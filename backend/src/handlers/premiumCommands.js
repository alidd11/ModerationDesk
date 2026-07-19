import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { billingConfigured } from '../billing.js';
import { discordBillingConfigured, discordStoreUrls } from '../discordBilling.js';
import { PLAN_FEATURES, planLabel, planPrice } from '../premium.js';
import { guildLocale, t } from '../i18n.js';
import { getGuildConfig } from '../store.js';
import { success } from './helpers.js';

export async function handlePremiumCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const cfg = getGuildConfig(interaction.guildId);
  const locale = guildLocale(interaction.guildId, interaction.locale);
  if (subcommand === 'status') {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('ModerationDesk subscription').addFields(
      { name: 'Current plan', value: planLabel(cfg.plan), inline: true },
      { name: 'Billing status', value: cfg.billing.status || 'Not linked', inline: true },
      ...(cfg.billing.currentPeriodEnd ? [{ name: 'Current period ends', value: `<t:${cfg.billing.currentPeriodEnd}:F>` }] : [])
    ).setTimestamp()], ephemeral: true });
  }
  if (subcommand === 'features') {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('ModerationDesk plans').addFields(
      { name: `Free — ${planPrice('free')}`, value: PLAN_FEATURES.free.map(item => `• ${item}`).join('\n') },
      { name: `Pro — ${planPrice('pro')}/month`, value: PLAN_FEATURES.pro.map(item => `• ${item}`).join('\n') },
      { name: `Pro+ — ${planPrice('enterprise')}/month`, value: PLAN_FEATURES.enterprise.map(item => `• ${item}`).join('\n') }
    )], ephemeral: true });
  }
  const url = config.publicBaseUrl ? `${config.publicBaseUrl}/dashboard/${interaction.guildId}` : '';
  if (!url) return success(interaction, 'The dashboard URL has not been configured by the bot operator.');
  if (discordBillingConfigured()) return interaction.reply({ content: t(locale, 'premium.store.ready', { url: discordStoreUrls().store }), ephemeral: true });
  return interaction.reply({ content: billingConfigured() ? `Manage or upgrade this server at ${url}` : t(locale, 'premium.store.pending', { url }), ephemeral: true });
}
