import 'dotenv/config';
import path from 'node:path';

const cleanBaseUrl = value => String(value || '').trim().replace(/\/$/, '');
const bool = (value, fallback = false) => value == null ? fallback : /^(1|true|yes|on)$/i.test(String(value));
const list = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);

const legacyPublicBaseUrl = cleanBaseUrl(process.env.PUBLIC_BASE_URL);
const frontendBaseUrl = cleanBaseUrl(process.env.FRONTEND_BASE_URL || legacyPublicBaseUrl);
const backendBaseUrl = cleanBaseUrl(process.env.BACKEND_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR || path.join(process.cwd(), 'data');

export const config = Object.freeze({
  token: process.env.DISCORD_BOT_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  frontendBaseUrl,
  backendBaseUrl,
  publicBaseUrl: frontendBaseUrl,
  port: Number(process.env.PORT || 3001),
  sessionSecret: process.env.SESSION_SECRET || '',
  premiumAdminKey: process.env.PREMIUM_ADMIN_KEY || '',
  statsKey: process.env.STATS_KEY || '',
  enterpriseGuildIds: list(process.env.ENTERPRISE_GUILD_IDS),
  allowedOrigins: [...new Set([frontendBaseUrl, ...list(process.env.ALLOWED_ORIGINS)].filter(Boolean))],
  registerCommandsOnStart: bool(process.env.REGISTER_COMMANDS_ON_START),
  devGuildId: process.env.DEV_GUILD_ID || '',
  dataDir: path.resolve(volumePath),
  logLevel: process.env.LOG_LEVEL || 'info',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    enterprisePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || ''
  },
  discordBilling: {
    proSkuId: process.env.DISCORD_PRO_SKU_ID || '',
    proPlusSkuId: process.env.DISCORD_PRO_PLUS_SKU_ID || ''
  },
  links: {
    privacy: process.env.PRIVACY_URL || '',
    terms: process.env.TERMS_URL || '',
    support: process.env.SUPPORT_URL || ''
  }
});

function isValidPublicUrl(value) {
  return /^https:\/\//i.test(value) || /^http:\/\/localhost(?::\d+)?$/i.test(value);
}

export function validateConfig({ requireOAuth = true } = {}) {
  const errors = [];
  if (!config.token) errors.push('DISCORD_BOT_TOKEN is required.');
  if (!config.clientId) errors.push('DISCORD_CLIENT_ID is required.');
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) errors.push('PORT must be a valid TCP port.');
  if (requireOAuth || config.frontendBaseUrl) {
    if (!config.clientSecret) errors.push('DISCORD_CLIENT_SECRET is required for dashboard, appeals and OAuth verification.');
    if (!config.frontendBaseUrl) errors.push('FRONTEND_BASE_URL is required and must be the production Vercel URL or custom domain.');
    if (config.frontendBaseUrl && !isValidPublicUrl(config.frontendBaseUrl)) errors.push('FRONTEND_BASE_URL must use HTTPS, except for localhost development.');
    if (config.sessionSecret.length < 32) errors.push('SESSION_SECRET must be at least 32 characters.');
  }
  if (config.backendBaseUrl && !isValidPublicUrl(config.backendBaseUrl)) errors.push('BACKEND_BASE_URL must use HTTPS, except for localhost development.');
  return errors;
}
