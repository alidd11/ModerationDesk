import { config } from './config.js';
import { logger } from './logger.js';
import { getGuildConfig, setPlan, updateBilling } from './store.js';

const activeEntitlement = entitlement => !entitlement.deleted && !entitlement.endsTimestamp;

export function discordPlanForSku(skuId) {
  const id = String(skuId || '');
  if (id && id === config.discordBilling.proSkuId) return 'pro';
  if (id && id === config.discordBilling.proPlusSkuId) return 'enterprise';
  return '';
}

export function discordBillingConfigured() {
  return Boolean(config.clientId && config.discordBilling.proSkuId && config.discordBilling.proPlusSkuId);
}

export function discordStoreUrls() {
  const store = config.clientId ? `https://discord.com/application-directory/${config.clientId}/store` : '';
  return {
    store,
    pro: config.discordBilling.proSkuId ? `${store}/${config.discordBilling.proSkuId}` : '',
    enterprise: config.discordBilling.proPlusSkuId ? `${store}/${config.discordBilling.proPlusSkuId}` : ''
  };
}

function applyEntitlements(guildId, entitlements) {
  const relevant = [...entitlements]
    .filter(entitlement => String(entitlement.guildId || '') === String(guildId))
    .filter(activeEntitlement)
    .map(entitlement => ({ entitlement, plan: discordPlanForSku(entitlement.skuId) }))
    .filter(entry => entry.plan)
    .sort((left, right) => left.plan === 'enterprise' ? -1 : right.plan === 'enterprise' ? 1 : 0);
  const selected = relevant[0];
  if (selected) {
    setPlan(guildId, selected.plan);
    updateBilling(guildId, {
      provider: 'discord',
      discordEntitlementId: String(selected.entitlement.id),
      discordSkuId: String(selected.entitlement.skuId),
      status: 'active',
      currentPeriodEnd: 0
    });
    return selected.plan;
  }

  const billing = getGuildConfig(guildId).billing;
  if (billing.provider === 'discord') {
    setPlan(guildId, 'free');
    updateBilling(guildId, { provider: '', discordEntitlementId: '', discordSkuId: '', status: 'ended', currentPeriodEnd: 0 });
  }
  return 'free';
}

export async function syncGuildDiscordEntitlements(client, guildId) {
  if (!discordBillingConfigured()) return getGuildConfig(guildId).plan;
  const entitlements = await client.application.entitlements.fetch({
    guild: String(guildId),
    skus: [config.discordBilling.proSkuId, config.discordBilling.proPlusSkuId],
    excludeEnded: true,
    excludeDeleted: true,
    cache: false
  });
  return applyEntitlements(guildId, entitlements.values());
}

export function attachDiscordBilling(client) {
  const refresh = async entitlement => {
    const guildId = entitlement?.guildId;
    if (!guildId || !discordPlanForSku(entitlement.skuId)) return;
    try {
      const plan = await syncGuildDiscordEntitlements(client, guildId);
      logger.info('Discord entitlement synchronised', { guildId, entitlementId: entitlement.id, plan });
    } catch (error) {
      logger.error('Discord entitlement synchronisation failed', { guildId, entitlementId: entitlement.id, error: error.message });
    }
  };
  client.on('entitlementCreate', refresh);
  client.on('entitlementDelete', refresh);
  client.on('entitlementUpdate', (oldEntitlement, newEntitlement) => refresh(newEntitlement));
}

export async function syncAllDiscordEntitlements(client) {
  if (!discordBillingConfigured()) return;
  for (const guild of client.guilds.cache.values()) {
    try { await syncGuildDiscordEntitlements(client, guild.id); }
    catch (error) { logger.warn('Unable to restore Discord subscription state', { guildId: guild.id, error: error.message }); }
  }
}

export const __test = { discordPlanForSku, activeEntitlement };
