import { EmbedBuilder } from 'discord.js';
import { addNote, clearWarning, listNotes, listWarnings, updateCase } from '../store.js';
import { moderationHierarchyError } from '../permissions.js';
import { isSnowflake, parseDuration, truncate } from '../utils.js';
import { createModerationRecord, registerWarning, scheduleUnban, sendModerationDm } from '../services/moderationService.js';
import { failure, fetchTarget, listEmbed, success } from './helpers.js';

export async function handleModerationCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'unban') {
    const userId = interaction.options.getString('user-id', true).trim();
    if (!isSnowflake(userId)) return failure(interaction, 'Enter a valid Discord user ID.');
    const reason = interaction.options.getString('reason') || `Unbanned by ${interaction.user.tag}`;
    const user = await interaction.client.users.fetch(userId).catch(() => ({ id: userId, tag: userId, username: userId }));
    await interaction.guild.members.unban(userId, reason).catch(error => { throw new Error(`Unable to unban that user: ${error.message}`); });
    const row = await createModerationRecord({ guild: interaction.guild, user, moderator: interaction.user, action: 'unban', reason });
    return success(interaction, `Unbanned ${user.tag || userId}. Case #${row.id}.`);
  }

  const { user, member } = await fetchTarget(interaction);

  if (subcommand === 'warnings') {
    const warnings = listWarnings(interaction.guildId, user.id);
    return interaction.reply({
      embeds: [listEmbed(`Active warnings: ${user.tag}`, warnings.map(row => `**${row.id}** · Case #${row.caseId || '—'} · ${truncate(row.reason, 300)} · <@${row.moderatorId}>`), 'No active warnings.')],
      ephemeral: true
    });
  }

  if (subcommand === 'clear-warning') {
    const warningId = interaction.options.getString('warning-id') || '';
    const count = clearWarning(interaction.guildId, user.id, warningId);
    return count ? success(interaction, `Cleared ${count} warning${count === 1 ? '' : 's'} for ${user.tag}.`) : failure(interaction, 'No matching active warning was found.');
  }

  if (subcommand === 'notes') {
    const notes = listNotes(interaction.guildId, user.id);
    return interaction.reply({
      embeds: [listEmbed(`Moderator notes: ${user.tag}`, notes.map(row => `**${row.id}** · ${truncate(row.note, 500)} · <@${row.moderatorId}>`), 'No moderator notes.')],
      ephemeral: true
    });
  }

  if (subcommand === 'note') {
    const note = interaction.options.getString('note', true);
    const row = addNote({ guildId: interaction.guildId, userId: user.id, moderatorId: interaction.user.id, note });
    return success(interaction, `Private note ${row.id} added for ${user.tag}.`);
  }

  const hierarchyError = moderationHierarchyError(interaction, member);
  if (hierarchyError) return failure(interaction, hierarchyError);

  const reason = interaction.options.getString('reason') || `Actioned by ${interaction.user.tag}`;
  let action = subcommand;
  let durationMs = 0;
  let dmDelivered = false;
  let row;

  try {
  if (subcommand === 'warn') {
    row = await createModerationRecord({ guild: interaction.guild, user, moderator: interaction.user, action, reason });
    registerWarning({ guildId: interaction.guildId, userId: user.id, moderatorId: interaction.user.id, reason, caseId: row.id });
    dmDelivered = await sendModerationDm(user, { guild: interaction.guild, action, reason, caseId: row.id });
  } else if (subcommand === 'kick') {
    row = await createModerationRecord({ guild: interaction.guild, user, moderator: interaction.user, action, reason });
    dmDelivered = await sendModerationDm(user, { guild: interaction.guild, action, reason, caseId: row.id });
    await member.kick(reason);
  } else if (subcommand === 'ban') {
    const deleteDays = interaction.options.getInteger('delete-days') ?? 0;
    row = await createModerationRecord({ guild: interaction.guild, user, moderator: interaction.user, action, reason, metadata: { deleteDays } });
    dmDelivered = await sendModerationDm(user, { guild: interaction.guild, action, reason, caseId: row.id });
    await member.ban({ deleteMessageSeconds: deleteDays * 86_400, reason });
  } else if (subcommand === 'softban') {
    row = await createModerationRecord({ guild: interaction.guild, user, moderator: interaction.user, action, reason });
    dmDelivered = await sendModerationDm(user, { guild: interaction.guild, action, reason, caseId: row.id });
    await member.ban({ deleteMessageSeconds: 604_800, reason });
    await interaction.guild.members.unban(user.id, 'ModerationDesk softban completed');
  } else if (subcommand === 'tempban') {
    durationMs = parseDuration(interaction.options.getString('duration'));
    if (!durationMs) return failure(interaction, 'Use a duration from 1s to 4w, such as 30m, 2h or 7d.');
    row = await createModerationRecord({ guild: interaction.guild, user, moderator: interaction.user, action, reason, durationMs });
    dmDelivered = await sendModerationDm(user, { guild: interaction.guild, action, reason, durationMs, caseId: row.id });
    await member.ban({ reason });
    scheduleUnban({ guildId: interaction.guildId, userId: user.id, executeAt: Date.now() + durationMs, caseId: row.id });
  } else if (subcommand === 'timeout') {
    durationMs = parseDuration(interaction.options.getString('duration'));
    if (!durationMs) return failure(interaction, 'Use a duration from 1s to 4w, such as 30m, 2h or 7d.');
    row = await createModerationRecord({ guild: interaction.guild, user, moderator: interaction.user, action, reason, durationMs });
    dmDelivered = await sendModerationDm(user, { guild: interaction.guild, action, reason, durationMs, caseId: row.id });
    await member.timeout(durationMs, reason);
  } else if (subcommand === 'untimeout') {
    row = await createModerationRecord({ guild: interaction.guild, user, moderator: interaction.user, action, reason });
    await member.timeout(null, reason);
  } else if (subcommand === 'nickname') {
    const nickname = interaction.options.getString('nickname');
    row = await createModerationRecord({ guild: interaction.guild, user, moderator: interaction.user, action, reason, metadata: { nickname: nickname || null } });
    await member.setNickname(nickname || null, reason);
  } else {
    return failure(interaction, 'Unknown moderation action.');
  }
  } catch (error) {
    if (row) updateCase(interaction.guildId, row.id, { active: false, voidReason: `Action failed: ${error.message}`, failedAt: new Date().toISOString() });
    throw error;
  }

  const dmNote = ['warn', 'kick', 'ban', 'softban', 'tempban', 'timeout'].includes(subcommand) ? ` DM ${dmDelivered ? 'delivered' : 'could not be delivered'}.` : '';
  return success(interaction, `${action} completed for ${user.tag}. Case #${row.id}.${dmNote}`);
}
