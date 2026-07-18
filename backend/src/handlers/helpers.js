import { EmbedBuilder } from 'discord.js';
import { respond, truncate } from '../utils.js';

export async function success(interaction, content) {
  return respond(interaction, { content: `✅ ${content}`, ephemeral: true });
}

export async function failure(interaction, content) {
  return respond(interaction, { content: `❌ ${content}`, ephemeral: true });
}

export async function fetchTarget(interaction) {
  const user = interaction.options.getUser('user', true);
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  return { user, member };
}

export function listEmbed(title, rows, empty = 'Nothing to show.') {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(title)
    .setDescription(rows.length ? truncate(rows.join('\n'), 4_096) : empty)
    .setTimestamp();
}

export function setMembership(setLike, value, enabled) {
  const set = new Set(setLike || []);
  if (enabled) set.add(value);
  else set.delete(value);
  return [...set];
}
