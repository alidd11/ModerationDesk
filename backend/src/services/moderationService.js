import { EmbedBuilder } from 'discord.js';
import { addTempAction, addWarning, getGuildConfig, listWarnings, recordAuditEvent, recordCase } from '../store.js';
import { DANGER_COLOUR, sendLog, userLabel, WARNING_COLOUR } from './logService.js';
import { discordTimestamp, formatDuration } from '../utils.js';

export async function createModerationRecord({ guild, user, moderator, action, reason, durationMs = 0, metadata = {} }) {
  const row = recordCase({
    guildId: guild.id,
    userId: user.id,
    moderatorId: moderator.id,
    action,
    reason,
    durationMs,
    metadata
  });
  recordAuditEvent({
    guildId: guild.id,
    category: 'moderation',
    action: `case_${action}`,
    actorId: moderator.id,
    actorName: moderator.tag || moderator.username || 'ModerationDesk',
    summary: `${action} recorded for ${user.tag || user.username || user.id}: ${reason || 'No reason supplied'}`
  });

  await sendLog(guild, 'moderation', {
    title: `Case #${row.id}: ${action}`,
    eventKey: ({ warn: 'member_warned', kick: 'member_kicked', ban: 'member_banned', softban: 'member_softbanned', timeout: 'member_timed_out', tempban: 'member_tempbanned', tempmute: 'member_tempmuted', unban: 'member_unbanned', unmute: 'member_unmuted' }[action] || 'moderation_case'),
    colour: action === 'warn' ? WARNING_COLOUR : DANGER_COLOUR,
    fields: [
      { name: 'User', value: userLabel(user), inline: true },
      { name: 'Moderator', value: userLabel(moderator), inline: true },
      { name: 'Reason', value: reason || 'No reason supplied' },
      ...(durationMs ? [{ name: 'Duration', value: formatDuration(durationMs), inline: true }] : [])
    ]
  });
  return row;
}

export async function sendModerationDm(user, { guild, action, reason, durationMs = 0, caseId }) {
  const embed = new EmbedBuilder()
    .setColor(DANGER_COLOUR)
    .setTitle(`Moderation action in ${guild.name}`)
    .addFields(
      { name: 'Action', value: action, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true },
      { name: 'Reason', value: reason || 'No reason supplied' },
      ...(durationMs ? [{ name: 'Duration', value: formatDuration(durationMs), inline: true }] : [])
    )
    .setFooter({ text: 'Keep this case number if you need to appeal.' })
    .setTimestamp();
  return user.send({ embeds: [embed] }).then(() => true).catch(() => false);
}

export function registerWarning({ guildId, userId, moderatorId, reason, caseId }) {
  return addWarning({ guildId, userId, moderatorId, reason, caseId });
}

export async function applyWarningEscalation({ guild, user, member, moderator }) {
  const escalation = getGuildConfig(guild.id).moderation.escalation;
  if (!escalation?.enabled || !member) return null;
  const cutoff = Date.now() - escalation.windowDays * 86_400_000;
  const warningCount = listWarnings(guild.id, user.id).filter(warning => new Date(warning.createdAt).getTime() >= cutoff).length;
  const step = warningCount >= escalation.finalThreshold
    ? { action: escalation.finalAction, threshold: escalation.finalThreshold, durationMinutes: escalation.firstDurationMinutes }
    : warningCount >= escalation.firstThreshold
      ? { action: escalation.firstAction, threshold: escalation.firstThreshold, durationMinutes: escalation.firstDurationMinutes }
      : null;
  if (!step) return null;

  const reason = `Warning escalation: ${warningCount} active warnings within ${escalation.windowDays} days.`;
  let durationMs = 0;
  if (step.action === 'timeout') {
    if (!member.moderatable) return { warningCount, blocked: true, reason: 'ModerationDesk cannot timeout this member because of role hierarchy or permissions.' };
    durationMs = Math.min(Math.max(1, step.durationMinutes) * 60_000, 2_419_200_000);
    await member.timeout(durationMs, reason);
  } else if (step.action === 'kick') {
    if (!member.kickable) return { warningCount, blocked: true, reason: 'ModerationDesk cannot kick this member because of role hierarchy or permissions.' };
    await member.kick(reason);
  } else if (step.action === 'ban') {
    if (!member.bannable) return { warningCount, blocked: true, reason: 'ModerationDesk cannot ban this member because of role hierarchy or permissions.' };
    await member.ban({ reason });
  } else return null;

  const row = await createModerationRecord({
    guild,
    user,
    moderator,
    action: `warning-escalation-${step.action}`,
    reason,
    durationMs,
    metadata: { warningCount, threshold: step.threshold, windowDays: escalation.windowDays }
  });
  const dmDelivered = await sendModerationDm(user, { guild, action: `warning escalation: ${step.action}`, reason, durationMs, caseId: row.id });
  return { warningCount, action: step.action, row, dmDelivered };
}

export function scheduleUnban({ guildId, userId, executeAt, caseId }) {
  return addTempAction({ guildId, userId, type: 'unban', executeAt, caseId });
}

export function caseEmbed(row) {
  const embed = new EmbedBuilder()
    .setColor(row.active === false ? 0x95A5A6 : 0x5865F2)
    .setTitle(`Case #${row.id}: ${row.action}`)
    .addFields(
      { name: 'User', value: `<@${row.userId}> (${row.userId})` },
      { name: 'Moderator', value: `<@${row.moderatorId}> (${row.moderatorId})` },
      { name: 'Reason', value: row.reason || 'No reason supplied' },
      { name: 'Created', value: discordTimestamp(new Date(row.createdAt), 'F') },
      { name: 'Status', value: row.active === false ? `Voided${row.voidReason ? `: ${row.voidReason}` : ''}` : 'Active' }
    );
  if (row.durationMs) embed.addFields({ name: 'Duration', value: formatDuration(row.durationMs), inline: true });
  return embed;
}
