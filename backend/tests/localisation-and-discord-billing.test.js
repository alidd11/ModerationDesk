import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DISCORD_PRO_SKU_ID = '111';
process.env.DISCORD_PRO_PLUS_SKU_ID = '222';

const { __test: billing } = await import('../src/discordBilling.js');
const { normaliseLocale, t } = await import('../src/i18n.js');

test('Discord SKU mapping keeps Pro+ above Pro', () => {
  assert.equal(billing.discordPlanForSku('111'), 'pro');
  assert.equal(billing.discordPlanForSku('222'), 'enterprise');
  assert.equal(billing.discordPlanForSku('333'), '');
});

test('locale fallback is safe and premium prompts are translated', () => {
  assert.equal(normaliseLocale('fr-CA'), 'fr');
  assert.equal(normaliseLocale('unsupported'), 'en-GB');
  assert.match(t('es-ES', 'premium.required.enterprise'), /Pro\+/);
});
