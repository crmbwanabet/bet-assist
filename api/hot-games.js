// ============================================
// BetPredict — Hot Games Daily Rotation API
// Picks 4 games per day, spread across categories,
// weighted by popularity, rotated by last_featured date.
// Results cached for 1 day.
// ============================================

let cachedGames = null;
let cacheDate = null;

function getTodayStr() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

async function supabaseQuery(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (!r.ok) return null;
  return r.json();
}

async function supabaseUpdate(ids, date) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  // Update last_featured for selected games
  for (const id of ids) {
    await fetch(`${url}/rest/v1/hot_games?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ last_featured: date }),
    }).catch(() => {});
  }
}

function selectDailyGames(allGames) {
  if (!allGames || allGames.length === 0) return [];

  // Sort by: last_featured oldest first (nulls = never featured = highest priority), then by weight descending
  const sorted = [...allGames].sort((a, b) => {
    const aDate = a.last_featured || '2000-01-01';
    const bDate = b.last_featured || '2000-01-01';
    if (aDate !== bDate) return aDate.localeCompare(bDate); // oldest first
    return (b.weight || 5) - (a.weight || 5); // higher weight first
  });

  const selected = [];
  const categoryCount = {};
  const MAX_PER_CATEGORY = 2;
  const TOTAL = 4;

  // Always include Aviator if active (it's the #1 game)
  const aviator = sorted.find(g => g.name === 'Aviator');
  if (aviator) {
    selected.push(aviator);
    categoryCount[aviator.category] = 1;
  }

  // Fill remaining slots
  for (const game of sorted) {
    if (selected.length >= TOTAL) break;
    if (selected.find(s => s.id === game.id)) continue; // skip already selected

    const catCount = categoryCount[game.category] || 0;
    if (catCount >= MAX_PER_CATEGORY) continue; // category limit

    // Weighted random — higher weight = more likely, but not guaranteed
    const chance = (game.weight || 5) / 10;
    if (Math.random() > chance && sorted.indexOf(game) > 6) continue; // skip low-weight games sometimes

    selected.push(game);
    categoryCount[game.category] = catCount + 1;
  }

  // If we didn't fill 4 slots (unlikely), fill from top of sorted
  for (const game of sorted) {
    if (selected.length >= TOTAL) break;
    if (!selected.find(s => s.id === game.id)) {
      selected.push(game);
    }
  }

  return selected.slice(0, TOTAL);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const today = getTodayStr();

  // Return cache if same day
  if (cachedGames && cacheDate === today) {
    return res.status(200).json({ date: today, games: cachedGames, cached: true });
  }

  try {
    const allGames = await supabaseQuery('hot_games?active=eq.true&select=*&order=last_featured.asc.nullsfirst,weight.desc');
    if (!allGames || allGames.length === 0) {
      return res.status(200).json({ date: today, games: [], error: 'No active games found' });
    }

    const selected = selectDailyGames(allGames);

    // Update last_featured in background
    supabaseUpdate(selected.map(g => g.id), today).catch(() => {});

    // Format for client consumption
    const games = selected.map(g => ({
      name: g.name,
      category: g.category,
      provider: g.provider,
      rtp: g.rtp,
      description: g.description,
      url: g.bwanabet_url,
      min_bet: g.min_bet_zmw,
    }));

    // Cache
    cachedGames = games;
    cacheDate = today;

    return res.status(200).json({ date: today, games });

  } catch (error) {
    console.error('[hot-games] Error:', error);
    return res.status(500).json({ error: 'Failed to load hot games' });
  }
}
