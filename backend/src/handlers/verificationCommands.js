import { EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../store.js';
import { requirePlan } from '../premium.js';
import { ensureVerificationPanel } from '../verification.js';
import { roleHierarchyError } from '../permissions.js';
import { failure, success } from './helpers.js';

export async function handleVerificationCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const cfg = getGuildConfig(interaction.guildId);
  if (subcommand === 'status') {
    const v = cfg.verification;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('Verification status').addFields(
      { name: 'Enabled', value: String(v.enabled), inline: true },
      { name: 'Mode', value: v.mode, inline: true },
      { name: 'Channel', value: v.channelId ? `<#${v.channelId}>` : 'Not set' },
      { name: 'Verified role', value: v.verifiedRoleId ? `<@&${v.verifiedRoleId}>` : 'Not set', inline: true },
      { name: 'Unverified role', value: v.unverifiedRoleId ? `<@&${v.unverifiedRoleId}>` : 'Not set', inline: true }
    )], ephemeral: true });
  }
  if (subcommand === 'disable') {
    if (cfg.verification.messageId && cfg.verification.channelId) {
    const oldChannel = interaction.guild.channels.cache.get(cfg.verification.channelId);
    const oldMessage = await oldChannel?.messages.fetch(cfg.verification.messageId).catch(() => null);
    if (oldMessage) await oldMessage.delete().catch(() => {});
  }
  updateGuildConfig(interaction.guildId, { verification: { enabled: false } });
    return success(interaction, 'Verification disabled. Existing roles are unchanged.');
  }
  if (subcommand === 'refresh') {
    await ensureVerificationPanel(interaction.client, interaction.guildId, { force: true });
    return success(interaction, 'Verification panel reposted.');
  }

  const mode = interaction.options.getString('mode', true);
  if (mode === 'oauth' && !(await requirePlan(interaction, 'pro'))) return;
  const verifiedRole = interaction.options.getRole('verified-role', true);
  const unverifiedRole = interaction.options.getRole('unverified-role');
  const verifiedError = roleHierarchyError(interaction.guild, interaction.member, verifiedRole);
  if (verifiedError) return failure(interaction, verifiedError);
  if (unverifiedRole) {
    const unverifiedError = roleHierarchyError(interaction.guild, interaction.member, unverifiedRole);
    if (unverifiedError) return failure(interaction, unverifiedError);
  }
  updateGuildConfig(interaction.guildId, { verification: {
    enabled: true,
    mode,
    channelId: interaction.options.getChannel('channel', true).id,
    verifiedRoleId: verifiedRole.id,
    unverifiedRoleId: unverifiedRole?.id || '',
    message: interaction.options.getString('message') || cfg.verification.message,
    messageId: ''
  } });
  await ensureVerificationPanel(interaction.client, interaction.guildId, { force: true });
  return success(interaction, 'Verification configured and the panel was posted.');
}
