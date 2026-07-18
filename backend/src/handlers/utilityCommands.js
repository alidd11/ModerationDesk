import { EmbedBuilder, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { config } from '../config.js';
import { diagnoseGuild } from '../diagnostics.js';
import { getGuildConfig, setAfk } from '../store.js';
import { discordTimestamp } from '../utils.js';
import { success } from './helpers.js';

export async function handleUtilityCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === 'ping') return success(interaction, `Gateway: ${interaction.client.ws.ping}ms.`);

  if (subcommand === 'serverinfo') {
    const cfg = getGuildConfig(interaction.guildId);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(interaction.guild.name).setThumbnail(interaction.guild.iconURL({ size: 512 })).addFields(
      { name: 'Members', value: String(interaction.guild.memberCount), inline: true },
      { name: 'Owner', value: `<@${interaction.guild.ownerId}>`, inline: true },
      { name: 'Plan', value: cfg.plan.toUpperCase(), inline: true },
      { name: 'Created', value: discordTimestamp(interaction.guild.createdTimestamp, 'D'), inline: true },
      { name: 'Channels', value: String(interaction.guild.channels.cache.size), inline: true },
      { name: 'Roles', value: String(interaction.guild.roles.cache.size), inline: true }
    ).setTimestamp()] });
  }

  if (subcommand === 'userinfo' || subcommand === 'avatar') {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (subcommand === 'avatar') return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`${user.tag} avatar`).setImage(user.displayAvatarURL({ size: 1_024 }))] });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(user.tag).setThumbnail(user.displayAvatarURL({ size: 512 })).addFields(
      { name: 'ID', value: user.id },
      { name: 'Account created', value: discordTimestamp(user.createdTimestamp, 'R') },
      { name: 'Joined server', value: member?.joinedTimestamp ? discordTimestamp(member.joinedTimestamp, 'R') : 'Not currently a member' },
      { name: 'Roles', value: member?.roles.cache.filter(role => role.id !== interaction.guildId).sort((a, b) => b.position - a.position).map(role => role.toString()).join(' ').slice(0, 1_000) || 'None' }
    ).setTimestamp()] });
  }

  if (subcommand === 'roleinfo') {
    const role = interaction.options.getRole('role', true);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(role.color || 0x5865F2).setTitle(role.name).addFields(
      { name: 'ID', value: role.id },
      { name: 'Members', value: String(role.members.size), inline: true },
      { name: 'Position', value: String(role.position), inline: true },
      { name: 'Mentionable', value: String(role.mentionable), inline: true },
      { name: 'Managed', value: String(role.managed), inline: true },
      { name: 'Created', value: discordTimestamp(role.createdTimestamp, 'R') }
    ).setTimestamp()] });
  }

  if (subcommand === 'afk') {
    setAfk(interaction.guildId, interaction.user.id, { reason: interaction.options.getString('reason') || 'AFK' });
    return success(interaction, 'AFK status set. It will be removed when you next send a message.');
  }

  if (subcommand === 'diagnose') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'You need Manage Server to run a ModerationDesk diagnosis.', ephemeral: true });
    const diagnosis = diagnoseGuild(interaction.guild);
    const passed = diagnosis.checks.filter(check => check.ok);
    const attention = diagnosis.checks.filter(check => !check.ok);
    return interaction.reply({ embeds: [new EmbedBuilder()
      .setColor(attention.length ? 0xFEE75C : 0x57F287)
      .setTitle(`ModerationDesk diagnosis: ${diagnosis.score}% ready`)
      .setDescription(attention.length ? 'Address the items below before relying on the affected protection features.' : 'Permissions, role hierarchy and core configuration look ready.')
      .addFields(
        { name: `Ready (${passed.length})`, value: passed.slice(0, 8).map(check => `✓ ${check.label}`).join('\n') || 'None', inline: false },
        ...(attention.length ? [{ name: `Needs attention (${attention.length})`, value: attention.slice(0, 8).map(check => `• ${check.label} — ${check.detail}`).join('\n'), inline: false }] : [])
      )
      .setTimestamp()], ephemeral: true });
  }

  if (subcommand === 'invite') {
    const permissions = new PermissionsBitField([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.ManageNicknames,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ViewAuditLog
    ]).bitfield.toString();
    const url = `https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=${permissions}&scope=bot%20applications.commands`;
    return interaction.reply({ content: url, ephemeral: true });
  }

  if (subcommand === 'dashboard') {
    return interaction.reply({ content: config.publicBaseUrl ? `${config.publicBaseUrl}/dashboard` : 'The dashboard URL has not been configured.', ephemeral: true });
  }

  const links = [config.links.privacy && `Privacy: ${config.links.privacy}`, config.links.terms && `Terms: ${config.links.terms}`, config.links.support && `Support/data requests: ${config.links.support}`].filter(Boolean);
  return interaction.reply({ content: links.length ? links.join('\n') : 'Use `/config export` to export this server’s stored data. Ask the bot operator to configure public privacy and support links.', ephemeral: true });
}
