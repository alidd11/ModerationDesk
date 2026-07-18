import { getCase, listCases, updateCase } from '../store.js';
import { caseEmbed } from '../services/moderationService.js';
import { truncate } from '../utils.js';
import { failure, listEmbed, success } from './helpers.js';

export async function handleCaseCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === 'view') {
    const row = getCase(interaction.guildId, interaction.options.getInteger('id', true));
    return row ? interaction.reply({ embeds: [caseEmbed(row)], ephemeral: true }) : failure(interaction, 'Case not found.');
  }
  if (subcommand === 'history') {
    const user = interaction.options.getUser('user', true);
    const rows = listCases(interaction.guildId, { userId: user.id, limit: 25 });
    return interaction.reply({ embeds: [listEmbed(`Case history: ${user.tag}`, rows.map(row => `**#${row.id}** · ${row.action} · ${row.active === false ? 'VOIDED · ' : ''}${truncate(row.reason, 220)}`), 'No cases found.')], ephemeral: true });
  }
  const id = interaction.options.getInteger('id', true);
  const row = getCase(interaction.guildId, id);
  if (!row) return failure(interaction, 'Case not found.');
  if (subcommand === 'reason') {
    updateCase(interaction.guildId, id, { reason: interaction.options.getString('reason', true), reasonUpdatedBy: interaction.user.id });
    return success(interaction, `Updated the reason for case #${id}.`);
  }
  updateCase(interaction.guildId, id, { active: false, voidReason: interaction.options.getString('reason', true), voidedBy: interaction.user.id });
  return success(interaction, `Voided case #${id}. The record remains in the audit trail.`);
}
