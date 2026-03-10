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

async function fetchGames(leagueInput) {
  const resolved = resolveLeague(leagueInput);
  if (!resolved) {
    // Try as direct sport
    if (ALL_SPORTS[leagueInput]) {
      const league = Object.keys(ALL_SPORTS[leagueInput].leagues)[0];
      return fetchGamesForLeague(leagueInput, league);
    }
    return { error: `Unknown league: ${leagueInput}. Try "Premier League", "NBA", "La Liga", etc.` };
  }
  return fetchGamesForLeague(resolved.sport, resolved.league);
}

async function fetchGamesForLeague(sport, league) {
  const url = buildUrl(sport, league, 'scoreboard');
  if (!url) return { error: `Could not build URL for ${sport}/${league}` };

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
      totalGames: games.length,
      liveGames: games.filter(g => g.status.state === 'in'),
      upcomingGames: games.filter(g => g.status.state === 'pre'),
      completedGames: games.filter(g => g.status.state === 'post'),
      allGames: games.slice(0, 15),
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
  // Search priority leagues only to stay within Vercel timeout
  const priority = [
    { sport: 'soccer', league: 'eng.1' }, { sport: 'soccer', league: 'esp.1' },
    { sport: 'soccer', league: 'ger.1' }, { sport: 'soccer', league: 'ita.1' },
    { sport: 'soccer', league: 'fra.1' }, { sport: 'soccer', league: 'por.1' },
    { sport: 'soccer', league: 'ned.1' }, { sport: 'soccer', league: 'uefa.champions' },
    { sport: 'soccer', league: 'sau.1' }, { sport: 'soccer', league: 'rsa.1' },
    { sport: 'basketball', league: 'nba' }, { sport: 'football', league: 'nfl' },
    { sport: 'baseball', league: 'mlb' }, { sport: 'hockey', league: 'nhl' },
    { sport: 'soccer', league: 'arg.1' }, { sport: 'soccer', league: 'bra.1' },
    { sport: 'soccer', league: 'mex.1' }, { sport: 'soccer', league: 'usa.1' },
  ];

  // Search in batches of 6
  for (let i = 0; i < priority.length && results.length < 10; i += 6) {
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
      } catch { return []; }
    }));
    batchResults.flat().forEach(m => {
      if (!results.find(r => r.id === m.id && r.league === m.league)) results.push(m);
    });
  }

  return { query: teamName, results: results.slice(0, 10), totalFound: results.length };
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
// TOOL DEFINITIONS (for Claude API)
// ============================================
const TOOL_DEFINITIONS = [
  {
    name: 'get_games',
    description: 'Fetch live, upcoming, and completed games for a league. Returns scores, teams, match times, and game IDs (use IDs with get_game_stats for detailed stats).',
    input_schema: { type: 'object', properties: { league: { type: 'string', description: 'League name (e.g., "Premier League", "NBA", "La Liga", "Champions League", "UFC")' } }, required: ['league'] },
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
];

// ============================================
// TOOL EXECUTOR
// ============================================
async function executeTool(name, input) {
  switch (name) {
    case 'get_games': return await fetchGames(input.league);
    case 'get_standings': return await fetchLeagueStandings(input.league);
    case 'get_game_stats': return await fetchGameStats(input.league, input.game_id);
    case 'search_team': return await searchTeam(input.team_name);
    case 'get_team_stats': return await fetchTeamStats(input.team_name, input.league);
    case 'get_head_to_head': return await fetchHeadToHead(input.team1, input.team2, input.league);
    case 'list_leagues': return listAvailableLeagues(input.sport);
    case 'calculate_bet_payout': return calculatePayout(input.odds, input.stake);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// Truncate large results to save tokens
function truncateResult(result) {
  const str = JSON.stringify(result);
  if (str.length > 8000) {
    // Trim arrays
    if (result.allGames?.length > 8) result.allGames = result.allGames.slice(0, 8);
    if (result.liveGames?.length > 5) result.liveGames = result.liveGames.slice(0, 5);
    if (result.upcomingGames?.length > 8) result.upcomingGames = result.upcomingGames.slice(0, 8);
    if (result.completedGames?.length > 3) result.completedGames = result.completedGames.slice(0, 3);
    if (result.standings?.length > 20) result.standings = result.standings.slice(0, 20);
    if (result.results?.length > 8) result.results = result.results.slice(0, 8);
  }
  return result;
}

export { TOOL_DEFINITIONS, executeTool, truncateResult };
