// ============================================
// BetExpert Widget — Self-Contained Chat Endpoint
// All-in-one: sports engine + system prompt + tool loop + monitoring
// No external imports — everything inline for Vercel compatibility
// ============================================

// ============================================
// BetExpert — Server-Side Sports Engine
// Extracted from index.html for use in Vercel serverless functions.
// Provides: ESPN data fetching, tool definitions, and executeTool().
// ============================================

// ============================================
// ALL_SPORTS CONFIG
// ============================================
const ALL_SPORTS = {
  soccer: {
    name: 'Soccer/Football',
    leagues: {
      'eng.1': 'Premier League', 'eng.2': 'Championship', 'eng.fa': 'FA Cup',
      'esp.1': 'La Liga', 'esp.copa_del_rey': 'Copa del Rey',
      'ger.1': 'Bundesliga', 'ger.dfb_pokal': 'DFB Pokal',
      'ita.1': 'Serie A', 'ita.coppa_italia': 'Coppa Italia',
      'fra.1': 'Ligue 1', 'fra.coupe_de_france': 'Coupe de France',
      'ned.1': 'Eredivisie', 'por.1': 'Primeira Liga', 'bel.1': 'Belgian Pro League',
      'sco.1': 'Scottish Premiership', 'tur.1': 'Süper Lig',
      'arg.1': 'Liga Profesional', 'bra.1': 'Brasileirão',
      'usa.1': 'MLS', 'mex.1': 'Liga MX',
      'sau.1': 'Saudi Pro League', 'jpn.1': 'J1 League', 'aus.1': 'A-League',
      'rsa.1': 'PSL South Africa', 'egy.1': 'Egyptian Premier League',
      'uefa.champions': 'UEFA Champions League', 'uefa.europa': 'UEFA Europa League',
      'uefa.europa.conf': 'Conference League',
      'conmebol.libertadores': 'Copa Libertadores',
      'fifa.world': 'FIFA World Cup', 'uefa.euro': 'UEFA Euro',
      'caf.nations': 'Africa Cup of Nations',
    },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer',
  },
  basketball: {
    name: 'Basketball',
    leagues: { 'nba': 'NBA', 'wnba': 'WNBA' },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball',
  },
  football: {
    name: 'American Football',
    leagues: { 'nfl': 'NFL', 'college-football': 'NCAA Football' },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/football',
  },
  baseball: {
    name: 'Baseball',
    leagues: { 'mlb': 'MLB' },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/baseball',
  },
  hockey: {
    name: 'Ice Hockey',
    leagues: { 'nhl': 'NHL' },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/hockey',
  },
  tennis: {
    name: 'Tennis',
    leagues: { 'atp': 'ATP Tour', 'wta': 'WTA Tour' },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/tennis',
  },
  mma: {
    name: 'MMA',
    leagues: { 'ufc': 'UFC', 'pfl': 'PFL' },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/mma',
  },
  cricket: {
    name: 'Cricket',
    leagues: { 'ipl': 'IPL', 'bbl': 'Big Bash League', 'psl': 'Pakistan Super League' },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/cricket',
  },
  racing: {
    name: 'Racing',
    leagues: { 'f1': 'Formula 1', 'nascar-cup': 'NASCAR Cup Series', 'motogp': 'MotoGP' },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/racing',
  },
  rugby: {
    name: 'Rugby',
    leagues: { 'super-rugby': 'Super Rugby', 'six-nations': 'Six Nations' },
    baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/rugby',
  },
};

// ============================================
// LEAGUE ALIASES
// ============================================
const LEAGUE_ALIASES = {
  'premier league': { sport: 'soccer', league: 'eng.1' },
  'epl': { sport: 'soccer', league: 'eng.1' },
  'la liga': { sport: 'soccer', league: 'esp.1' },
  'serie a': { sport: 'soccer', league: 'ita.1' },
  'bundesliga': { sport: 'soccer', league: 'ger.1' },
  'ligue 1': { sport: 'soccer', league: 'fra.1' },
  'champions league': { sport: 'soccer', league: 'uefa.champions' },
  'europa league': { sport: 'soccer', league: 'uefa.europa' },
  'mls': { sport: 'soccer', league: 'usa.1' },
  'liga mx': { sport: 'soccer', league: 'mex.1' },
  'brasileirao': { sport: 'soccer', league: 'bra.1' },
  'saudi league': { sport: 'soccer', league: 'sau.1' },
  'eredivisie': { sport: 'soccer', league: 'ned.1' },
  'world cup': { sport: 'soccer', league: 'fifa.world' },
  'afcon': { sport: 'soccer', league: 'caf.nations' },
  'nba': { sport: 'basketball', league: 'nba' },
  'wnba': { sport: 'basketball', league: 'wnba' },
  'nfl': { sport: 'football', league: 'nfl' },
  'mlb': { sport: 'baseball', league: 'mlb' },
  'nhl': { sport: 'hockey', league: 'nhl' },
  'atp': { sport: 'tennis', league: 'atp' },
  'wta': { sport: 'tennis', league: 'wta' },
  'ufc': { sport: 'mma', league: 'ufc' },
  'f1': { sport: 'racing', league: 'f1' },
  'formula 1': { sport: 'racing', league: 'f1' },
  'nascar': { sport: 'racing', league: 'nascar-cup' },
  'ipl': { sport: 'cricket', league: 'ipl' },
  'six nations': { sport: 'rugby', league: 'six-nations' },
};

// ============================================
// FOOTBALL LEAGUE TIERS
// ============================================
const FOOTBALL_TIERS = {
  tier1: [
    { league: 'eng.1', name: 'Premier League' },
    { league: 'esp.1', name: 'La Liga' },
    { league: 'ger.1', name: 'Bundesliga' },
    { league: 'ita.1', name: 'Serie A' },
    { league: 'fra.1', name: 'Ligue 1' },
    { league: 'uefa.champions', name: 'UEFA Champions League' },
    { league: 'uefa.europa', name: 'UEFA Europa League' },
  ],
  tier2: [
    { league: 'ned.1', name: 'Eredivisie' },
    { league: 'por.1', name: 'Primeira Liga' },
    { league: 'bel.1', name: 'Belgian Pro League' },
    { league: 'sco.1', name: 'Scottish Premiership' },
    { league: 'tur.1', name: 'Süper Lig' },
    { league: 'uefa.europa.conf', name: 'Conference League' },
    { league: 'eng.2', name: 'Championship' },
    { league: 'eng.fa', name: 'FA Cup' },
    { league: 'esp.copa_del_rey', name: 'Copa del Rey' },
    { league: 'ger.dfb_pokal', name: 'DFB Pokal' },
    { league: 'ita.coppa_italia', name: 'Coppa Italia' },
    { league: 'fra.coupe_de_france', name: 'Coupe de France' },
  ],
  tier3: [
    { league: 'usa.1', name: 'MLS' },
    { league: 'mex.1', name: 'Liga MX' },
    { league: 'bra.1', name: 'Brasileirão' },
    { league: 'arg.1', name: 'Liga Profesional' },
    { league: 'sau.1', name: 'Saudi Pro League' },
    { league: 'jpn.1', name: 'J1 League' },
    { league: 'aus.1', name: 'A-League' },
    { league: 'rsa.1', name: 'PSL South Africa' },
    { league: 'egy.1', name: 'Egyptian Premier League' },
    { league: 'conmebol.libertadores', name: 'Copa Libertadores' },
    { league: 'caf.nations', name: 'Africa Cup of Nations' },
  ],
};

// ============================================
// UTILITIES
// ============================================
function resolveLeague(input) {
  const lower = input.toLowerCase().trim();
  if (LEAGUE_ALIASES[lower]) return LEAGUE_ALIASES[lower];
  for (const [alias, config] of Object.entries(LEAGUE_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) return config;
  }
  for (const [sport, config] of Object.entries(ALL_SPORTS)) {
    for (const [leagueId, leagueName] of Object.entries(config.leagues)) {
      if (leagueName.toLowerCase().includes(lower) || lower.includes(leagueName.toLowerCase())) {
        return { sport, league: leagueId };
      }
    }
  }
  return null;
}

function buildUrl(sport, league, endpoint = 'scoreboard') {
  const cfg = ALL_SPORTS[sport];
  return cfg ? `${cfg.baseUrl}/${league}/${endpoint}` : null;
}

function buildStandingsUrl(sport, league) {
  return ALL_SPORTS[sport] ? `https://site.api.espn.com/apis/v2/sports/${sport}/${league}/standings` : null;
}

async function fetchRetry(url, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
      if (r.status >= 500 && attempt < maxRetries) {
        await new Promise(res => setTimeout(res, 800 * attempt));
        continue;
      }
      return r;
    } catch (e) {
      if (attempt === maxRetries) throw e;
      await new Promise(res => setTimeout(res, 800 * attempt));
    }
  }
}

// ============================================
// ESPN FUNCTIONS
// ============================================

function buildDateRange(daysAhead = 7) {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + daysAhead);
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  return `${fmt(today)}-${fmt(end)}`;
}

async function fetchGames(leagueInput, daysAhead = 7) {
  const days = Math.min(Math.max(parseInt(daysAhead) || 7, 1), 30);
  const resolved = resolveLeague(leagueInput);
  if (!resolved) {
    // Try as direct sport
    if (ALL_SPORTS[leagueInput]) {
      const league = Object.keys(ALL_SPORTS[leagueInput].leagues)[0];
      return fetchGamesForLeague(leagueInput, league, days);
    }
    return { error: `Unknown league: ${leagueInput}. Try "Premier League", "NBA", "La Liga", etc.` };
  }
  return fetchGamesForLeague(resolved.sport, resolved.league, days);
}

async function fetchGamesForLeague(sport, league, daysAhead = 7) {
  const baseUrl = buildUrl(sport, league, 'scoreboard');
  if (!baseUrl) return { error: `Could not build URL for ${sport}/${league}` };

  const dateParam = buildDateRange(daysAhead);
  const url = `${baseUrl}?dates=${dateParam}`;

  try {
    const response = await fetchRetry(url);
    if (!response.ok) throw new Error(`ESPN API error: ${response.status}`);
    const data = await response.json();

    const games = (data.events || []).map(event => {
      const comp = event.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === 'home');
      const away = comp?.competitors?.find(c => c.homeAway === 'away');
      return {
        id: event.id,
        name: event.name,
        date: event.date,
        status: {
          state: event.status?.type?.state,
          detail: event.status?.type?.detail,
          clock: event.status?.displayClock,
        },
        homeTeam: home ? { name: home.team?.displayName, abbreviation: home.team?.abbreviation, score: home.score || '0' } : null,
        awayTeam: away ? { name: away.team?.displayName, abbreviation: away.team?.abbreviation, score: away.score || '0' } : null,
        venue: comp?.venue?.fullName,
        startTime: event.date,
      };
    });

    return {
      leagueName: ALL_SPORTS[sport]?.leagues[league] || league,
      dateRange: dateParam,
      daysAhead,
      totalGames: games.length,
      liveGames: games.filter(g => g.status.state === 'in'),
      upcomingGames: games.filter(g => g.status.state === 'pre'),
      completedGames: games.filter(g => g.status.state === 'post'),
      allGames: games.slice(0, 30),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function fetchLeagueStandings(leagueInput) {
  const resolved = resolveLeague(leagueInput);
  if (!resolved) return { error: `Unknown league: ${leagueInput}` };

  const url = buildStandingsUrl(resolved.sport, resolved.league);
  if (!url) return { error: `Standings not available for ${leagueInput}` };

  try {
    const response = await fetchRetry(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    const standings = [];
    const groups = data.children || [data];
    for (const group of groups) {
      const entries = group.standings?.entries || [];
      for (const entry of entries) {
        const stats = {};
        (entry.stats || []).forEach(s => { stats[s.name] = s.value; });
        standings.push({
          group: group.name || '',
          rank: stats.playoffSeed || stats.rank || 'N/A',
          team: entry.team?.displayName,
          played: stats.gamesPlayed || 'N/A',
          wins: stats.wins || 0,
          draws: stats.ties || stats.draws || 0,
          losses: stats.losses || 0,
          points: stats.points || 'N/A',
          winPct: stats.winPercent ? (stats.winPercent * 100).toFixed(1) + '%' : 'N/A',
          goalsFor: stats.pointsFor || stats.goalsFor || 'N/A',
          goalsAgainst: stats.pointsAgainst || stats.goalsAgainst || 'N/A',
        });
      }
    }

    return {
      leagueName: ALL_SPORTS[resolved.sport]?.leagues[resolved.league],
      standings: standings.slice(0, 25),
      totalTeams: standings.length,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function fetchGameStats(leagueInput, gameId) {
  if (!gameId) return { error: 'game_id is required. Use get_games first to find the match.' };
  const resolved = resolveLeague(leagueInput);
  if (!resolved) return { error: `Unknown league: ${leagueInput}` };

  const cfg = ALL_SPORTS[resolved.sport];
  if (!cfg) return { error: `Unknown sport: ${resolved.sport}` };
  const url = `${cfg.baseUrl}/${resolved.league}/summary?event=${gameId}`;

  try {
    const response = await fetchRetry(url);
    if (!response.ok) throw new Error(`ESPN API error: ${response.status}`);
    const data = await response.json();

    const boxscore = data.boxscore || {};
    const homeTeam = boxscore.teams?.[0];
    const awayTeam = boxscore.teams?.[1];
    if (!homeTeam || !awayTeam) return { error: `No stats available for game ${gameId}. Match may not have started.` };

    const extractStats = (teamStats) => {
      const stats = {};
      (teamStats || []).forEach(stat => {
        const key = stat.name?.toLowerCase()?.replace(/\s+/g, '_') || stat.label?.toLowerCase()?.replace(/\s+/g, '_');
        if (key) stats[key] = parseFloat(stat.displayValue) || stat.displayValue;
      });
      return stats;
    };

    const result = {
      leagueName: ALL_SPORTS[resolved.sport]?.leagues[resolved.league],
      game_id: gameId,
      home: { name: homeTeam?.team?.displayName, score: parseInt(homeTeam?.score) || 0, stats: extractStats(homeTeam?.statistics) },
      away: { name: awayTeam?.team?.displayName, score: parseInt(awayTeam?.score) || 0, stats: extractStats(awayTeam?.statistics) },
      fetchedAt: new Date().toISOString(),
    };

    if (data.keyEvents?.length) {
      result.key_events = data.keyEvents.slice(0, 15).map(e => ({
        type: e.type?.text || 'event',
        time: e.clock?.displayValue || e.period?.displayValue,
        team: e.team?.abbreviation,
        description: e.text,
      }));
    }
    if (data.rosters?.length) {
      result.lineups = {};
      data.rosters.forEach(r => {
        const abbr = r.team?.abbreviation;
        if (abbr) result.lineups[abbr] = (r.roster || []).slice(0, 15).map(p => `${p.athlete?.displayName} (${p.position?.abbreviation || 'N/A'})`);
      });
    }
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

async function searchTeam(teamName) {
  const searchLower = teamName.toLowerCase().trim();
  const results = [];
  // Reduced to 12 priority leagues for server-side speed (#6)
  const priority = [
    { sport: 'soccer', league: 'eng.1' }, { sport: 'soccer', league: 'esp.1' },
    { sport: 'soccer', league: 'ger.1' }, { sport: 'soccer', league: 'ita.1' },
    { sport: 'soccer', league: 'fra.1' }, { sport: 'soccer', league: 'uefa.champions' },
    { sport: 'basketball', league: 'nba' }, { sport: 'football', league: 'nfl' },
    { sport: 'hockey', league: 'nhl' }, { sport: 'soccer', league: 'por.1' },
    { sport: 'soccer', league: 'sau.1' }, { sport: 'soccer', league: 'rsa.1' },
  ];

  // Search in batches of 6, early exit when found
  for (let i = 0; i < priority.length && results.length < 8; i += 6) {
    const batch = priority.slice(i, i + 6);
    const batchResults = await Promise.all(batch.map(async ({ sport, league }) => {
      try {
        const url = buildUrl(sport, league, 'teams');
        const r = await fetch(url);
        if (!r.ok) return [];
        const data = await r.json();
        return (data.sports?.[0]?.leagues?.[0]?.teams || [])
          .filter(t => {
            const name = t.team.displayName?.toLowerCase() || '';
            const abbr = t.team.abbreviation?.toLowerCase() || '';
            return name.includes(searchLower) || abbr === searchLower || searchLower.includes(name.split(' ').pop());
          })
          .map(t => ({
            id: t.team.id, name: t.team.displayName, abbreviation: t.team.abbreviation,
            sport, league, leagueName: ALL_SPORTS[sport]?.leagues[league],
          }));
      } catch (e) { return []; }
    }));
    batchResults.flat().forEach(m => {
      if (!results.find(r => r.id === m.id && r.league === m.league)) results.push(m);
    });
    // Early exit: if we found results in first batch, don't search more (#6)
    if (results.length > 0) break;
  }

  return { query: teamName, results: results.slice(0, 8), totalFound: results.length };
}

async function fetchTeamStats(teamName, leagueInput = null) {
  const searchResults = await searchTeam(teamName);
  if (searchResults.totalFound === 0) return { error: `Team "${teamName}" not found. Try the full name like "Manchester United".` };

  let team = searchResults.results[0];
  if (leagueInput) {
    const resolved = resolveLeague(leagueInput);
    if (resolved) {
      const match = searchResults.results.find(t => t.sport === resolved.sport && t.league === resolved.league);
      if (match) team = match;
    }
  }

  const url = buildUrl(team.sport, team.league, `teams/${team.id}`);
  try {
    const response = await fetchRetry(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    const td = data.team;
    const record = td.record?.items?.[0];
    const stats = {};
    (record?.stats || []).forEach(s => { stats[s.name] = s.value; });
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    const total = wins + losses;

    return {
      team: { name: td.displayName, abbreviation: td.abbreviation, sport: team.sport, league: team.league, leagueName: ALL_SPORTS[team.sport]?.leagues[team.league] },
      record: { overall: record?.summary || 'N/A', wins, losses, winPercentage: total > 0 ? ((wins / total) * 100).toFixed(1) + '%' : 'N/A', pointsFor: stats.pointsFor || 'N/A', pointsAgainst: stats.pointsAgainst || 'N/A' },
      standings: td.standingSummary || 'N/A',
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function fetchHeadToHead(team1Name, team2Name, leagueInput = null) {
  const [t1, t2] = await Promise.all([fetchTeamStats(team1Name, leagueInput), fetchTeamStats(team2Name, leagueInput)]);
  if (t1.error) return { error: `Team 1: ${t1.error}` };
  if (t2.error) return { error: `Team 2: ${t2.error}` };
  return {
    team1: { name: t1.team?.name, record: t1.record?.overall, winPct: t1.record?.winPercentage },
    team2: { name: t2.team?.name, record: t2.record?.overall, winPct: t2.record?.winPercentage },
    fetchedAt: new Date().toISOString(),
  };
}

function listAvailableLeagues(sportFilter = null) {
  const leagues = [];
  for (const [sport, config] of Object.entries(ALL_SPORTS)) {
    if (sportFilter && sport !== sportFilter) continue;
    for (const [id, name] of Object.entries(config.leagues)) {
      leagues.push({ sport, sportName: config.name, leagueId: id, leagueName: name });
    }
  }
  return {
    totalLeagues: leagues.length,
    totalSports: Object.keys(ALL_SPORTS).length,
    leagues: leagues.slice(0, 50),
    allSports: Object.entries(ALL_SPORTS).map(([id, c]) => ({ id, name: c.name, leagueCount: Object.keys(c.leagues).length })),
  };
}

function calculatePayout(odds, stake) {
  const profit = odds > 0 ? (stake * odds) / 100 : (stake * 100) / Math.abs(odds);
  const impliedProb = odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
  return { odds, stake, profit: profit.toFixed(2), totalReturn: (stake + profit).toFixed(2), impliedProbability: (impliedProb * 100).toFixed(1) + '%' };
}

// ============================================
// TIERED FOOTBALL FETCH
// ============================================
async function fetchFootballByTier(tier, daysAhead = 7) {
  const days = Math.min(Math.max(parseInt(daysAhead) || 7, 1), 30);
  const tierLeagues = FOOTBALL_TIERS[tier];
  if (!tierLeagues) return { error: `Unknown tier: ${tier}. Use "tier1", "tier2", or "tier3".` };

  const results = await Promise.all(
    tierLeagues.map(async ({ league, name }) => {
      try {
        const data = await fetchGamesForLeague('soccer', league, days);
        if (data.error) return { league: name, leagueId: league, error: data.error, totalGames: 0 };
        return {
          league: name,
          leagueId: league,
          totalGames: data.totalGames || 0,
          liveGames: data.liveGames || [],
          upcomingGames: data.upcomingGames || [],
          completedGames: data.completedGames || [],
        };
      } catch (e) {
        return { league: name, leagueId: league, error: e.message, totalGames: 0 };
      }
    })
  );

  const withGames = results.filter(r => r.totalGames > 0);
  const totalMatches = withGames.reduce((sum, r) => sum + r.totalGames, 0);

  return {
    tier,
    tierName: tier === 'tier1' ? 'Major Leagues' : tier === 'tier2' ? 'Secondary European Leagues & Cups' : 'Americas, Africa, Asia & Oceania',
    daysAhead: days,
    totalMatches,
    leaguesWithGames: withGames.length,
    leaguesChecked: tierLeagues.length,
    leagues: withGames,
    fetchedAt: new Date().toISOString(),
  };
}

// ============================================
// TOOL DEFINITIONS (for Claude API)
// ============================================
const TOOL_DEFINITIONS = [
  {
    name: 'get_games',
    description: 'Fetch live, upcoming, and completed games for a league over a date range. Default is 7 days ahead. Use days_ahead=30 for a full month of fixtures. Returns scores, teams, match times, and game IDs (use IDs with get_game_stats for detailed stats).',
    input_schema: { type: 'object', properties: { league: { type: 'string', description: 'League name (e.g., "Premier League", "NBA", "La Liga", "Champions League", "UFC")' }, days_ahead: { type: 'number', description: 'Number of days ahead to fetch (1-30, default 7). Use 30 for a full month of fixtures.' } }, required: ['league'] },
  },
  {
    name: 'get_standings',
    description: 'Fetch current league standings/table with team rankings, wins, losses, points.',
    input_schema: { type: 'object', properties: { league: { type: 'string', description: 'League name' } }, required: ['league'] },
  },
  {
    name: 'get_game_stats',
    description: 'Get detailed match statistics: possession, shots, corners, cards, key events (goals), lineups. Requires a game_id from get_games.',
    input_schema: { type: 'object', properties: { league: { type: 'string' }, game_id: { type: 'string', description: 'Game ID from get_games results' } }, required: ['league', 'game_id'] },
  },
  {
    name: 'search_team',
    description: 'Search for a team by name across major leagues worldwide.',
    input_schema: { type: 'object', properties: { team_name: { type: 'string' } }, required: ['team_name'] },
  },
  {
    name: 'get_team_stats',
    description: 'Get detailed statistics for a team: record, win percentage, standings.',
    input_schema: { type: 'object', properties: { team_name: { type: 'string' }, league: { type: 'string', description: 'Optional: specify league if ambiguous' } }, required: ['team_name'] },
  },
  {
    name: 'get_head_to_head',
    description: 'Compare two teams — shows records and win percentages for both.',
    input_schema: { type: 'object', properties: { team1: { type: 'string' }, team2: { type: 'string' }, league: { type: 'string' } }, required: ['team1', 'team2'] },
  },
  {
    name: 'list_leagues',
    description: 'List all available sports and leagues. Use when users ask what sports are available.',
    input_schema: { type: 'object', properties: { sport: { type: 'string', description: 'Optional: filter by sport' } }, required: [] },
  },
  {
    name: 'calculate_bet_payout',
    description: 'Calculate potential payout for a bet given odds and stake.',
    input_schema: { type: 'object', properties: { odds: { type: 'number' }, stake: { type: 'number' } }, required: ['odds', 'stake'] },
  },
  {
    name: 'get_football_by_tier',
    description: 'Fetch football/soccer matches from a specific tier of leagues. Tier 1: Major leagues (EPL, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, Europa League). Tier 2: Secondary European leagues and cups (Eredivisie, Primeira Liga, Belgian Pro League, Scottish Premiership, Süper Lig, Conference League, Championship, FA Cup, Copa del Rey, DFB Pokal, Coppa Italia, Coupe de France). Tier 3: Americas, Africa, Asia and Oceania (MLS, Liga MX, Brasileirão, Liga Profesional, Saudi Pro League, J1 League, A-League, PSL South Africa, Egyptian Premier League, Copa Libertadores, AFCON). Use this when user asks broadly about football matches. Start with tier1, and if no matches found, ASK the user before checking tier2 or tier3.',
    input_schema: {
      type: 'object',
      properties: {
        tier: { type: 'string', description: 'Which tier to fetch: "tier1", "tier2", or "tier3"' },
        days_ahead: { type: 'number', description: 'Number of days ahead to fetch (1-30, default 7)' },
      },
      required: ['tier'],
    },
  },
];

// ============================================
// TOOL EXECUTOR
// ============================================
async function executeTool(name, input) {
  switch (name) {
    case 'get_games': return await fetchGames(input.league, input.days_ahead);
    case 'get_standings': return await fetchLeagueStandings(input.league);
    case 'get_game_stats': return await fetchGameStats(input.league, input.game_id);
    case 'search_team': return await searchTeam(input.team_name);
    case 'get_team_stats': return await fetchTeamStats(input.team_name, input.league);
    case 'get_head_to_head': return await fetchHeadToHead(input.team1, input.team2, input.league);
    case 'list_leagues': return listAvailableLeagues(input.sport);
    case 'calculate_bet_payout': return calculatePayout(input.odds, input.stake);
    case 'get_football_by_tier': return await fetchFootballByTier(input.tier, input.days_ahead);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// Truncate large results to save tokens
function truncateResult(result) {
  const str = JSON.stringify(result);
  if (str.length > 8000) {
    // Trim arrays
    if (result.allGames?.length > 20) result.allGames = result.allGames.slice(0, 20);
    if (result.liveGames?.length > 5) result.liveGames = result.liveGames.slice(0, 5);
    if (result.upcomingGames?.length > 15) result.upcomingGames = result.upcomingGames.slice(0, 15);
    if (result.completedGames?.length > 5) result.completedGames = result.completedGames.slice(0, 5);
    if (result.standings?.length > 20) result.standings = result.standings.slice(0, 20);
    if (result.results?.length > 8) result.results = result.results.slice(0, 8);
  }
  return result;
}


// ============================================
// BetExpert — System Prompt (matches full app design)
// Single source of truth for widget personality & rules
// ============================================

const SYSTEM_PROMPT = `You are BetExpert, the AI sports betting assistant on BwanaBet.com — Zambia's premier betting platform. You have ONE absolute rule: EVERY statistic MUST come directly from tool results.

###############################################################################
##  MANDATORY DATA INTEGRITY SYSTEM                                          ##
###############################################################################

## THE GOLDEN RULE

If you cannot point to the EXACT data in tool results where a number appears, you CANNOT use that number.

NO TOOL DATA = NO CLAIM

## HOW DATA INTEGRITY WORKS

When get_standings returns:
  { team: "Napoli", played: 15, wins: 10, draws: 1, losses: 4, goalsFor: 22, goalsAgainst: 13, points: 31 }

You write:
  **Napoli**
  - Position: 2nd in Serie A
  - Record: 10-1-4 (15 games)
  - Points: 31
  - Goals: 22 scored, 13 conceded
  - Goal difference: +9
  - Win rate: 66.7%

  Ready to go?

The numbers 10, 1, 4, 15, 31, 22, 13 ALL appear in the tool result. You can use them.

## WHAT YOU CANNOT DO

Tool returns: { wins: 10, draws: 1, losses: 4, points: 31 }

WRONG: "Napoli have 12 wins" ← 12 is NOT in the data. FORBIDDEN.
WRONG: "Napoli have 43 points" ← 43 is NOT in the data. FORBIDDEN.
WRONG: "Napoli played 20 games" ← 20 is NOT in the data. FORBIDDEN.

If you write a number that doesn't exist in tool results, you are FABRICATING DATA.
Users bet real money. Fabrication = lost money = broken trust.

## BEFORE YOU WRITE ANY NUMBER

Ask yourself:
1. Can I find this EXACT number in the tool results?
2. Which tool result contains this number?

If you cannot answer both questions, DO NOT WRITE THAT NUMBER.

## DO NOT NARRATE YOUR TOOL USAGE

WRONG (never do this):
"Let me check the standings for you..."
"I found the latest results..."
"Let me search for that..."
"The tool results show..."
"Searching..."

RIGHT (just give the answer directly - no preamble):
**Napoli**
- Position: 2nd in Serie A
- Record: 10-1-4 (15 games)
...

Go directly to the formatted response. No preamble. No narration. No commentary.

###############################################################################
##  INTERACTIVE CONVERSATION DESIGN                                          ##
###############################################################################

## YOUR ROLE

You are NOT a passive stats lookup. You are an ACTIVE betting assistant that guides users toward placing bets on BwanaBet.com. Every interaction should move the user closer to a bet.

## ONBOARDING (first interaction or greetings)

If user says hello/hi/hey, respond:
"Hey! What do you prefer?"
Then suggest: Sports Betting or Casino Games

If they choose sports betting, ask:
"How do you want me to explain things? **Simple:** One clear pick with step-by-step instructions. **In-Depth:** Full stats, multiple options, betting jargon included."

Adapt ALL future responses to their choice.

## GIVING PICKS

When suggesting a bet, ALWAYS include:
1. **Match**: Team A vs Team B
2. **Time**: When the match starts
3. **My Pick**: The specific bet (e.g., BTTS Yes, Over 2.5, Home Win)
4. **Odds**: If available from tool data
5. **Confidence**: Low / Medium / High (based on data strength)
6. **Why this pick**: 1-2 sentences explaining the reasoning from tool data
7. **How to place this bet on BwanaBet**:
   1. Open BwanaBet and go to Sports → Football → [League]
   2. Find "[Team A] vs [Team B]"
   3. Look for "[Bet Type]" and tap "[Selection]"
   4. Enter your bet amount (start small, like ZMW 10-20)
   5. Tap "Place Bet" to confirm

Always end with: **Ready to go?**

## RESPONSE FORMAT FOR STATS

**[Team Name]**
- Position: [number from data] in [league]
- Record: [W]-[D]-[L] ([total] games)
- Points: [number from data]
- Goals: [GF] scored, [GA] conceded
- Goal difference: [calculated GF-GA]
- Win rate: [calculated W ÷ total × 100]%

Ready to go?

## POSITION RULE

ONLY state a league position if:
1. Tool result explicitly shows position/rank
2. OR you can count the position from a complete standings table

If position is not clearly shown:
- Position: Not available in current data

DO NOT guess position based on points alone.

## MATHEMATICAL VALIDATION

Before responding, CHECK YOUR MATH:

1. Total games = Wins + Draws + Losses
   - If data says 15 games and you write 10W-1D-4L, check: 10+1+4=15 ✓

2. Points = (Wins × 3) + Draws (for soccer)
   - If data says 31 points and you write 10W-1D, check: (10×3)+1=31 ✓

3. Goal difference = Goals For - Goals Against
   - If data says "+9 GD" and "22:13", check: 22-13=9 ✓

If the math doesn't work, THE DATA IS WRONG. Do not use it.

###############################################################################
##  TOOLS                                                                    ##
###############################################################################

You have these tools for REAL-TIME data. ALWAYS use them — never guess:

- **get_games**: Live/upcoming/completed matches. Returns game IDs for use with get_game_stats.
- **get_standings**: Current league table with points, wins, losses, draws.
- **get_game_stats**: Detailed match stats (possession, corners, cards, shots, lineups, key events). Requires game_id from get_games.
- **search_team**: Find a team by name across all major leagues.
- **get_team_stats**: Win/loss record, win percentage for a specific team.
- **get_head_to_head**: Compare two teams side by side.
- **list_leagues**: Show all available sports and leagues.
- **calculate_bet_payout**: Calculate returns from odds + stake.
- **get_football_by_tier**: Fetch football matches across a full tier of leagues at once. Use when user asks broadly about football.

Use get_games FIRST when asked about matches, then get_game_stats for details.
Use get_standings for league tables.
Use get_team_stats or get_head_to_head for team analysis.

###############################################################################
##  FOOTBALL MATCH SEARCH — TIMEFRAME & TIERED FALLBACK                     ##
###############################################################################

## TIMEFRAME PARSING

When a user asks about football/soccer matches, FIRST determine the timeframe:

- "today" / "tonight" / "now" → days_ahead=1
- "tomorrow" → days_ahead=2
- "this week" / "this weekend" / "next few days" → days_ahead=7
- "this month" / "next weeks" → days_ahead=30
- "this season" → Tell the user you can check up to 30 days ahead, and ask if they want a specific window

If the timeframe is UNCLEAR (e.g., "any matches?", "what's on?", "football matches"):
Ask: "Are you looking for matches today, this week, or further ahead?"
Wait for the user's answer before fetching.

## TIERED LEAGUE FALLBACK

When a user asks broadly about football (not a specific league), use get_football_by_tier:

**Step 1**: Fetch tier1 (Major Leagues) with the parsed timeframe.

**Step 2**: If tier1 returns totalMatches > 0, present the results. Done.

**Step 3**: If tier1 returns totalMatches = 0, tell the user:
"No matches found in the major leagues (EPL, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, Europa League) for [timeframe]."
Then ask: "Want me to check secondary European leagues and cups (Eredivisie, Primeira Liga, Scottish Premiership, domestic cups, and more)?"

**Step 4**: If the user says yes and tier2 also returns 0, tell the user:
"No matches found in secondary European leagues either for [timeframe]."
Then ask: "Want me to check leagues from the Americas, Africa, Asia, and Oceania (MLS, Brasileirão, Saudi Pro League, PSL South Africa, and more)?"

**Step 5**: If tier3 also returns 0:
"No football matches found across any league for [timeframe]. This might be an off-day or international break. Want to try a different timeframe?"

IMPORTANT:
- NEVER silently expand to other tiers without asking the user first
- ALWAYS state which leagues were checked and the timeframe when reporting no results
- If the user asks about a SPECIFIC league (e.g., "Premier League matches"), use get_games directly — do not use the tiered system
- When presenting results from any tier, always label each match with its league name

###############################################################################
##  HANDLING TOOL RESULTS                                                    ##
###############################################################################

### If tools return clear data:
Report it with formatting. No preamble. Drive toward a bet.

### If tools return conflicting data:
"I found inconsistent information. Please check bwanabet.com for the latest odds and fixtures."

### If tools return errors or no data:
"I couldn't find current data for [league/team]. Try a different league or check back closer to match time."

DO NOT GUESS. DO NOT FILL IN. DO NOT APPROXIMATE.

###############################################################################
##  FORBIDDEN ACTIONS                                                        ##
###############################################################################

NEVER write:
- Any number not in tool results
- "approximately" or "around" followed by a number
- "likely" or "probably" with any statistic
- "unbeaten in X" unless tool data says EXACTLY this
- "X wins in a row" unless tool data says EXACTLY this
- "good form" or "poor form" unless data clearly shows this
- Betting recommendations not backed by tool data
- Tool narration ("Let me search...", "I found...", "Perfect!", "Searching...")
- Manager/coaching news unless explicitly asked
- Never fabricate urgency ("bonus expires soon", "limited time")

###############################################################################
##  BWANABET CONTEXT                                                         ##
###############################################################################

## YOU ARE ON BWANABET.COM

- Users can place bets RIGHT HERE on this website
- When suggesting picks, always include step-by-step BwanaBet placement instructions
- Suggest small stakes for beginners (ZMW 10-20)
- The Zambian market favors: Premier League, Champions League, La Liga, and accumulator bets
- Currency is ZMW (Zambian Kwacha)
- BwanaBet also has: Casino, Live Casino, Aviator, Virtual Sports, Royal Win

## PROMOTING BWANABET FEATURES (naturally, not as spam)

When relevant:
- "You can also bet live on this match at BwanaBet → Live"
- "BwanaBet's Aviator game is popular — want to know how it works?"

Only mention when naturally fits the conversation. Never force it.

## BONUSES AND PROMOTIONS

IMPORTANT: Do NOT proactively mention bonuses, free spins, welcome offers, or promotions unless the user specifically asks about them. Stay on topic — focus on games, picks, and analysis. If a user asks about bonuses or promotions, then you can discuss what BwanaBet offers.

## ACCOUNT/SUPPORT ISSUES

For deposits, withdrawals, login issues, account problems:
"For account help, tap 'Talk to support' below — the BwanaBet team will assist you."
You only handle sports data and betting analysis.

## RESPONSIBLE GAMBLING

- Include a brief reminder on EVERY betting suggestion: "Remember: only bet what you can afford to lose."
- Suggest starting with small stakes (ZMW 10-20) for beginners
- Never pressure users to bet or increase stakes
- If a user seems distressed about losses, encourage them to take a break

###############################################################################
##  CASINO GAMES                                                             ##
###############################################################################

For casino questions (roulette, slots, blackjack, aviator, crash games, instant games):
- Recommend games from the HOT GAMES list below based on criteria:
  - "top games" or "best games" → recommend by highest RTP
  - "popular" or "what's hot" → recommend the most-played / trending games (Aviator is always #1)
  - "crash games" → filter crash category games
  - "slots" → filter slot category games
  - "instant games" → filter instant category games
  - Generic "show me casino games" → pick 3-4 varied games across categories
- Do NOT list all 20 games at once. Pick 3-4 relevant ones based on what the user asked.
- Always include the game's category and RTP when recommending
- Use general knowledge about game rules and basic strategy
- No tools needed for casino
- Guide them to BwanaBet's casino: "You can try this at BwanaBet → Casino"
- For Aviator: explain the cash-out mechanic, suggest conservative strategies
- For crash games: explain the multiplier/cash-out concept
- For slots: mention paylines, bonus features, RTP

###############################################################################
##  OTHER RULES                                                              ##
###############################################################################

- NO emojis
- Currency: ZMW (Zambian Kwacha)
- End stat responses with "Ready to go?"
- Keep responses focused (5-6 lines for stats, longer for picks with placement instructions)
- Never fabricate urgency
- Be confident and direct — you are the expert
- Adapt complexity to the user's level (simple vs in-depth based on their choice)

## DISCLAIMER

IMPORTANT: When giving any advice, picks, tips, analysis, game recommendations, or strategy suggestions, you MUST add this disclaimer at the end of your message (before the [ACTIONS] block):

"*Disclaimer: I am an AI, this information is for educational purposes only and should not be used for gambling or financial risks.*"

This applies to: betting picks, casino game recommendations, strategy tips, odds analysis, game explanations with strategy. This does NOT apply to: simple greetings, factual standings/scores, account help redirects, or general conversation.

###############################################################################
##  SUGGESTED QUICK ACTIONS                                                  ##
###############################################################################

At the END of EVERY response, include exactly 3-4 suggested next actions in this format:

[ACTIONS]
Action text 1 | message to send if clicked
Action text 2 | message to send if clicked
Action text 3 | message to send if clicked
[/ACTIONS]

Rules:
- Actions MUST be relevant to what you just said — not generic
- If you listed specific games/teams/options, the actions should match those exact items
- If you asked a question with choices, the actions should BE those choices
- One action should always drive toward placing a bet or playing a game
- Keep action text short (2-5 words)
- The message after | is what gets sent as the user's next message

Examples:

After listing casino games (Aviator, Blackjack, Roulette):
[ACTIONS]
Teach me Aviator | Teach me how to play and win at Aviator
Teach me Blackjack | Teach me how to play and win at Blackjack
Try Roulette | Teach me how to play and win at Roulette
Sports betting instead | Show me sports betting picks
[/ACTIONS]

After giving a match pick (Liverpool vs Arsenal, BTTS):
[ACTIONS]
How do I place this? | Show me step by step how to place this bet
Different pick | Show me a different betting pick
More about this match | Tell me more about Liverpool vs Arsenal
Play casino | Show me casino games
[/ACTIONS]

After asking "Simple or In-Depth?":
[ACTIONS]
Keep it simple | Keep it simple for me
In-depth analysis | Give me in-depth analysis
[/ACTIONS]

After showing EPL standings:
[ACTIONS]
Pick a match to bet | Pick a match from EPL for me to bet on
Different league | Show me La Liga standings
Team stats | Show me stats for a specific team
Play casino | Show me casino games
[/ACTIONS]

CRITICAL: Actions must match YOUR response content. If you asked about Aviator specifically, don't suggest "Teach me Blackjack" as the first action.

###############################################################################
##  FINAL CHECK BEFORE EVERY RESPONSE                                       ##
###############################################################################

[ ] No narration or preamble (just the answer)
[ ] Every number appears EXACTLY in tool results
[ ] Math validates (W+D+L = total, W×3+D = points for soccer)
[ ] No interpretation beyond what data shows
[ ] Includes "Ready to go?" or a clear call to action
[ ] Includes BwanaBet placement instructions if suggesting a bet
[ ] Includes responsible gambling reminder if suggesting a bet
[ ] No fabricated data, no guessing, no approximation
[ ] [ACTIONS] block at the end with 3-4 relevant quick actions`;



// ============================================
// WIDGET CHAT HANDLER
// ============================================

const MAX_TOOL_LOOPS = 6;
const MAX_TOKENS = 1536;

async function supabaseInsert(table, data) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify(data),
    });
  } catch (e) { console.error(`[widget-monitor] ${table}:`, e.message); }
}

function estimateCost(inp, out) {
  return ((inp / 1e6) * 3.0) + ((out / 1e6) * 15.0);
}

// ============================================
// SLACK NOTIFICATIONS (inline, no imports)
// ============================================

async function slackAlert(severity, title, details = {}) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  const emojis = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };
  const emoji = emojis[severity] || '🔵';
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const fields = [
    { type: 'mrkdwn', text: `*Error:*\n${title}` },
    { type: 'mrkdwn', text: `*Severity:*\n${severity.toUpperCase()}` },
    { type: 'mrkdwn', text: `*Time:*\n${time}` },
  ];
  if (details.endpoint) fields.push({ type: 'mrkdwn', text: `*Endpoint:*\n${details.endpoint}` });
  if (details.duration) fields.push({ type: 'mrkdwn', text: `*Duration:*\n${details.duration}` });
  if (details.cost) fields.push({ type: 'mrkdwn', text: `*Cost:*\n${details.cost}` });

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `${emoji} BETEXPERT ${severity.toUpperCase()}` } },
    { type: 'section', fields },
  ];

  if (details.message) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${String(details.message).slice(0, 500)}\`\`\`` } });
  }

  if (details.sessionId) {
    blocks.push({ type: 'context', elements: [
      { type: 'mrkdwn', text: `Session: \`${details.sessionId}\` | <https://bet-assist.vercel.app/admin.html|Dashboard>` }
    ] });
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${emoji} ${title}`, blocks }),
    });
  } catch (e) { console.error('[slack] Failed:', e.message); }
}

// Check error rate and cost thresholds after each request
async function checkAlertThresholds(sessionId, costUsd) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey || !process.env.SLACK_WEBHOOK_URL) return;

  try {
    // Check error rate in last 15 minutes
    const fifteenMinAgo = new Date(Date.now() - 15 * 60000).toISOString();
    const resp = await fetch(
      `${sbUrl}/rest/v1/monitor_requests?select=status&created_at=gte.${fifteenMinAgo}`,
      { headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` } }
    );
    if (resp.ok) {
      const rows = await resp.json();
      if (rows.length >= 10) { // Only check if enough data
        const errors = rows.filter(r => r.status === 'error').length;
        const rate = ((errors / rows.length) * 100).toFixed(1);
        if (parseFloat(rate) > 10) {
          await slackAlert('high', 'High error rate spike', {
            message: `${rate}% error rate (${errors}/${rows.length}) in last 15 minutes`,
            endpoint: 'widget-chat',
          });
        }
      }
    }

    // Check daily cost
    const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
    const costResp = await fetch(
      `${sbUrl}/rest/v1/monitor_requests?select=cost_usd&created_at=gte.${todayStart}`,
      { headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` } }
    );
    if (costResp.ok) {
      const costRows = await costResp.json();
      const totalToday = costRows.reduce((sum, r) => sum + parseFloat(r.cost_usd || 0), 0);
      const limit = parseFloat(process.env.DAILY_COST_LIMIT || '50');
      if (totalToday > limit) {
        await slackAlert('high', 'Daily cost limit exceeded', {
          message: `Today's cost: $${totalToday.toFixed(2)} (limit: $${limit})`,
          cost: `$${totalToday.toFixed(2)} / $${limit}`,
        });
      }
    }
  } catch (e) { /* threshold checks are best-effort */ }
}

async function checkRateLimit(sessionId) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return true;

  try {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const resp = await fetch(
      `${url}/rest/v1/monitor_requests?select=id&session_id=eq.${sessionId}&created_at=gte.${oneMinuteAgo}`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
    );
    if (!resp.ok) return true;
    const rows = await resp.json();
    return rows.length < 15;
  } catch (e) { return true; }
}

// ============================================
// HOT GAMES — fetch and inject into system prompt
// ============================================
let hotGamesCache = null;
let hotGamesCacheDate = null;

async function fetchHotGames() {
  const today = new Date().toISOString().split('T')[0];
  if (hotGamesCache && hotGamesCacheDate === today) return hotGamesCache;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;

  try {
    const resp = await fetch(
      `${url}/rest/v1/hot_games?active=eq.true&select=name,category,rtp,description,bwanabet_url&order=weight.desc&limit=25`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
    );
    if (!resp.ok) return null;
    const games = await resp.json();
    hotGamesCache = games;
    hotGamesCacheDate = today;
    return games;
  } catch (e) { return null; }
}

function buildHotGamesPrompt(games) {
  if (!games || games.length === 0) return '';

  let prompt = `\n\n## BWANABET CASINO GAMES CATALOG\n\nThese are the actual games available on BwanaBet. ONLY recommend games from this list.\n\n`;

  // Group by category
  const categories = {};
  games.forEach(g => {
    if (!categories[g.category]) categories[g.category] = [];
    categories[g.category].push(g);
  });

  for (const [cat, catGames] of Object.entries(categories)) {
    prompt += `### ${cat} Games\n`;
    catGames.forEach(g => {
      prompt += `- **${g.name}** — ${g.description} (RTP: ${g.rtp}%)\n`;
    });
    prompt += `\n`;
  }

  prompt += `### Recommendation criteria:\n`;
  prompt += `- Aviator is the #1 most-played game on BwanaBet — always mention it first for crash/popular game requests\n`;
  prompt += `- For "best RTP" requests: sort by highest RTP percentage\n`;
  prompt += `- For "what's hot/popular" requests: Aviator, JetX, High Flyer, Skyward Delux are trending\n`;
  prompt += `- For generic requests: pick 3-4 games across different categories for variety\n`;
  prompt += `- NEVER list all games at once. Keep recommendations to 3-4 games max.\n`;
  prompt += `- Always include RTP when mentioning a game.\n`;
  prompt += `- Direct users to BwanaBet Casino to play.\n`;

  return prompt;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://bwanabet.com', 'https://www.bwanabet.com', 'https://bet-assist.vercel.app'];
  if (process.env.WIDGET_DEV === 'true') allowed.push('http://localhost:3000');
  res.setHeader('Access-Control-Allow-Origin', allowed.includes(origin) ? origin : allowed[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    slackAlert('critical', 'API key missing', { message: 'ANTHROPIC_API_KEY not set in Vercel env vars', endpoint: 'widget-chat' });
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }

  const startTime = Date.now();
  const { messages, session_id } = req.body;
  const sessionId = session_id || 'widget_anon';

  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' });

  const rateLimitOk = await checkRateLimit(sessionId);
  if (!rateLimitOk) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  let conversationMessages = messages.slice(-20);
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let allToolsCalled = [];

  try {
    // Fetch hot games and inject into system prompt
    const hotGames = await fetchHotGames();
    const enhancedPrompt = SYSTEM_PROMPT + buildHotGamesPrompt(hotGames);

    let loopCount = 0;
    let finalText = '';

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount++;
      console.log(`[widget] Loop ${loopCount}, messages: ${conversationMessages.length}`);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system: enhancedPrompt,
          messages: conversationMessages,
          tools: TOOL_DEFINITIONS,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error?.message || 'API error';
        console.error('[widget] Anthropic error:', response.status, errMsg);
        supabaseInsert('monitor_errors', {
          session_id: sessionId, source: 'api',
          error_message: `Widget: ${errMsg}`, severity: 'high',
          context: { endpoint: 'widget-chat', loop: loopCount, status: response.status },
        });
        slackAlert(response.status >= 500 ? 'critical' : 'high', `Anthropic API ${response.status}`, {
          message: errMsg, sessionId, endpoint: 'widget-chat',
        });
        return res.status(502).json({ error: 'Service temporarily unavailable' });
      }

      totalInputTokens += data.usage?.input_tokens || 0;
      totalOutputTokens += data.usage?.output_tokens || 0;

      const textBlocks = (data.content || []).filter(b => b.type === 'text');
      const toolBlocks = (data.content || []).filter(b => b.type === 'tool_use');

      if (data.stop_reason !== 'tool_use' || toolBlocks.length === 0) {
        finalText = textBlocks.map(b => b.text).join('\n');
        break;
      }

      console.log(`[widget] Executing ${toolBlocks.length} tools:`, toolBlocks.map(t => t.name).join(', '));

      const toolResults = await Promise.all(toolBlocks.map(async (toolBlock) => {
        allToolsCalled.push(toolBlock.name);
        try {
          const result = await executeTool(toolBlock.name, toolBlock.input);
          const truncated = truncateResult(result);
          return {
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: JSON.stringify(truncated),
          };
        } catch (e) {
          console.error(`[widget] Tool ${toolBlock.name} error:`, e.message);
          slackAlert('medium', `Tool failed: ${toolBlock.name}`, {
            message: e.message, sessionId, endpoint: 'widget-chat',
          });
          return {
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: JSON.stringify({ error: e.message }),
          };
        }
      }));

      conversationMessages.push({ role: 'assistant', content: data.content });
      conversationMessages.push({ role: 'user', content: toolResults });
    }

    if (loopCount >= MAX_TOOL_LOOPS && !finalText) {
      finalText = "I tried to look that up but it's taking too long. Try asking something more specific.";
    }

    const durationMs = Date.now() - startTime;
    const costUsd = estimateCost(totalInputTokens, totalOutputTokens);

    const userMsg = messages.filter(m => m.role === 'user').pop();
    const userContent = (typeof userMsg?.content === 'string' ? userMsg.content : '').slice(0, 2000);

    Promise.all([
      supabaseInsert('monitor_requests', {
        session_id: sessionId, model,
        input_tokens: totalInputTokens, output_tokens: totalOutputTokens, cost_usd: costUsd,
        duration_ms: durationMs, stop_reason: 'end_turn',
        tools_called: allToolsCalled, tool_count: allToolsCalled.length,
        status: durationMs > 30000 ? 'timeout' : 'success',
      }),
      supabaseInsert('monitor_messages', {
        session_id: sessionId, role: 'user', content: userContent, tokens_used: totalInputTokens,
      }),
      supabaseInsert('monitor_messages', {
        session_id: sessionId, role: 'assistant', content: finalText.slice(0, 2000), tokens_used: totalOutputTokens,
      }),
      ...allToolsCalled.map(name => supabaseInsert('monitor_messages', {
        session_id: sessionId, role: 'tool_call', tool_name: name, content: `Tool: ${name}`,
      })),
      durationMs > 10000 ? supabaseInsert('monitor_errors', {
        session_id: sessionId, source: 'api',
        error_message: `Widget slow: ${durationMs}ms (${allToolsCalled.length} tools)`,
        severity: durationMs > 20000 ? 'high' : 'medium',
        context: { duration_ms: durationMs, tools: allToolsCalled, loops: loopCount },
      }) : Promise.resolve(),
      // Slack alert for very slow requests (>20s)
      durationMs > 20000 ? slackAlert('medium', `Slow request: ${(durationMs/1000).toFixed(1)}s`, {
        duration: `${(durationMs/1000).toFixed(1)}s`,
        message: `Tools: ${allToolsCalled.join(', ') || 'none'} | Loops: ${loopCount}`,
        sessionId, endpoint: 'widget-chat',
      }) : Promise.resolve(),
    ]).catch(() => {});

    // Check error rate + cost thresholds (fire-and-forget)
    checkAlertThresholds(sessionId, costUsd).catch(() => {});

    console.log(`[widget] Done in ${durationMs}ms, ${loopCount} loops, ${allToolsCalled.length} tools, $${costUsd.toFixed(4)}`);

    // Parse [ACTIONS] block from Claude's response
    let actions = null;
    let cleanText = finalText;
    const actionsMatch = finalText.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/);
    if (actionsMatch) {
      cleanText = finalText.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/, '').trim();
      actions = actionsMatch[1]
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes('|'))
        .map(line => {
          const [text, query] = line.split('|').map(s => s.trim());
          return { text, q: query };
        })
        .slice(0, 4);
    }

    return res.status(200).json({
      text: cleanText,
      actions: actions,
      usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens, tools: allToolsCalled.length },
    });

  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[widget] Error:', error);
    supabaseInsert('monitor_errors', {
      session_id: sessionId, source: 'api',
      error_message: `Widget exception: ${error.message}`,
      error_raw: error.stack?.slice(0, 3000), severity: 'critical',
    });
    slackAlert('critical', 'Widget exception', {
      message: error.message, sessionId, endpoint: 'widget-chat',
    });
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }
}
