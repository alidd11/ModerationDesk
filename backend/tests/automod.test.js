import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'moderationdesk-automod-'));
const { inspectAutomodContent } = await import(`../src/automod.js?test=${Date.now()}`);

const baseConfig = {
  antiInvites: false,
  antiLinks: false,
  antiMassMentions: false,
  antiCaps: false,
  allowedInviteCodes: [],
  allowedDomains: [],
  blockedWords: [],
  maxMentions: 5,
  maxCapsPercent: 80,
  minCapsLength: 18
};

test('AutoMod content inspector recognises direct-content rules', () => {
  const blocked = inspectAutomodContent('This contains a forbidden phrase.', { ...baseConfig, blockedWords: ['forbidden phrase'] });
  assert.deepEqual(blocked, { rule: 'blockedWords', reason: 'Blocked word or phrase' });

  const invite = inspectAutomodContent('Join https://discord.gg/not-allowed', { ...baseConfig, antiInvites: true });
  assert.deepEqual(invite, { rule: 'invites', reason: 'Unauthorised Discord invite' });

  const caps = inspectAutomodContent('THIS MESSAGE IS ALL CAPITAL LETTERS', { ...baseConfig, antiCaps: true, minCapsLength: 10, maxCapsPercent: 75 });
  assert.deepEqual(caps, { rule: 'caps', reason: 'Excessive capital letters' });
});

test('AutoMod content inspector respects allowed domains and mention limits', () => {
  const allowed = inspectAutomodContent('Read https://docs.example.com/start', { ...baseConfig, antiLinks: true, allowedDomains: ['example.com'] });
  assert.equal(allowed, null);

  const mentions = inspectAutomodContent('Hello everyone', { ...baseConfig, antiMassMentions: true, maxMentions: 3 }, { mentionCount: 3 });
  assert.deepEqual(mentions, { rule: 'mentions', reason: 'Mass mentions' });
});
