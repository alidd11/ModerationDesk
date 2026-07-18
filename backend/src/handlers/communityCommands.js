import { EmbedBuilder } from 'discord.js';
import { createGiveaway, getGuildConfig, listGiveaways, updateGuildConfig } from '../store.js';
import { parseDuration } from '../utils.js';
import { failure, success } from './helpers.js';

const pollEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

async function selectGiveawayWinners(message, count) {
  const reaction = message.reactions.cache.get('🎉') || await message.reactions.fetch().then(cache => cache.get('🎉')).catch(() => null);
  const users = reaction ? await reaction.users.fetch() : null;
  const entries = users ? [...users.values()].filter(user => !user.bot) : [];
  const winners = [];
  while (entries.length && winners.length < count) winners.push(entries.splice(Math.floor(Math.random() * entries.length), 1)[0]);
  return winners;
}

export async function handleCommunityCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'announce') {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    if (!channel?.isTextBased()) return failure(interaction, 'Choose a text channel.');
    await channel.send({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('Announcement').setDescription(interaction.options.getString('message', true)).setFooter({ text: `Posted by ${interaction.user.tag}` }).setTimestamp()], allowedMentions: { parse: [] } });
    return success(interaction, `Announcement posted in ${channel}.`);
  }

  if (subcommand === 'poll') {
    const options = interaction.options.getString('options', true).split('|').map(value => value.trim()).filter(Boolean).slice(0, 10);
    if (options.length < 2) return failure(interaction, 'Provide at least two options separated with `|`.');
    const message = await interaction.channel.send({
      embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(interaction.options.getString('question', true)).setDescription(options.map((value, index) => `${pollEmoji[index]} ${value}`).join('\n')).setFooter({ text: `Poll by ${interaction.user.tag}` }).setTimestamp()]
    });
    for (let index = 0; index < options.length; index += 1) await message.react(pollEmoji[index]);
    return success(interaction, 'Poll created.');
  }

  if (subcommand === 'embed') {
    const colourText = interaction.options.getString('colour') || '#5865F2';
    const colour = /^#[0-9a-f]{6}$/i.test(colourText) ? Number.parseInt(colourText.slice(1), 16) : 0x5865F2;
    await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(colour).setTitle(interaction.options.getString('title', true)).setDescription(interaction.options.getString('description', true)).setFooter({ text: `Posted by ${interaction.user.tag}` }).setTimestamp()], allowedMentions: { parse: [] } });
    return success(interaction, 'Embed sent.');
  }

  if (subcommand === 'starboard') {
    const enabled = interaction.options.getBoolean('enabled', true);
    const cfg = getGuildConfig(interaction.guildId).starboard;
    updateGuildConfig(interaction.guildId, { starboard: {
      enabled,
      channelId: interaction.options.getChannel('channel')?.id || cfg.channelId,
      threshold: interaction.options.getInteger('threshold') || cfg.threshold,
      emoji: interaction.options.getString('emoji') || cfg.emoji
    } });
    return success(interaction, 'Starboard configuration updated.');
  }

  if (subcommand === 'giveaway') {
    const durationMs = parseDuration(interaction.options.getString('duration'), { max: 31_536_000_000 });
    if (!durationMs) return failure(interaction, 'Use a valid duration such as 30m, 2h, 7d or 4w.');
    const prize = interaction.options.getString('prize', true);
    const winners = interaction.options.getInteger('winners') || 1;
    const endsAt = Date.now() + durationMs;
    const message = await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🎉 Giveaway').setDescription(`**Prize:** ${prize}\nReact with 🎉 to enter.\nEnds <t:${Math.floor(endsAt / 1_000)}:R>`).setFooter({ text: `${winners} winner${winners === 1 ? '' : 's'} · Hosted by ${interaction.user.tag}` }).setTimestamp()] });
    await message.react('🎉');
    createGiveaway({ id: message.id, guildId: interaction.guildId, channelId: interaction.channelId, messageId: message.id, prize, winners, endsAt });
    return success(interaction, 'Giveaway started.');
  }

  const messageId = interaction.options.getString('message-id', true);
  const giveaway = listGiveaways(interaction.guildId).find(row => row.messageId === messageId);
  if (!giveaway) return failure(interaction, 'Giveaway not found in ModerationDesk data.');
  const channel = interaction.guild.channels.cache.get(giveaway.channelId);
  const message = await channel?.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) return failure(interaction, 'The giveaway message could not be found.');
  const winners = await selectGiveawayWinners(message, interaction.options.getInteger('winners') || giveaway.winners || 1);
  await channel.send({ content: winners.length ? `🎉 Reroll winners: ${winners.map(user => `<@${user.id}>`).join(', ')} — **${giveaway.prize}**` : `No valid entries remain for **${giveaway.prize}**.`, allowedMentions: { users: winners.map(user => user.id) } });
  return success(interaction, 'Giveaway rerolled.');
}

export async function handleSuggestionCommand(interaction) {
  const cfg = getGuildConfig(interaction.guildId).suggestions;
  if (!cfg.enabled || !cfg.channelId) return failure(interaction, 'Suggestions are not enabled in this server.');
  const channel = interaction.guild.channels.cache.get(cfg.channelId);
  if (!channel?.isTextBased()) return failure(interaction, 'The configured suggestions channel is unavailable.');
  const message = await channel.send({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('New suggestion').setDescription(interaction.options.getString('suggestion', true)).setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() }).setFooter({ text: `User ID: ${interaction.user.id}` }).setTimestamp()] });
  await message.react('👍');
  await message.react('👎');
  return success(interaction, 'Your suggestion was submitted.');
}

export { selectGiveawayWinners };
