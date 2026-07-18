import { getGuildConfig } from './store.js';

export const PLAN_ORDER = Object.freeze({ free: 0, pro: 1, enterprise: 2 });
export const PLAN_FEATURES = Object.freeze({
  free: ['Core moderation', 'Cases and warnings', 'Message/member/server logs', 'Welcome and autoroles', 'Basic AutoMod'],
  pro: ['Everything in Free', 'Advanced AutoMod', 'Anti-raid', 'OAuth verification', 'Web appeals', 'Starboard and sticky roles'],
  enterprise: ['Everything in Pro', 'Anti-nuke enforcement', 'Consent-based server migration', 'Role restoration', 'Priority configuration limits']
});

export function hasPlan(guildId, minimum = 'pro') {
  const current = getGuildConfig(guildId).plan;
  return (PLAN_ORDER[current] ?? 0) >= (PLAN_ORDER[minimum] ?? 0);
}

export async function requirePlan(interaction, minimum = 'pro') {
  if (hasPlan(interaction.guildId, minimum)) return true;
  await interaction.reply({
    content: `This feature requires ModerationDesk ${minimum === 'enterprise' ? 'Enterprise' : 'Pro'}. Use \`/premium features\` for details.`,
    ephemeral: true
  }).catch(() => {});
  return false;
}
