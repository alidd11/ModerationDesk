import { PermissionFlagsBits } from 'discord.js';
import { getGuildConfig } from './store.js';

const requiredPermissions = [
  ['Manage roles', PermissionFlagsBits.ManageRoles],
  ['Manage channels', PermissionFlagsBits.ManageChannels],
  ['Moderate members', PermissionFlagsBits.ModerateMembers],
  ['Kick members', PermissionFlagsBits.KickMembers],
  ['Ban members', PermissionFlagsBits.BanMembers],
  ['Manage messages', PermissionFlagsBits.ManageMessages],
  ['View audit log', PermissionFlagsBits.ViewAuditLog],
  ['Send messages', PermissionFlagsBits.SendMessages]
];

export function diagnoseGuild(guild) {
  const cfg = getGuildConfig(guild.id);
  const botMember = guild.members.me;
  const checks = [];
  const add = (id, label, ok, detail, href = '') => checks.push({ id, label, ok: Boolean(ok), detail, href });

  add('bot-connected', 'Bot connection', Boolean(botMember), botMember ? 'ModerationDesk is connected to this server.' : 'ModerationDesk is not currently available in this server.');
  for (const [label, permission] of requiredPermissions) {
    const granted = Boolean(botMember?.permissions.has(permission));
    add(`permission-${label.toLowerCase().replaceAll(' ', '-')}`, label, granted, granted ? 'Granted to ModerationDesk.' : `Grant ${label} to ModerationDesk in Server Settings.`, '/dashboard');
  }

  const configuredLogs = Object.values(cfg.logs).filter(Boolean).length;
  add('logging', 'Operational logging', configuredLogs > 0, configuredLogs ? `${configuredLogs} log categor${configuredLogs === 1 ? 'y is' : 'ies are'} routed.` : 'Choose at least one staff-only log channel.', '/logging');
  add('staff-access', 'Staff access', cfg.staffRoleIds.length > 0, cfg.staffRoleIds.length ? `${cfg.staffRoleIds.length} staff role${cfg.staffRoleIds.length === 1 ? ' is' : 's are'} configured.` : 'Choose the roles allowed to use staff commands.', '/staff-access');

  const managedRoleIds = [
    ...cfg.autoroles,
    ...cfg.stickyRoles.roleIds,
    cfg.security.antiRaid.quarantineRoleId,
    cfg.security.joinGate.quarantineRoleId,
    cfg.security.antiNuke.quarantineRoleId,
    cfg.verification.verifiedRoleId,
    cfg.verification.unverifiedRoleId
  ].filter(Boolean);
  const blockedRoles = [...new Set(managedRoleIds)].filter(roleId => {
    const role = guild.roles.cache.get(roleId);
    return !role || !botMember || role.position >= botMember.roles.highest.position;
  });
  add('role-hierarchy', 'Role hierarchy', blockedRoles.length === 0, blockedRoles.length ? `${blockedRoles.length} configured role${blockedRoles.length === 1 ? ' is' : 's are'} at or above the bot role.` : 'All configured managed roles are below ModerationDesk.', '/roles');

  if (cfg.security.joinGate.enabled && cfg.security.joinGate.action === 'quarantine') {
    add('join-gate-role', 'Join Gate quarantine role', Boolean(cfg.security.joinGate.quarantineRoleId), cfg.security.joinGate.quarantineRoleId ? 'A quarantine role is selected.' : 'Choose a quarantine role before enabling Join Gate.', '/anti-raid');
  }
  if (cfg.security.antiNuke.enabled) {
    add('anti-nuke-audit', 'Anti-nuke audit access', Boolean(botMember?.permissions.has(PermissionFlagsBits.ViewAuditLog)), botMember?.permissions.has(PermissionFlagsBits.ViewAuditLog) ? 'Audit-log monitoring is available.' : 'View Audit Log is required for anti-nuke enforcement.', '/anti-nuke');
  }

  const passed = checks.filter(check => check.ok).length;
  return { passed, total: checks.length, score: Math.round((passed / Math.max(1, checks.length)) * 100), checks };
}
