// api/popup-plan.js
// Responds with the popup payload the widget should render for the current slot.
// Fail-open: any unexpected error returns a teaser payload so a popup always shows.

import { selectContent } from './popup-selector.js';

const CAT_OFFSET_MS = 2 * 60 * 60 * 1000;
const SLOT_HOURS_CAT = [0, 4, 8, 12, 16, 20];

const TEASER_FALLBACK = {
  slotId: null,
  slotDate: null,
  type: 'teaser',
  subtype: null,
  title: null,
  body: 'Try **Bwanabet** new AI chatbot to predict bets and check stats!',
  chatPrompt: null,
  fireChat: false,
  ttlSeconds: 30,
};

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function parseShown(shown) {
  if (!shown) return [];
  return String(shown).split(',').map(pair => {
    const [slot, type] = pair.split(':').map(s => s.trim());
    return slot && type ? { slot, type } : null;
  }).filter(Boolean);
}

function currentSlotDateTime(now) {
  const cat = new Date(now.getTime() + CAT_OFFSET_MS);
  const catHour = cat.getUTCHours();
  const slotCatHour = SLOT_HOURS_CAT.filter(h => h <= catHour).pop() ?? 0;
  const slotDateCat = new Date(cat);
  slotDateCat.setUTCHours(slotCatHour, 0, 0, 0);
  return new Date(slotDateCat.getTime() - CAT_OFFSET_MS);
}

async function loadMatches() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];
  const nowIso = new Date().toISOString();
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const q = `kickoff_utc=gte.${encodeURIComponent(nowIso)}&kickoff_utc=lt.${encodeURIComponent(inThreeDays)}&select=*&order=kickoff_utc.asc&limit=100`;
  const resp = await fetch(`${url}/rest/v1/popup_matches?${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) return [];
  return await resp.json();
}

async function loadHotGames() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];
  const resp = await fetch(
    `${url}/rest/v1/hot_games?active=eq.true&select=name,category,rtp,description&order=weight.desc&limit=10`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!resp.ok) return [];
  return await resp.json();
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const nowParam = req.query?.now || new Date().toISOString();
    const shownParam = req.query?.shown || '';
    const now = new Date(nowParam);
    if (Number.isNaN(now.getTime())) {
      return res.status(200).json(TEASER_FALLBACK);
    }

    const slotDateTime = currentSlotDateTime(now);
    const shownToday = parseShown(shownParam);

    const [matches, hotGames] = await Promise.all([loadMatches(), loadHotGames()]);
    const payload = selectContent({ slotDateTime, shownToday, matches, hotGames });
    return res.status(200).json(payload);
  } catch (err) {
    console.error('[popup-plan] Error — falling back to teaser:', err);
    return res.status(200).json(TEASER_FALLBACK);
  }
}
