import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { getAppeal, getGuildConfig, listAppeals, resolveAppeal } from '../store.js';
import { discordTimestamp, truncate } from '../utils.js';
import { failure, listEmbed, success } from './helpers.js';

function appealEmbed(appeal) {
  return new EmbedBuilder().setColor(appeal.status === 'open' ? 0xFEE75C : appeal.status === 'accepted' ? 0x57F287 : 0xED4245).setTitle(`Appeal ${appeal.id}`).addFields(
    { name: 'User', value: `<@${appeal.userId}> (${appeal.userId})` },
    { name: 'Case', value: appeal.caseId ? `#${appeal.caseId}` : 'Not supplied', inline: true },
    { name: 'Status', value: appeal.status, inline: true },
    { name: 'Submitted', value: discordTimestamp(new Date(appeal.createdAt), 'F') },
    { name: 'Appeal', value: truncate(appeal.reason, 1_024) },
    ...(appeal.response ? [{ name: 'Staff response', value: truncate(appeal.response, 1_024) }] : [])
  ).setTimestamp();
}

export async function handleAppealCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === 'list') {
    const status = interaction.options.getString('status') || '';
    const rows = listAppeals(interaction.guildId, status);
    return interaction.reply({ embeds: [listEmbed(`Appeals${status ? `: ${status}` : ''}`, rows.map(row => `**${row.id}** · <@${row.userId}> · ${row.status} · Case ${row.caseId ? `#${row.caseId}` : '—'}`), 'No matching appeals.')], ephemeral: true });
  }

  const id = interaction.options.getString('id', true);
  const appeal = getAppeal(interaction.guildId, id);
  if (!appeal) return failure(interaction, 'Appeal not found.');
  if (subcommand === 'view') return interaction.reply({ embeds: [appealEmbed(appeal)], ephemeral: true });

  const decision = interaction.options.getString('decision', true);
  const response = interaction.options.getString('response', true);
  const updated = resolveAppeal(interaction.guildId, id, { status: decision, response, resolvedBy: interaction.user.id });
  const user = await interaction.client.users.fetch(updated.userId).catch(() => null);
  if (user) await user.send({ embeds: [appealEmbed(updated).setTitle(`Your appeal in ${interaction.guild.name}`)] }).catch(() => {});
  return success(interaction, `Appeal ${id} marked ${decision}.`);
}

export function appealsPublicUrl(guildId) {
  const cfg = getGuildConfig(guildId);
  return cfg.appeals.enabled && config.publicBaseUrl ? `${config.publicBaseUrl}/appeal/${guildId}` : '';
}
