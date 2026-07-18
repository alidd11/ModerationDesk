import { AuditLogEvent, ChannelType, PermissionFlagsBits } from 'discord.js';
import { addTempAction, getGuildConfig, incrementStat, recordAuditEvent, recordCase, updateGuildConfig } from './store.js';
import { DANGER_COLOUR, sendLog } from './services/logService.js';
import { logger } from './logger.js';

const joinWindows = new Map();
const destructiveWindows = new Map();
const enforced = new Map();
const dangerousPermissions = [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers];

export async function setLockdown(guild, enabled, reason = 'ModerationDesk lockdown') {
  let changed = 0;
  for (const channel of guild.channels.cache.values()) {
    if (![ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum].includes(channel.type) || !channel.permissionOverwrites) continue;
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: enabled ? false : null, SendMessagesInThreads: enabled ? false : null }, { reason });
      changed += 1;
    } catch {}
  }
  updateGuildConfig(guild.id, { security: { lockdown: enabled } });
  const eventKey = reason.startsWith('Anti-raid') ? 'anti_raid_triggered' : (enabled ? 'server_lockdown_started' : 'server_lockdown_ended');
  await sendLog(guild, 'security', { title: enabled ? 'Server lockdown activated' : 'Server lockdown ended', eventKey, description: `${changed} channels updated.\nReason: ${reason}`, colour: enabled ? DANGER_COLOUR : 0x57F287 });
  return changed;
}

async function latestExecutor(guild, type, targetId) {
  await new Promise(resolve => setTimeout(resolve, 750));
  const auditTypes = Array.isArray(type) ? type : [type];
  const logSets = await Promise.all(auditTypes.map(auditType => guild.fetchAuditLogs({ type: auditType, limit: 6 }).catch(() => null)));
  const now = Date.now();
  const entry = logSets
    .flatMap(logs => logs ? [...logs.entries.values()] : [])
    .filter(candidate => (!targetId || candidate.target?.id === targetId) && now - candidate.createdTimestamp < 12_000)
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)[0];
  return entry?.executor || null;
}

async function isTrusted(guild, userId, cfg) {
  if (!userId || userId === guild.ownerId || userId === guild.client.user.id || cfg.trustedUserIds.includes(userId)) return true;
  const member = await guild.members.fetch(userId).catch(() => null);
  return Boolean(member && cfg.trustedRoleIds.some(roleId => member.roles.cache.has(roleId)));
}

async function enforce(guild, executor, eventName, deletedObject = null) {
  const cfg = getGuildConfig(guild.id).security.antiNuke;
  const cooldownKey = `${guild.id}:${executor.id}`;
  if ((enforced.get(cooldownKey) || 0) > Date.now() - 60_000) return;
  enforced.set(cooldownKey, Date.now());
  incrementStat(guild.id, 'antiNukeTriggers');

  const member = await guild.members.fetch(executor.id).catch(() => null);
  let result = 'No enforcement action was possible.';
  if (cfg.action === 'ban' && member?.bannable) {
    await member.ban({ reason: `ModerationDesk anti-nuke: ${eventName}` });
    result = 'Executor banned.';
  } else if (member) {
    const roles = member.roles.cache.filter(role => role.id !== guild.id && role.editable && dangerousPermissions.some(permission => role.permissions.has(permission)));
    if (roles.size) {
      await member.roles.remove([...roles.keys()], `ModerationDesk anti-nuke: ${eventName}`).catch(() => {});
      result = `Removed ${roles.size} dangerous role${roles.size === 1 ? '' : 's'}.`;
    }
  }

  if (member && cfg.quarantineRoleId && !member.roles.cache.has(cfg.quarantineRoleId)) {
    const quarantineRole = guild.roles.cache.get(cfg.quarantineRoleId);
    if (quarantineRole?.editable) {
      await member.roles.add(quarantineRole, `ModerationDesk anti-nuke: ${eventName}`).catch(() => {});
      result += ' Executor quarantined.';
    }
  }

  if (cfg.lockdownOnTrigger || cfg.panicMode) {
    await setLockdown(guild, true, `Anti-nuke ${cfg.panicMode ? 'panic mode' : 'threshold'}: ${eventName}`).catch(() => {});
    result += ' Server lockdown activated.';
  }

  if (cfg.restoreDeletedObjects && deletedObject) {
    try {
      if (eventName === 'channelDelete') {
        const restored = await guild.channels.create({
          name: deletedObject.name,
          type: deletedObject.type,
          parent: deletedObject.parentId || undefined,
          topic: deletedObject.topic || undefined,
          nsfw: deletedObject.nsfw || false,
          rateLimitPerUser: deletedObject.rateLimitPerUser || 0,
          permissionOverwrites: deletedObject.permissionOverwrites?.cache?.map(overwrite => ({ id: overwrite.id, type: overwrite.type, allow: overwrite.allow.bitfield, deny: overwrite.deny.bitfield })) || [],
          reason: 'ModerationDesk anti-nuke restoration'
        });
        await restored.setPosition(deletedObject.position).catch(() => {});
        result += ' Deleted channel restored.';
      } else if (eventName === 'roleDelete') {
        const restored = await guild.roles.create({ name: deletedObject.name, color: deletedObject.color, hoist: deletedObject.hoist, mentionable: deletedObject.mentionable, permissions: deletedObject.permissions, reason: 'ModerationDesk anti-nuke restoration' });
        await restored.setPosition(deletedObject.position).catch(() => {});
        result += ' Deleted role restored; previous member assignments cannot be reconstructed automatically.';
      }
    } catch (error) {
      result += ` Restoration failed: ${error.message}`;
    }
  }

  recordAuditEvent({ guildId: guild.id, category: 'security', action: 'anti_nuke_enforced', actorId: executor.id, actorName: executor.tag, summary: `${eventName}: ${result}` });

  await sendLog(guild, 'security', { title: 'Anti-nuke threshold exceeded', eventKey: 'anti_nuke_triggered', colour: DANGER_COLOUR, fields: [
    { name: 'Executor', value: `${executor.tag} (${executor.id})` },
    { name: 'Event', value: eventName, inline: true },
    { name: 'Response', value: result }
  ] });
}

async function observeDestructive(guild, eventName, auditType, targetId, deletedObject = null) {
  const cfg = getGuildConfig(guild.id).security.antiNuke;
  if (!cfg.enabled) return;
  const executor = await latestExecutor(guild, auditType, targetId);
  if (!executor || await isTrusted(guild, executor.id, cfg)) return;
  const key = `${guild.id}:${executor.id}:${eventName}`;
  const now = Date.now();
  const rows = (destructiveWindows.get(key) || []).filter(time => now - time <= cfg.windowSeconds * 1_000);
  rows.push(now);
  destructiveWindows.set(key, rows);
  const threshold = cfg.thresholds[eventName] || 3;
  if (rows.length >= threshold) await enforce(guild, executor, eventName, deletedObject);
}

async function enforceJoinGate(member) {
  const cfg = getGuildConfig(member.guild.id);
  const policy = cfg.security.joinGate;
  if (!policy?.enabled || member.user.bot) return;

  const reasons = [];
  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;
  if (policy.minimumAccountAgeDays > 0 && accountAgeDays < policy.minimumAccountAgeDays) reasons.push(`Account is ${Math.max(0, Math.floor(accountAgeDays))} days old`);
  if (policy.requireAvatar && !member.user.avatar) reasons.push('Account has no custom avatar');
  const identity = [member.user.username, member.user.globalName, member.displayName].filter(Boolean).join(' ').toLowerCase();
  const matchedTerm = policy.blockedTerms.find(term => identity.includes(String(term).toLowerCase()));
  if (matchedTerm) reasons.push(`Identity matched the Join Gate term “${matchedTerm}”`);
  if (!reasons.length) return;

  const reason = `Join Gate: ${reasons.join('; ')}`;
  const row = recordCase({
    guildId: member.guild.id,
    userId: member.id,
    moderatorId: member.client.user.id,
    action: `join-gate-${policy.action}`,
    reason,
    metadata: { accountAgeDays: Math.floor(accountAgeDays), matchedTerm: matchedTerm || null }
  });
  let outcome = 'No action could be completed.';
  if (policy.action === 'quarantine') {
    const role = member.guild.roles.cache.get(policy.quarantineRoleId);
    if (role?.editable) {
      await member.roles.add(role, reason);
      outcome = `Quarantined with ${role.name}.`;
    } else outcome = 'Quarantine role is missing or above ModerationDesk.';
  } else if (policy.action === 'timeout' && member.moderatable) {
    await member.timeout(Math.min(policy.timeoutMinutes * 60_000, 2_419_200_000), reason);
    outcome = `Timed out for ${policy.timeoutMinutes} minutes.`;
  } else if (policy.action === 'kick' && member.kickable) {
    await member.kick(reason);
    outcome = 'Member kicked.';
  } else if (policy.action === 'ban' && member.bannable) {
    await member.ban({ reason });
    outcome = 'Member banned.';
  }

  recordAuditEvent({ guildId: member.guild.id, category: 'security', action: 'join_gate_enforced', actorId: member.id, actorName: member.user.tag, summary: `${policy.action}: ${reasons.join('; ')}` });
  await sendLog(member.guild, 'security', {
    title: 'Join Gate action',
    eventKey: 'join_gate_action',
    colour: DANGER_COLOUR,
    fields: [
      { name: 'Member', value: `${member.user.tag} (${member.id})` },
      { name: 'Signals', value: reasons.join('\n') },
      { name: 'Action', value: outcome },
      { name: 'Case', value: `#${row.id}`, inline: true }
    ]
  });
}

export function attachSecurity(client) {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, times] of joinWindows) { const recent = times.filter(time => now - time < 300_000); recent.length ? joinWindows.set(key, recent) : joinWindows.delete(key); }
    for (const [key, times] of destructiveWindows) { const recent = times.filter(time => now - time < 300_000); recent.length ? destructiveWindows.set(key, recent) : destructiveWindows.delete(key); }
    for (const [key, time] of enforced) if (now - time > 300_000) enforced.delete(key);
  }, 300_000);
  cleanup.unref();

  client.on('guildMemberAdd', async member => {
    if (member.user.bot) return;
    const cfg = getGuildConfig(member.guild.id).security.antiRaid;
    await enforceJoinGate(member).catch(error => logger.warn('Join Gate enforcement failed', { error: error.message }));
    if (!cfg.enabled) return;
    const accountAge = Date.now() - member.user.createdTimestamp;
    const joinGateEnabled = getGuildConfig(member.guild.id).security.joinGate?.enabled;
    if (!joinGateEnabled && cfg.minimumAccountAgeDays > 0 && accountAge < cfg.minimumAccountAgeDays * 86_400_000 && cfg.quarantineRoleId) {
      await member.roles.add(cfg.quarantineRoleId, 'ModerationDesk new-account quarantine').catch(() => {});
      await sendLog(member.guild, 'security', { title: 'New account quarantined', eventKey: 'new_account_quarantined', description: `${member.user.tag} (${member.id})`, colour: DANGER_COLOUR });
    }
    const now = Date.now();
    const joins = (joinWindows.get(member.guild.id) || []).filter(time => now - time <= cfg.windowSeconds * 1_000);
    joins.push(now);
    joinWindows.set(member.guild.id, joins);
    const guildCfg = getGuildConfig(member.guild.id);
    if (joins.length >= cfg.joinThreshold && !guildCfg.security.lockdown) {
      incrementStat(member.guild.id, 'raidTriggers');
      await setLockdown(member.guild, true, `Anti-raid threshold reached: ${joins.length} joins in ${cfg.windowSeconds}s`);
      addTempAction({ guildId: member.guild.id, type: 'unlockdown', executeAt: Date.now() + cfg.autoUnlockMinutes * 60_000, reason: 'Automatic anti-raid unlock' });
    }
  });

  client.on('channelDelete', channel => observeDestructive(channel.guild, 'channelDelete', AuditLogEvent.ChannelDelete, channel.id, channel).catch(error => logger.warn('Anti-nuke channel observation failed', { error: error.message })));
  client.on('channelCreate', channel => observeDestructive(channel.guild, 'channelCreate', AuditLogEvent.ChannelCreate, channel.id).catch(error => logger.warn('Anti-nuke channel observation failed', { error: error.message })));
  client.on('channelUpdate', (oldChannel, channel) => observeDestructive(channel.guild, 'channelUpdate', AuditLogEvent.ChannelUpdate, channel.id).catch(error => logger.warn('Anti-nuke channel observation failed', { error: error.message })));
  client.on('roleDelete', role => observeDestructive(role.guild, 'roleDelete', AuditLogEvent.RoleDelete, role.id, role).catch(error => logger.warn('Anti-nuke role observation failed', { error: error.message })));
  client.on('roleCreate', role => observeDestructive(role.guild, 'roleCreate', AuditLogEvent.RoleCreate, role.id).catch(error => logger.warn('Anti-nuke role observation failed', { error: error.message })));
  client.on('roleUpdate', (oldRole, role) => {
    const newDangerousPermission = dangerousPermissions.some(permission => !oldRole.permissions.has(permission) && role.permissions.has(permission));
    const eventName = newDangerousPermission ? 'rolePermissionEscalation' : 'roleUpdate';
    return observeDestructive(role.guild, eventName, AuditLogEvent.RoleUpdate, role.id).catch(error => logger.warn('Anti-nuke role observation failed', { error: error.message }));
  });
  client.on('guildBanAdd', ban => observeDestructive(ban.guild, 'memberBan', AuditLogEvent.MemberBanAdd, ban.user.id).catch(error => logger.warn('Anti-nuke ban observation failed', { error: error.message })));
  client.on('guildMemberRemove', member => observeDestructive(member.guild, 'memberKick', AuditLogEvent.MemberKick, member.id).catch(error => logger.warn('Anti-nuke kick observation failed', { error: error.message })));
  client.on('guildMemberAdd', member => {
    if (!member.user.bot) return;
    return observeDestructive(member.guild, 'botAdd', AuditLogEvent.BotAdd, member.id).catch(error => logger.warn('Anti-nuke bot observation failed', { error: error.message }));
  });
  client.on('webhooksUpdate', channel => observeDestructive(channel.guild, 'webhookUpdate', [AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookUpdate, AuditLogEvent.WebhookDelete], null).catch(error => logger.warn('Anti-nuke webhook observation failed', { error: error.message })));
  client.on('guildUpdate', (oldGuild, guild) => observeDestructive(guild, 'guildUpdate', AuditLogEvent.GuildUpdate, guild.id).catch(error => logger.warn('Anti-nuke guild observation failed', { error: error.message })));
}
