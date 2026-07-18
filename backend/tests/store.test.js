import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'moderationdesk-store-'));
process.env.DATA_DIR = directory;
const store = await import(`../src/store.js?test=${Date.now()}`);

test('guild configuration is isolated and deep-merged', () => {
  store.updateGuildConfig('guild-a', { automod: { enabled: true } });
  assert.equal(store.getGuildConfig('guild-a').automod.enabled, true);
  assert.equal(store.getGuildConfig('guild-a').automod.antiInvites, true);
  assert.equal(store.getGuildConfig('guild-a').security.joinGate.action, 'quarantine');
  assert.equal(store.getGuildConfig('guild-a').moderation.escalation.firstThreshold, 3);
  assert.equal(store.getGuildConfig('guild-b').automod.enabled, false);
});

test('cases and warnings retain auditable identifiers', () => {
  const moderationCase = store.recordCase({ guildId: 'guild-a', userId: 'user-a', moderatorId: 'mod-a', action: 'warn', reason: 'Test' });
  assert.equal(moderationCase.id, 1);
  const warning = store.addWarning({ guildId: 'guild-a', userId: 'user-a', moderatorId: 'mod-a', reason: 'Test', caseId: moderationCase.id });
  assert.ok(warning.id);
  assert.equal(store.listWarnings('guild-a', 'user-a').length, 1);
  assert.equal(store.clearWarning('guild-a', 'user-a', warning.id), 1);
  assert.equal(store.listWarnings('guild-a', 'user-a').length, 0);
});

test('web sessions and OAuth states survive process memory boundaries', () => {
  const created = store.createWebSession({ user: { id: 'user-a' }, guilds: [] }, 60_000);
  assert.equal(store.getWebSession(created.id).user.id, 'user-a');
  assert.ok(store.getWebSession(created.id).csrf);
  assert.equal(store.deleteWebSession(created.id), true);
  assert.equal(store.getWebSession(created.id), null);

  const state = store.createOAuthState({ kind: 'dashboard', returnTo: '/dashboard' }, 60_000);
  assert.equal(store.consumeOAuthState(state).returnTo, '/dashboard');
  assert.equal(store.consumeOAuthState(state), null);
});

test('dashboard activity is retained per guild and newest first', () => {
  store.recordAuditEvent({ guildId: 'guild-a', category: 'configuration', action: 'automod_updated', actorId: 'mod-a', actorName: 'Moderator', summary: 'AutoMod was updated.' });
  store.recordAuditEvent({ guildId: 'guild-b', category: 'logging', action: 'log_delivery_tested', actorId: 'mod-b', actorName: 'Other moderator', summary: 'Log delivery was tested.' });
  const events = store.listAuditEvents('guild-a');
  assert.equal(events.length, 1);
  assert.equal(events[0].action, 'automod_updated');
  assert.equal(events[0].actorName, 'Moderator');
});
