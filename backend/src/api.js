import { PermissionFlagsBits } from 'discord.js';
import { config } from './config.js';
import { commandCatalog, sanitiseCommandSettings, syncGuildCommands } from './commandSync.js';
import { billingConfigured, createCheckoutSession, createPortalSession } from './billing.js';
import {
  consumeOAuthState,
  createAppeal,
  createOAuthState,
  createWebSession,
  deleteGuildData,
  deleteWebSession,
  exportGuildData,
  getCase,
  getGuildConfig,
  getWebSession,
  listAppeals,
  listCases,
  pruneWebAuth,
  updateGuildConfig
} from './store.js';
import { ensureVerificationPanel } from './verification.js';
import { clamp, safeUrlDomain } from './utils.js';
import { sendLog, WARNING_COLOUR } from './services/logService.js';
import { logger } from './logger.js';

const SESSION_COOKIE = 'moderationdesk_session';
const MANAGE_GUILD = PermissionFlagsBits.ManageGuild;
const ADMINISTRATOR = PermissionFlagsBits.Administrator;
const SESSION_TTL = 8 * 60 * 60_000;

const cleanup = setInterval(() => pruneWebAuth(), 15 * 60_000);
cleanup.unref();

const redirectUri = () => `${config.frontendBaseUrl}/api/oauth/dashboard/callback`;
const frontend = path => `${config.frontendBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

function hasManagePermission(partialGuild) {
  if (partialGuild.owner) return true;
  const permissions = BigInt(partialGuild.permissions || '0');
  return (permissions & ADMINISTRATOR) === ADMINISTRATOR || (permissions & MANAGE_GUILD) === MANAGE_GUILD;
}

function oauthUrl(state, scope) {
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

async function exchangeCode(code) {
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri()
    })
  });
  if (!response.ok) throw new Error(`Discord OAuth exchange failed (${response.status}).`);
  return response.json();
}

async function discordGet(path, accessToken) {
  const response = await fetch(`https://discord.com/api${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Discord OAuth request failed (${response.status}).`);
  return response.json();
}

function createSession(res, data) {
  const { id, session } = createWebSession(data, SESSION_TTL);
  res.cookie(SESSION_COOKIE, id, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: config.frontendBaseUrl.startsWith('https://'),
    maxAge: SESSION_TTL,
    path: '/'
  });
  return session;
}

function sessionFrom(req) {
  return getWebSession(req.signedCookies?.[SESSION_COOKIE]);
}

function clearSession(req, res) {
  const id = req.signedCookies?.[SESSION_COOKIE];
  if (id) deleteWebSession(id);
  res.clearCookie(SESSION_COOKIE, { path: '/', sameSite: 'lax', secure: config.frontendBaseUrl.startsWith('https://') });
}

function requireSession(req, res, next) {
  const session = sessionFrom(req);
  if (!session) return res.status(401).json({ ok: false, error: 'authentication_required', loginUrl: '/api/auth/login' });
  req.dashboardSession = session;
  next();
}

function canManage(session, guildId) {
  return session.guilds?.some(guild => guild.id === String(guildId) && hasManagePermission(guild));
}

function requireGuildAccess(client) {
  return (req, res, next) => {
    if (!canManage(req.dashboardSession, req.params.guildId)) return res.status(403).json({ ok: false, error: 'manage_server_required' });
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) return res.status(404).json({ ok: false, error: 'bot_not_installed' });
    req.dashboardGuild = guild;
    next();
  };
}

function checkCsrf(req, res, next) {
  const supplied = req.get('X-CSRF-Token') || req.body?.csrf || '';
  if (!req.dashboardSession || supplied !== req.dashboardSession.csrf) return res.status(403).json({ ok: false, error: 'invalid_csrf' });
  next();
}

function userPayload(user) {
  return {
    id: user.id,
    username: user.username,
    globalName: user.global_name || user.username,
    avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null
  };
}

function guildIcon(guild) {
  return guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null;
}

function dashboardGuild(client, partial) {
  const installed = client.guilds.cache.has(partial.id);
  return {
    id: partial.id,
    name: partial.name,
    icon: guildIcon(partial),
    installed,
    owner: Boolean(partial.owner),
    permissions: partial.permissions,
    manage: hasManagePermission(partial)
  };
}

function publicConfig(cfg) {
  const commandOverrides = { ...(cfg.commandSettings?.overrides || {}) };
  for (const command of commandCatalog()) commandOverrides[command.key] ||= { name: command.name, description: command.description, enabled: true };
  return {
    ...cfg,
    commandSettings: { ...(cfg.commandSettings || {}), overrides: commandOverrides },
    billing: {
      status: cfg.billing.status || '',
      currentPeriodEnd: cfg.billing.currentPeriodEnd || 0,
      linked: Boolean(cfg.billing.stripeCustomerId)
    }
  };
}

function guildPayload(guild) {
  const channels = [...guild.channels.cache.values()]
    .filter(channel => channel.isTextBased?.() && channel.permissionOverwrites)
    .sort((a, b) => a.position - b.position)
    .map(channel => ({ id: channel.id, name: channel.name, type: channel.type }));
  const roles = [...guild.roles.cache.values()]
    .filter(role => !role.managed && role.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map(role => ({ id: role.id, name: role.name, position: role.position, colour: role.hexColor }));
  const botMember = guild.members.me;
  const permissionChecks = [
    ['Manage roles', PermissionFlagsBits.ManageRoles],
    ['Manage channels', PermissionFlagsBits.ManageChannels],
    ['Moderate members', PermissionFlagsBits.ModerateMembers],
    ['Kick members', PermissionFlagsBits.KickMembers],
    ['Ban members', PermissionFlagsBits.BanMembers],
    ['Manage messages', PermissionFlagsBits.ManageMessages],
    ['View audit log', PermissionFlagsBits.ViewAuditLog],
    ['Send messages', PermissionFlagsBits.SendMessages]
  ].map(([name, permission]) => ({ name, granted: Boolean(botMember?.permissions.has(permission)) }));
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL({ size: 128 }),
    memberCount: guild.memberCount,
    channels,
    roles,
    config: publicConfig(getGuildConfig(guild.id)),
    health: {
      connected: Boolean(botMember),
      permissions: permissionChecks,
      granted: permissionChecks.filter(item => item.granted).length,
      total: permissionChecks.length,
      highestRole: botMember?.roles.highest?.name || ''
    },
    billingConfigured: billingConfigured(),
    appealUrl: frontend(`/appeal/${guild.id}`)
  };
}

function selectedIds(value, collection) {
  const values = Array.isArray(value) ? value : [];
  return [...new Set(values.map(String).filter(id => collection.has(id)))];
}

function selectedId(value, collection) {
  const id = String(value || '');
  return id && collection.has(id) ? id : '';
}

function bool(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

async function applySettings(guild, section, body) {
  const cfg = getGuildConfig(guild.id);
  const data = body?.data || body || {};
  const channel = value => selectedId(value, guild.channels.cache);
  const role = value => selectedId(value, guild.roles.cache);
  const roleIds = value => selectedIds(value, guild.roles.cache);

  if (section === 'commands') {
    const settings = sanitiseCommandSettings(data.commandSettings || data);
    const updated = updateGuildConfig(guild.id, { commandSettings: settings });
    await syncGuildCommands(guild.id);
    return updated;
  }

  if (section === 'general') {
    return updateGuildConfig(guild.id, {
      staffRoleIds: roleIds(data.staffRoleIds),
      adminRoleIds: roleIds(data.adminRoleIds),
      logs: {
        member: channel(data.logs?.member),
        moderation: channel(data.logs?.moderation),
        messages: channel(data.logs?.messages),
        server: channel(data.logs?.server),
        security: channel(data.logs?.security),
        appeals: channel(data.logs?.appeals)
      },
      welcome: {
        enabled: bool(data.welcome?.enabled),
        channelId: channel(data.welcome?.channelId),
        message: String(data.welcome?.message || cfg.welcome.message).slice(0, 2_000)
      },
      goodbye: {
        enabled: bool(data.goodbye?.enabled),
        channelId: channel(data.goodbye?.channelId),
        message: String(data.goodbye?.message || cfg.goodbye.message).slice(0, 2_000)
      },
      autoroles: roleIds(data.autoroles).slice(0, cfg.plan === 'free' ? 1 : 10),
      stickyRoles: {
        enabled: cfg.plan !== 'free' && bool(data.stickyRoles?.enabled),
        roleIds: roleIds(data.stickyRoles?.roleIds).slice(0, 20)
      },
      suggestions: { enabled: bool(data.suggestions?.enabled), channelId: channel(data.suggestions?.channelId) },
      starboard: {
        enabled: cfg.plan !== 'free' && bool(data.starboard?.enabled),
        channelId: channel(data.starboard?.channelId),
        emoji: String(data.starboard?.emoji || '⭐').slice(0, 64),
        threshold: clamp(data.starboard?.threshold, 1, 100, cfg.starboard.threshold)
      },
      appeals: { enabled: bool(data.appeals?.enabled), channelId: channel(data.appeals?.channelId) }
    });
  }

  if (section === 'automod') {
    return updateGuildConfig(guild.id, { automod: {
      enabled: bool(data.enabled),
      antiInvites: bool(data.antiInvites),
      antiLinks: bool(data.antiLinks),
      antiSpam: bool(data.antiSpam),
      antiDuplicates: bool(data.antiDuplicates),
      antiMassMentions: bool(data.antiMassMentions),
      antiCaps: bool(data.antiCaps),
      action: cfg.plan === 'free' ? 'delete' : ['delete', 'warn', 'timeout'].includes(data.action) ? data.action : 'delete',
      timeoutSeconds: clamp(data.timeoutSeconds, 10, 2_419_200, cfg.automod.timeoutSeconds),
      blockedWords: String(data.blockedWords || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean).slice(0, cfg.plan === 'free' ? 25 : 500),
      allowedDomains: String(data.allowedDomains || '').split(/\r?\n/).map(safeUrlDomain).filter(Boolean).slice(0, cfg.plan === 'free' ? 10 : 250),
      allowedInviteCodes: String(data.allowedInviteCodes || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean).slice(0, 250),
      maxMentions: clamp(data.maxMentions, 2, 50, cfg.automod.maxMentions),
      maxCapsPercent: clamp(data.maxCapsPercent, 50, 100, cfg.automod.maxCapsPercent),
      minCapsLength: clamp(data.minCapsLength, 5, 200, cfg.automod.minCapsLength),
      spamWindowSeconds: clamp(data.spamWindowSeconds, 2, 60, cfg.automod.spamWindowSeconds),
      spamMaxMessages: clamp(data.spamMaxMessages, 3, 30, cfg.automod.spamMaxMessages),
      duplicateMax: clamp(data.duplicateMax, 2, 10, cfg.automod.duplicateMax),
      exemptRoleIds: roleIds(data.exemptRoleIds),
      exemptChannelIds: selectedIds(data.exemptChannelIds, guild.channels.cache)
    } });
  }

  if (section === 'security') {
    return updateGuildConfig(guild.id, { security: {
      antiRaid: {
        enabled: cfg.plan !== 'free' && bool(data.antiRaid?.enabled),
        joinThreshold: clamp(data.antiRaid?.joinThreshold, 3, 100, cfg.security.antiRaid.joinThreshold),
        windowSeconds: clamp(data.antiRaid?.windowSeconds, 5, 300, cfg.security.antiRaid.windowSeconds),
        autoUnlockMinutes: clamp(data.antiRaid?.autoUnlockMinutes, 1, 1_440, cfg.security.antiRaid.autoUnlockMinutes),
        minimumAccountAgeDays: clamp(data.antiRaid?.minimumAccountAgeDays, 0, 3_650, cfg.security.antiRaid.minimumAccountAgeDays),
        quarantineRoleId: role(data.antiRaid?.quarantineRoleId)
      },
      antiNuke: {
        enabled: cfg.plan === 'enterprise' && bool(data.antiNuke?.enabled),
        windowSeconds: clamp(data.antiNuke?.windowSeconds, 5, 300, cfg.security.antiNuke.windowSeconds),
        action: data.antiNuke?.action === 'ban' ? 'ban' : 'strip_roles',
        restoreDeletedObjects: bool(data.antiNuke?.restoreDeletedObjects),
        trustedUserIds: [...new Set((Array.isArray(data.antiNuke?.trustedUserIds) ? data.antiNuke.trustedUserIds : []).map(String).filter(id => /^\d{16,22}$/.test(id)))].slice(0, 100),
        trustedRoleIds: roleIds(data.antiNuke?.trustedRoleIds),
        thresholds: {
          channelDelete: clamp(data.antiNuke?.thresholds?.channelDelete, 1, 25, cfg.security.antiNuke.thresholds.channelDelete),
          roleDelete: clamp(data.antiNuke?.thresholds?.roleDelete, 1, 25, cfg.security.antiNuke.thresholds.roleDelete),
          memberBan: clamp(data.antiNuke?.thresholds?.memberBan, 1, 50, cfg.security.antiNuke.thresholds.memberBan),
          memberKick: clamp(data.antiNuke?.thresholds?.memberKick, 1, 50, cfg.security.antiNuke.thresholds.memberKick)
        }
      }
    } });
  }

  if (section === 'verification') {
    const oldChannel = guild.channels.cache.get(cfg.verification.channelId);
    if (cfg.verification.messageId && oldChannel?.isTextBased()) {
      const oldMessage = await oldChannel.messages.fetch(cfg.verification.messageId).catch(() => null);
      if (oldMessage) await oldMessage.delete().catch(() => {});
    }
    const mode = data.mode === 'oauth' && cfg.plan !== 'free' ? 'oauth' : 'button';
    const updated = updateGuildConfig(guild.id, { verification: {
      enabled: bool(data.enabled),
      mode,
      channelId: channel(data.channelId),
      verifiedRoleId: role(data.verifiedRoleId),
      unverifiedRoleId: role(data.unverifiedRoleId),
      message: String(data.message || cfg.verification.message).slice(0, 2_000),
      messageId: ''
    } });
    if (updated.verification.enabled) await ensureVerificationPanel(guild.client, guild.id);
    return getGuildConfig(guild.id);
  }

  throw new Error('Unknown settings section.');
}

export function mountApi(app, client) {
  app.get('/api/meta', (req, res) => res.json({
    ok: true,
    name: 'ModerationDesk',
    version: '1.1.0',
    botReady: client.isReady(),
    links: config.links
  }));

  app.get('/api/auth/login', (req, res) => {
    if (!config.frontendBaseUrl || !config.clientSecret || config.sessionSecret.length < 32) return res.status(503).json({ ok: false, error: 'oauth_not_configured' });
    const requested = String(req.query.returnTo || '/dashboard');
    const returnTo = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
    const state = createOAuthState({ kind: 'dashboard', returnTo });
    res.redirect(oauthUrl(state, 'identify guilds'));
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSession(req, res);
    res.json({ ok: true });
  });

  app.get('/api/auth/session', (req, res) => {
    const session = sessionFrom(req);
    if (!session) return res.status(401).json({ ok: false, authenticated: false });
    res.json({ ok: true, authenticated: true, user: session.user, csrf: session.csrf, expiresAt: session.expiresAt });
  });

  app.get('/api/oauth/dashboard/callback', async (req, res) => {
    if (!config.frontendBaseUrl || !config.clientSecret || config.sessionSecret.length < 32) return res.status(503).json({ ok: false, error: 'oauth_not_configured' });
    const state = consumeOAuthState(String(req.query.state || ''));
    if (!state) return res.redirect(frontend('/auth/error?reason=expired'));
    try {
      const token = await exchangeCode(String(req.query.code || ''));
      const user = await discordGet('/users/@me', token.access_token);
      const guilds = state.kind === 'dashboard' ? await discordGet('/users/@me/guilds', token.access_token) : [];
      createSession(res, { user: userPayload(user), guilds, authKind: state.kind });
      const destination = state.kind === 'appeal' ? `/appeal/${state.guildId}` : state.returnTo || '/dashboard';
      res.redirect(frontend(destination));
    } catch (error) {
      logger.warn('Dashboard OAuth failed', { error: error.message });
      res.redirect(frontend(`/auth/error?reason=${encodeURIComponent(error.message)}`));
    }
  });

  app.get('/api/guilds', requireSession, (req, res) => {
    const guilds = (req.dashboardSession.guilds || [])
      .filter(hasManagePermission)
      .map(partial => dashboardGuild(client, partial))
      .sort((a, b) => Number(b.installed) - Number(a.installed) || a.name.localeCompare(b.name));
    res.json({ ok: true, guilds });
  });

  app.get('/api/guilds/:guildId', requireSession, requireGuildAccess(client), (req, res) => {
    res.json({ ok: true, guild: guildPayload(req.dashboardGuild) });
  });

  app.get('/api/commands/catalog', requireSession, (req, res) => {
    res.json({ ok: true, commands: commandCatalog() });
  });

  app.get('/api/guilds/:guildId/cases', requireSession, requireGuildAccess(client), (req, res) => {
    const limit = clamp(req.query.limit, 1, 100, 25);
    res.json({ ok: true, cases: listCases(req.params.guildId, { limit }) });
  });

  app.get('/api/guilds/:guildId/appeals', requireSession, requireGuildAccess(client), (req, res) => {
    const status = ['open', 'accepted', 'rejected'].includes(String(req.query.status || '')) ? String(req.query.status) : '';
    res.json({ ok: true, appeals: listAppeals(req.params.guildId, status) });
  });

  app.patch('/api/guilds/:guildId/settings/:section', requireSession, requireGuildAccess(client), checkCsrf, async (req, res) => {
    try {
      const updated = await applySettings(req.dashboardGuild, req.params.section, req.body);
      res.json({ ok: true, config: publicConfig(updated) });
    } catch (error) {
      logger.warn('Dashboard settings update failed', { guildId: req.params.guildId, section: req.params.section, error: error.message });
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get('/api/guilds/:guildId/export', requireSession, requireGuildAccess(client), (req, res) => {
    res.setHeader('Content-Disposition', `attachment; filename="moderationdesk-${req.params.guildId}-export.json"`);
    res.json(exportGuildData(req.params.guildId));
  });

  app.delete('/api/guilds/:guildId/data', requireSession, requireGuildAccess(client), checkCsrf, (req, res) => {
    if (String(req.body?.confirmation || '') !== req.params.guildId) return res.status(400).json({ ok: false, error: 'confirmation_mismatch' });
    deleteGuildData(req.params.guildId);
    res.json({ ok: true });
  });

  app.post('/api/guilds/:guildId/billing/checkout', requireSession, requireGuildAccess(client), checkCsrf, async (req, res) => {
    try {
      const plan = req.body?.plan;
      if (!['pro', 'enterprise'].includes(plan)) throw new Error('Invalid plan.');
      const checkout = await createCheckoutSession({ guildId: req.params.guildId, plan, userId: req.dashboardSession.user.id });
      res.json({ ok: true, url: checkout.url });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/guilds/:guildId/billing/portal', requireSession, requireGuildAccess(client), checkCsrf, async (req, res) => {
    try {
      const portal = await createPortalSession({ guildId: req.params.guildId });
      res.json({ ok: true, url: portal.url });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get('/api/appeals/:guildId/status', (req, res) => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    const cfg = guild && getGuildConfig(guild.id);
    if (!guild || !cfg?.appeals.enabled) return res.status(404).json({ ok: false, error: 'appeals_unavailable' });
    const session = sessionFrom(req);
    res.json({ ok: true, guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ size: 128 }) }, authenticated: Boolean(session), user: session?.user || null });
  });

  app.get('/api/appeals/:guildId/login', (req, res) => {
    if (!config.frontendBaseUrl || !config.clientSecret || config.sessionSecret.length < 32) return res.status(503).json({ ok: false, error: 'oauth_not_configured' });
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild || !getGuildConfig(guild.id).appeals.enabled) return res.status(404).json({ ok: false, error: 'appeals_unavailable' });
    const state = createOAuthState({ kind: 'appeal', guildId: guild.id });
    res.redirect(oauthUrl(state, 'identify'));
  });

  app.post('/api/appeals/:guildId', requireSession, checkCsrf, (req, res) => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    const cfg = guild && getGuildConfig(guild.id);
    if (!guild || !cfg?.appeals.enabled) return res.status(404).json({ ok: false, error: 'appeals_unavailable' });
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 20 || reason.length > 4_000) return res.status(400).json({ ok: false, error: 'reason_length' });
    const caseId = req.body?.caseId ? Number(req.body.caseId) : null;
    if (caseId) {
      const moderationCase = getCase(guild.id, caseId);
      if (!moderationCase || moderationCase.userId !== req.dashboardSession.user.id) return res.status(400).json({ ok: false, error: 'case_not_owned' });
    }
    const result = createAppeal({ guildId: guild.id, userId: req.dashboardSession.user.id, username: req.dashboardSession.user.username, caseId, reason });
    if (!result.duplicate) {
      const channel = guild.channels.cache.get(cfg.appeals.channelId || cfg.logs.appeals);
      if (channel?.isTextBased()) channel.send({ embeds: [{ color: WARNING_COLOUR, title: `New appeal ${result.appeal.id}`, description: reason, fields: [{ name: 'User', value: `${req.dashboardSession.user.username} (${req.dashboardSession.user.id})` }, { name: 'Case', value: caseId ? `#${caseId}` : 'Not supplied' }], timestamp: new Date().toISOString() }], allowedMentions: { parse: [] } }).catch(() => {});
      if (cfg.logs.appeals !== channel?.id) sendLog(guild, 'appeals', { title: `New appeal ${result.appeal.id}`, description: `${req.dashboardSession.user.username} (${req.dashboardSession.user.id})\nCase: ${caseId || 'not supplied'}\n${reason}`, colour: WARNING_COLOUR });
    }
    res.json({ ok: true, duplicate: result.duplicate, appeal: result.appeal });
  });
}
