// test/popup-plan.integration.test.js
// Exercises the deployed /api/popup-plan endpoint.
// Runs against bet-assist.vercel.app by default. Override with POPUP_INTEGRATION_URL.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.POPUP_INTEGRATION_URL || 'https://bet-assist.vercel.app';
const ORIGIN = 'https://bet-assist.vercel.app';

async function fetchPlan(shown) {
  const now = new Date().toISOString();
  const url = `${BASE}/api/popup-plan?now=${encodeURIComponent(now)}&shown=${encodeURIComponent(shown)}`;
  const resp = await fetch(url, { headers: { Origin: ORIGIN } });
  assert.equal(resp.ok, true, `HTTP ${resp.status}`);
  return await resp.json();
}

test('popup-plan returns a payload with required fields', async () => {
  const p = await fetchPlan('');
  assert.ok(['match', 'casino', 'teaser', 'none'].includes(p.type),
    `type must be one of match|casino|teaser|none, got ${p.type}`);
  if (p.type !== 'none') {
    assert.equal(typeof p.body, 'string');
    assert.equal(typeof p.slotId, 'string');
    assert.equal(typeof p.ttlSeconds, 'number');
    assert.ok(p.ttlSeconds > 0);
  }
});

test('popup-plan respects 3-match cap', async () => {
  const p = await fetchPlan('0:match,4:match,8:match');
  assert.notEqual(p.type, 'match',
    `Expected non-match content after cap, got ${p.type}`);
});

test('popup-plan match payload has chatPrompt and fireChat', async () => {
  const p = await fetchPlan('');
  if (p.type === 'match') {
    assert.ok(p.chatPrompt?.startsWith('Give me a pick for'),
      `match chatPrompt should start with "Give me a pick for", got: ${p.chatPrompt}`);
    assert.equal(p.fireChat, true);
  }
});

test('popup-plan casino payload has correct chatPrompt shape', async () => {
  const p = await fetchPlan('0:match,4:match,8:match,12:match');
  if (p.type === 'casino') {
    assert.ok(p.chatPrompt?.startsWith('How do I win on'),
      `casino chatPrompt should start with "How do I win on", got: ${p.chatPrompt}`);
    assert.equal(p.fireChat, true);
  }
});

test('popup-plan teaser payload has null chatPrompt', async () => {
  // Force teaser by implicitly over-capping matches and (likely) no casino.
  // This test is opportunistic — teaser may or may not surface depending on hot_games state.
  const p = await fetchPlan('0:match,4:match,8:match');
  if (p.type === 'teaser') {
    assert.equal(p.chatPrompt, null);
    assert.equal(p.fireChat, false);
    assert.ok(p.body.includes('Bwanabet'),
      'teaser body should mention Bwanabet');
  }
});
