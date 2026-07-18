import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { __test } from '../src/billing.js';

test('Stripe signature verification accepts a valid v1 signature', () => {
  const payload = '{"id":"evt_test"}';
  const secret = 'whsec_test_secret';
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  assert.equal(__test.verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret), true);
  assert.equal(__test.verifyStripeSignature(payload, `t=${timestamp},v1=00`, secret), false);
});
