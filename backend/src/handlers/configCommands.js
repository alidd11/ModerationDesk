import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { exportGuildData, getGuildConfig, updateGuildConfig } from '../store.js';
import { setMembership, success } from './helpers.js';

export async function handleConfigCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const cfg = getGuildConfig(interaction.guildId);

  if (subcommand === 'logs') {
    const type = interaction.options.getString('type', true);
    const channelId = interaction.options.getChannel('channel', true).id;
    const patch = type === 'all'
      ? { member: channelId, moderation: channelId, messages: channelId, server: channelId, security: channelId, appeals: channelId }
      : { [type]: channelId };
    updateGuildConfig(interaction.guildId, { logs: patch });
    return success(interaction, `${type === 'all' ? 'All log categories' : `${type} logs`} now use <#${channelId}>.`);
  }

  if (subcommand === 'welcome' || subcommand === 'goodbye') {
    const current = cfg[subcommand];
    updateGuildConfig(interaction.guildId, { [subcommand]: {
      enabled: interaction.options.getBoolean('enabled', true),
      channelId: interaction.options.getChannel('channel')?.id || current.channelId,
      message: interaction.options.getString('message') || current.message
    } });
    return success(interaction, `${subcommand[0].toUpperCase()}${subcommand.slice(1)} settings updated.`);
  }

  if (subcommand === 'suggestions' || subcommand === 'appeals') {
    const current = cfg[subcommand];
    updateGuildConfig(interaction.guildId, { [subcommand]: {
      enabled: interaction.options.getBoolean('enabled', true),
      channelId: interaction.options.getChannel('channel')?.id || current.channelId
    } });
    const extra = subcommand === 'appeals' && config.publicBaseUrl ? ` Public form: ${config.publicBaseUrl}/appeal/${interaction.guildId}` : '';
    return success(interaction, `${subcommand[0].toUpperCase()}${subcommand.slice(1)} settings updated.${extra}`);
  }

  if (subcommand === 'staff-role' || subcommand === 'admin-role') {
    const role = interaction.options.getRole('role', true);
    const enabled = interaction.options.getBoolean('enabled', true);
    const key = subcommand === 'staff-role' ? 'staffRoleIds' : 'adminRoleIds';
    updateGuildConfig(interaction.guildId, { [key]: setMembership(cfg[key], role.id, enabled) });
    return success(interaction, `${role.name} ${enabled ? 'authorised' : 'removed'} as a ModerationDesk ${subcommand === 'staff-role' ? 'staff' : 'admin'} role.`);
  }

  if (subcommand === 'export') {
    const data = JSON.stringify(exportGuildData(interaction.guildId), null, 2);
    const file = new AttachmentBuilder(Buffer.from(data), { name: `moderationdesk-${interaction.guildId}-export.json` });
    return interaction.reply({ content: 'Server data export generated. This may contain moderation records and should be stored securely.', files: [file], ephemeral: true });
  }

  return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('ModerationDesk configuration').addFields(
    { name: 'Plan', value: cfg.plan.toUpperCase(), inline: true },
    { name: 'AutoMod', value: cfg.automod.enabled ? `Enabled (${cfg.automod.action})` : 'Disabled', inline: true },
    { name: 'Verification', value: cfg.verification.enabled ? `${cfg.verification.mode} in <#${cfg.verification.channelId}>` : 'Disabled', inline: true },
    { name: 'Anti-raid', value: cfg.security.antiRaid.enabled ? 'Enabled' : 'Disabled', inline: true },
    { name: 'Anti-nuke', value: cfg.security.antiNuke.enabled ? 'Enabled' : 'Disabled', inline: true },
    { name: 'Appeals', value: cfg.appeals.enabled ? `${config.publicBaseUrl || 'Dashboard URL missing'}/appeal/${interaction.guildId}` : 'Disabled' },
    { name: 'Staff roles', value: cfg.staffRoleIds.map(id => `<@&${id}>`).join(' ') || 'Discord permission defaults' },
    { name: 'Admin roles', value: cfg.adminRoleIds.map(id => `<@&${id}>`).join(' ') || 'Discord permission defaults' }
  ).setTimestamp()], ephemeral: true });
}
