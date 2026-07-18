import { recordCase } from '../store.js';
import { sendLog, WARNING_COLOUR } from '../services/logService.js';
import { failure, success } from './helpers.js';

export async function handleChannelCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  if (!interaction.channel?.isTextBased()) return failure(interaction, 'This command requires a text channel.');

  if (subcommand === 'purge') {
    const count = interaction.options.getInteger('count', true);
    const user = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains')?.toLowerCase() || '';
    const botsOnly = interaction.options.getBoolean('bots') || false;
    const fetched = await interaction.channel.messages.fetch({ limit: 100 });
    const selected = fetched.filter(message => {
      if (message.pinned) return false;
      if (user && message.author.id !== user.id) return false;
      if (contains && !message.content.toLowerCase().includes(contains)) return false;
      if (botsOnly && !message.author.bot) return false;
      return true;
    }).first(count);
    const deleted = await interaction.channel.bulkDelete(selected, true);
    recordCase({ guildId: interaction.guildId, userId: user?.id || 'multiple', moderatorId: interaction.user.id, action: 'purge', reason: `Deleted ${deleted.size} messages in #${interaction.channel.name}`, metadata: { channelId: interaction.channelId } });
    return success(interaction, `Deleted ${deleted.size} recent message${deleted.size === 1 ? '' : 's'}. Messages older than 14 days cannot be bulk-deleted.`);
  }

  if (subcommand === 'lock' || subcommand === 'unlock') {
    const locked = subcommand === 'lock';
    const reason = interaction.options.getString('reason') || `${subcommand} by ${interaction.user.tag}`;
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: locked ? false : null }, { reason });
    await sendLog(interaction.guild, 'moderation', { title: `Channel ${locked ? 'locked' : 'unlocked'}`, description: `<#${interaction.channelId}> by <@${interaction.user.id}>\nReason: ${reason}`, colour: WARNING_COLOUR });
    return success(interaction, `Channel ${locked ? 'locked' : 'unlocked'}.`);
  }

  if (subcommand === 'slowmode') {
    const seconds = interaction.options.getInteger('seconds', true);
    await interaction.channel.setRateLimitPerUser(seconds, `Changed by ${interaction.user.tag}`);
    return success(interaction, `Slowmode set to ${seconds} second${seconds === 1 ? '' : 's'}.`);
  }

  if (interaction.options.getString('confirmation', true) !== 'NUKE') return failure(interaction, 'Nuke cancelled. Type exactly `NUKE` in the confirmation field.');
  await interaction.reply({ content: '✅ Channel replacement confirmed.', ephemeral: true });
  const oldChannel = interaction.channel;
  const clone = await oldChannel.clone({ reason: `Channel nuked by ${interaction.user.tag}` });
  await clone.setPosition(oldChannel.position);
  await oldChannel.delete(`Channel nuked by ${interaction.user.tag}`);
  await clone.send({ content: `Channel recreated by <@${interaction.user.id}>.`, allowedMentions: { users: [interaction.user.id] } });
}
