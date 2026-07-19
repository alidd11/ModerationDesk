import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { normaliseWords, randomToken } from './utils.js';

const DATA_FILE = path.join(config.dataDir, 'moderationdesk.json');
const SCHEMA_VERSION = 2;

export const DEFAULT_GUILD = Object.freeze({
  plan: 'free',
  locale: 'en-GB',
  staffRoleIds: [],
  adminRoleIds: [],
  welcome: { enabled: false, channelId: '', message: 'Welcome {user} to **{server}**. You are member **#{count}**.' },
  goodbye: { enabled: false, channelId: '', message: 'Goodbye **{username}**.' },
  logs: { member: '', moderation: '', messages: '', server: '', security: '', appeals: '' },
  logEvents: { member: [], moderation: [], messages: [], server: [], security: [], appeals: [] },
  logEventChannels: { member: {}, moderation: {}, messages: {}, server: {}, security: {}, appeals: {} },
  automod: {
    enabled: false,
    preset: 'custom',
    action: 'delete',
    timeoutSeconds: 300,
    ruleActions: { invites: 'inherit', links: 'inherit', spam: 'inherit', duplicates: 'inherit', mentions: 'inherit', caps: 'inherit', blockedWords: 'inherit' },
    ruleLogChannels: { invites: '', links: '', spam: '', duplicates: '', mentions: '', caps: '', blockedWords: '' },
    antiInvites: true,
    antiLinks: false,
    antiSpam: true,
    antiDuplicates: true,
    antiMassMentions: true,
    antiCaps: false,
    blockedWords: [],
    allowedDomains: [],
    allowedInviteCodes: [],
    maxMentions: 5,
    maxCapsPercent: 80,
    minCapsLength: 18,
    spamWindowSeconds: 8,
    spamMaxMessages: 6,
    duplicateMax: 3,
    exemptRoleIds: [],
    exemptChannelIds: []
  },
  moderation: {
    escalation: {
      enabled: false,
      windowDays: 30,
      firstThreshold: 3,
      firstAction: 'timeout',
      firstDurationMinutes: 60,
      finalThreshold: 5,
      finalAction: 'kick'
    }
  },
  security: {
    lockdown: false,
    antiRaid: {
      enabled: false,
      joinThreshold: 10,
      windowSeconds: 20,
      autoUnlockMinutes: 10,
      minimumAccountAgeDays: 0,
      quarantineRoleId: ''
    },
    joinGate: {
      enabled: false,
      minimumAccountAgeDays: 0,
      requireAvatar: false,
      blockedTerms: [],
      action: 'quarantine',
      timeoutMinutes: 60,
      quarantineRoleId: ''
    },
    antiNuke: {
      enabled: false,
      windowSeconds: 20,
      action: 'strip_roles',
      restoreDeletedObjects: true,
      lockdownOnTrigger: true,
      panicMode: false,
      quarantineRoleId: '',
      trustedUserIds: [],
      trustedRoleIds: [],
      thresholds: {
        channelDelete: 3,
        channelCreate: 6,
        channelUpdate: 8,
        roleDelete: 3,
        roleCreate: 6,
        roleUpdate: 8,
        rolePermissionEscalation: 1,
        memberBan: 5,
        memberKick: 5,
        webhookUpdate: 3,
        botAdd: 1,
        guildUpdate: 3
      }
    }
  },
  verification: {
    enabled: false,
    mode: 'button',
    channelId: '',
    verifiedRoleId: '',
    unverifiedRoleId: '',
    messageId: '',
    message: 'Verify your Discord account to unlock the server.'
  },
  migration: {
    enabled: false,
    sourceGuildId: '',
    roleMappings: {},
    requireSourceMembership: true,
    complianceMode: 'individual-oauth-consent'
  },
  commandSettings: { overrides: {}, syncedAt: '' },
  autoroles: [],
  stickyRoles: { enabled: false, roleIds: [] },
  suggestions: { enabled: false, channelId: '' },
  starboard: { enabled: false, channelId: '', emoji: '⭐', threshold: 3 },
  appeals: { enabled: false, channelId: '' },
  billing: { stripeCustomerId: '', stripeSubscriptionId: '', discordEntitlementId: '', discordSkuId: '', provider: '', status: '', currentPeriodEnd: 0 },
  stats: { verified: 0, migrated: 0, automodActions: 0, raidTriggers: 0, antiNukeTriggers: 0 },
  nextCaseId: 1,
  createdAt: '',
  updatedAt: ''
});

let db = {
  schemaVersion: SCHEMA_VERSION,
  guilds: {},
  cases: [],
  warnings: [],
  notes: [],
  appeals: [],
  auditEvents: [],
  migrations: {},
  tempActions: [],
  afk: {},
  giveaways: [],
  stickyRoles: {},
  starboard: {},
  billingSubscriptions: {},
  webSessions: {},
  oauthStates: {}
};

const clone = value => JSON.parse(JSON.stringify(value));

function deepMerge(target, patch) {
  const output = Array.isArray(target) ? [...target] : { ...target };
  for (const [key, value] of Object.entries(patch || {})) {
    output[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(target?.[key] && typeof target[key] === 'object' ? target[key] : {}, value)
      : value;
  }
  return output;
}

function save() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const temporary = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, DATA_FILE);
}

function load() {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      fs.mkdirSync(config.dataDir, { recursive: true });
      try { fs.copyFileSync(DATA_FILE, `${DATA_FILE}.corrupt-${Date.now()}`); } catch {}
    }
    save();
  }
  db.schemaVersion = SCHEMA_VERSION;
  for (const key of ['guilds', 'migrations', 'afk', 'stickyRoles', 'starboard', 'billingSubscriptions', 'webSessions', 'oauthStates']) db[key] ||= {};
  for (const key of ['cases', 'warnings', 'notes', 'appeals', 'auditEvents', 'tempActions', 'giveaways']) db[key] ||= [];
}
load();

export function getGuildConfig(guildId) {
  const id = String(guildId);
  const now = new Date().toISOString();
  if (!db.guilds[id]) {
    db.guilds[id] = deepMerge(clone(DEFAULT_GUILD), { createdAt: now, updatedAt: now });
    save();
  } else {
    db.guilds[id] = deepMerge(clone(DEFAULT_GUILD), db.guilds[id]);
  }
  return clone(db.guilds[id]);
}

export function updateGuildConfig(guildId, patch) {
  const id = String(guildId);
  const current = getGuildConfig(id);
  const next = deepMerge(current, patch || {});
  next.updatedAt = new Date().toISOString();
  next.automod.blockedWords = normaliseWords(next.automod.blockedWords);
  next.automod.allowedDomains = normaliseWords(next.automod.allowedDomains);
  next.automod.allowedInviteCodes = normaliseWords(next.automod.allowedInviteCodes);
  next.security.joinGate.blockedTerms = normaliseWords(next.security.joinGate.blockedTerms);
  db.guilds[id] = next;
  save();
  return clone(next);
}

export function deleteGuildData(guildId) {
  const id = String(guildId);
  delete db.guilds[id];
  db.cases = db.cases.filter(row => row.guildId !== id);
  db.warnings = db.warnings.filter(row => row.guildId !== id);
  db.notes = db.notes.filter(row => row.guildId !== id);
  db.appeals = db.appeals.filter(row => row.guildId !== id);
  db.auditEvents = db.auditEvents.filter(row => row.guildId !== id);
  db.tempActions = db.tempActions.filter(row => row.guildId !== id);
  db.giveaways = db.giveaways.filter(row => row.guildId !== id);
  for (const collection of ['migrations', 'afk', 'stickyRoles', 'starboard']) {
    for (const key of Object.keys(db[collection])) if (key.startsWith(`${id}:`)) delete db[collection][key];
  }
  for (const [subscriptionId, mappedGuildId] of Object.entries(db.billingSubscriptions)) if (mappedGuildId === id) delete db.billingSubscriptions[subscriptionId];
  save();
}

export const setPlan = (guildId, plan) => updateGuildConfig(guildId, { plan });
export const incrementStat = (guildId, name, amount = 1) => {
  const cfg = getGuildConfig(guildId);
  return updateGuildConfig(guildId, { stats: { [name]: Number(cfg.stats[name] || 0) + amount } });
};

export function recordCase(entry) {
  const cfg = getGuildConfig(entry.guildId);
  const id = cfg.nextCaseId;
  updateGuildConfig(entry.guildId, { nextCaseId: id + 1 });
  const row = { id, createdAt: new Date().toISOString(), active: true, ...entry, guildId: String(entry.guildId) };
  db.cases.push(row);
  save();
  return clone(row);
}
export const getCase = (guildId, id) => clone(db.cases.find(row => row.guildId === String(guildId) && row.id === Number(id)) || null);
export function listCases(guildId, { userId = '', limit = 25 } = {}) {
  return clone(db.cases.filter(row => row.guildId === String(guildId) && (!userId || row.userId === String(userId))).slice(-Math.min(100, limit)).reverse());
}
export function updateCase(guildId, id, patch) {
  const row = db.cases.find(item => item.guildId === String(guildId) && item.id === Number(id));
  if (!row) return null;
  Object.assign(row, patch, { updatedAt: new Date().toISOString() });
  save();
  return clone(row);
}

export function addWarning(entry) {
  const row = { id: randomToken(6), active: true, createdAt: new Date().toISOString(), ...entry, guildId: String(entry.guildId) };
  db.warnings.push(row);
  save();
  return clone(row);
}
export const listWarnings = (guildId, userId, activeOnly = true) => clone(db.warnings.filter(row => row.guildId === String(guildId) && row.userId === String(userId) && (!activeOnly || row.active)).reverse());
export function clearWarning(guildId, userId, warningId = '') {
  let count = 0;
  for (const row of db.warnings) {
    if (row.guildId === String(guildId) && row.userId === String(userId) && row.active && (!warningId || row.id === warningId)) {
      row.active = false;
      row.clearedAt = new Date().toISOString();
      count += 1;
    }
  }
  if (count) save();
  return count;
}

export function addNote(entry) {
  const row = { id: randomToken(6), createdAt: new Date().toISOString(), ...entry, guildId: String(entry.guildId) };
  db.notes.push(row);
  save();
  return clone(row);
}
export const listNotes = (guildId, userId, limit = 25) => clone(db.notes.filter(row => row.guildId === String(guildId) && row.userId === String(userId)).slice(-limit).reverse());

export function recordAuditEvent(entry) {
  const row = {
    id: randomToken(10),
    createdAt: new Date().toISOString(),
    ...entry,
    guildId: String(entry.guildId),
    category: String(entry.category || 'system').slice(0, 64),
    action: String(entry.action || 'updated').slice(0, 128),
    actorId: String(entry.actorId || ''),
    actorName: String(entry.actorName || 'System').slice(0, 128),
    summary: String(entry.summary || '').slice(0, 500)
  };
  db.auditEvents.push(row);
  if (db.auditEvents.length > 10_000) db.auditEvents = db.auditEvents.slice(-10_000);
  save();
  return clone(row);
}

export function listAuditEvents(guildId, { limit = 50, category = '' } = {}) {
  return clone(db.auditEvents
    .filter(row => row.guildId === String(guildId) && (!category || row.category === category))
    .slice(-Math.min(200, Math.max(1, Number(limit) || 50)))
    .reverse());
}

export function addTempAction(entry) {
  const row = { id: randomToken(8), active: true, createdAt: new Date().toISOString(), ...entry, guildId: String(entry.guildId) };
  db.tempActions.push(row);
  save();
  return clone(row);
}
export const dueTempActions = (now = Date.now()) => clone(db.tempActions.filter(row => row.active && row.executeAt <= now));
export function completeTempAction(id, error = '') {
  const row = db.tempActions.find(item => item.id === id);
  if (!row) return;
  row.active = false;
  row.completedAt = new Date().toISOString();
  if (error) row.error = error;
  save();
}

export function setAfk(guildId, userId, data) { db.afk[`${guildId}:${userId}`] = { ...data, since: Date.now() }; save(); }
export function clearAfk(guildId, userId) { const key = `${guildId}:${userId}`; const value = db.afk[key]; delete db.afk[key]; if (value) save(); return clone(value || null); }
export const getAfk = (guildId, userId) => clone(db.afk[`${guildId}:${userId}`] || null);

export function createGiveaway(entry) { const row = { ...entry, active: true, createdAt: new Date().toISOString() }; db.giveaways.push(row); save(); return clone(row); }
export const dueGiveaways = (now = Date.now()) => clone(db.giveaways.filter(row => row.active && row.endsAt <= now));
export const listGiveaways = guildId => clone(db.giveaways.filter(row => row.guildId === String(guildId)).slice(-25).reverse());
export function completeGiveaway(id) { const row = db.giveaways.find(item => item.id === id); if (row) { row.active = false; row.completedAt = new Date().toISOString(); save(); } }

export function setStickyRoles(guildId, userId, roleIds) { db.stickyRoles[`${guildId}:${userId}`] = [...new Set(roleIds)]; save(); }
export const getStickyRoles = (guildId, userId) => clone(db.stickyRoles[`${guildId}:${userId}`] || []);

export function setStarboardEntry(guildId, sourceMessageId, data) { db.starboard[`${guildId}:${sourceMessageId}`] = data; save(); }
export const getStarboardEntry = (guildId, sourceMessageId) => clone(db.starboard[`${guildId}:${sourceMessageId}`] || null);
export function deleteStarboardEntry(guildId, sourceMessageId) { delete db.starboard[`${guildId}:${sourceMessageId}`]; save(); }

export function recordMigration(guildId, userId, data) {
  const key = `${guildId}:${userId}`;
  if (!db.migrations[key]) incrementStat(guildId, 'migrated');
  db.migrations[key] = { destinationGuildId: String(guildId), userId: String(userId), completedAt: new Date().toISOString(), ...data };
  save();
  return clone(db.migrations[key]);
}
export const getMigration = (guildId, userId) => clone(db.migrations[`${guildId}:${userId}`] || null);

export function createAppeal(entry) {
  const existing = db.appeals.find(row => row.guildId === String(entry.guildId) && row.userId === String(entry.userId) && row.status === 'open');
  if (existing) return { duplicate: true, appeal: clone(existing) };
  const row = { id: randomToken(6), status: 'open', createdAt: new Date().toISOString(), ...entry, guildId: String(entry.guildId), userId: String(entry.userId) };
  db.appeals.push(row);
  save();
  return { duplicate: false, appeal: clone(row) };
}
export const getAppeal = (guildId, id) => clone(db.appeals.find(row => row.guildId === String(guildId) && row.id === String(id)) || null);
export function listAppeals(guildId, status = '') { return clone(db.appeals.filter(row => row.guildId === String(guildId) && (!status || row.status === status)).slice(-50).reverse()); }
export function resolveAppeal(guildId, id, data) {
  const row = db.appeals.find(item => item.guildId === String(guildId) && item.id === String(id));
  if (!row) return null;
  Object.assign(row, data, { resolvedAt: new Date().toISOString() });
  save();
  return clone(row);
}

export function updateBilling(guildId, patch) {
  const cfg = updateGuildConfig(guildId, { billing: patch });
  if (cfg.billing.stripeSubscriptionId) db.billingSubscriptions[cfg.billing.stripeSubscriptionId] = String(guildId);
  save();
  return cfg.billing;
}
export const guildForSubscription = subscriptionId => db.billingSubscriptions[String(subscriptionId)] || '';

export function snapshot() { return clone(db); }
export function exportGuildData(guildId) {
  const id = String(guildId);
  return clone({
    exportedAt: new Date().toISOString(),
    config: getGuildConfig(id),
    cases: db.cases.filter(row => row.guildId === id),
    warnings: db.warnings.filter(row => row.guildId === id),
    notes: db.notes.filter(row => row.guildId === id),
    appeals: db.appeals.filter(row => row.guildId === id),
    auditEvents: db.auditEvents.filter(row => row.guildId === id),
    migrations: Object.values(db.migrations).filter(row => row.destinationGuildId === id)
  });
}

export function createWebSession(data, ttlMs = 8 * 60 * 60_000) {
  const id = randomToken(32);
  db.webSessions[id] = { ...data, csrf: randomToken(20), expiresAt: Date.now() + ttlMs };
  save();
  return { id, session: clone(db.webSessions[id]) };
}

export function getWebSession(id) {
  const key = String(id || '');
  const session = db.webSessions[key];
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    delete db.webSessions[key];
    save();
    return null;
  }
  return clone(session);
}

export function deleteWebSession(id) {
  const key = String(id || '');
  if (!db.webSessions[key]) return false;
  delete db.webSessions[key];
  save();
  return true;
}

export function createOAuthState(data, ttlMs = 10 * 60_000) {
  const token = randomToken(24);
  db.oauthStates[token] = { ...data, expiresAt: Date.now() + ttlMs };
  save();
  return token;
}

export function consumeOAuthState(token) {
  const key = String(token || '');
  const state = db.oauthStates[key];
  delete db.oauthStates[key];
  save();
  return state && state.expiresAt > Date.now() ? clone(state) : null;
}

export function pruneWebAuth(now = Date.now()) {
  let changed = false;
  for (const [id, session] of Object.entries(db.webSessions)) {
    if (session.expiresAt <= now) { delete db.webSessions[id]; changed = true; }
  }
  for (const [id, state] of Object.entries(db.oauthStates)) {
    if (state.expiresAt <= now) { delete db.oauthStates[id]; changed = true; }
  }
  if (changed) save();
}
