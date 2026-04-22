// api/popup-event.js
// Fire-and-forget analytics sink for popup impressions / clicks / dismisses.
// Inserts into popup_events. Silent failure acceptable — do not propagate errors to the client.

function allowedOrigins() {
  const base = [
    'https://bwanabet.com', 'https://www.bwanabet.com',
    'https://bwanabet.co.zm', 'https://www.bwanabet.co.zm',
    'https://bet-assist.vercel.app',
  ];
  if (process.env.WIDGET_DEV === 'true') base.push('http://localhost:3000');
  return base;
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allow = allowedOrigins();
  const match = allow.includes(origin) || origin.endsWith('-bwanabetcrms-projects.vercel.app');
  res.setHeader('Access-Control-Allow-Origin', match ? origin : allow[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

const ALLOWED_EVENT = new Set(['impression', 'click', 'dismiss']);
const ALLOWED_CONTENT = new Set(['match', 'casino', 'teaser']);

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { event_type, slot_id, slot_date, content_type, content_id, browser_id } = req.body || {};

    if (!ALLOWED_EVENT.has(event_type) || !ALLOWED_CONTENT.has(content_type)) {
      return res.status(400).json({ error: 'Invalid event_type or content_type' });
    }
    if (typeof slot_id !== 'string' || typeof slot_date !== 'string') {
      return res.status(400).json({ error: 'Missing slot_id or slot_date' });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return res.status(200).json({ ok: false, reason: 'no-storage' });

    // Await the insert so Vercel doesn't terminate the function before fetch completes.
    // Small latency cost (~50-100ms) in exchange for reliable event persistence.
    try {
      const r = await fetch(`${url}/rest/v1/popup_events`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          event_type, slot_id, slot_date, content_type,
          content_id: content_id || null,
          browser_id: browser_id || null,
        }),
      });
      if (!r.ok) {
        console.error('[popup-event] insert HTTP', r.status, await r.text());
        return res.status(200).json({ ok: false });
      }
    } catch (err) {
      console.error('[popup-event] insert threw:', err?.message);
      return res.status(200).json({ ok: false });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[popup-event] Error:', err);
    return res.status(200).json({ ok: false });
  }
}
