import { DANGER_COLOUR, sendLog, WARNING_COLOUR } from './services/logService.js';
import { truncate } from './utils.js';

function roleDiff(before, after) {
  const added = after.roles.cache.filter(role => !before.roles.cache.has(role.id) && role.id !== after.guild.id);
  const removed = before.roles.cache.filter(role => !after.roles.cache.has(role.id) && role.id !== after.guild.id);
  return { added, removed };
}

export function attachAuditLogging(client) {
  client.on('guildMemberAdd', member => sendLog(member.guild, 'member', {
    title: 'Member joined',
    fields: [
      { name: 'User', value: `${member.user.tag} (${member.id})` },
      { name: 'Account created', value: `<t:${Math.floor(member.user.createdTimestamp / 1_000)}:R>` },
      { name: 'Member count', value: String(member.guild.memberCount), inline: true }
    ]
  }));

  client.on('guildMemberRemove', member => sendLog(member.guild, 'member', {
    title: 'Member left or was removed',
    description: `${member.user.tag} (${member.id})`,
    colour: WARNING_COLOUR
  }));

  client.on('guildMemberUpdate', (before, after) => {
    const changes = [];
    if (before.nickname !== after.nickname) changes.push({ name: 'Nickname', value: `${before.nickname || before.user.username} → ${after.nickname || after.user.username}` });
    const roles = roleDiff(before, after);
    if (roles.added.size) changes.push({ name: 'Roles added', value: roles.added.map(role => role.toString()).join(' ').slice(0, 1_024) });
    if (roles.removed.size) changes.push({ name: 'Roles removed', value: roles.removed.map(role => role.toString()).join(' ').slice(0, 1_024) });
    if (!changes.length) return;
    sendLog(after.guild, 'member', { title: 'Member updated', description: `${after.user.tag} (${after.id})`, fields: changes });
  });

  client.on('guildBanAdd', ban => sendLog(ban.guild, 'moderation', { title: 'Member banned', description: `${ban.user.tag} (${ban.user.id})`, colour: DANGER_COLOUR }));
  client.on('guildBanRemove', ban => sendLog(ban.guild, 'moderation', { title: 'Member unbanned', description: `${ban.user.tag} (${ban.user.id})` }));

  client.on('messageDelete', message => {
    if (!message.guild || message.author?.bot) return;
    sendLog(message.guild, 'messages', {
      title: 'Message deleted',
      fields: [
        { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown' },
        { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
        { name: 'Content', value: truncate(message.content || 'Content was not cached.', 1_024) }
      ],
      colour: WARNING_COLOUR
    });
  });

  client.on('messageDeleteBulk', messages => {
    const first = messages.first();
    if (!first?.guild) return;
    sendLog(first.guild, 'messages', { title: 'Messages bulk-deleted', description: `${messages.size} messages removed from <#${first.channelId}>.`, colour: WARNING_COLOUR });
  });

  client.on('messageUpdate', (before, after) => {
    if (!after.guild || after.author?.bot || before.content === after.content) return;
    sendLog(after.guild, 'messages', {
      title: 'Message edited',
      fields: [
        { name: 'Author', value: after.author ? `${after.author.tag} (${after.author.id})` : 'Unknown' },
        { name: 'Channel', value: `<#${after.channelId}>`, inline: true },
        { name: 'Before', value: truncate(before.content || 'Content was not cached.', 1_024) },
        { name: 'After', value: truncate(after.content || 'Empty', 1_024) },
        { name: 'Jump', value: after.url || 'Unavailable' }
      ]
    });
  });

  client.on('channelCreate', channel => sendLog(channel.guild, 'server', { title: 'Channel created', description: `${channel.name} (${channel.id})` }));
  client.on('channelDelete', channel => sendLog(channel.guild, 'server', { title: 'Channel deleted', description: `${channel.name} (${channel.id})`, colour: DANGER_COLOUR }));
  client.on('channelUpdate', (before, after) => {
    const changes = [];
    if (before.name !== after.name) changes.push({ name: 'Name', value: `${before.name} → ${after.name}` });
    if ('topic' in before && before.topic !== after.topic) changes.push({ name: 'Topic', value: `${truncate(before.topic || 'None', 450)} → ${truncate(after.topic || 'None', 450)}` });
    if (changes.length) sendLog(after.guild, 'server', { title: 'Channel updated', description: `${after.name} (${after.id})`, fields: changes });
  });

  client.on('roleCreate', role => sendLog(role.guild, 'server', { title: 'Role created', description: `${role.name} (${role.id})` }));
  client.on('roleDelete', role => sendLog(role.guild, 'server', { title: 'Role deleted', description: `${role.name} (${role.id})`, colour: DANGER_COLOUR }));
  client.on('roleUpdate', (before, after) => {
    const changes = [];
    if (before.name !== after.name) changes.push({ name: 'Name', value: `${before.name} → ${after.name}` });
    if (before.permissions.bitfield !== after.permissions.bitfield) changes.push({ name: 'Permissions', value: 'Role permissions changed.' });
    if (before.color !== after.color) changes.push({ name: 'Colour', value: `${before.hexColor} → ${after.hexColor}` });
    if (changes.length) sendLog(after.guild, 'server', { title: 'Role updated', description: `${after.name} (${after.id})`, fields: changes });
  });
}
