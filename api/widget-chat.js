// ============================================
// BetExpert Widget — Self-Contained Chat Endpoint — v2.1.0
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
      // Major European
      'eng.1': 'Premier League', 'eng.2': 'Championship', 'eng.fa': 'FA Cup',
      'esp.1': 'La Liga', 'esp.copa_del_rey': 'Copa del Rey',
      'ger.1': 'Bundesliga', 'ger.dfb_pokal': 'DFB Pokal',
      'ita.1': 'Serie A', 'ita.coppa_italia': 'Coppa Italia',
      'fra.1': 'Ligue 1', 'fra.coupe_de_france': 'Coupe de France',
      // Secondary European
      'ned.1': 'Eredivisie', 'por.1': 'Primeira Liga', 'bel.1': 'Belgian Pro League',
      'sco.1': 'Scottish Premiership', 'tur.1': 'Süper Lig',
      'gre.1': 'Greek Super League', 'sui.1': 'Swiss Super League',
      'aut.1': 'Austrian Bundesliga', 'den.1': 'Danish Superliga',
      'swe.1': 'Swedish Allsvenskan', 'nor.1': 'Norwegian Eliteserien',
      'cze.1': 'Czech First League', 'rus.1': 'Russian Premier League',
      'cyp.1': 'Cypriot First Division', 'isr.1': 'Israeli Premier League',
      // European competitions
      'uefa.champions': 'UEFA Champions League', 'uefa.europa': 'UEFA Europa League',
      'uefa.europa.conf': 'Conference League',
      'uefa.euro': 'UEFA Euro',
      // Americas
      'usa.1': 'MLS', 'mex.1': 'Liga MX',
      'bra.1': 'Brasileirão', 'arg.1': 'Liga Profesional',
      'col.1': 'Colombian Primera A', 'chi.1': 'Chilean Primera División',
      'uru.1': 'Uruguayan Primera División', 'per.1': 'Peruvian Primera División',
      'conmebol.libertadores': 'Copa Libertadores',
      // Africa
      'rsa.1': 'PSL South Africa', 'egy.1': 'Egyptian Premier League',
      'zam.1': 'Zambian Super League', 'ken.1': 'Kenyan Premier League',
      'nga.1': 'Nigerian Professional League', 'gha.1': 'Ghana Premier League',
      'uga.1': 'Ugandan Premier League',
      'caf.nations': 'Africa Cup of Nations',
      // Asia & Oceania
      'sau.1': 'Saudi Pro League', 'jpn.1': 'J1 League', 'aus.1': 'A-League',
      'chn.1': 'Chinese Super League', 'idn.1': 'Indonesian Liga 1',
      'tha.1': 'Thai League', 'ind.1': 'Indian Super League',
      // World
      'fifa.world': 'FIFA World Cup',
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
  // New football league aliases
  'greek super league': { sport: 'soccer', league: 'gre.1' },
  'swiss super league': { sport: 'soccer', league: 'sui.1' },
  'austrian bundesliga': { sport: 'soccer', league: 'aut.1' },
  'danish superliga': { sport: 'soccer', league: 'den.1' },
  'allsvenskan': { sport: 'soccer', league: 'swe.1' },
  'eliteserien': { sport: 'soccer', league: 'nor.1' },
  'czech league': { sport: 'soccer', league: 'cze.1' },
  'russian premier league': { sport: 'soccer', league: 'rus.1' },
  'colombian league': { sport: 'soccer', league: 'col.1' },
  'primera a': { sport: 'soccer', league: 'col.1' },
  'chilean league': { sport: 'soccer', league: 'chi.1' },
  'uruguayan league': { sport: 'soccer', league: 'uru.1' },
  'peruvian league': { sport: 'soccer', league: 'per.1' },
  'chinese super league': { sport: 'soccer', league: 'chn.1' },
  'indonesian liga': { sport: 'soccer', league: 'idn.1' },
  'thai league': { sport: 'soccer', league: 'tha.1' },
  'indian super league': { sport: 'soccer', league: 'ind.1' },
  'isl': { sport: 'soccer', league: 'ind.1' },
  'zambian super league': { sport: 'soccer', league: 'zam.1' },
  'zambian league': { sport: 'soccer', league: 'zam.1' },
  'kenyan league': { sport: 'soccer', league: 'ken.1' },
  'nigerian league': { sport: 'soccer', league: 'nga.1' },
  'ghana premier league': { sport: 'soccer', league: 'gha.1' },
  'ugandan league': { sport: 'soccer', league: 'uga.1' },
  'psl': { sport: 'soccer', league: 'rsa.1' },
  'cypriot league': { sport: 'soccer', league: 'cyp.1' },
  'israeli league': { sport: 'soccer', league: 'isr.1' },
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
    { league: 'gre.1', name: 'Greek Super League' },
    { league: 'sui.1', name: 'Swiss Super League' },
    { league: 'aut.1', name: 'Austrian Bundesliga' },
    { league: 'den.1', name: 'Danish Superliga' },
    { league: 'swe.1', name: 'Swedish Allsvenskan' },
    { league: 'nor.1', name: 'Norwegian Eliteserien' },
    { league: 'cze.1', name: 'Czech First League' },
    { league: 'rus.1', name: 'Russian Premier League' },
    { league: 'cyp.1', name: 'Cypriot First Division' },
    { league: 'isr.1', name: 'Israeli Premier League' },
    { league: 'uefa.europa.conf', name: 'Conference League' },
    { league: 'eng.2', name: 'Championship' },
  ],
  tier3: [
    { league: 'eng.fa', name: 'FA Cup' },
    { league: 'esp.copa_del_rey', name: 'Copa del Rey' },
    { league: 'ger.dfb_pokal', name: 'DFB Pokal' },
    { league: 'ita.coppa_italia', name: 'Coppa Italia' },
    { league: 'fra.coupe_de_france', name: 'Coupe de France' },
    { league: 'usa.1', name: 'MLS' },
    { league: 'mex.1', name: 'Liga MX' },
    { league: 'bra.1', name: 'Brasileirão' },
    { league: 'arg.1', name: 'Liga Profesional' },
    { league: 'col.1', name: 'Colombian Primera A' },
    { league: 'chi.1', name: 'Chilean Primera División' },
    { league: 'uru.1', name: 'Uruguayan Primera División' },
    { league: 'per.1', name: 'Peruvian Primera División' },
    { league: 'conmebol.libertadores', name: 'Copa Libertadores' },
  ],
  tier4: [
    { league: 'sau.1', name: 'Saudi Pro League' },
    { league: 'jpn.1', name: 'J1 League' },
    { league: 'aus.1', name: 'A-League' },
    { league: 'chn.1', name: 'Chinese Super League' },
    { league: 'idn.1', name: 'Indonesian Liga 1' },
    { league: 'tha.1', name: 'Thai League' },
    { league: 'ind.1', name: 'Indian Super League' },
    { league: 'rsa.1', name: 'PSL South Africa' },
    { league: 'egy.1', name: 'Egyptian Premier League' },
    { league: 'zam.1', name: 'Zambian Super League' },
    { league: 'ken.1', name: 'Kenyan Premier League' },
    { league: 'nga.1', name: 'Nigerian Professional League' },
    { league: 'gha.1', name: 'Ghana Premier League' },
    { league: 'uga.1', name: 'Ugandan Premier League' },
    { league: 'caf.nations', name: 'Africa Cup of Nations' },
  ],
};

// ============================================
// UTILITIES
// ============================================
function getLeagueTimezoneOffset(league) {
  // Returns UTC offset in hours for the league's primary timezone
  const offsets = {
    // South America
    'arg.1':              -3,  // Argentina (no DST)
    'bra.1':              -3,  // Brazil (Brasília time)
    'col.1':              -5,  // Colombia (no DST)
    'uru.1':              -3,  // Uruguay
    'chi.1':              -4,  // Chile
    'per.1':              -5,  // Peru
    'mex.1':              -6,  // Mexico City
    'usa.1':              -5,  // MLS (Eastern, covers most teams)
    'conmebol.libertadores': -3,

    // Africa
    'rsa.1':              +2,  // South Africa (SAST = UTC+2)
    'egy.1':              +2,  // Egypt
    'zam.1':              +2,  // Zambia
    'ken.1':              +3,  // Kenya
    'nga.1':              +1,  // Nigeria
    'gha.1':               0,  // Ghana
    'uga.1':              +3,  // Uganda

    // Asia / Oceania
    'jpn.1':              +9,  // Japan
    'aus.1':             +10,  // Australia (AEST)
    'sau.1':              +3,  // Saudi Arabia
    'chn.1':              +8,  // China
    'idn.1':              +7,  // Indonesia (WIB)
    'tha.1':              +7,  // Thailand
    'ind.1':            +5.5,  // India (IST)

    // Default 0 for all European leagues — close enough to UTC
  };
  return offsets[league] ?? 0;
}

function toZambiaTime(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  // CAT = UTC+2. Shift the time then format.
  const cat = new Date(date.getTime() + 2 * 60 * 60 * 1000);
  const hours = String(cat.getUTCHours()).padStart(2, '0');
  const mins = String(cat.getUTCMinutes()).padStart(2, '0');
  // Return local date string alongside time so Claude labels days correctly
  const dateStr = cat.toISOString().slice(0, 10); // YYYY-MM-DD in CAT
  return `${hours}:${mins} CAT (${dateStr})`;
}

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

function buildDateRange(daysAhead = 7, league = null) {
  const now = new Date();

  // Shift current time to the league's local timezone before extracting the date.
  // This prevents UTC rolling ahead of South American / African local dates,
  // which caused matches to appear under the wrong day.
  const offsetHours = league ? getLeagueTimezoneOffset(league) : 0;
  const localNow = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);

  const end = new Date(localNow);
  end.setDate(end.getDate() + daysAhead);

  // Format as YYYYMMDD (ESPN scoreboard date format)
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  return `${fmt(localNow)}-${fmt(end)}`;
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

  const dateParam = buildDateRange(daysAhead, league);
  const url = `${baseUrl}?dates=${dateParam}`;
  console.log(`[espn] ${sport}/${league} → dates=${dateParam} (offset: UTC${getLeagueTimezoneOffset(league) >= 0 ? '+' : ''}${getLeagueTimezoneOffset(league)}h)`);

  try {
    const response = await fetchRetry(url);
    if (!response.ok) throw new Error(`ESPN API error: ${response.status}`);
    const data = await response.json();

    const games = (data.events || []).map(event => {
      const comp = event.competitions?.[0];
      const homeByField = comp?.competitors?.find(c => c.homeAway === 'home');
      const awayByField = comp?.competitors?.find(c => c.homeAway === 'away');
      const home = homeByField ?? comp?.competitors?.[0];
      const away = awayByField ?? comp?.competitors?.[1];
      const homeAwaySource = homeByField ? 'field' : 'position[0]=fallback';
      if (!homeByField) {
        console.warn(`[espn] homeAway field missing for ${league} event ${event.id}`);
      }

      return {
        id: event.id,
        date: event.date,
        status: {
          state: event.status?.type?.state,
          detail: event.status?.type?.detail,
          clock: event.status?.displayClock,
        },
        homeTeam: home ? { name: home.team?.displayName, abbreviation: home.team?.abbreviation, score: home.score || '0' } : null,
        awayTeam: away ? { name: away.team?.displayName, abbreviation: away.team?.abbreviation, score: away.score || '0' } : null,
        _homeAwaySource: homeAwaySource,
        venue: comp?.venue?.fullName,
        startTime: toZambiaTime(event.date),
        startTimeUTC: event.date,
      };
    });

    return {
      leagueName: ALL_SPORTS[sport]?.leagues[league] || league,
      season: getCurrentSeason(sport),
      dataAsOf: new Date().toISOString(),
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
      season: getCurrentSeason(resolved.sport),
      dataAsOf: new Date().toISOString(),
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

async function verifyTeamStats(teamName, leagueInput, claimedStats = null) {
  const resolved = resolveLeague(leagueInput);
  if (!resolved) return { error: `Unknown league: ${leagueInput}` };

  const [standingsResult, teamResult] = await Promise.all([
    fetchLeagueStandings(leagueInput),
    fetchTeamStats(teamName, leagueInput),
  ]);

  const season = getCurrentSeason(resolved.sport);
  const dataAsOf = new Date().toISOString();

  // Find the team in standings
  const teamInStandings = standingsResult.standings
    ? standingsResult.standings.find(s =>
        s.team?.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(s.team?.toLowerCase())
      )
    : null;

  return {
    verificationResult: 'LIVE DATA — use this, not the claimed stats',
    season,
    dataAsOf,
    claimedStats: claimedStats || 'none provided',
    liveStandings: teamInStandings || 'Team not found in standings',
    liveTeamStats: teamResult,
    instruction: 'Compare claimedStats against liveStandings. If they differ, report the discrepancy to the user and use only the live data.',
  };
}

function getCurrentSeason(sport) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 8) return `${year}/${year + 1}`;
  if (month <= 5) return `${year - 1}/${year}`;
  return `${year}`;
}

async function fetchTeamForm(teamName, leagueInput = null, matchCount = 5) {
  // Step 1: find the team
  const searchResults = await searchTeam(teamName);
  if (searchResults.totalFound === 0) {
    return { error: `Team "${teamName}" not found. Try the full official name.` };
  }

  let team = searchResults.results[0];
  if (leagueInput) {
    const resolved = resolveLeague(leagueInput);
    if (resolved) {
      const match = searchResults.results.find(
        t => t.sport === resolved.sport && t.league === resolved.league
      );
      if (match) team = match;
    }
  }

  // Step 2: fetch team schedule (contains recent + upcoming matches)
  const cfg = ALL_SPORTS[team.sport];
  if (!cfg) return { error: `Unknown sport: ${team.sport}` };

  const scheduleUrl = `${cfg.baseUrl}/${team.league}/teams/${team.id}/schedule`;

  try {
    const response = await fetchRetry(scheduleUrl);
    if (!response.ok) throw new Error(`ESPN API error: ${response.status}`);
    const data = await response.json();

    // Extract completed matches only
    const events = data.events || [];
    const completed = events
      .filter(e => e.competitions?.[0]?.status?.type?.state === 'post')
      .slice(-matchCount); // last N completed matches

    if (completed.length === 0) {
      return {
        error: `No recent completed matches found for ${teamName}. ` +
               `Cannot make a data-backed pick — insufficient form data.`,
        dataAvailable: false,
      };
    }

    // Parse each completed match
    const recentMatches = completed.map(event => {
      const comp = event.competitions?.[0];
      const homeByField = comp?.competitors?.find(c => c.homeAway === 'home');
      const awayByField = comp?.competitors?.find(c => c.homeAway === 'away');
      const homeComp = homeByField ?? comp?.competitors?.[0];
      const awayComp = awayByField ?? comp?.competitors?.[1];

      const isHome = homeComp?.team?.id === String(team.id);
      const teamComp = isHome ? homeComp : awayComp;
      const opponentComp = isHome ? awayComp : homeComp;

      const teamScore = parseInt(teamComp?.score) || 0;
      const oppScore = parseInt(opponentComp?.score) || 0;

      let result;
      if (teamScore > oppScore) result = 'W';
      else if (teamScore < oppScore) result = 'L';
      else result = 'D';

      return {
        date: event.date,
        opponent: opponentComp?.team?.displayName || 'Unknown',
        venue: isHome ? 'home' : 'away',
        teamScore,
        oppScore,
        result,
        btts: teamScore > 0 && oppScore > 0,
        over25: (teamScore + oppScore) > 2,
      };
    });

    // Compute aggregates
    const wins = recentMatches.filter(m => m.result === 'W').length;
    const draws = recentMatches.filter(m => m.result === 'D').length;
    const losses = recentMatches.filter(m => m.result === 'L').length;
    const goalsScored = recentMatches.reduce((s, m) => s + m.teamScore, 0);
    const goalsConceded = recentMatches.reduce((s, m) => s + m.oppScore, 0);
    const bttsCount = recentMatches.filter(m => m.btts).length;
    const over25Count = recentMatches.filter(m => m.over25).length;
    const cleanSheets = recentMatches.filter(m => m.oppScore === 0).length;
    const failedToScore = recentMatches.filter(m => m.teamScore === 0).length;
    const formString = recentMatches.map(m => m.result).join('');

    return {
      team: teamName,
      league: ALL_SPORTS[team.sport]?.leagues[team.league] || team.league,
      matchesAnalyzed: recentMatches.length,
      formString,
      record: `${wins}W-${draws}D-${losses}L`,
      goalsScored,
      goalsConceded,
      avgGoalsScored: (goalsScored / recentMatches.length).toFixed(1),
      avgGoalsConceded: (goalsConceded / recentMatches.length).toFixed(1),
      bttsCount,
      bttsRate: `${bttsCount}/${recentMatches.length}`,
      over25Count,
      over25Rate: `${over25Count}/${recentMatches.length}`,
      cleanSheets,
      failedToScore,
      recentMatches,
      dataAvailable: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { error: error.message, dataAvailable: false };
  }
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

  const TIER_NAMES = {
    tier1: 'Major European Leagues',
    tier2: 'Secondary European Leagues',
    tier3: 'Domestic Cups & Americas',
    tier4: 'Africa, Asia & Oceania',
    all: 'All Leagues Worldwide',
  };

  // "all" fetches every tier in parallel
  if (tier === 'all') {
    const allLeagues = [
      ...FOOTBALL_TIERS.tier1,
      ...FOOTBALL_TIERS.tier2,
      ...FOOTBALL_TIERS.tier3,
      ...FOOTBALL_TIERS.tier4,
    ];
    const results = await Promise.all(
      allLeagues.map(async ({ league, name }) => {
        try {
          const data = await fetchGamesForLeague('soccer', league, days);
          if (data.error) return { league: name, leagueId: league, totalGames: 0 };
          return {
            league: name,
            leagueId: league,
            totalGames: data.totalGames || 0,
            liveGames: data.liveGames || [],
            upcomingGames: data.upcomingGames || [],
            completedGames: data.completedGames || [],
          };
        } catch (e) {
          return { league: name, leagueId: league, totalGames: 0 };
        }
      })
    );

    const withGames = results.filter(r => r.totalGames > 0);
    const totalMatches = withGames.reduce((sum, r) => sum + r.totalGames, 0);

    return {
      tier: 'all',
      tierName: TIER_NAMES.all,
      daysAhead: days,
      totalMatches,
      leaguesWithGames: withGames.length,
      leaguesChecked: allLeagues.length,
      leagues: withGames,
      fetchedAt: new Date().toISOString(),
    };
  }

  const tierLeagues = FOOTBALL_TIERS[tier];
  if (!tierLeagues) return { error: `Unknown tier: ${tier}. Use "tier1", "tier2", "tier3", "tier4", or "all".` };

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
    tierName: TIER_NAMES[tier] || tier,
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
    description: 'Fetch football/soccer matches from a specific tier or ALL leagues at once. Use tier "all" when user asks broadly about football matches (e.g., "what matches are on today?") to scan all 53 leagues in parallel. Tier 1: Major European (EPL, La Liga, Bundesliga, Serie A, Ligue 1, UCL, UEL). Tier 2: Secondary European (Eredivisie, Primeira Liga, Belgian, Scottish, Turkish, Greek, Swiss, Austrian, Danish, Swedish, Norwegian, Czech, Russian, Cypriot, Israeli, Conference League, Championship). Tier 3: Domestic cups & Americas (FA Cup, Copa del Rey, DFB Pokal, MLS, Liga MX, Brasileirão, Colombian, Chilean, Uruguayan, Peruvian, Copa Libertadores). Tier 4: Africa, Asia & Oceania (Saudi Pro League, J1 League, A-League, Chinese, Indonesian, Thai, Indian Super League, PSL South Africa, Egyptian, Zambian Super League, Kenyan, Nigerian, Ghanaian, Ugandan, AFCON).',
    input_schema: {
      type: 'object',
      properties: {
        tier: { type: 'string', description: 'Which tier to fetch: "all" (recommended for broad queries), "tier1", "tier2", "tier3", or "tier4"' },
        days_ahead: { type: 'number', description: 'Number of days ahead to fetch (1-30, default 7)' },
      },
      required: ['tier'],
    },
  },
  {
    name: 'verify_team_stats',
    description: 'Verify specific stats claimed by a user against live data. ALWAYS use this when a user pastes, states, or quotes specific statistics about a team — position, record, points, goals, form, streaks. Never accept user-provided stats as fact without running this tool first.',
    input_schema: {
      type: 'object',
      properties: {
        team_name: { type: 'string', description: 'The team name to verify stats for' },
        league: { type: 'string', description: 'The league name (e.g. "Liga Profesional", "Premier League")' },
        claimed_stats: { type: 'string', description: 'The exact stats the user claimed, as a plain string. e.g. "30th place, 6 draws 4 losses, 0 points"' },
      },
      required: ['team_name', 'league'],
    },
  },
  {
    name: 'get_team_form',
    description: 'Fetch recent match results and form for a specific team. Returns last 5 matches with scores, results (W/D/L), BTTS count, Over 2.5 count, clean sheets, and goals scored/conceded. REQUIRED before making any betting pick — never suggest a pick without calling this for both teams first.',
    input_schema: {
      type: 'object',
      properties: {
        team_name: {
          type: 'string',
          description: 'Full team name e.g. "Deportivo Pereira", "Liverpool"'
        },
        league: {
          type: 'string',
          description: 'League name to narrow the search e.g. "Colombian Primera A", "Premier League"'
        },
        match_count: {
          type: 'number',
          description: 'Number of recent matches to fetch (default 5, max 10)'
        },
      },
      required: ['team_name'],
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
    case 'verify_team_stats': return await verifyTeamStats(input.team_name, input.league, input.claimed_stats);
    case 'get_team_form': return await fetchTeamForm(input.team_name, input.league, input.match_count || 5);
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
4. **Confidence**: Low / Medium / High (based on data strength)
5. **Why this pick**: 1-2 sentences explaining the reasoning from tool data
6. **Odds**: "Check the latest odds on BwanaBet" — do NOT quote specific odds numbers, they change constantly and may be inaccurate
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
- **web_search**: Search the live internet for injury news, team news, transfer updates, and any information ESPN tools cannot provide. NEVER use it to search for betting odds. See the WEB SEARCH section below for detailed usage rules.

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

## BROAD FOOTBALL QUERIES — USE "all"

When a user asks broadly about football matches (e.g., "what matches are on today?", "any football today?", "show me matches this week"):
- Use get_football_by_tier with tier "all" — this scans 53 leagues across 4 tiers in parallel
- This is the DEFAULT for any broad football query. Do NOT start with tier1 only.

When a user asks about a SPECIFIC league (e.g., "Premier League matches", "La Liga this week"):
- Use get_games directly with that league — do not use the tiered system.

When a user asks about a SPECIFIC region:
- "European matches" → use tier1 + tier2
- "South American matches" → use tier3
- "African matches" or "Asian matches" → use tier4

## PRESENTING RESULTS

- Always label each match with its league name
- Group matches by league for readability
- Show live matches first, then upcoming, then completed
- If totalMatches = 0 for "all", tell the user:
  "No football matches found across any league for [timeframe]. This might be an off-day or international break. Want to try a different timeframe?"

## TIER REFERENCE

- **Tier 1** — Major European: EPL, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, Europa League
- **Tier 2** — Secondary European: Eredivisie, Primeira Liga, Belgian, Scottish, Turkish, Greek, Swiss, Austrian, Danish, Swedish, Norwegian, Czech, Russian, Cypriot, Israeli, Conference League, Championship
- **Tier 3** — Domestic Cups & Americas: FA Cup, Copa del Rey, DFB Pokal, MLS, Liga MX, Brasileirão, Colombian, Chilean, Uruguayan, Peruvian, Copa Libertadores
- **Tier 4** — Africa, Asia & Oceania: Saudi Pro League, J1 League, A-League, Chinese, Indonesian, Thai, Indian Super League, PSL South Africa, Egyptian, Zambian Super League, Kenyan, Nigerian, Ghanaian, Ugandan, AFCON

###############################################################################
##  WEB SEARCH — WHEN AND HOW TO USE IT                                     ##
###############################################################################

You have a **web_search** tool that searches the live internet. Use it strategically alongside ESPN tools.

## WHEN TO USE WEB SEARCH

Use web_search for information ESPN tools CANNOT provide:
- **Injury & team news**: Lineup updates, suspensions, injuries before a match
- **Transfer news**: Recent signings, departures, rumours when relevant to a bet
- **Leagues not on ESPN**: Any league or competition not in our ESPN coverage
- **Verification**: When ESPN data looks stale or a user questions the accuracy
- **Context for picks**: Manager comments, form narratives, derby history
- **Live scores**: When ESPN returns no live data but user says a match is in progress

## WHEN NOT TO USE WEB SEARCH

Do NOT use web_search when ESPN tools already provide the answer:
- League standings → use get_standings
- Upcoming fixtures for known leagues → use get_games or get_football_by_tier
- Match statistics (possession, shots, corners) → use get_game_stats
- Team records and win percentages → use get_team_stats
- Betting odds → NEVER search for odds. They change by the minute and will be inaccurate. Direct users to BwanaBet for live odds.

## WEB SEARCH DATA INTEGRITY RULES

The same golden rule applies to web search results:
- Only cite specific numbers (scores, dates) that appear in the search results
- If search results are vague or conflicting, say so — do not guess
- Always attribute: "According to [source]..." when citing news
- Web search results may be outdated — note the date if visible
- NEVER combine ESPN numbers with web search numbers to create fake statistics

## SEARCH QUERY TIPS

Write specific, targeted search queries:
- GOOD: "Manchester United vs Chelsea injury news March 2026"
- GOOD: "Premier League injuries team news matchday 30"
- BAD: "football" (too vague)
- BAD: "best bets today" (opinion, not data)

## COMBINING ESPN + WEB SEARCH FOR PICKS

The best betting analysis uses BOTH:
1. ESPN tools for hard stats (standings, form, head-to-head records)
2. Web search for context (injuries, team news, suspensions)

Example flow for a pick:
1. get_games → find the match and confirm time
2. get_standings → check league positions
3. get_team_stats → check recent records
4. web_search → "Team A vs Team B injuries team news"
5. Combine ALL tool data into an informed pick
6. For odds → direct the user to check BwanaBet

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
- Specific betting odds numbers — odds change constantly and will be wrong. Always say: "Check the latest odds on BwanaBet." If a user asks for odds, direct them to BwanaBet.com.
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
[ ] Used ESPN tools for any covered league — NOT web search
[ ] If web search was used: response opens with "Based on web search results"
[ ] If web search was used: response closes with fixture confirmation note
[ ] get_team_form called for BOTH teams before any pick
[ ] Pick reasoning uses ONLY numbers from get_team_form results
[ ] If get_team_form returned no data — pick was REFUSED, not fabricated
[ ] [ACTIONS] block at the end with 3-4 relevant quick actions

###############################################################################
##  FIXTURE DISPLAY RULES                                                    ##
###############################################################################

## MATCH NAME FORMAT

When displaying any fixture, ALWAYS build the name from the tool result fields:
  {homeTeam.name} vs {awayTeam.name}

Example: if tool result has homeTeam.name = "Deportivo Riestra" and
awayTeam.name = "San Lorenzo", display as:
  Deportivo Riestra vs San Lorenzo

NEVER use the name field from tool results. ESPN formats it as:
  "Away Team at Home Team"
which is the wrong order and will mislead users about which team is at home.
The name field is for internal reference only — do not display it.

## TIME DISPLAY

All match times in tool results are already converted to CAT (Central Africa Time,
UTC+2 — Zambia local time). The startTime field format is:
  "HH:MM CAT (YYYY-MM-DD)"

Example: "21:30 CAT (2026-03-24)"

Rules:
- Always display the time as shown in startTime (e.g. "21:30 CAT")
- Never convert or display times in UTC
- To label a match as "today", "tomorrow", or a weekday name, use the DATE
  in parentheses from startTime and compare it against today's CAT date
- Never use event.date or any raw UTC string to determine the day label

## DAY LABELING

Given today's CAT date, label matches as follows:
- Same date as today → "Today"
- Next calendar date → "Tomorrow"
- Further ahead → use the weekday name (e.g. "Thursday")

Example:
  startTime: "21:30 CAT (2026-03-24)" and today is 2026-03-24 → "Today at 21:30 CAT"
  startTime: "18:00 CAT (2026-03-25)" and today is 2026-03-24 → "Tomorrow at 18:00 CAT"
  startTime: "20:00 CAT (2026-03-26)" and today is 2026-03-24 → "Thursday at 20:00 CAT"

###############################################################################
##  SEASON & DATA VERIFICATION                                               ##
###############################################################################

## CURRENT SEASON AWARENESS

Today's date is injected at runtime. The active seasons are:
- Argentina Liga Profesional: 2026
- European leagues: 2025/2026 season
- MLS: 2026
- Brazilian Série A: 2026

NEVER use stats from a previous season. If you are uncertain which season
a stat belongs to, DO NOT use it. Say:
"I can't confirm which season those stats are from. Let me pull current data."

Every tool result includes a season and dataAsOf field.
NEVER use stats from a different season than what the tool returns.

## HANDLING USER-PASTED STATS

CRITICAL: When a user pastes or states specific statistics about a team
(position, record, points, goals, form, streaks), treat them as UNVERIFIED
CLAIMS — not facts.

ALWAYS call verify_team_stats before accepting any user-provided stats.

If tool results CONTRADICT the user's stats, respond:
"The current data I'm seeing doesn't match those figures — here's what I found:"
[then show the live tool result]

NEVER say "As you mentioned, Riestra are 30th..." — always verify first.

## BEFORE EVERY STATS CLAIM

You MUST have called get_standings or get_games in the CURRENT conversation
before stating ANY statistic about a team's position, record, or points.

If you haven't fetched data yet → fetch it. Do not rely on what the user told you.

[ ] Stats verified against tool result from THIS conversation (not user input)
[ ] Season field in tool result matches current season
[ ] No stat older than 24 hours used for betting advice

###############################################################################
##  WEB SEARCH — RESTRICTIONS                                                ##
###############################################################################

Web search is a LAST RESORT. ESPN tools return structured, reliable data.
Web search returns unstructured text that is prone to home/away errors,
wrong times, and outdated results. Always prefer ESPN tools.

## WHEN TO USE ESPN TOOLS (always try these first)

For ANY of these requests, use ESPN tools — NEVER web search:
- Fixtures / match schedules → get_games or get_football_by_tier
- League tables / standings → get_standings
- Match statistics → get_game_stats
- Team search → search_team
- Team record / win rate → get_team_stats
- Head to head → get_head_to_head

These leagues are covered by ESPN tools — NEVER use web search for them:
Premier League, Championship, FA Cup, La Liga, Copa del Rey, Bundesliga,
DFB Pokal, Serie A, Coppa Italia, Ligue 1, Coupe de France, Eredivisie,
Primeira Liga, Belgian Pro League, Scottish Premiership, Süper Lig,
Champions League, Europa League, Conference League, MLS, Liga MX,
Brasileirão, Liga Profesional (Argentina), Colombian Primera A,
Uruguayan Primera División, Saudi Pro League, J1 League, A-League,
PSL South Africa, Egyptian Premier League, Copa Libertadores, AFCON,
NBA, WNBA, NFL, MLB, NHL, ATP, WTA, UFC, Formula 1, NASCAR, IPL,
Six Nations, Super Rugby.

## WHEN WEB SEARCH IS ALLOWED

Only use web_search when ALL THREE conditions are true:
1. The league is NOT in the list above (genuinely not covered by ESPN)
2. You have already called the appropriate ESPN tool and it returned
   an error or zero results
3. The user is asking about fixtures, scores, or standings — not
   general betting strategy or rules questions

Examples of valid web search use:
- Turkish 2. Lig fixtures (not in ESPN config)
- African Women's Cup of Nations (not in ESPN config)
- Brazilian Série B (not in ESPN config)
- A specific ESPN tool returned { error: "..." } or totalGames: 0

NEVER use web_search:
- As a shortcut when you could use an ESPN tool
- To verify or supplement ESPN data
- For leagues in the list above, even if you think ESPN might be slow
- For standings, stats, or team data for covered leagues

###############################################################################
##  WEB SEARCH — DISCLOSURE RULES                                            ##
###############################################################################

When you have used web_search to find fixture, score, standings, or team data
(because ESPN tools genuinely couldn't help), you MUST disclose this clearly.

## OPENING LINE

Start the response with:
"Based on web search results (not a live data feed):"

## CLOSING LINE

End the data section with:
"Confirm these fixtures on BwanaBet before placing any bets — web search
results may not reflect recent postponements or time changes."

## CONFIDENCE LEVEL

When giving a betting pick based on web search data (not ESPN data):
- Set Confidence to: Low (unverified source)
- Add to the pick: "Stats sourced from web search — verify before betting."

## WHAT THIS APPLIES TO

This disclosure rule applies to: fixtures, scores, standings, team stats,
form guides — any factual sports data sourced from web search.

This does NOT apply to: general questions about betting rules, game
explanations, casino game descriptions, or betting strategy advice.

## EXAMPLE RESPONSE FORMAT

Based on web search results (not a live data feed):

**Turkish 2. Lig — Today**
- Adana 01 vs Bucaspor 1928 — 16:00 CAT
- 24 Erzincan vs Kepezspor — 15:00 CAT

Confirm these fixtures on BwanaBet before placing any bets — web search
results may not reflect recent postponements or time changes.

###############################################################################
##  BETTING PICKS — DATA REQUIREMENTS                                        ##
###############################################################################

## MANDATORY: CALL get_team_form BEFORE ANY PICK

You MUST call get_team_form for BOTH teams before suggesting any betting pick.
No exceptions. If you have not called this tool, you have no basis for a pick.

WRONG — never do this:
  Pick: BTTS Yes
  Why: "Colombian matches tend to be high scoring" ← FABRICATED, no tool data

RIGHT — always do this:
  [calls get_team_form for team 1]
  [calls get_team_form for team 2]
  Pick: BTTS Yes
  Why: "Pereira scored in 4 of their last 5 (form: WWDLW, 4 goals scored).
       Cúcuta scored in 3 of their last 5 (form: WLDLW, 3 goals scored).
       BTTS landed in 3/5 for Pereira and 3/5 for Cúcuta."
  ← Every claim traceable to tool results

## WHEN get_team_form RETURNS NO DATA

If get_team_form returns dataAvailable: false or an error, do NOT make a pick.
Instead respond:

"I don't have enough recent match data for [team] to make a confident pick.
For the best analysis, check the match stats on BwanaBet directly before placing."

Never invent reasoning to fill the gap. An honest "no data" response protects
users from betting on fabricated analysis.

## WHAT YOU CAN AND CANNOT CLAIM FROM FORM DATA

FROM get_team_form YOU CAN SAY:
- "Pereira scored in X of their last 5" ← bttsCount / failedToScore in data
- "Cúcuta's form is WLDLW" ← formString in data
- "Over 2.5 landed in X/5 for Pereira" ← over25Count in data
- "Pereira kept X clean sheets in last 5" ← cleanSheets in data

YOU CANNOT SAY (even with form data):
- "Colombian football is attacking" ← league-wide claim, not in tool data
- "Both teams will be motivated" ← motivation not in tool data
- "This is a must-win game" ← context not in tool data
- Any claim about injuries, suspensions, or team news ← not in tool data

## CONFIDENCE LEVELS BASED ON DATA

High: Both teams have 5+ matches, form strongly supports the pick
      e.g. BTTS: both teams scored in 4/5 recent matches
Medium: Form partially supports the pick, some uncertainty
      e.g. BTTS: one team scored in 4/5, other in 3/5
Low: Limited data (fewer than 3 matches) or mixed signals
      e.g. get_team_form returned only 2 matches

## UPDATED PICK FORMAT

When giving a pick, always show the data behind it:

**[Home Team] vs [Away Team]**
- Time: [startTime from tool]
- My Pick: [specific bet type]
- Confidence: [High/Medium/Low — based on data strength above]

**Form Data:**
- [Home Team]: [formString] — scored in [X]/[total], BTTS [bttsRate]
- [Away Team]: [formString] — scored in [X]/[total], BTTS [bttsRate]

**Why this pick:**
[1-2 sentences using ONLY numbers from get_team_form results]

**How to place on BwanaBet:**
1. Sports → Football → [League]
2. Find "[Home] vs [Away]"
3. Select "[Bet Type]" → "[Selection]"
4. Start with ZMW 10-20
5. Tap "Place Bet"

*Disclaimer: I am an AI, this information is for educational purposes only
and should not be used for gambling or financial risks.*

Remember: only bet what you can afford to lose.`;



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
// RESPONSE VALIDATION — detect hallucinated numbers
// ============================================
function validateResponseNumbers(finalText, toolResultsLog, sessionId) {
  if (!finalText || !toolResultsLog?.length) return;

  // Extract numbers from response (skip very small numbers like positions 1-3, ZMW amounts)
  const numbersInResponse = [...finalText.matchAll(/\b(\d{2,}\.?\d*)\b/g)]
    .map(m => m[1])
    .filter(n => parseFloat(n) > 3);

  if (!numbersInResponse.length) return;

  // Flatten all tool results to a single searchable string
  const toolData = JSON.stringify(toolResultsLog);

  const suspicious = numbersInResponse.filter(num => !toolData.includes(num));

  // If more than 4 numbers appear in response but not in any tool result, flag it
  if (suspicious.length > 4) {
    console.warn('[widget] Possible hallucinated stats detected:', suspicious);
    slackAlert('medium', 'Possible hallucinated stats in response', {
      message: `${suspicious.length} numbers not found in tool data: ${suspicious.slice(0, 8).join(', ')}`,
      sessionId,
      endpoint: 'widget-chat',
    }).catch(() => {});
  }
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
  let toolResultsLog = [];

  try {
    // Fetch hot games and inject into system prompt
    const hotGames = await fetchHotGames();
    const currentDate = new Date().toLocaleDateString('en-ZA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Africa/Lusaka'
    });
    const dateInjection = `\n\n## CURRENT DATE\nToday is ${currentDate} (Zambia time). Use this to determine the active season for all leagues.\n`;
    const enhancedPrompt = SYSTEM_PROMPT + dateInjection + buildHotGamesPrompt(hotGames);

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
          tools: [
            ...TOOL_DEFINITIONS,
            { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
          ],
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
      // Custom tools need local execution; server tools (web_search) are already resolved inline
      const customToolBlocks = (data.content || []).filter(b => b.type === 'tool_use');
      const serverToolBlocks = (data.content || []).filter(b => b.type === 'server_tool_use');

      // Track server tool usage (web_search etc.)
      serverToolBlocks.forEach(b => allToolsCalled.push(b.name));

      if (data.stop_reason !== 'tool_use' || customToolBlocks.length === 0) {
        finalText = textBlocks.map(b => b.text).join('\n');
        break;
      }

      console.log(`[widget] Executing ${customToolBlocks.length} custom tools:`, customToolBlocks.map(t => t.name).join(', '));
      if (serverToolBlocks.length > 0) {
        console.log(`[widget] Server tools resolved: ${serverToolBlocks.map(t => t.name).join(', ')}`);
      }

      const toolResults = await Promise.all(customToolBlocks.map(async (toolBlock) => {
        allToolsCalled.push(toolBlock.name);
        try {
          const result = await executeTool(toolBlock.name, toolBlock.input);
          toolResultsLog.push(result);
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

    // Validate numbers in response against tool data (fire-and-forget)
    validateResponseNumbers(finalText, toolResultsLog, sessionId);

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
