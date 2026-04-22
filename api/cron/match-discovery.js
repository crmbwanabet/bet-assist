// api/cron/match-discovery.js
// Vercel cron: fetches upcoming fixtures from ESPN and upserts big ones to popup_matches.
// Runs 6x/day (03:45/07:45/11:45/15:45/19:45/23:45 CAT per vercel.json).
//
// No dependency on widget-chat.js — uses its own minimal ESPN fetcher.

import { TOP_CLUBS, TOP_CLUBS_AFRICA, isInClubList, findDerby } from '../popup-lists.js';

const LEAGUES = [
  // Tier-1 European (EU)
  { code: 'eng.1',            name: 'Premier League',            tag: 'tier1' },
  { code: 'esp.1',            name: 'La Liga',                   tag: 'tier1' },
  { code: 'ger.1',            name: 'Bundesliga',                tag: 'tier1' },
  { code: 'ita.1',            name: 'Serie A',                   tag: 'tier1' },
  { code: 'fra.1',            name: 'Ligue 1',                   tag: 'tier1' },
  { code: 'uefa.champions',   name: 'UEFA Champions League',     tag: 'tier1' },
  { code: 'uefa.europa',      name: 'UEFA Europa League',        tag: 'tier1' },
  // African / continental
  { code: 'zam.1',            name: 'Zambia Super League',       tag: 'zambia' },
  { code: 'rsa.1',            name: 'South African Premiership', tag: 'african' },
  { code: 'egy.1',            name: 'Egyptian Premier League',   tag: 'african' },
  { code: 'mar.1',            name: 'Moroccan Botola',           tag: 'african' },
  { code: 'tun.1',            name: 'Tunisian L1',               tag: 'african' },
  { code: 'caf.champions',    name: 'CAF Champions League',      tag: 'caf' },
  { code: 'caf.confederation', name: 'CAF Confederation Cup',    tag: 'caf' },
];

const DAYS_AHEAD = 3;
const KNOCKOUT_RE = /round of 16|quarter|semi|final|r16|qtf|semf|fnl/i;

function fmtDate(d) {
  return d.toISOString().slice(0,10).replace(/-/g,'');
}

function hashId(home, away, kickoffUtc) {
  const src = `${home}|${away}|${kickoffUtc}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `m_${h.toString(36)}`;
}

async function fetchLeague(league) {
  const start = new Date();
  const end = new Date(start.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const range = `${fmtDate(start)}-${fmtDate(end)}`;
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league.code)}/scoreboard?dates=${range}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    return events.flatMap(evt => {
      const comp = evt?.competitions?.[0];
      if (!comp) return [];
      const competitors = comp.competitors || [];
      const home = competitors.find(c => c.homeAway === 'home')?.team?.displayName;
      const away = competitors.find(c => c.homeAway === 'away')?.team?.displayName;
      if (!home || !away) return [];
      const kickoff = evt.date;
      const stage = comp?.type?.name || comp?.type?.text || comp?.type?.abbreviation || '';
      return [{
        home, away,
        kickoff_utc: kickoff,
        league: league.name,
        league_code: league.code,
        tag: league.tag,
        stage,
      }];
    });
  } catch (err) {
    console.error(`[match-discovery] ${league.code} fetch failed:`, err?.message || err);
    return [];
  }
}

function qualify(match) {
  const { home, away, tag } = match;
  const isTier1 = tag === 'tier1';
  const isCaf = tag === 'caf';
  const isZambiaLeague = tag === 'zambia';
  const isAfrican = tag === 'african' || isZambiaLeague;

  const topClubEuro = isInClubList(home, TOP_CLUBS) || isInClubList(away, TOP_CLUBS);
  const topClubAfrica = isInClubList(home, TOP_CLUBS_AFRICA) || isInClubList(away, TOP_CLUBS_AFRICA);
  const derby = findDerby(home, away);
  const isKnockout = KNOCKOUT_RE.test(match.stage || '');
  // "Zambia" in TOP_CLUBS_AFRICA matches the national team via isInClubList
  const isZambiaMatch = isInClubList(home, ['Zambia']) || isInClubList(away, ['Zambia']) || isZambiaLeague;

  const qualifies =
    (isTier1 && topClubEuro) ||
    !!derby ||
    isKnockout ||
    isCaf ||
    (isAfrican && topClubAfrica) ||
    isZambiaMatch;

  return {
    qualifies,
    is_tier_1: isTier1,
    is_knockout: isKnockout,
    is_derby: !!derby,
    derby_name: derby ? derby.name : null,
    is_zambia: isZambiaMatch,
    is_african: isAfrican,
  };
}

function toRow(match) {
  const q = qualify(match);
  if (!q.qualifies) return null;
  return {
    id: hashId(match.home, match.away, match.kickoff_utc),
    home_team: match.home,
    away_team: match.away,
    league: match.league,
    league_code: match.league_code,
    kickoff_utc: match.kickoff_utc,
    is_derby: q.is_derby,
    derby_name: q.derby_name,
    is_tier_1: q.is_tier_1,
    is_knockout: q.is_knockout,
    is_zambia: q.is_zambia,
    is_african: q.is_african,
    updated_at: new Date().toISOString(),
  };
}

async function upsertMatches(rows) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  if (rows.length === 0) return;

  const resp = await fetch(`${url}/rest/v1/popup_matches`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Upsert failed ${resp.status}: ${txt}`);
  }
}

async function purgeOld() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const resp = await fetch(`${url}/rest/v1/popup_matches?kickoff_utc=lt.${encodeURIComponent(cutoff)}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
  });
  if (!resp.ok && resp.status !== 204) {
    const txt = await resp.text();
    console.warn(`[match-discovery] purge failed ${resp.status}: ${txt}`);
  }
}

export default async function handler(req, res) {
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers['x-cron-secret'] !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const t0 = Date.now();
  try {
    const leagueResults = await Promise.all(LEAGUES.map(fetchLeague));
    const allMatches = leagueResults.flat();
    const rows = allMatches.map(toRow).filter(Boolean);

    await upsertMatches(rows);
    await purgeOld();

    const dur = Date.now() - t0;
    console.log(`[match-discovery] ${allMatches.length} raw, ${rows.length} qualifying, upserted in ${dur}ms`);
    return res.status(200).json({
      ok: true,
      raw_count: allMatches.length,
      qualifying_count: rows.length,
      duration_ms: dur,
    });
  } catch (err) {
    console.error('[match-discovery] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
