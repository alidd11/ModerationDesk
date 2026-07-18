import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { billingConfigured } from '../billing.js';
import { PLAN_FEATURES } from '../premium.js';
import { getGuildConfig } from '../store.js';
import { success } from './helpers.js';

export async function handlePremiumCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const cfg = getGuildConfig(interaction.guildId);
  if (subcommand === 'status') {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('ModerationDesk subscription').addFields(
      { name: 'Current plan', value: cfg.plan.toUpperCase(), inline: true },
      { name: 'Billing status', value: cfg.billing.status || 'Not linked', inline: true },
      ...(cfg.billing.currentPeriodEnd ? [{ name: 'Current period ends', value: `<t:${cfg.billing.currentPeriodEnd}:F>` }] : [])
    ).setTimestamp()], ephemeral: true });
  }
  if (subcommand === 'features') {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('ModerationDesk plans').addFields(
      { name: 'Free', value: PLAN_FEATURES.free.map(item => `• ${item}`).join('\n') },
      { name: 'Pro', value: PLAN_FEATURES.pro.map(item => `• ${item}`).join('\n') },
      { name: 'Enterprise', value: PLAN_FEATURES.enterprise.map(item => `• ${item}`).join('\n') }
    )], ephemeral: true });
  }
  const url = config.publicBaseUrl ? `${config.publicBaseUrl}/dashboard/${interaction.guildId}` : '';
  if (!url) return success(interaction, 'The dashboard URL has not been configured by the bot operator.');
  return interaction.reply({ content: billingConfigured() ? `Manage or upgrade this server at ${url}` : `Plan management is available at ${url}. Stripe checkout is not yet configured by the bot operator.`, ephemeral: true });
}
