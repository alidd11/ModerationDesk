import { EmbedBuilder } from 'discord.js';
import { getGuildConfig } from '../store.js';
import { logger } from '../logger.js';
import { truncate } from '../utils.js';

export const BRAND_COLOUR = 0x5865F2;
export const DANGER_COLOUR = 0xED4245;
export const SUCCESS_COLOUR = 0x57F287;
export const WARNING_COLOUR = 0xFEE75C;

export async function sendLog(guild, group, { title, eventKey: explicitEventKey, description = '', fields = [], colour = BRAND_COLOUR, footer = '', channelId: explicitChannelId = '', force = false }) {
  const cfg = getGuildConfig(guild.id);
  const eventKey = explicitEventKey || String(title || group).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const configuredEvents = cfg.logEvents?.[group];
  if (!force && Array.isArray(configuredEvents) && configuredEvents.length && !configuredEvents.includes(eventKey)) return null;
  const channelId = explicitChannelId || cfg.logEventChannels?.[group]?.[eventKey] || cfg.logs[group];
  if (!channelId) return null;
  const channel = guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return null;
  const embed = new EmbedBuilder().setColor(colour).setTitle(truncate(title, 256)).setTimestamp();
  if (description) embed.setDescription(truncate(description, 4_096));
  if (fields.length) embed.addFields(fields.slice(0, 25).map(field => ({ ...field, name: truncate(field.name, 256), value: truncate(field.value, 1_024) })));
  if (footer) embed.setFooter({ text: truncate(footer, 2_048) });
  try {
    return await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (error) {
    logger.warn('Failed to send Discord log', { guildId: guild.id, group, error: error.message });
    return null;
  }
}

export function userLabel(user) {
  return `${user.tag || user.username} (${user.id})`;
}
