import { EmbedBuilder } from 'discord.js';
import { clearAfk, completeGiveaway, completeTempAction, dueGiveaways, dueTempActions, getAfk, getGuildConfig, getStarboardEntry, getStickyRoles, setStarboardEntry, setStickyRoles, deleteStarboardEntry } from './store.js';
import { setLockdown } from './security.js';
import { logger } from './logger.js';
import { selectGiveawayWinners } from './handlers/communityCommands.js';
import { truncate } from './utils.js';

function renderTemplate(template, memberOrUser, guild) {
  const user = memberOrUser.user || memberOrUser;
  return String(template || '')
    .replaceAll('{user}', `<@${user.id}>`)
    .replaceAll('{username}', user.username)
    .replaceAll('{server}', guild.name)
    .replaceAll('{count}', String(guild.memberCount));
}

async function updateStarboard(reaction) {
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const message = reaction.message;
  if (!message.guild || message.author?.bot) return;
  const cfg = getGuildConfig(message.guild.id).starboard;
  if (!cfg.enabled || !cfg.channelId || reaction.emoji.name !== cfg.emoji) return;
  const channel = message.guild.channels.cache.get(cfg.channelId);
  if (!channel?.isTextBased() || channel.id === message.channelId) return;
  const entry = getStarboardEntry(message.guild.id, message.id);
  if (reaction.count < cfg.threshold) {
    if (entry?.starboardMessageId) {
      const starMessage = await channel.messages.fetch(entry.starboardMessageId).catch(() => null);
      if (starMessage) await starMessage.delete().catch(() => {});
      deleteStarboardEntry(message.guild.id, message.id);
    }
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
    .setDescription(truncate(message.content || 'No text content.', 4_000))
    .addFields({ name: 'Source', value: `[Jump to message](${message.url})` })
    .setTimestamp(message.createdAt);
  const attachment = message.attachments.first();
  if (attachment?.contentType?.startsWith('image/')) embed.setImage(attachment.url);
  const payload = { content: `${cfg.emoji} **${reaction.count}** <#${message.channelId}>`, embeds: [embed], allowedMentions: { parse: [] } };
  if (entry?.starboardMessageId) {
    const starMessage = await channel.messages.fetch(entry.starboardMessageId).catch(() => null);
    if (starMessage) return starMessage.edit(payload);
  }
  const starMessage = await channel.send(payload);
  setStarboardEntry(message.guild.id, message.id, { starboardMessageId: starMessage.id, channelId: channel.id });
}

export function attachRuntime(client) {
  client.on('guildMemberAdd', async member => {
    if (member.user.bot) return;
    const cfg = getGuildConfig(member.guild.id);
    for (const roleId of cfg.autoroles) await member.roles.add(roleId, 'ModerationDesk autorole').catch(() => {});
    if (cfg.stickyRoles.enabled) {
      const stored = getStickyRoles(member.guild.id, member.id);
      for (const roleId of stored.filter(id => cfg.stickyRoles.roleIds.includes(id))) await member.roles.add(roleId, 'ModerationDesk sticky role restoration').catch(() => {});
    }
    if (cfg.welcome.enabled && cfg.welcome.channelId) {
      const channel = member.guild.channels.cache.get(cfg.welcome.channelId);
      if (channel?.isTextBased()) await channel.send({ content: renderTemplate(cfg.welcome.message, member, member.guild), allowedMentions: { users: [member.id] } }).catch(() => {});
    }
  });

  client.on('guildMemberRemove', async member => {
    const cfg = getGuildConfig(member.guild.id);
    if (cfg.stickyRoles.enabled) {
      const roleIds = member.roles.cache.filter(role => cfg.stickyRoles.roleIds.includes(role.id)).map(role => role.id);
      setStickyRoles(member.guild.id, member.id, roleIds);
    }
    if (cfg.goodbye.enabled && cfg.goodbye.channelId) {
      const channel = member.guild.channels.cache.get(cfg.goodbye.channelId);
      if (channel?.isTextBased()) await channel.send({ content: renderTemplate(cfg.goodbye.message, member, member.guild), allowedMentions: { parse: [] } }).catch(() => {});
    }
  });

  client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const own = clearAfk(message.guild.id, message.author.id);
    if (own) await message.reply({ content: 'Welcome back. Your AFK status has been removed.', allowedMentions: { repliedUser: false } }).catch(() => {});
    const notified = new Set();
    for (const user of message.mentions.users.values()) {
      if (user.id === message.author.id || notified.has(user.id)) continue;
      notified.add(user.id);
      const afk = getAfk(message.guild.id, user.id);
      if (afk) await message.reply({ content: `${user.tag} is AFK: ${afk.reason}`, allowedMentions: { repliedUser: false, users: [] } }).catch(() => {});
    }
  });

  client.on('messageReactionAdd', reaction => updateStarboard(reaction).catch(error => logger.warn('Starboard update failed', { error: error.message })));
  client.on('messageReactionRemove', reaction => updateStarboard(reaction).catch(error => logger.warn('Starboard update failed', { error: error.message })));

  const timer = setInterval(async () => {
    for (const action of dueTempActions()) {
      try {
        const guild = client.guilds.cache.get(action.guildId);
        if (!guild) throw new Error('Guild unavailable');
        if (action.type === 'unban') await guild.members.unban(action.userId, 'ModerationDesk temporary ban expired').catch(error => { if (error.code !== 10026) throw error; });
        if (action.type === 'unlockdown') await setLockdown(guild, false, action.reason || 'Scheduled unlock');
        completeTempAction(action.id);
      } catch (error) {
        logger.warn('Temporary action failed', { actionId: action.id, error: error.message });
        completeTempAction(action.id, error.message);
      }
    }

    for (const giveaway of dueGiveaways()) {
      try {
        const guild = client.guilds.cache.get(giveaway.guildId);
        const channel = guild?.channels.cache.get(giveaway.channelId);
        const message = await channel?.messages.fetch(giveaway.messageId).catch(() => null);
        if (message) {
          const winners = await selectGiveawayWinners(message, giveaway.winners);
          await channel.send({ content: winners.length ? `🎉 Congratulations ${winners.map(user => `<@${user.id}>`).join(', ')}! You won **${giveaway.prize}**.` : `No valid entries for **${giveaway.prize}**.`, allowedMentions: { users: winners.map(user => user.id) } });
        }
        completeGiveaway(giveaway.id);
      } catch (error) {
        logger.warn('Giveaway completion failed', { giveawayId: giveaway.id, error: error.message });
      }
    }
  }, 30_000);
  timer.unref();
}
