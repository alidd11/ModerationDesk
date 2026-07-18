import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatDuration, isSnowflake, parseDuration, safeUrlDomain } from '../src/utils.js';

test('parseDuration enforces Discord timeout bounds', () => {
  assert.equal(parseDuration('30m'), 1_800_000);
  assert.equal(parseDuration('4w'), 2_419_200_000);
  assert.equal(parseDuration('5w'), 0);
  assert.equal(parseDuration('invalid'), 0);
});

test('formatDuration returns compact values', () => {
  assert.equal(formatDuration(7 * 86_400_000), '1w');
  assert.equal(formatDuration(2 * 3_600_000), '2h');
});

test('HTML and domain helpers normalise input', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(safeUrlDomain('https://www.Example.com/path'), 'example.com');
  assert.equal(isSnowflake('123456789012345678'), true);
  assert.equal(isSnowflake('123'), false);
});
