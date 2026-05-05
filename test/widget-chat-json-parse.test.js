// test/widget-chat-json-parse.test.js
// Regression tests for the "Widget exception: Unexpected token '<'" leak.
// Apr 29 fix added a content-type header guard before .json(); May 4 fix
// extended that to read body-as-text and JSON.parse, so HTML responses with
// a "Content-Type: application/json" header are also handled gracefully.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Ensure no real upstream calls slip through in the test env
process.env.OPENAI_API_KEY = 'sk-test-dummy';
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;
delete process.env.SLACK_WEBHOOK_URL;

const handler = (await import('../api/widget-chat.js')).default;

function makeRes() {
  const calls = [];
  const chain = {
    end: () => { calls.push({ kind: 'end' }); return chain; },
    json: (body) => { calls.push({ kind: 'json', body }); return chain; },
  };
  const res = {
    setHeader: () => res,
    status: (code) => { calls.push({ kind: 'status', code }); return chain; },
    calls,
  };
  return res;
}

function makeReq(userMsg, sessionId = 'test_session') {
  return {
    method: 'POST',
    headers: { origin: 'https://bwanabet.co.zm' },
    body: {
      messages: [{ role: 'user', content: userMsg }],
      session_id: sessionId,
    },
  };
}

function fakeResponse({ status, contentType, body }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => k.toLowerCase() === 'content-type' ? contentType : null },
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

async function runWithMockedFetch(mockFetch, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try { return await fn(); } finally { globalThis.fetch = original; }
}

const HTML_BODY = '<!DOCTYPE html><html><body>Cloudflare 502</body></html>';

test('returns 502 when OpenAI body is HTML and Content-Type lies as application/json', async () => {
  await runWithMockedFetch(
    async () => fakeResponse({ status: 200, contentType: 'application/json', body: HTML_BODY }),
    async () => {
      const req = makeReq('BrazilSerie A GremioCR Flamengo', 'test_ct_lie');
      const res = makeRes();
      await assert.doesNotReject(() => handler(req, res));
      const status = res.calls.find(c => c.kind === 'status');
      assert.equal(status?.code, 502, 'expected graceful 502 instead of throwing');
    }
  );
});

test('returns 502 when OpenAI body is HTML and Content-Type is text/html (Apr 29 case)', async () => {
  await runWithMockedFetch(
    async () => fakeResponse({ status: 502, contentType: 'text/html', body: HTML_BODY }),
    async () => {
      const req = makeReq('hello', 'test_ct_html');
      const res = makeRes();
      await assert.doesNotReject(() => handler(req, res));
      const status = res.calls.find(c => c.kind === 'status');
      assert.equal(status?.code, 502);
    }
  );
});

test('returns 502 when OpenAI body is empty (truncated stream)', async () => {
  await runWithMockedFetch(
    async () => fakeResponse({ status: 200, contentType: 'application/json', body: '' }),
    async () => {
      const req = makeReq('hello', 'test_empty');
      const res = makeRes();
      await assert.doesNotReject(() => handler(req, res));
      const status = res.calls.find(c => c.kind === 'status');
      assert.equal(status?.code, 502);
    }
  );
});
