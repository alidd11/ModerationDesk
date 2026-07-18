import crypto from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { config } from './config.js';
import { getGuildConfig, getMigration, incrementStat, recordMigration, updateGuildConfig } from './store.js';
import { hasPlan } from './premium.js';
import { logger } from './logger.js';

const VERIFY_BUTTON = 'moderationdesk:verify';
const states = new Map();
const stateCleanup = setInterval(() => { const now = Date.now(); for (const [key, state] of states) if (state.expiresAt <= now) states.delete(key); }, 300_000);
stateCleanup.unref();

function createState(payload) {
  const token = crypto.randomBytes(32).toString('hex');
  states.set(token, { ...payload, expiresAt: Date.now() + 10 * 60_000 });
  return token;
}

function consumeState(token) {
  const state = states.get(token);
  states.delete(token);
  return state && state.expiresAt > Date.now() ? state : null;
}

function verificationOAuthUrl(state) {
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', `${config.frontendBaseUrl}/api/oauth/verify/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify');
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
      redirect_uri: `${config.frontendBaseUrl}/api/oauth/verify/callback`
    })
  });
  if (!response.ok) throw new Error('Discord token exchange failed.');
  return response.json();
}

async function fetchOAuthUser(accessToken) {
  const response = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error('Discord identity lookup failed.');
  return response.json();
}

export async function grantVerification(member) {
  const verification = getGuildConfig(member.guild.id).verification;
  const alreadyVerified = Boolean(verification.verifiedRoleId && member.roles.cache.has(verification.verifiedRoleId));
  if (verification.verifiedRoleId) await member.roles.add(verification.verifiedRoleId, 'ModerationDesk verification');
  if (verification.unverifiedRoleId) await member.roles.remove(verification.unverifiedRoleId, 'ModerationDesk verification').catch(() => {});
  if (!alreadyVerified) incrementStat(member.guild.id, 'verified');
}

export function attachVerification(client) {
  client.on('guildMemberAdd', async member => {
    const verification = getGuildConfig(member.guild.id).verification;
    if (!member.user.bot && verification.enabled && verification.unverifiedRoleId) {
      await member.roles.add(verification.unverifiedRoleId, 'Awaiting ModerationDesk verification').catch(() => {});
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.customId !== VERIFY_BUTTON || !interaction.guild) return;
    const cfg = getGuildConfig(interaction.guildId);
    if (!cfg.verification.enabled) return interaction.reply({ content: 'Verification is currently disabled.', ephemeral: true });

    if (cfg.verification.mode === 'button') {
      try {
        await grantVerification(interaction.member);
        return interaction.reply({ content: '✅ Verification complete.', ephemeral: true });
      } catch (error) {
        logger.warn('Button verification failed', { guildId: interaction.guildId, userId: interaction.user.id, error: error.message });
        return interaction.reply({ content: '❌ Verification failed. Ask an administrator to check the bot role hierarchy.', ephemeral: true });
      }
    }

    if (!config.publicBaseUrl || !config.clientId || !config.clientSecret) {
      return interaction.reply({ content: 'OAuth verification has not been configured by the bot operator.', ephemeral: true });
    }

    const migrationActive = cfg.migration.enabled && hasPlan(interaction.guildId, 'enterprise');
    const state = createState({ guildId: interaction.guildId, userId: interaction.user.id });
    const notice = migrationActive
      ? 'Authorize your Discord identity to verify source-server membership and restore mapped roles. You must join this destination server yourself; ModerationDesk does not move or force-add accounts.'
      : 'Authorize your Discord identity. ModerationDesk requests only the identify scope and does not receive your password.';
    return interaction.reply({ content: `${notice}\n\n${verificationOAuthUrl(state)}`, ephemeral: true });
  });
}

export async function ensureVerificationPanel(client, guildId, { force = false } = {}) {
  const guild = client.guilds.cache.get(String(guildId));
  if (!guild) return null;
  const cfg = getGuildConfig(guild.id);
  const verification = cfg.verification;
  if (!verification.enabled || !verification.channelId) return null;
  const channel = guild.channels.cache.get(verification.channelId);
  if (!channel?.isTextBased()) return null;

  if (verification.messageId) {
    const existing = await channel.messages.fetch(verification.messageId).catch(() => null);
    if (existing && !force) return existing;
    if (existing && force) await existing.delete().catch(() => {});
  }

  const migrationActive = cfg.migration.enabled && hasPlan(guild.id, 'enterprise');
  const description = migrationActive
    ? `${verification.message}\n\nYou must join this server yourself. Discord OAuth is used only to confirm identity and source-server membership before mapped roles are restored.`
    : verification.message;
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(migrationActive ? 'ModerationDesk Migration Verification' : 'ModerationDesk Verification')
    .setDescription(description)
    .setFooter({ text: 'Never share your password, token or QR login with anyone.' });
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(VERIFY_BUTTON).setLabel(migrationActive ? 'Verify and Restore Roles' : verification.mode === 'oauth' ? 'Verify with Discord' : 'Verify').setStyle(ButtonStyle.Success));
  const message = await channel.send({ embeds: [embed], components: [row] });
  updateGuildConfig(guild.id, { verification: { messageId: message.id } });
  return message;
}

export async function ensureAllVerificationPanels(client) {
  for (const guild of client.guilds.cache.values()) await ensureVerificationPanel(client, guild.id).catch(error => logger.warn('Verification panel check failed', { guildId: guild.id, error: error.message }));
}

export function mountVerificationOAuth(app, client) {
  app.get('/api/oauth/verify/callback', async (req, res) => {
    const state = consumeState(String(req.query.state || ''));
    if (!state) return res.status(400).send('Verification session expired. Return to Discord and try again.');
    try {
      const token = await exchangeCode(String(req.query.code || ''));
      const user = await fetchOAuthUser(token.access_token);
      if (user.id !== state.userId) throw new Error('The authorized account did not match the Discord user who started verification.');
      const guild = client.guilds.cache.get(state.guildId);
      if (!guild) throw new Error('The destination server is unavailable.');
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) throw new Error('Join the destination server yourself before verifying.');
      const cfg = getGuildConfig(guild.id);
      await grantVerification(member);

      const restored = [];
      if (cfg.migration.enabled && hasPlan(guild.id, 'enterprise') && !getMigration(guild.id, user.id)) {
        const source = client.guilds.cache.get(cfg.migration.sourceGuildId);
        if (!source) throw new Error('The source server is not connected to ModerationDesk.');
        const sourceMember = await source.members.fetch(user.id).catch(() => null);
        if (cfg.migration.requireSourceMembership && !sourceMember) throw new Error('Your membership in the source server could not be confirmed.');
        if (sourceMember) {
          for (const [sourceRoleId, destinationRoleId] of Object.entries(cfg.migration.roleMappings || {})) {
            if (sourceMember.roles.cache.has(sourceRoleId) && guild.roles.cache.has(destinationRoleId)) {
              try {
                await member.roles.add(destinationRoleId, 'ModerationDesk consent-based role restoration');
                restored.push(destinationRoleId);
              } catch {}
            }
          }
        }
        recordMigration(guild.id, user.id, { sourceGuildId: source.id, restoredRoleIds: restored, consentMethod: 'discord_oauth_identify', userJoinedDestinationIndependently: true });
      }

      return res.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width"><title>Verification complete</title><style>body{font-family:system-ui;background:#111827;color:#f9fafb;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:520px;background:#1f2937;padding:32px;border-radius:18px;text-align:center}h1{color:#57f287}</style><div class="card"><h1>Verification complete</h1><p>You can return to Discord.</p><p>${restored.length} mapped role${restored.length === 1 ? '' : 's'} restored.</p><p>ModerationDesk did not move your account or join a server on your behalf.</p></div>`);
    } catch (error) {
      logger.warn('OAuth verification failed', { guildId: state.guildId, userId: state.userId, error: error.message });
      return res.status(400).type('html').send(`<h1>Verification failed</h1><p>${String(error.message)}</p>`);
    }
  });
}
