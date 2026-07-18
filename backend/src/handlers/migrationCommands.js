import { EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../store.js';
import { requirePlan } from '../premium.js';
import { isSnowflake } from '../utils.js';
import { ensureVerificationPanel } from '../verification.js';
import { failure, success } from './helpers.js';
import { roleHierarchyError } from '../permissions.js';

export async function handleMigrationCommand(interaction) {
  if (!(await requirePlan(interaction, 'enterprise'))) return;
  const subcommand = interaction.options.getSubcommand();
  const cfg = getGuildConfig(interaction.guildId);
  if (subcommand === 'setup') {
    const sourceGuildId = interaction.options.getString('source-server-id', true).trim();
    if (!isSnowflake(sourceGuildId)) return failure(interaction, 'Enter a valid Discord server ID.');
    if (sourceGuildId === interaction.guildId) return failure(interaction, 'The source and destination servers must be different.');
    if (!interaction.client.guilds.cache.has(sourceGuildId)) return failure(interaction, 'ModerationDesk must already be installed in the source server.');
    updateGuildConfig(interaction.guildId, { migration: { enabled: false, sourceGuildId } });
    return success(interaction, 'Source server saved. No members will be moved automatically.');
  }
  if (subcommand === 'role-map') {
    const sourceRoleId = interaction.options.getString('source-role-id', true).trim();
    if (!isSnowflake(sourceRoleId)) return failure(interaction, 'Enter a valid source role ID.');
    const destinationRole = interaction.options.getRole('destination-role', true);
    const hierarchyError = roleHierarchyError(interaction.guild, interaction.member, destinationRole);
    if (hierarchyError) return failure(interaction, hierarchyError);
    const mappings = { ...cfg.migration.roleMappings, [sourceRoleId]: destinationRole.id };
    updateGuildConfig(interaction.guildId, { migration: { roleMappings: mappings } });
    return success(interaction, `Mapped source role ${sourceRoleId} to ${destinationRole}.`);
  }
  if (subcommand === 'role-unmap') {
    const sourceRoleId = interaction.options.getString('source-role-id', true).trim();
    const mappings = { ...cfg.migration.roleMappings };
    delete mappings[sourceRoleId];
    updateGuildConfig(interaction.guildId, { migration: { roleMappings: mappings } });
    return success(interaction, 'Role mapping removed.');
  }
  if (subcommand === 'start') {
    if (!cfg.migration.sourceGuildId) return failure(interaction, 'Run `/migration setup` first.');
    const channelId = interaction.options.getChannel('channel', true).id;
    if (cfg.verification.messageId && cfg.verification.channelId) {
      const oldChannel = interaction.guild.channels.cache.get(cfg.verification.channelId);
      const oldMessage = await oldChannel?.messages.fetch(cfg.verification.messageId).catch(() => null);
      if (oldMessage) await oldMessage.delete().catch(() => {});
    }
    updateGuildConfig(interaction.guildId, { migration: { enabled: true }, verification: { enabled: true, mode: 'oauth', channelId, messageId: '' } });
    await ensureVerificationPanel(interaction.client, interaction.guildId, { force: true });
    return success(interaction, 'Migration campaign started. Members must join independently and authorize Discord OAuth before mapped roles are restored.');
  }
  if (subcommand === 'stop') {
    updateGuildConfig(interaction.guildId, { migration: { enabled: false } });
    return success(interaction, 'Migration campaign stopped. Existing members and restored roles are unchanged.');
  }
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('Migration status').addFields(
    { name: 'Enabled', value: String(cfg.migration.enabled), inline: true },
    { name: 'Source server', value: cfg.migration.sourceGuildId || 'Not configured' },
    { name: 'Role mappings', value: String(Object.keys(cfg.migration.roleMappings).length), inline: true },
    { name: 'Completed verifications', value: String(cfg.stats.migrated), inline: true },
    { name: 'Compliance model', value: 'The member joins the destination independently, authorizes the identify OAuth scope, and then has eligible mapped roles restored.' }
  )], ephemeral: true });
}
