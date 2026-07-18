import { PermissionFlagsBits } from 'discord.js';
import { getGuildConfig } from './store.js';

export function hasConfiguredRole(member, roleIds = []) {
  return roleIds.some(id => member.roles.cache.has(id));
}

export function isStaff(member) {
  if (!member) return false;
  if (member.id === member.guild.ownerId) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true;
  return hasConfiguredRole(member, getGuildConfig(member.guild.id).staffRoleIds);
}

export function isGuildAdmin(member) {
  if (!member) return false;
  if (member.id === member.guild.ownerId) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return hasConfiguredRole(member, getGuildConfig(member.guild.id).adminRoleIds);
}

export function moderationHierarchyError(interaction, targetMember) {
  if (!targetMember) return 'That member is not currently in this server.';
  if (targetMember.id === interaction.guild.ownerId) return 'The server owner cannot be moderated.';
  if (targetMember.id === interaction.user.id) return 'You cannot use that action on yourself.';
  const botMember = interaction.guild.members.me;
  if (!botMember || botMember.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) return 'Move the ModerationDesk role above the target member’s highest role.';
  if (interaction.user.id !== interaction.guild.ownerId && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
    return 'Your highest role must be above the target member’s highest role.';
  }
  return '';
}

export function roleHierarchyError(guild, actor, role) {
  const botMember = guild.members.me;
  if (!botMember || role.position >= botMember.roles.highest.position) return 'Move the ModerationDesk role above that role.';
  if (actor.id !== guild.ownerId && !actor.permissions.has(PermissionFlagsBits.Administrator) && role.position >= actor.roles.highest.position) return 'Your highest role must be above that role.';
  if (role.managed) return 'Managed integration roles cannot be assigned manually.';
  return '';
}
