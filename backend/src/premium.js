import { getGuildConfig } from './store.js';
import { guildLocale, t } from './i18n.js';

export const PLAN_ORDER = Object.freeze({ free: 0, pro: 1, enterprise: 2 });
export const PLAN_LABELS = Object.freeze({ free: 'Free', pro: 'Pro', enterprise: 'Pro+' });
export const PLAN_PRICES = Object.freeze({ free: '$0', pro: '$3.99', enterprise: '$7.99' });
export const PLAN_FEATURES = Object.freeze({
  free: ['Core moderation and cases', 'Warnings, timeouts and channel controls', 'Structured moderation, server and message logs', 'Welcome messages and one auto role', 'Essential message screening'],
  pro: ['Everything in Free', 'Advanced message screening with per-rule responses', 'Anti-raid and Join Gate protection', 'Discord OAuth verification and web appeals', 'Sticky roles, starboard and ten auto roles', 'Per-event log routing'],
  enterprise: ['Everything in Pro', 'Anti-nuke containment and audit response', 'Consent-based server migration', 'Mapped role restoration', 'Priority configuration limits', 'Full protection policy controls']
});

export const planLabel = plan => PLAN_LABELS[plan] || PLAN_LABELS.free;
export const planPrice = plan => PLAN_PRICES[plan] || PLAN_PRICES.free;

export function hasPlan(guildId, minimum = 'pro') {
  const current = getGuildConfig(guildId).plan;
  return (PLAN_ORDER[current] ?? 0) >= (PLAN_ORDER[minimum] ?? 0);
}

export async function requirePlan(interaction, minimum = 'pro') {
  if (hasPlan(interaction.guildId, minimum)) return true;
  await interaction.reply({
    content: t(guildLocale(interaction.guildId, interaction.locale), `premium.required.${minimum}`),
    ephemeral: true
  }).catch(() => {});
  return false;
}
