import { EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../store.js';
import { roleHierarchyError } from '../permissions.js';
import { failure, fetchTarget, setMembership, success } from './helpers.js';

export async function handleRoleCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const cfg = getGuildConfig(interaction.guildId);

  if (subcommand === 'add' || subcommand === 'remove') {
    const { user, member } = await fetchTarget(interaction);
    if (!member) return failure(interaction, 'That member is not currently in this server.');
    const role = interaction.options.getRole('role', true);
    const hierarchyError = roleHierarchyError(interaction.guild, interaction.member, role);
    if (hierarchyError) return failure(interaction, hierarchyError);
    await (subcommand === 'add' ? member.roles.add(role, `Added by ${interaction.user.tag}`) : member.roles.remove(role, `Removed by ${interaction.user.tag}`));
    return success(interaction, `${subcommand === 'add' ? 'Added' : 'Removed'} ${role} ${subcommand === 'add' ? 'to' : 'from'} ${user.tag}.`);
  }

  if (subcommand === 'list') {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('Role automation').addFields(
        { name: 'Autoroles', value: cfg.autoroles.map(id => `<@&${id}>`).join(' ') || 'None' },
        { name: 'Sticky roles', value: `${cfg.stickyRoles.enabled ? 'Enabled' : 'Disabled'}\n${cfg.stickyRoles.roleIds.map(id => `<@&${id}>`).join(' ') || 'No roles selected'}` }
      )],
      ephemeral: true
    });
  }

  if (subcommand === 'sticky-toggle') {
    updateGuildConfig(interaction.guildId, { stickyRoles: { enabled: interaction.options.getBoolean('enabled', true) } });
    return success(interaction, 'Sticky role restoration updated.');
  }

  const role = interaction.options.getRole('role', true);
  const hierarchyError = roleHierarchyError(interaction.guild, interaction.member, role);
  if (hierarchyError) return failure(interaction, hierarchyError);

  if (subcommand.startsWith('autorole-')) {
    const enabled = subcommand.endsWith('add');
    updateGuildConfig(interaction.guildId, { autoroles: setMembership(cfg.autoroles, role.id, enabled) });
    return success(interaction, `${role.name} ${enabled ? 'added to' : 'removed from'} autoroles.`);
  }

  const enabled = subcommand.endsWith('add');
  updateGuildConfig(interaction.guildId, { stickyRoles: { roleIds: setMembership(cfg.stickyRoles.roleIds, role.id, enabled) } });
  return success(interaction, `${role.name} ${enabled ? 'added to' : 'removed from'} sticky roles.`);
}
