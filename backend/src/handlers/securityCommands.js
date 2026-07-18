import { EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../store.js';
import { requirePlan } from '../premium.js';
import { safeUrlDomain } from '../utils.js';
import { setLockdown } from '../security.js';
import { failure, setMembership, success } from './helpers.js';

export async function handleSecurityCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const cfg = getGuildConfig(interaction.guildId);

  if (subcommand === 'status') {
    const antiRaid = cfg.security.antiRaid;
    const antiNuke = cfg.security.antiNuke;
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('ModerationDesk security posture').addFields(
        { name: 'AutoMod', value: `${cfg.automod.enabled ? 'Enabled' : 'Disabled'} · ${cfg.automod.action}`, inline: true },
        { name: 'Anti-raid', value: `${antiRaid.enabled ? 'Enabled' : 'Disabled'} · ${antiRaid.joinThreshold}/${antiRaid.windowSeconds}s`, inline: true },
        { name: 'Anti-nuke', value: `${antiNuke.enabled ? 'Enabled' : 'Disabled'} · ${antiNuke.action}`, inline: true },
        { name: 'Lockdown', value: cfg.security.lockdown ? 'Active' : 'Inactive', inline: true },
        { name: 'Blocked words', value: String(cfg.automod.blockedWords.length), inline: true },
        { name: 'Allowed domains', value: String(cfg.automod.allowedDomains.length), inline: true }
      ).setTimestamp()],
      ephemeral: true
    });
  }

  if (subcommand === 'automod') {
    updateGuildConfig(interaction.guildId, { automod: { enabled: interaction.options.getBoolean('enabled', true) } });
    return success(interaction, 'AutoMod status updated.');
  }

  if (subcommand === 'automod-action') {
    const action = interaction.options.getString('action', true);
    const timeoutSeconds = interaction.options.getInteger('timeout-seconds') || cfg.automod.timeoutSeconds;
    if (action !== 'delete' && !(await requirePlan(interaction, 'pro'))) return;
    updateGuildConfig(interaction.guildId, { automod: { action, timeoutSeconds } });
    return success(interaction, `AutoMod action set to ${action}.`);
  }

  if (subcommand === 'blocked-word-list') {
    const words = cfg.automod.blockedWords;
    return interaction.reply({ content: words.length ? `Blocked words/phrases:\n${words.map(word => `• ${word}`).join('\n')}` : 'No blocked words are configured.', ephemeral: true });
  }

  if (subcommand.startsWith('blocked-word-')) {
    const word = interaction.options.getString('word', true).trim().toLowerCase();
    if (word.length < 2) return failure(interaction, 'Blocked entries must contain at least two characters.');
    const enabled = subcommand.endsWith('add');
    updateGuildConfig(interaction.guildId, { automod: { blockedWords: setMembership(cfg.automod.blockedWords, word, enabled) } });
    return success(interaction, `Blocked-word list updated.`);
  }

  if (subcommand.startsWith('allow-domain-')) {
    const domain = safeUrlDomain(interaction.options.getString('domain', true));
    if (!domain) return failure(interaction, 'Enter a valid domain, such as example.com.');
    const enabled = subcommand.endsWith('add');
    updateGuildConfig(interaction.guildId, { automod: { allowedDomains: setMembership(cfg.automod.allowedDomains, domain, enabled) } });
    return success(interaction, `Allowed-domain list updated.`);
  }

  if (subcommand === 'anti-raid') {
    if (!(await requirePlan(interaction, 'pro'))) return;
    updateGuildConfig(interaction.guildId, { security: { antiRaid: {
      enabled: interaction.options.getBoolean('enabled', true),
      joinThreshold: interaction.options.getInteger('join-threshold') || cfg.security.antiRaid.joinThreshold,
      windowSeconds: interaction.options.getInteger('window-seconds') || cfg.security.antiRaid.windowSeconds,
      autoUnlockMinutes: interaction.options.getInteger('auto-unlock-minutes') || cfg.security.antiRaid.autoUnlockMinutes
    } } });
    return success(interaction, 'Anti-raid configuration updated.');
  }

  if (subcommand === 'anti-nuke') {
    if (!(await requirePlan(interaction, 'enterprise'))) return;
    updateGuildConfig(interaction.guildId, { security: { antiNuke: {
      enabled: interaction.options.getBoolean('enabled', true),
      action: interaction.options.getString('action') || cfg.security.antiNuke.action
    } } });
    return success(interaction, 'Anti-nuke configuration updated. The bot requires View Audit Log and sufficient role hierarchy.');
  }

  if (subcommand === 'trust-user') {
    if (!(await requirePlan(interaction, 'enterprise'))) return;
    const user = interaction.options.getUser('user', true);
    const trusted = interaction.options.getBoolean('trusted', true);
    updateGuildConfig(interaction.guildId, { security: { antiNuke: { trustedUserIds: setMembership(cfg.security.antiNuke.trustedUserIds, user.id, trusted) } } });
    return success(interaction, `${user.tag} is ${trusted ? 'now' : 'no longer'} trusted by anti-nuke.`);
  }

  if (subcommand === 'trust-role') {
    if (!(await requirePlan(interaction, 'enterprise'))) return;
    const role = interaction.options.getRole('role', true);
    const trusted = interaction.options.getBoolean('trusted', true);
    updateGuildConfig(interaction.guildId, { security: { antiNuke: { trustedRoleIds: setMembership(cfg.security.antiNuke.trustedRoleIds, role.id, trusted) } } });
    return success(interaction, `${role.name} is ${trusted ? 'now' : 'no longer'} trusted by anti-nuke.`);
  }

  if (subcommand === 'exempt-role') {
    const role = interaction.options.getRole('role', true);
    const exempt = interaction.options.getBoolean('exempt', true);
    updateGuildConfig(interaction.guildId, { automod: { exemptRoleIds: setMembership(cfg.automod.exemptRoleIds, role.id, exempt) } });
    return success(interaction, `${role.name} is ${exempt ? 'now' : 'no longer'} exempt from AutoMod.`);
  }

  if (subcommand === 'exempt-channel') {
    const channel = interaction.options.getChannel('channel', true);
    const exempt = interaction.options.getBoolean('exempt', true);
    updateGuildConfig(interaction.guildId, { automod: { exemptChannelIds: setMembership(cfg.automod.exemptChannelIds, channel.id, exempt) } });
    return success(interaction, `${channel} is ${exempt ? 'now' : 'no longer'} exempt from AutoMod.`);
  }

  const enabled = subcommand === 'lockdown';
  await interaction.deferReply({ ephemeral: true });
  const changed = await setLockdown(interaction.guild, enabled, interaction.options.getString('reason') || `${subcommand} by ${interaction.user.tag}`);
  return interaction.editReply(`✅ Server ${enabled ? 'locked down' : 'unlocked'}. ${changed} channel${changed === 1 ? '' : 's'} updated.`);
}
