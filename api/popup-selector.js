// api/popup-selector.js
// Pure priority selector. No I/O.
// Given slot time + shown history + available matches + hot casino games,
// returns the popup payload to render (or the teaser fallback).

const CAT_OFFSET_MS = 2 * 60 * 60 * 1000; // CAT = UTC+2

const TEASER_BODY = 'Try **Bwanabet** new AI chatbot to predict bets and check stats!';

function toCAT(date) {
  return new Date(date.getTime() + CAT_OFFSET_MS);
}

// Deterministic hash -> 0..n-1 index (FNV-1a on string).
function rotateIndex(key, n) {
  if (n <= 0) return 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h % n;
}

function slotIdFor(slotDateTime) {
  const cat = toCAT(slotDateTime);
  return String(cat.getUTCHours());
}

function catDateStr(d) {
  const cat = toCAT(d);
  return cat.toISOString().slice(0, 10);
}

function sameCATDay(a, b) {
  return catDateStr(a) === catDateStr(b);
}

function daysApartCAT(a, b) {
  const aDay = new Date(catDateStr(a) + 'T00:00:00Z');
  const bDay = new Date(catDateStr(b) + 'T00:00:00Z');
  return Math.round((bDay - aDay) / (24 * 60 * 60 * 1000));
}

function formatKickoff(matchUtc, slotDateTime) {
  const kickoff = new Date(matchUtc);
  const catKick = toCAT(kickoff);
  const hh = String(catKick.getUTCHours()).padStart(2, '0');
  const mm = String(catKick.getUTCMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;
  const days = daysApartCAT(slotDateTime, kickoff);
  if (days === 0) return `Today at ${time} CAT`;
  if (days === 1) return `Tomorrow at ${time} CAT`;
  const weekday = catKick.toLocaleDateString('en-ZA', { weekday: 'long', timeZone: 'UTC' });
  return `${weekday} at ${time} CAT`;
}

function buildMatchPayload(match, subtype, slotDateTime, slotId) {
  const home = match.home_team;
  const away = match.away_team;
  const kickoffStr = formatKickoff(match.kickoff_utc, slotDateTime);
  const titleLead = match.is_derby && match.derby_name ? match.derby_name : `${home} vs ${away}`;
  const titleBody = match.is_derby && match.derby_name ? `${home} vs ${away}` : '';
  // Enrich the auto-fired chat prompt with kickoff + league so the bot doesn't
  // need a second ESPN round-trip just to surface those values in its reply.
  const leagueSuffix = match.league ? `, ${match.league}` : '';
  const chatPrompt = `Give me a pick for ${home} vs ${away} (kickoff ${kickoffStr}${leagueSuffix})`;
  return {
    slotId,
    slotDate: catDateStr(slotDateTime),
    type: 'match',
    subtype,
    title: titleLead,
    body: titleBody ? `${titleBody} \u2014 ${kickoffStr}. Get a pick \u2192` : `${kickoffStr}. Get a pick \u2192`,
    chatPrompt,
    fireChat: true,
    ttlSeconds: 30,
  };
}

function buildCasinoPayload(game, slotDateTime, slotId) {
  return {
    slotId,
    slotDate: catDateStr(slotDateTime),
    type: 'casino',
    subtype: null,
    title: game.name,
    body: `**${game.name}** is hot today. Get winning tips \u2192`,
    chatPrompt: `How do I win on ${game.name}`,
    fireChat: true,
    ttlSeconds: 30,
  };
}

function buildTeaserPayload(slotDateTime, slotId) {
  return {
    slotId,
    slotDate: catDateStr(slotDateTime),
    type: 'teaser',
    subtype: null,
    title: null,
    body: TEASER_BODY,
    chatPrompt: null,
    fireChat: false,
    ttlSeconds: 30,
  };
}

/**
 * Pick the content payload for the given slot, respecting the priority order
 * and the 3-match cap per browser per day.
 */
export function selectContent({ slotDateTime, shownToday = [], matches = [], hotGames = [] }) {
  const slotId = slotIdFor(slotDateTime);

  const matchCount = shownToday.filter(s => s.type === 'match').length;
  const canShowMatch = matchCount < 3;

  if (canShowMatch) {
    const morningCandidates = matches
      .filter(m => {
        const k = new Date(m.kickoff_utc);
        return sameCATDay(k, slotDateTime) && k.getTime() > slotDateTime.getTime();
      })
      .sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc));
    if (morningCandidates.length > 0) {
      const pick = morningCandidates[rotateIndex(slotId + catDateStr(slotDateTime) + 'morning', morningCandidates.length)];
      return buildMatchPayload(pick, 'morning_of', slotDateTime, slotId);
    }
  }

  if (canShowMatch) {
    const t1 = matches.filter(m => daysApartCAT(slotDateTime, new Date(m.kickoff_utc)) === 1)
      .sort((a, b) => a.home_team.localeCompare(b.home_team));
    if (t1.length > 0) {
      const pick = t1[rotateIndex(slotId + catDateStr(slotDateTime) + 't1', t1.length)];
      return buildMatchPayload(pick, 't1', slotDateTime, slotId);
    }
  }

  if (canShowMatch) {
    const t2 = matches.filter(m => daysApartCAT(slotDateTime, new Date(m.kickoff_utc)) === 2)
      .sort((a, b) => a.home_team.localeCompare(b.home_team));
    if (t2.length > 0) {
      const pick = t2[rotateIndex(slotId + catDateStr(slotDateTime) + 't2', t2.length)];
      return buildMatchPayload(pick, 't2', slotDateTime, slotId);
    }
  }

  if (hotGames.length > 0) {
    const game = hotGames[rotateIndex(slotId + catDateStr(slotDateTime) + 'casino', hotGames.length)];
    return buildCasinoPayload(game, slotDateTime, slotId);
  }

  return buildTeaserPayload(slotDateTime, slotId);
}
