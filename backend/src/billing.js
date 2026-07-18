import crypto from 'node:crypto';
import express from 'express';
import { config } from './config.js';
import { getGuildConfig, guildForSubscription, setPlan, updateBilling } from './store.js';
import { logger } from './logger.js';

function priceForPlan(plan) {
  if (plan === 'pro') return config.stripe.proPriceId;
  if (plan === 'enterprise') return config.stripe.enterprisePriceId;
  return '';
}

async function stripeRequest(path, body) {
  if (!config.stripe.secretKey) throw new Error('Stripe billing is not configured.');
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.stripe.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Stripe request failed (${response.status}).`);
  return data;
}

export function billingConfigured() {
  return Boolean(config.stripe.secretKey && config.stripe.webhookSecret && config.stripe.proPriceId && config.stripe.enterprisePriceId && config.publicBaseUrl);
}

export async function createCheckoutSession({ guildId, plan, userId }) {
  const priceId = priceForPlan(plan);
  if (!priceId) throw new Error(`No Stripe price is configured for ${plan}.`);
  const current = getGuildConfig(guildId);
  const body = {
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: String(guildId),
    success_url: `${config.publicBaseUrl}/dashboard/${guildId}?billing=success`,
    cancel_url: `${config.publicBaseUrl}/dashboard/${guildId}?billing=cancelled`,
    'metadata[guildId]': String(guildId),
    'metadata[plan]': plan,
    'metadata[purchasedBy]': String(userId),
    'subscription_data[metadata][guildId]': String(guildId),
    'subscription_data[metadata][plan]': plan,
    allow_promotion_codes: 'true'
  };
  if (current.billing.stripeCustomerId) body.customer = current.billing.stripeCustomerId;
  return stripeRequest('/checkout/sessions', body);
}

export async function createPortalSession({ guildId }) {
  const billing = getGuildConfig(guildId).billing;
  if (!billing.stripeCustomerId) throw new Error('No Stripe customer is linked to this server.');
  return stripeRequest('/billing_portal/sessions', {
    customer: billing.stripeCustomerId,
    return_url: `${config.publicBaseUrl}/dashboard/${guildId}`
  });
}

function verifyStripeSignature(payload, header, secret, toleranceSeconds = 300) {
  const parts = String(header || '').split(',').map(item => item.trim().split('=', 2));
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value).filter(Boolean);
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1_000 - timestamp) > toleranceSeconds) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex'), 'hex');
  return signatures.some(signature => {
    const supplied = Buffer.from(signature, 'hex');
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  });
}

function planFromSubscription(subscription) {
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  if (priceId === config.stripe.proPriceId) return 'pro';
  if (priceId === config.stripe.enterprisePriceId) return 'enterprise';
  const metadataPlan = subscription?.metadata?.plan;
  if (metadataPlan === 'pro' || metadataPlan === 'enterprise') return metadataPlan;
  return 'free';
}

function guildFromObject(object) {
  return String(object?.metadata?.guildId || object?.client_reference_id || guildForSubscription(object?.id) || '');
}

function processStripeEvent(event) {
  const object = event?.data?.object || {};
  if (event.type === 'checkout.session.completed') {
    const guildId = guildFromObject(object);
    const plan = object.metadata?.plan;
    if (!guildId || !['pro', 'enterprise'].includes(plan)) return;
    updateBilling(guildId, {
      stripeCustomerId: String(object.customer || ''),
      stripeSubscriptionId: String(object.subscription || ''),
      status: object.payment_status || 'complete'
    });
    if (['paid', 'no_payment_required'].includes(object.payment_status)) setPlan(guildId, plan);
    return;
  }

  if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
    const guildId = guildFromObject(object);
    if (!guildId) return;
    const active = event.type !== 'customer.subscription.deleted' && ['active', 'trialing'].includes(object.status);
    const plan = active ? planFromSubscription(object) : 'free';
    updateBilling(guildId, {
      stripeCustomerId: String(object.customer || ''),
      stripeSubscriptionId: String(object.id || ''),
      status: object.status || (active ? 'active' : 'cancelled'),
      currentPeriodEnd: Number(object.current_period_end || 0)
    });
    setPlan(guildId, plan);
  }
}

export function mountBillingWebhook(app) {
  app.post('/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
    if (!config.stripe.webhookSecret) return res.status(503).send('Billing webhook is not configured.');
    const payload = req.body.toString('utf8');
    if (!verifyStripeSignature(payload, req.get('stripe-signature'), config.stripe.webhookSecret)) return res.status(400).send('Invalid signature.');
    let event;
    try { event = JSON.parse(payload); } catch { return res.status(400).send('Invalid JSON.'); }
    try {
      processStripeEvent(event);
      logger.info('Stripe event processed', { type: event.type, id: event.id });
      return res.json({ received: true });
    } catch (error) {
      logger.error('Stripe event failed', { type: event.type, id: event.id, error: error.message });
      return res.status(500).send('Webhook processing failed.');
    }
  });
}

export const __test = { verifyStripeSignature, processStripeEvent };
