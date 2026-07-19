import cookieParser from 'cookie-parser';
import express from 'express';
import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { attachAuditLogging } from './auditLog.js';
import { attachAutomod } from './automod.js';
import { attachInteractionHandler } from './interactionHandler.js';
import { attachRuntime } from './runtime.js';
import { attachSecurity } from './security.js';
import { attachVerification, ensureAllVerificationPanels, mountVerificationOAuth } from './verification.js';
import { mountApi } from './api.js';
import { mountBillingWebhook } from './billing.js';
import { attachDiscordBilling, syncAllDiscordEntitlements, syncGuildDiscordEntitlements } from './discordBilling.js';
import { commands } from './commands.js';
import { constantTimeEqual } from './utils.js';
import { deleteGuildData, exportGuildData, getGuildConfig, setPlan, snapshot, updateGuildConfig } from './store.js';

const errors = validateConfig({ requireOAuth: false });
if (errors.length) {
  for (const error of errors) logger.error(error);
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember]
});

attachAuditLogging(client);
attachAutomod(client);
attachSecurity(client);
attachVerification(client);
attachRuntime(client);
attachInteractionHandler(client);
attachDiscordBilling(client);

client.once('ready', async readyClient => {
  logger.info('ModerationDesk connected', { user: readyClient.user.tag, guilds: readyClient.guilds.cache.size });
  for (const guildId of config.enterpriseGuildIds) setPlan(guildId, 'enterprise');
  for (const guild of readyClient.guilds.cache.values()) getGuildConfig(guild.id);
  await syncAllDiscordEntitlements(readyClient);
  if (config.registerCommandsOnStart) {
    const rest = new REST({ version: '10' }).setToken(config.token);
    const route = config.devGuildId
      ? Routes.applicationGuildCommands(config.clientId, config.devGuildId)
      : Routes.applicationCommands(config.clientId);
    await rest.put(route, { body: commands });
    logger.info('Application commands registered on startup', { count: commands.length, devGuildId: config.devGuildId || null });
  }
  await ensureAllVerificationPanels(readyClient);
});
client.on('guildCreate', guild => {
  getGuildConfig(guild.id);
  syncGuildDiscordEntitlements(client, guild.id).catch(error => logger.warn('Unable to check new guild Discord entitlement', { guildId: guild.id, error: error.message }));
});
client.on('error', error => logger.error('Discord client error', { error: error.stack || error.message }));
client.on('warn', warning => logger.warn('Discord client warning', { warning }));
client.on('shardError', error => logger.error('Discord shard error', { error: error.stack || error.message }));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-ModerationDesk-Admin-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});

const requestBuckets = new Map();
const bucketCleanup = setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, times] of requestBuckets) {
    const recent = times.filter(time => time >= cutoff);
    if (recent.length) requestBuckets.set(key, recent);
    else requestBuckets.delete(key);
  }
}, 300_000);
bucketCleanup.unref();

app.use((req, res, next) => {
  if (req.path === '/billing/webhook' || req.path === '/health') return next();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = (requestBuckets.get(key) || []).filter(time => now - time < 60_000);
  bucket.push(now);
  requestBuckets.set(key, bucket);
  if (bucket.length > 180) return res.status(429).json({ ok: false, error: 'rate_limited' });
  next();
});

mountBillingWebhook(app);
app.use(express.json({ limit: '300kb' }));
app.use(express.urlencoded({ extended: false, limit: '300kb' }));
app.use(cookieParser(config.sessionSecret));
mountVerificationOAuth(app, client);
mountApi(app, client);

app.get('/', (req, res) => res.json({
  ok: true,
  service: 'ModerationDesk API',
  version: '1.2.0',
  frontend: config.frontendBaseUrl
}));

app.get('/health', (req, res) => {
  const ready = client.isReady();
  res.status(200).json({
    ok: true,
    ready,
    guilds: client.guilds.cache.size,
    uptimeSeconds: Math.floor(process.uptime()),
    version: '1.2.0'
  });
});

function adminOnly(req, res, next) {
  const supplied = req.get('X-ModerationDesk-Admin-Key') || '';
  if (!config.premiumAdminKey || !constantTimeEqual(supplied, config.premiumAdminKey)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  next();
}

app.post('/api/admin/guild/:guildId/plan', adminOnly, (req, res) => {
  const plan = req.body.plan;
  if (!['free', 'pro', 'enterprise'].includes(plan)) return res.status(400).json({ ok: false, error: 'invalid_plan' });
  res.json({ ok: true, config: setPlan(req.params.guildId, plan) });
});
app.patch('/api/admin/guild/:guildId/config', adminOnly, (req, res) => res.json({ ok: true, config: updateGuildConfig(req.params.guildId, req.body || {}) }));
app.get('/api/admin/guild/:guildId/export', adminOnly, (req, res) => res.json(exportGuildData(req.params.guildId)));
app.delete('/api/admin/guild/:guildId', adminOnly, (req, res) => {
  deleteGuildData(req.params.guildId);
  res.json({ ok: true });
});
app.get('/api/admin/snapshot', adminOnly, (req, res) => res.json(snapshot()));

// Aggregate install/member/plan counts for the DeskLabs Stats dashboard.
// Checked against its own STATS_KEY, not PREMIUM_ADMIN_KEY, so a leaked
// stats credential can't reach plan edits, config patches, export or delete.
function statsOnly(req, res, next) {
  const supplied = req.get('X-Stats-Key') || '';
  if (!config.statsKey || !constantTimeEqual(supplied, config.statsKey)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  next();
}

app.get('/api/admin/stats', statsOnly, (req, res) => {
  const guilds = [...client.guilds.cache.values()];
  const totalMembers = guilds.reduce((sum, guild) => sum + (guild.memberCount || 0), 0);
  const plans = { free: 0, pro: 0, enterprise: 0 };
  const guildList = guilds
    .map((guild) => {
      const cfg = getGuildConfig(guild.id);
      plans[cfg.plan] = (plans[cfg.plan] || 0) + 1;
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 64 }) || null,
        memberCount: guild.memberCount || 0,
        plan: cfg.plan,
        addedAt: cfg.createdAt || null,
      };
    })
    .sort((a, b) => b.memberCount - a.memberCount);
  res.json({ bot: 'ModerationDesk', installs: guilds.length, totalMembers, plans, guilds: guildList });
});

app.use((error, req, res, next) => {
  logger.error('HTTP request failed', { method: req.method, path: req.path, error: error.stack || error.message });
  if (res.headersSent) return next(error);
  res.status(500).json({ ok: false, error: 'internal_server_error' });
});

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info('HTTP server listening', {
    port: config.port,
    frontendBaseUrl: config.frontendBaseUrl,
    backendBaseUrl: config.backendBaseUrl || null,
    dataDir: config.dataDir
  });
});

client.login(config.token).catch(error => {
  logger.error('Discord login failed', { error: error.stack || error.message });
  process.exitCode = 1;
  server.close(() => process.exit(1));
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutting down', { signal });
  server.close(() => {
    client.destroy();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', error => logger.error('Unhandled rejection', { error: error?.stack || String(error) }));
process.on('uncaughtException', error => {
  logger.error('Uncaught exception', { error: error.stack || error.message });
  shutdown('uncaughtException');
});
