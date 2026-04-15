// ============================================
// BetPredict Widget — Self-Contained Chat Endpoint — v2.1.0
// All-in-one: sports engine + system prompt + tool loop + monitoring
// No external imports — everything inline for Vercel compatibility
// ============================================

// ============================================
// BetPredict — Server-Side Sports Engine
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
  const priority = [
    // Major European
    { sport: 'soccer', league: 'eng.1' }, { sport: 'soccer', league: 'esp.1' },
    { sport: 'soccer', league: 'ger.1' }, { sport: 'soccer', league: 'ita.1' },
    { sport: 'soccer', league: 'fra.1' }, { sport: 'soccer', league: 'uefa.champions' },
    // Americas
    { sport: 'soccer', league: 'arg.1' }, { sport: 'soccer', league: 'bra.1' },
    { sport: 'soccer', league: 'col.1' }, { sport: 'soccer', league: 'uru.1' },
    { sport: 'soccer', league: 'mex.1' }, { sport: 'soccer', league: 'usa.1' },
    { sport: 'soccer', league: 'chi.1' }, { sport: 'soccer', league: 'per.1' },
    { sport: 'soccer', league: 'conmebol.libertadores' },
    // Africa & Asia
    { sport: 'soccer', league: 'rsa.1' }, { sport: 'soccer', league: 'egy.1' },
    { sport: 'soccer', league: 'zam.1' }, { sport: 'soccer', league: 'sau.1' },
    { sport: 'soccer', league: 'jpn.1' }, { sport: 'soccer', league: 'aus.1' },
    // Secondary European
    { sport: 'soccer', league: 'por.1' }, { sport: 'soccer', league: 'ned.1' },
    { sport: 'soccer', league: 'tur.1' }, { sport: 'soccer', league: 'bel.1' },
    // Other sports
    { sport: 'basketball', league: 'nba' }, { sport: 'football', league: 'nfl' },
    { sport: 'hockey', league: 'nhl' },
  ];

  // Search in batches of 9, early exit when found
  for (let i = 0; i < priority.length && results.length < 8; i += 9) {
    const batch = priority.slice(i, i + 9);
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

async function fetchTeamForm(teamName, leagueInput = null, matchCount = 10) {
  // Step 0: Check Supabase cache (4-hour TTL)
  // Cache key: normalized team name + league, safe for REST query
  const normalizeForCache = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  const cacheKey = `${normalizeForCache(teamName)}|${normalizeForCache(leagueInput)}`;
  const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

  try {
    const cached = await supabaseSelect(
      'team_form_cache',
      `cache_key=eq.${encodeURIComponent(cacheKey)}&select=form_data,cached_at&limit=1`
    );
    if (cached?.[0]) {
      const age = Date.now() - new Date(cached[0].cached_at).getTime();
      // Only serve cache if: within TTL, has valid data, and source is ESPN (not web search)
      if (age < CACHE_TTL_MS && cached[0].form_data?.dataAvailable && cached[0].form_data?.source === 'espn') {
        console.log(`[form-cache] HIT for "${teamName}" (${Math.round(age / 60000)}min old)`);
        return { ...cached[0].form_data, source: 'cache', cacheAge: Math.round(age / 60000) };
      }
    }
  } catch (e) {
    // Cache unavailable — continue to ESPN (Supabase down should not break the bot)
    console.warn('[form-cache] Supabase read failed, falling back to ESPN:', e.message);
  }

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

      const rawTeamScore = teamComp?.score;
      const teamScore = parseInt(typeof rawTeamScore === 'object' ? (rawTeamScore?.displayValue ?? rawTeamScore?.value) : rawTeamScore) || 0;
      const rawOppScore = opponentComp?.score;
      const oppScore = parseInt(typeof rawOppScore === 'object' ? (rawOppScore?.displayValue ?? rawOppScore?.value) : rawOppScore) || 0;

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

    // ── Suspicious data detection ──────────────────────────────────────────
    // ESPN sometimes returns completed match shells with no scores for South
    // American leagues. Detect this before returning to Claude.

    const allDraws = draws === recentMatches.length && recentMatches.length >= 3;
    const allZeroGoals = goalsScored === 0 && goalsConceded === 0 && recentMatches.length >= 3;
    const allIdenticalScores = recentMatches.length >= 3 && recentMatches.every(
      m => m.teamScore === recentMatches[0].teamScore &&
           m.oppScore === recentMatches[0].oppScore
    );
    const isDataSuspicious = allDraws || allZeroGoals || allIdenticalScores;

    if (isDataSuspicious) {
      console.warn(
        `[form] Suspicious ESPN data for "${teamName}" (${team.league}) — ` +
        `${recentMatches.length} matches: ${wins}W-${draws}D-${losses}L, ` +
        `${goalsScored} goals scored. Flagging as unavailable.`
      );
      return {
        team: teamName,
        league: ALL_SPORTS[team.sport]?.leagues[team.league] || team.league,
        dataAvailable: false,
        reason: `ESPN returned suspicious data for ${teamName} — ` +
                `${recentMatches.length} matches all showing identical or zero scores. ` +
                `Use web_search fallback to find real form data.`,
        espnRawSample: recentMatches.slice(0, 3),
        fetchedAt: new Date().toISOString(),
      };
    }
    // ── End suspicious data detection ─────────────────────────────────────

    const formResult = {
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
      source: 'espn',
      fetchedAt: new Date().toISOString(),
    };

    // Write to Supabase cache for other sessions to use
    // Only cache clean ESPN data (never cache suspicious, error, or web search results)
    if (formResult.dataAvailable && formResult.source === 'espn') {
      supabaseUpsert('team_form_cache', {
        cache_key: cacheKey,
        team_name: teamName,
        league: formResult.league,
        form_data: formResult,
        cached_at: new Date().toISOString(),
      }).catch((e) => {
        console.warn('[form-cache] Write failed (non-blocking):', e.message);
      });
    }

    return formResult;
  } catch (error) {
    // ESPN failure should not block the bot — return gracefully
    return { error: error.message, dataAvailable: false };
  }
}

// ============================================
// BETSLIP MANAGER
// ============================================

function manageBetslip(action, currentSlip, pickData = null, removeIndex = null) {
  // currentSlip is passed in from Claude's conversation context as a JSON string
  let slip;
  try {
    slip = currentSlip
      ? (typeof currentSlip === 'string' ? JSON.parse(currentSlip) : currentSlip)
      : { picks: [] };
  } catch (e) {
    slip = { picks: [] };
  }
  if (!slip || !Array.isArray(slip.picks)) slip = { picks: [] };

  switch (action) {

    case 'add': {
      if (!pickData) return { error: 'pickData required for add action' };
      const pick = {
        id: Date.now(),
        match: pickData.match,           // "Deportivo Pereira vs Cúcuta"
        homeTeam: pickData.homeTeam,
        awayTeam: pickData.awayTeam,
        betType: pickData.betType,       // "BTTS Yes", "Home Win", "Over 2.5"
        confidence: pickData.confidence, // "High", "Medium", "Low"
        basis: pickData.basis,           // short reasoning string from form data
        missingData: pickData.missingData || null, // what was unavailable
        addedAt: new Date().toISOString(),
      };
      slip.picks.push(pick);
      return {
        action: 'added',
        pick,
        slip,
        slipJson: JSON.stringify(slip),
        totalPicks: slip.picks.length,
        summary: buildSlipSummary(slip),
      };
    }

    case 'remove': {
      if (removeIndex === null || removeIndex === undefined) {
        return { error: 'removeIndex required for remove action (0-based)' };
      }
      const idx = parseInt(removeIndex);
      if (idx < 0 || idx >= slip.picks.length) {
        return { error: `Invalid index ${idx}. Slip has ${slip.picks.length} picks (0 to ${slip.picks.length - 1}).` };
      }
      const removed = slip.picks.splice(idx, 1)[0];
      return {
        action: 'removed',
        removedPick: removed,
        slip,
        slipJson: JSON.stringify(slip),
        totalPicks: slip.picks.length,
        summary: buildSlipSummary(slip),
      };
    }

    case 'view': {
      return {
        action: 'view',
        slip,
        slipJson: JSON.stringify(slip),
        totalPicks: slip.picks.length,
        summary: buildSlipSummary(slip),
      };
    }

    case 'clear': {
      slip.picks = [];
      return {
        action: 'cleared',
        slip,
        slipJson: JSON.stringify(slip),
        totalPicks: 0,
        summary: 'Betslip cleared.',
      };
    }

    default:
      return { error: `Unknown action: ${action}. Use add, remove, view, or clear.` };
  }
}

function buildSlipSummary(slip) {
  if (!slip.picks.length) return 'Betslip is empty.';

  const confidenceRank = { High: 3, Medium: 2, Low: 1 };
  const weakest = slip.picks.reduce((min, p) =>
    (confidenceRank[p.confidence] || 0) < (confidenceRank[min.confidence] || 0) ? p : min,
    slip.picks[0]
  );

  const lines = slip.picks.map((p, i) =>
    `${i + 1}. ${p.match} — ${p.betType} [${p.confidence}]${p.missingData ? ' ⚠️' : ''}`
  );

  return {
    totalPicks: slip.picks.length,
    type: slip.picks.length === 1 ? 'Single' : 'Accumulator',
    overallConfidence: weakest.confidence,
    picks: lines,
    hasGaps: slip.picks.some(p => p.missingData),
    note: slip.picks.length > 1
      ? `Accumulator confidence is ${weakest.confidence} — driven by the weakest leg.`
      : null,
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
// TOOL DEFINITIONS (OpenAI function calling format)
// ============================================
const TOOL_DEFINITIONS = [
  { type: 'function', function: {
    name: 'get_games',
    description: 'Fetch live, upcoming, and completed games for a league over a date range. Default is 7 days ahead. Use days_ahead=30 for a full month of fixtures. Returns scores, teams, match times, and game IDs (use IDs with get_game_stats for detailed stats).',
    parameters: { type: 'object', properties: { league: { type: 'string', description: 'League name (e.g., "Premier League", "NBA", "La Liga", "Champions League", "UFC")' }, days_ahead: { type: 'number', description: 'Number of days ahead to fetch (1-30, default 7). Use 30 for a full month of fixtures.' } }, required: ['league'] },
  }},
  { type: 'function', function: {
    name: 'get_standings',
    description: 'Fetch current league standings/table with team rankings, wins, losses, points.',
    parameters: { type: 'object', properties: { league: { type: 'string', description: 'League name' } }, required: ['league'] },
  }},
  { type: 'function', function: {
    name: 'get_game_stats',
    description: 'Get detailed match statistics: possession, shots, corners, cards, key events (goals), lineups. Requires a game_id from get_games.',
    parameters: { type: 'object', properties: { league: { type: 'string' }, game_id: { type: 'string', description: 'Game ID from get_games results' } }, required: ['league', 'game_id'] },
  }},
  { type: 'function', function: {
    name: 'search_team',
    description: 'Search for a team by name across major leagues worldwide.',
    parameters: { type: 'object', properties: { team_name: { type: 'string' } }, required: ['team_name'] },
  }},
  { type: 'function', function: {
    name: 'get_team_stats',
    description: 'Get detailed statistics for a team: record, win percentage, standings.',
    parameters: { type: 'object', properties: { team_name: { type: 'string' }, league: { type: 'string', description: 'Optional: specify league if ambiguous' } }, required: ['team_name'] },
  }},
  { type: 'function', function: {
    name: 'get_head_to_head',
    description: 'Compare two teams — shows records and win percentages for both.',
    parameters: { type: 'object', properties: { team1: { type: 'string' }, team2: { type: 'string' }, league: { type: 'string' } }, required: ['team1', 'team2'] },
  }},
  { type: 'function', function: {
    name: 'list_leagues',
    description: 'List all available sports and leagues. Use when users ask what sports are available.',
    parameters: { type: 'object', properties: { sport: { type: 'string', description: 'Optional: filter by sport' } }, required: [] },
  }},
  { type: 'function', function: {
    name: 'calculate_bet_payout',
    description: 'Calculate potential payout for a bet given odds and stake.',
    parameters: { type: 'object', properties: { odds: { type: 'number' }, stake: { type: 'number' } }, required: ['odds', 'stake'] },
  }},
  { type: 'function', function: {
    name: 'get_football_by_tier',
    description: 'Fetch football/soccer matches from a specific tier or ALL leagues at once. Use tier "all" when user asks broadly about football matches (e.g., "what matches are on today?") to scan all 53 leagues in parallel. Tier 1: Major European (EPL, La Liga, Bundesliga, Serie A, Ligue 1, UCL, UEL). Tier 2: Secondary European (Eredivisie, Primeira Liga, Belgian, Scottish, Turkish, Greek, Swiss, Austrian, Danish, Swedish, Norwegian, Czech, Russian, Cypriot, Israeli, Conference League, Championship). Tier 3: Domestic cups & Americas (FA Cup, Copa del Rey, DFB Pokal, MLS, Liga MX, Brasileirão, Colombian, Chilean, Uruguayan, Peruvian, Copa Libertadores). Tier 4: Africa, Asia & Oceania (Saudi Pro League, J1 League, A-League, Chinese, Indonesian, Thai, Indian Super League, PSL South Africa, Egyptian, Zambian Super League, Kenyan, Nigerian, Ghanaian, Ugandan, AFCON). Also use this tool as the first step when building an accumulator — fetch tier3 for South American leagues and tier1 for European leagues to get today\'s candidates.',
    parameters: {
      type: 'object',
      properties: {
        tier: { type: 'string', description: 'Which tier to fetch: "all" (recommended for broad queries), "tier1", "tier2", "tier3", or "tier4"' },
        days_ahead: { type: 'number', description: 'Number of days ahead to fetch (1-30, default 7)' },
      },
      required: ['tier'],
    },
  }},
  { type: 'function', function: {
    name: 'verify_team_stats',
    description: 'Verify specific stats claimed by a user against live data. ALWAYS use this when a user pastes, states, or quotes specific statistics about a team — position, record, points, goals, form, streaks. Never accept user-provided stats as fact without running this tool first.',
    parameters: {
      type: 'object',
      properties: {
        team_name: { type: 'string', description: 'The team name to verify stats for' },
        league: { type: 'string', description: 'The league name (e.g. "Liga Profesional", "Premier League")' },
        claimed_stats: { type: 'string', description: 'The exact stats the user claimed, as a plain string. e.g. "30th place, 6 draws 4 losses, 0 points"' },
      },
      required: ['team_name', 'league'],
    },
  }},
  { type: 'function', function: {
    name: 'get_team_form',
    description: 'Fetch recent match results and form for a specific team. Returns last 5 matches with scores, results (W/D/L), BTTS count, Over 2.5 count, clean sheets, and goals scored/conceded. REQUIRED before making any betting pick — never suggest a pick without calling this for both teams first.',
    parameters: {
      type: 'object',
      properties: {
        team_name: { type: 'string', description: 'Full team name e.g. "Deportivo Pereira", "Liverpool"' },
        league: { type: 'string', description: 'League name to narrow the search e.g. "Colombian Primera A", "Premier League"' },
        match_count: { type: 'number', description: 'Number of recent matches to fetch (default 10, max 10)' },
      },
      required: ['team_name'],
    },
  }},
  { type: 'function', function: {
    name: 'manage_betslip',
    description: 'Add, remove, view, or clear picks on the user\'s session betslip. The betslip persists across conversation turns. ALWAYS call get_team_form for both teams BEFORE calling manage_betslip with action="add". Pass the current slip JSON from conversation context as current_slip.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'One of: "add", "remove", "view", "clear"' },
        current_slip: { type: 'string', description: 'Current betslip as JSON string from conversation context. Pass empty string if no slip exists yet.' },
        pick_data: {
          type: 'object',
          description: 'Required for action="add". Contains match, homeTeam, awayTeam, betType, confidence, basis, missingData.',
          properties: {
            match: { type: 'string', description: 'e.g. "Deportivo Pereira vs Cúcuta Deportivo"' },
            homeTeam: { type: 'string' },
            awayTeam: { type: 'string' },
            betType: { type: 'string', description: 'e.g. "BTTS Yes", "Home Win", "Over 2.5", "Draw", "Double Chance"' },
            confidence: { type: 'string', description: 'High, Medium, or Low' },
            basis: { type: 'string', description: 'Short reasoning from form data only' },
            missingData: { type: 'string', description: 'What data was unavailable, or null if complete' },
          },
        },
        remove_index: { type: 'number', description: 'Required for action="remove". 0-based index of pick to remove.' },
      },
      required: ['action', 'current_slip'],
    },
  }},
  { type: 'function', function: {
    name: 'web_search',
    description: 'Search the live internet for information ESPN tools cannot provide: injury news, team news, transfer updates, form data for teams where get_team_form returned dataAvailable:false, leagues not covered by ESPN, PLAYER STATS AND INFO (always search immediately when user asks about a specific player), player career overviews, achievements, historical stats, and general football knowledge. NEVER use for betting odds. NEVER use when ESPN tools already provide the answer.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query. Be specific, e.g. "Deportivo Pereira recent results 2026" or "Arsenal injuries April 2026"' },
      },
      required: ['query'],
    },
  }},
  { type: 'function', function: {
    name: 'get_casino_games',
    description: 'Fetch BwanaBet casino and live casino game data including descriptions, tips, strategies, and daily payout status. Call this when the user asks about casino games, slots, Aviator, crash games, roulette, blackjack, or live casino. Returns both regular casino games and live casino games with recommendation guidance.',
    parameters: { type: 'object', properties: {}, required: [] },
  }},
];

// ============================================
// WEB SEARCH via Claude API (hybrid approach)
// GPT-4.1 mini handles conversation + ESPN tools,
// Claude handles web search only when needed.
// ============================================
async function executeWebSearch(query) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { error: 'Web search unavailable (ANTHROPIC_API_KEY not set)', query };
  }

  console.log(`[widget] Web search via Claude: "${query}"`);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: `Search the web for: ${query}\n\nReturn only the factual results — match scores, team form, injury news, etc. Be concise and structured.` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[widget] Claude web search error:', data.error?.message);
      return { error: `Web search failed: ${data.error?.message}`, query };
    }

    // Extract text from Claude's response (it processes web results and summarizes)
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const resultText = textBlocks.map(b => b.text).join('\n');

    return {
      query,
      results: resultText || 'No results found',
      source: 'web_search_via_claude',
      tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };
  } catch (e) {
    console.error('[widget] Web search exception:', e.message);
    return { error: `Web search failed: ${e.message}`, query };
  }
}

// ============================================
// TOOL EXECUTOR
// ============================================
async function executeTool(name, input) {
  switch (name) {
    case 'get_games': {
      const gamesResult = await fetchGames(input.league, input.days_ahead);
      if (gamesResult.error || gamesResult.totalGames === 0 || (gamesResult.completedGames && gamesResult.completedGames.length === 0)) {
        gamesResult._fallbackHint = 'ESPN returned no completed match results. You MUST now call web_search to answer the user\'s question. Do NOT say "no matches found" without searching the web first.';
      }
      return gamesResult;
    }
    case 'get_standings': {
      const standingsResult = await fetchLeagueStandings(input.league);
      if (standingsResult.error) {
        standingsResult._fallbackHint = 'ESPN returned no standings. You MUST now call web_search to find current standings.';
      }
      return standingsResult;
    }
    case 'get_game_stats': {
      const statsResult = await fetchGameStats(input.league, input.game_id);
      if (statsResult.error) {
        statsResult._fallbackHint = 'ESPN returned no stats. You MUST now call web_search to find this match info.';
      }
      return statsResult;
    }
    case 'search_team': return await searchTeam(input.team_name);
    case 'get_team_stats': {
      const teamStatsResult = await fetchTeamStats(input.team_name, input.league);
      if (teamStatsResult.error) {
        teamStatsResult._fallbackHint = 'ESPN returned no team stats. You MUST now call web_search to find this info.';
      }
      return teamStatsResult;
    }
    case 'get_head_to_head': {
      const h2hResult = await fetchHeadToHead(input.team1, input.team2, input.league);
      if (h2hResult.error) {
        h2hResult._fallbackHint = 'ESPN returned no H2H data. You MUST now call web_search to find head-to-head info.';
      }
      return h2hResult;
    }
    case 'list_leagues': return listAvailableLeagues(input.sport);
    case 'calculate_bet_payout': return calculatePayout(input.odds, input.stake);
    case 'get_football_by_tier': {
      const tierResult = await fetchFootballByTier(input.tier, input.days_ahead);
      const allCompleted = tierResult.leagues?.flatMap(l => l.completedGames || []) || [];
      if (tierResult.error || tierResult.totalGames === 0 || allCompleted.length === 0) {
        tierResult._fallbackHint = 'ESPN returned no completed match results for this tier. You MUST now call web_search to answer the user\'s question.';
      }
      return tierResult;
    }
    case 'verify_team_stats': return await verifyTeamStats(input.team_name, input.league, input.claimed_stats);
    case 'get_team_form': {
      const formResult = await fetchTeamForm(input.team_name, input.league, input.match_count || 10);
      // Auto-fallback: if ESPN has no data, try web search instead of leaving it to the LLM
      if (formResult.dataAvailable === false || formResult.error) {
        console.log(`[widget] Auto web-search fallback for "${input.team_name}" (ESPN returned no data)`);
        const webResult = await executeWebSearch(
          `${input.team_name} recent form results ${new Date().getFullYear()} last 5 matches`
        );
        return {
          ...formResult,
          webSearchFallback: true,
          webData: webResult,
          note: `ESPN had no data for ${input.team_name}. Web search results attached. IMPORTANT: Only use LEAGUE stats (not all-competition totals). If the web results mix league and cup data, only cite the league-specific numbers. If you cannot distinguish, say "based on available data" and do not cite exact numbers.`,
        };
      }
      return formResult;
    }
    case 'web_search': return await executeWebSearch(input.query);
    case 'get_casino_games': {
      const [hotGames, liveCasino] = await Promise.all([fetchHotGames(), fetchLiveCasinoGames()]);
      return {
        hotGames: buildHotGamesPrompt(hotGames),
        liveCasino: buildLiveCasinoPrompt(liveCasino),
        instructions: 'Use the data above to recommend games. Recommend EXACTLY 4 games. Lead with HOT games. Do NOT use emojis.',
      };
    }
    case 'manage_betslip': return manageBetslip(
      input.action,
      input.current_slip,
      input.pick_data || null,
      input.remove_index ?? null
    );
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
// BetPredict — System Prompt (matches full app design)
// Single source of truth for widget personality & rules
// ============================================

const SYSTEM_PROMPT = `You are BetPredict, the AI sports betting assistant on BwanaBet.com — Zambia's premier betting platform. You have ONE absolute rule: EVERY statistic MUST come directly from tool results.

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

If user says hello/hi/hey or asks your name, ALWAYS introduce yourself:
"Hey! I'm BetPredict, your AI betting assistant on BwanaBet. What do you prefer?"
Then suggest: Sports Betting or Casino Games
ALWAYS identify as BetPredict when asked "what's your name", "who are you", or similar.

If they choose sports betting, jump straight into action — fetch today's matches and give them a pick immediately. Default to simple, clear language. If the user later asks for more detail or stats, then switch to in-depth mode.

FIRST MESSAGE RULE: When the conversation has only 1 user message, keep your response SHORT — 2-3 sentences max, then show a pick or recommendation. Do NOT ask follow-up questions before delivering value. Get to the good stuff fast.

## BETSLIP FLOW — HOW TO HANDLE "MAKE ME A BETSLIP"

When a user asks for a betslip, picks, or "what should I bet on today":

Step 1: Call get_football_by_tier with tier "tier1" and daysAhead 1 to check major leagues.

Step 2: If tier1 has matches → build picks from those matches.
        If tier1 has NO matches → tell the user:
        "There are no major European league matches today."
        Then call get_football_by_tier with tier "all" and daysAhead 1.

Step 3: Report which leagues DO have matches today, e.g.:
        "However, I found matches in these leagues today:
        • Colombian Primera A (4 matches)
        • Uruguayan Primera División (6 matches)
        • Liga Profesional Argentina (1 match)
        Would you like me to build a betslip from these?"

Step 4: WAIT for the user to confirm before calling get_team_form and building picks.
        Do NOT auto-generate picks for leagues the user hasn't agreed to.

Step 5: Once user confirms, call get_team_form for both teams in each selected match,
        then build the betslip using the UPDATED PICK FORMAT below.

IMPORTANT: Never say "form data isn't available" without actually trying.
Always call get_team_form with the exact team name AND league parameter to
narrow the search. Example: get_team_form("Deportivo Pereira", "Colombian Primera A")

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

## ACCUMULATOR UPSELL — MANDATORY

COUNT the number of single-match betting picks in the conversation history
(messages where you gave a "My Pick:" for a specific match). If there are
3 or more previous picks in the conversation, you MUST add this line at the
END of your response, BEFORE the [ACTIONS] block:

"You've got [N] picks so far — want me to combine them into an accumulator for a bigger payout?"

And change the [ACTIONS] to:
[ACTIONS]
Build accumulator | Combine my picks into an accumulator betslip
Different pick | Show me a different betting pick
[/ACTIONS]

This is NON-NEGOTIABLE after 3+ picks. Users who build accumulators place
higher-value bets — this is a key revenue driver.

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
##  WEB SEARCH RULES                                                        ##
###############################################################################

## MANDATORY FALLBACK

If ANY ESPN tool returns no results or errors, you MUST call web_search before telling the user "no data found." This is automatic for get_team_form, but for other tools you should call web_search yourself.

## WHEN TO USE

- Injury/team news, transfers, manager comments
- Past match results (yesterday or earlier)
- Player stats (IMMEDIATELY search when asked — don't ask clarifying questions first)
- Leagues not on ESPN, player history, football knowledge
- When ESPN returns no live data but user says a match is in progress

## WHEN NOT TO USE

- ESPN-covered leagues for standings, fixtures, match stats, team records
- NEVER search for betting odds — direct users to BwanaBet

## DATA INTEGRITY

- Only cite numbers that appear in search results — do not guess
- NEVER combine ESPN + web search numbers to create fake statistics
- If web search data used for a pick: cap confidence at Medium, add verification disclaimer
- Write specific queries: "Arsenal injuries April 2026" not "football"

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
##  LIVE DATA vs GENERAL KNOWLEDGE                                           ##
###############################################################################

Not all questions require tool data. Distinguish between these two types:

**LIVE DATA** — MUST use tools, strict number rules apply:
- Today's matches, scores, standings, current form
- Current team stats, recent results, head-to-head
- Injury updates, transfer news (use web search)
- Betting picks and analysis
- Anything where the answer changes day-to-day

**GENERAL KNOWLEDGE** — answer from your own knowledge, no tools needed:
- Player career overviews, achievements, records, biographies
- Football history (World Cup winners, all-time records, legendary matches)
- Betting terminology and rules (what is an accumulator, how does cashout work)
- How casino games work, game rules, general strategies
- Sport rules and explanations
- General BwanaBet questions (what sports are available, how to place a bet)

IMPORTANT: General knowledge ONLY covers sports, betting, and casino topics.
Do NOT answer general knowledge about unrelated subjects (science, school,
politics, etc.) — see OFF-TOPIC BOUNDARY rules above.

For sports/betting general knowledge, respond naturally and confidently. Do NOT refuse to answer just because no tool was called. The "every number must come from tools" rule ONLY applies to live data like current form, standings, and betting picks — NOT to well-known historical facts like "Ronaldo has scored 900+ career goals" or "the World Cup is held every 4 years."

If you are unsure whether something is live data or general knowledge, use web search to verify.

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
- NEVER mention "tools", "tool results", "my current tools", "available tools", or any internal system language to the user. The user should never know how you work internally. Instead of "I don't have tools for this", just use web search or say "Let me look that up for you."

###############################################################################
##  OFF-TOPIC BOUNDARY                                                       ##
###############################################################################

You are a BETTING assistant ONLY. You do NOT answer questions unrelated to:
- Sports (football, matches, teams, players, leagues, tournaments)
- Betting (picks, accumulators, odds, strategies, how to place bets)
- Casino games (Aviator, slots, crash games, live casino)
- BwanaBet platform (account help, deposits, withdrawals)

If a user asks about school subjects (biology, chemistry, physics, ICT, maths),
general knowledge (history, geography, politics), sex, pornography, or anything
completely unrelated to sports/betting/casino, respond with EXACTLY:

"I'm BetPredict — I only help with sports betting and casino games on BwanaBet. Want a betting pick or casino recommendation?"

Do NOT answer the off-topic question. Do NOT explain why you can't answer.
Just redirect. One sentence, then the action buttons.

###############################################################################
##  TRANSFER NEWS / GOSSIP LIMIT                                             ##
###############################################################################

If a user asks about transfers, rumours, or player gossip, you may answer ONE
question using web_search. After that first answer, redirect:

"For more transfer news, check BBC Sport or ESPN. Want me to find you a bet instead?"

Do NOT keep searching for transfer after transfer. You are a betting assistant,
not a news feed. If the user keeps asking for transfers, gently redirect each
time — do not use web_search again for transfer gossip in the same session.
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

When a user mentions ANY of the following, respond with empathy and direct them to the call center:
- Account blocked, suspended, locked, or restricted
- Login problems, password issues, can't access account
- Deposit or withdrawal problems, pending transactions
- KYC / verification issues
- Technical errors on the site or app
- Bonus disputes, missing funds
- Any complaint or frustration with BwanaBet services

Response format — be polite, sympathetic, and helpful:
"I'm sorry to hear that — I understand how frustrating that must be. For account and technical issues, the BwanaBet support team can help you right away. Please call them directly:

+260 972 833 023
+260 962 290 801

They'll get you sorted quickly!"

Do NOT try to troubleshoot account or technical issues yourself. You only handle sports data, betting analysis, and casino game recommendations. Always direct them to the call center for everything else.

## RESPONSIBLE GAMBLING

- Include a brief reminder on every sports betting suggestion: "Remember: only bet what you can afford to lose."
- Suggest starting with small stakes (ZMW 10-20) for beginners
- Never pressure users to bet or increase stakes
- If a user seems distressed about losses, encourage them to take a break

###############################################################################
##  CASINO GAMES                                                             ##
###############################################################################

For casino questions, FIRST call the get_casino_games tool to fetch today's game data (hot games, payout statuses, live casino). Then use that data to recommend games.

TONE: Excited, conversational — like a friend sharing insider tips, not reading a spec sheet.
- Use phrases like "this one's been paying out!", "could be your lucky day"
- NEVER mention RTP unless asked. NEVER lecture about randomness or house edge unless asked.
- Recommend EXACTLY 4 games. No emojis. Lead with HOT games.
- HOT: "Players are cashing in right now!" / DUE: "Building up for a big payout!" / QUIET: "Solid game, steady play"
- Always mention BwanaBet's Live Casino too.
- Guide them to play: "Head to BwanaBet Casino and try it out!"

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

At the END of EVERY response, include exactly 2 suggested next actions in this format:

[ACTIONS]
Action text 1 | message to send if clicked
Action text 2 | message to send if clicked
[/ACTIONS]

## 2-BUTTON FUNNEL DESIGN

Every response sits at a stage in the user's journey:
  Discovery → Analysis → Pick → Next bet

The 2 buttons MUST be:
1. **Forward** — pushes the user deeper toward getting a bet recommendation
2. **Lateral** — offers an alternative path, but still within the funnel

NEVER include backward actions, dead ends, or generic filler.
NEVER include links to BwanaBet — they do not work inside the widget.

Rules:
- Exactly 2 actions, no more, no less
- Actions MUST be relevant to what you just said
- If you asked a question with choices, the actions should BE those choices
- Keep action text short (2-5 words)
- The message after | is what gets sent as the user's next message

## ACTIONS BY FUNNEL STAGE

Greeting / onboarding:
[ACTIONS]
Sports Betting | I want to try sports betting
Casino Games | Show me casino games
[/ACTIONS]

After showing match list:
[ACTIONS]
Pick me a bet | Pick me the best bet from these matches
Different league | Show me matches from a different league
[/ACTIONS]

After showing team stats:
[ACTIONS]
Give me a pick | Give me a betting pick based on this
Compare another team | Compare with another team
[/ACTIONS]

After showing standings:
[ACTIONS]
Pick a match to bet | Pick a match from this league for me to bet on
Different league | Show me standings for a different league
[/ACTIONS]

After giving a single pick:
[ACTIONS]
Build accumulator | Check today's other matches and build me an accumulator
Different pick | Show me a different betting pick
[/ACTIONS]

After showing accumulator/betslip:
[ACTIONS]
Explain these picks | Explain the reasoning behind each pick in more detail
Start fresh | Clear my betslip and show me today's matches
[/ACTIONS]

After placement instructions:
[ACTIONS]
More picks | Give me some more betting picks
Build accumulator | Build me an accumulator for today
[/ACTIONS]

After casino game recommendation:
[ACTIONS]
Try Live Casino | Tell me about BwanaBet Live Casino — live dealers, real action
Show another game | Recommend a different casino game
[/ACTIONS]

After casino game explanation:
[ACTIONS]
Try Live Casino | Tell me about BwanaBet Live Casino games
Try sports betting | Show me sports betting picks
[/ACTIONS]

After educational explanation:
[ACTIONS]
Show me picks | Now show me some betting picks
Explain more | Explain this in more detail
[/ACTIONS]

CRITICAL: Actions must match YOUR response content. Pick the stage that best matches what you just said.

###############################################################################
##  FINAL CHECK BEFORE EVERY RESPONSE                                       ##
###############################################################################

- Every number must appear in tool results (no fabrication)
- get_team_form called for BOTH teams before any pick
- Pick reasoning uses ONLY tool data; confidence matches data quality
- BTTS Yes requires both teams scored in 3+ of last 5
- Web search data: cap confidence at Medium, add disclosure
- [ACTIONS] block at end with exactly 2 relevant actions (forward + lateral)

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
- Display ONLY the time and timezone: "21:30 CAT"
- NEVER show the date in parentheses to the user — it is for internal
  day labeling only. Strip it before displaying.
- Never convert or display times in UTC
- Never use event.date or any raw UTC string to determine the day label

CORRECT: "Atlético Junior vs Bucaramanga — Tomorrow at 01:00 CAT"
WRONG:   "Atlético Junior vs Bucaramanga — 01:00 CAT (2026-03-25)"

## DAY LABELING

Use the date in parentheses from startTime ONLY to compute the day label.
Compare it against today's CAT date (injected at the top of this prompt).

Label rules — count calendar days from today:
- 0 days ahead (same date) → "Today at HH:MM CAT"
- 1 day ahead → "Tomorrow at HH:MM CAT"
- 2+ days ahead → "[Weekday name] at HH:MM CAT"

CRITICAL: "Tomorrow" means exactly 1 calendar day ahead. A match on
March 26 when today is March 24 is NOT tomorrow — it is Thursday.

Examples (today = 2026-03-24):
  startTime: "21:30 CAT (2026-03-24)" → "Today at 21:30 CAT"
  startTime: "01:00 CAT (2026-03-25)" → "Tomorrow at 01:00 CAT"
  startTime: "03:00 CAT (2026-03-26)" → "Thursday at 03:00 CAT"
  startTime: "20:00 CAT (2026-03-27)" → "Friday at 20:00 CAT"
  startTime: "15:00 CAT (2026-03-28)" → "Saturday at 15:00 CAT"

Never say "Tomorrow Night" for a match that is 2+ days away.
Never say "Tonight" for a match that is on a future calendar date.

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

## WEB SEARCH DISCLOSURE (when web search was used for sports data)
- Cap confidence at Medium (Low if data is thin)
- Add: "These stats could be inaccurate. Please verify on Sofascore before placing."
- Close with: "Confirm these fixtures on BwanaBet before placing any bets — web search results may not reflect recent postponements or time changes."
- Does NOT apply to general betting rules, casino game descriptions, or strategy advice.

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

## HOW get_team_form DATA WORKS

get_team_form uses a 3-tier data pipeline. You do NOT control which tier
responds — it happens automatically. Just call get_team_form and use
whatever data comes back:

1. **Cache** (source: "cache") — Recent ESPN data cached in Supabase,
   shared across all user sessions. Fastest. Data is max 4 hours old.
   Treat it exactly like ESPN data — same confidence level.

2. **ESPN live** (source: "espn") — Fresh data from ESPN API. Used when
   cache is empty or expired. This is the primary source.

3. **Web search fallback** (webSearchFallback: true) — If ESPN has no
   data (lower-tier leagues, unsupported teams), a web search runs
   automatically and results are attached as webData. Use this data
   but set confidence to Low and add the verification disclaimer.

You should ALWAYS call get_team_form first. If it returns data (from any
source), use it. If it returns with webSearchFallback: true, the web
search has ALREADY been done for you — do NOT call web_search again
for the same team. Only call web_search manually if you need additional
context like injuries, news, or head-to-head history.

## WHEN get_team_form RETURNS NO DATA

If get_team_form returns dataAvailable: false WITH NO webData attached
(rare — means both ESPN and web search failed), you may:
1. Try web_search manually with a different query
2. Tell the user honestly that data is unavailable for this team
3. Do NOT guess or fabricate stats

## get_team_form FALLBACK — WEB SEARCH

get_team_form has automatic web search fallback. If it returns webSearchFallback: true, web search was already done — do NOT call web_search again for that team.

If get_team_form returns dataAvailable: false with NO webData, try web_search manually:
  "[team name] recent results form [year] [league name]"

When extracting web search form data:
- PREFER individual match results over season totals (season totals hide recent form)
- Extract: W/D/L sequence, goals scored/conceded per match, scoring frequency
- IGNORE: predicted lineups, bookmaker odds, stats older than 60 days
- Confidence cap: Medium if data supports pick, Low if thin/mixed
- Always add: "These stats could be inaccurate. Please verify on Sofascore before placing."

## CLAIMS FROM FORM DATA

Only claim what appears in tool results (formString, bttsCount, over25Count, cleanSheets, failedToScore). NEVER claim motivation, league-wide trends, injuries, or context not in tool data.

## BET TYPE SELECTION — DECISION TREE

After calling get_team_form for both teams, pick the bet type the data MOST supports:

1. **Win/loss imbalance?** One team 3+W, other 3+L → Home/Away Win
2. **Weak team concedes 2+/game?** → Over 2.5 supported
3. **Both scored in 4+/5?** → BTTS Yes at Medium. Either scored ≤3/5? → no BTTS Yes at Medium+
4. **One team 3+W in formString?** → back that team. Both inconsistent? → Draw/Double Chance
5. Pick the type with the MOST supporting data points.

## BET TYPE MINIMUM REQUIREMENTS

- BTTS Yes: BOTH teams scored in 3+ of last 5 (else Low confidence only)
- BTTS No: one team 3+ clean sheets OR 3+ blanks in last 5
- Over 2.5: combined avg >2.5, or stronger team avg 2+, or one concedes 2+/game
- Under 2.5: both teams 2+ clean sheets OR combined avg <2.0
- Home/Away Win: winner has 3+W or loser has 3+L in last 5, or big standings gap
- If team has 3+ blanks in last 5 → confidence must be Low for any goals pick

## CONFIDENCE LEVELS

- High: 5+ matches, form strongly supports pick
- Medium: partial support, some uncertainty
- Low: <3 matches data, mixed signals, or web search source

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

Remember: only bet what you can afford to lose.

###############################################################################
##  BETSLIP MANAGEMENT                                                       ##
###############################################################################

## SESSION BETSLIP

The user has a betslip that persists across messages. You maintain it using
manage_betslip. The current slip JSON must be carried forward in every turn.

When the user says any of these → call manage_betslip:
- "add [match] to my betslip" / "add that to my slip" → action: add
- "show my betslip" / "what's on my slip" / "my picks" → action: view
- "remove pick [N]" / "take off the first one" → action: remove
- "clear my betslip" / "start over" / "remove all" → action: clear

BEFORE action="add", you MUST:
1. Call get_team_form for the home team
2. Call get_team_form for the away team
3. Analyse the data (or gaps) to determine bet type and confidence
4. THEN call manage_betslip with action="add"

Never add a pick to the slip without completing steps 1-3 first.

## BETSLIP DISPLAY FORMAT

When showing the betslip (view or after add), format it as:

─────────────────────────────
MY BETSLIP ([N] pick[s])
─────────────────────────────
1. [Home] vs [Away]
   Bet: [betType]
   Confidence: [High/Medium/Low]
   Based on: [basis from form data]
   [⚠️ Missing: missingData — see research links below]

2. [next pick...]

Type: [Single / Accumulator]
Overall Confidence: [weakest leg's confidence]
─────────────────────────────
[If any picks have missing data:]
⚠️ Research links for incomplete picks:
- Sofascore: https://www.sofascore.com/search/#[teamName]
- Flashscore: https://www.flashscore.com
─────────────────────────────

Ready to go?

## ACCUMULATOR SUGGESTION

After a single-match pick (betslip has 1 pick, more matches available), suggest:
"Want me to check today's other matches and build you a full accumulator?"
Skip if user already asked for an accumulator or has 3+ picks.

## ACCUMULATOR BUILDER

When user asks for accumulator/best bets/picks for today:
1. Fetch fixtures: get_football_by_tier tier1 + tier3, days_ahead=1
2. Select 3-4 candidate matches (today only, with available data)
3. Run get_team_form for both teams of each candidate (parallel)
4. Rate picks: STRONG (clear form gap, 5+ matches) → include. WEAK (no data, too even) → exclude.
5. Build 2-4 leg accumulator, mix bet types, each leg passes validation
6. Present in betslip format. Overall confidence = weakest leg.
7. Explain why these legs were chosen together (2-3 sentences).

If data is thin for all matches, still attempt — label as Low confidence guesses with research links. Never refuse to build an accumulator.

###############################################################################
##  PICK FORMAT & DATA QUALITY                                               ##
###############################################################################

ALWAYS give a pick. ALWAYS disclose data gaps. Never refuse.

## PICK FORMAT

**My Pick:** [betType]
**Based on:** [form data for both teams — formString, scored in X/total, BTTS rate]
**Confidence:** [High/Medium/Low]
**How to place on BwanaBet:** Sports → Football → [League] → [Match] → [Bet Type]

If partial data: name what's missing, add research links (Sofascore, Flashscore), cap at Medium.
If no data: label as "My Best Guess", use standings only, confidence Low, add research links.

## ACCUMULATOR CONFIDENCE

Overall confidence = weakest leg. State which leg is weakest and why.

## CLAIMS RULE

Only claim what tool data shows. Never claim league-wide trends, motivation, must-win context, injuries, or tactical analysis unless from tool results.`;



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

async function supabaseSelect(table, query) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  try {
    const resp = await fetch(`${url}/rest/v1/${table}?${query}`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) { return null; }
}

async function supabaseUpsert(table, data) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(data),
    });
  } catch (e) { console.error(`[widget-cache] ${table}:`, e.message); }
}

function estimateCost(inp, out) {
  // GPT-4.1 mini pricing: $0.40/1M input, $1.60/1M output
  // (Claude web search costs tracked separately in executeWebSearch)
  return ((inp / 1e6) * 0.4) + ((out / 1e6) * 1.6);
}

// ============================================
// SLACK NOTIFICATIONS (inline, no imports)
// Dedup: same alert title suppressed for 5 minutes
// ============================================
const slackAlertHistory = new Map(); // title → timestamp
const SLACK_DEDUP_MS = 5 * 60 * 1000; // 5 minutes

async function slackAlert(severity, title, details = {}) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  // Dedup: skip if same title was sent within the window
  const now = Date.now();
  const lastSent = slackAlertHistory.get(title);
  if (lastSent && (now - lastSent) < SLACK_DEDUP_MS) return;
  slackAlertHistory.set(title, now);
  // Prune old entries to prevent memory leak
  if (slackAlertHistory.size > 50) {
    for (const [key, ts] of slackAlertHistory) {
      if (now - ts > SLACK_DEDUP_MS) slackAlertHistory.delete(key);
    }
  }

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
    { type: 'header', text: { type: 'plain_text', text: `${emoji} BETPREDICT ${severity.toUpperCase()}` } },
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
function validateResponseNumbers(finalText, toolResultsLog, allToolsCalled, sessionId) {
  if (!finalText || !toolResultsLog?.length) return { flagged: false, suspicious: [] };

  // Skip validation when web_search was used — Claude synthesizes/calculates
  // numbers from web text (e.g. "4W from 9 games" → "44.44%"), so exact
  // number matching produces false positives
  if (allToolsCalled?.includes('web_search')) return { flagged: false, suspicious: [] };

  // Extract numbers from response (skip very small numbers like positions 1-3, ZMW amounts)
  const numbersInResponse = [...finalText.matchAll(/\b(\d{2,}\.?\d*)\b/g)]
    .map(m => m[1])
    .filter(n => parseFloat(n) > 3);

  if (!numbersInResponse.length) return { flagged: false, suspicious: [] };

  // Flatten all tool results to a single searchable string
  const toolData = JSON.stringify(toolResultsLog);

  // Numbers that are commonly derived from dates/times in tool data (e.g. "2026-04-19T13:30:00Z")
  // These appear in the response as day, hour, minute but not as standalone numbers in the JSON
  const dateTimeNumbers = new Set([...finalText.matchAll(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi)].map(m => m[1]));
  // Also extract time components like "13:30" → 13, 30
  for (const m of finalText.matchAll(/\b(\d{1,2}):(\d{2})\s*(CAT|UTC|GMT|AM|PM)?\b/gi)) {
    dateTimeNumbers.add(m[1]);
    dateTimeNumbers.add(m[2]);
  }
  // Common year numbers
  dateTimeNumbers.add('2025');
  dateTimeNumbers.add('2026');

  const suspicious = numbersInResponse.filter(num => !toolData.includes(num) && !dateTimeNumbers.has(num));

  // If more than 3 numbers appear in response but not in any tool result, flag it
  if (suspicious.length > 3) {
    console.warn('[widget] Possible hallucinated stats detected:', suspicious);
    slackAlert('medium', 'Possible hallucinated stats', {
      message: `${suspicious.length} numbers not found in tool data: ${suspicious.slice(0, 8).join(', ')}\n\n*AI response (first 300):* ${finalText.slice(0, 300)}`,
      sessionId,
      endpoint: 'widget-chat',
    }).catch(() => {});
    return { flagged: true, suspicious };
  }
  return { flagged: false, suspicious: [] };
}

// ============================================
// HOT GAMES — fetch and inject into system prompt
// TTL-based cache: survives across warm invocations,
// refetches after 6 hours or on date change.
// ============================================
let hotGamesCache = null;
let hotGamesCacheDate = null;
let hotGamesCacheTs = 0;
let liveCasinoCache = null;
let liveCasinoCacheDate = null;
let liveCasinoCacheTs = 0;
const HOT_GAMES_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function fetchHotGames() {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  // Serve from cache if same day AND within TTL
  if (hotGamesCache && hotGamesCacheDate === today && (now - hotGamesCacheTs) < HOT_GAMES_TTL_MS) {
    return hotGamesCache;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return hotGamesCache; // return stale cache if available

  try {
    const resp = await fetch(
      `${url}/rest/v1/hot_games?active=eq.true&select=name,category,rtp,description,bwanabet_url&order=weight.desc&limit=25`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
    );
    if (!resp.ok) return hotGamesCache; // stale cache on failure
    const games = await resp.json();
    hotGamesCache = games;
    hotGamesCacheDate = today;
    hotGamesCacheTs = now;
    return games;
  } catch (e) {
    return hotGamesCache; // stale cache on error
  }
}

// Seed-based random for deterministic daily rotation
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildHotGamesPrompt(games) {
  if (!games || games.length === 0) return '';

  // Generate a daily seed from the date so statuses rotate each day but stay consistent within a day
  const today = new Date().toISOString().split('T')[0];
  const daySeed = today.split('-').reduce((acc, n) => acc * 31 + parseInt(n), 0);

  // Aviator appears 4 out of 7 days (determined by day of week + seed)
  const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat
  const aviatorDays = [0, 1, 3, 5]; // Sun, Mon, Wed, Fri — 4 out of 7
  const showAviator = aviatorDays.includes(dayOfWeek);

  // Filter games — exclude Aviator on its off days
  const activeGames = showAviator ? games : games.filter(g => g.name !== 'Aviator');

  // Only 1 game gets HOT per day (Aviator if it's an Aviator day, otherwise a random game)
  const nonAviator = activeGames.filter(g => g.name !== 'Aviator');
  const hotIndex = showAviator ? -1 : Math.floor(seededRandom(daySeed) * nonAviator.length);

  const gamesWithStatus = activeGames.map((g, i) => {
    // Aviator is HOT on its days
    if (g.name === 'Aviator') {
      return { ...g, payoutStatus: 'HOT', statusNote: "on fire today — players are cashing out big!" };
    }

    const nonAvIdx = nonAviator.indexOf(g);
    let status, note;

    if (!showAviator && nonAvIdx === hotIndex) {
      // On non-Aviator days, one random game gets HOT
      status = 'HOT';
      const hotNotes = ["been paying out all day!", "players are winning on this right now!", "big wins coming in today!"];
      note = hotNotes[Math.floor(seededRandom(daySeed + i * 13) * hotNotes.length)];
    } else {
      const rand = seededRandom(daySeed + i * 7);
      if (rand < 0.45) {
        status = 'DUE';
        const dueNotes = ["hasn't had a big win in a while — could be your turn!", "been quiet lately... building up for something big?", "overdue for a payout — worth a shot!"];
        note = dueNotes[Math.floor(seededRandom(daySeed + i * 17) * dueNotes.length)];
      } else {
        status = 'QUIET';
        const quietNotes = ["steady play, solid game", "reliable choice for patient players", "consistent performer"];
        note = quietNotes[Math.floor(seededRandom(daySeed + i * 19) * quietNotes.length)];
      }
    }
    return { ...g, payoutStatus: status, statusNote: note };
  });

  let prompt = `\n\n## BWANABET CASINO GAMES — TODAY'S PICKS\n\nThese are the games available on BwanaBet with today's payout status. ONLY recommend games from this list. Use the payout status and notes to craft exciting recommendations.\n\n`;

  // Group by category
  const categories = {};
  gamesWithStatus.forEach(g => {
    if (!categories[g.category]) categories[g.category] = [];
    categories[g.category].push(g);
  });

  for (const [cat, catGames] of Object.entries(categories)) {
    prompt += `### ${cat}\n`;
    catGames.forEach(g => {
      prompt += `- **${g.name}** ${g.payoutStatus} — ${g.statusNote} | ${g.description}\n`;
    });
    prompt += `\n`;
  }

  prompt += `### How to recommend:\n`;
  prompt += `- Lead with HOT games — "this one's paying out right now!"\n`;
  prompt += `- Hype DUE games — "been quiet, could be ready to pop!"\n`;
  prompt += `- You MUST recommend EXACTLY 4 games from the list above. Count them. If you have more than 4, pick the best 4 (prioritize HOT > DUE > QUIET).\n`;
  prompt += `- Do NOT use emojis. Do NOT add a separate closing line hyping any specific game.\n`;
  prompt += `- Use the status notes above — make it feel like live casino floor intel.\n`;
  prompt += `- Also mention BwanaBet Live Casino as an option — full game details are in the LIVE CASINO GAMES section below.\n`;

  return prompt;
}

// ============================================
// LIVE CASINO GAMES — Supabase fetch + prompt
// ============================================

async function fetchLiveCasinoGames() {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  if (liveCasinoCache && liveCasinoCacheDate === today && (now - liveCasinoCacheTs) < HOT_GAMES_TTL_MS) {
    return liveCasinoCache;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return liveCasinoCache;

  try {
    const resp = await fetch(
      `${url}/rest/v1/live_casino_games?active=eq.true&select=name,category,provider,description,why_play,beginner_tip,strategy,expert_tip,excitement_level,best_for,min_bet_zmw,max_bet_zmw&order=weight.desc&limit=25`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
    );
    if (!resp.ok) return liveCasinoCache;
    const games = await resp.json();
    liveCasinoCache = games;
    liveCasinoCacheDate = today;
    liveCasinoCacheTs = now;
    return games;
  } catch (e) {
    return liveCasinoCache;
  }
}

function buildLiveCasinoPrompt(games) {
  if (!games || games.length === 0) return '';

  let prompt = `\n\n## BWANABET LIVE CASINO GAMES\n\n`;
  prompt += `These are the REAL live casino games available on BwanaBet. When a user asks about Live Casino, ONLY recommend games from this list. Use the descriptions, tips, and strategies below — do NOT make up game information.\n\n`;

  // Group by category
  const categories = {};
  games.forEach(g => {
    if (!categories[g.category]) categories[g.category] = [];
    categories[g.category].push(g);
  });

  for (const [cat, catGames] of Object.entries(categories)) {
    prompt += `### ${cat}\n`;
    catGames.forEach(g => {
      prompt += `**${g.name}** (${g.provider}) — ${g.excitement_level} excitement, best for ${g.best_for}\n`;
      prompt += `- What it is: ${g.description}\n`;
      prompt += `- Why play: ${g.why_play}\n`;
      prompt += `- Beginner tip: ${g.beginner_tip}\n`;
      prompt += `- Strategy: ${g.strategy}\n`;
      prompt += `- Expert tip: ${g.expert_tip}\n`;
      prompt += `- Bet range: ZMW ${g.min_bet_zmw} – ${g.max_bet_zmw}\n\n`;
    });
  }

  prompt += `### How to recommend Live Casino:\n`;
  prompt += `- When user asks about Live Casino, recommend 3-4 games matched to their vibe.\n`;
  prompt += `- Ask what they are in the mood for: "Are you feeling lucky and want big thrills, or prefer something more strategic?"\n`;
  prompt += `  - Thrill seekers → Crazy Time, Sweet Bonanza CandyLand, Lightning Storm\n`;
  prompt += `  - Strategists → Black Jack, Red Door Roulette, Roulette 1 - Azure\n`;
  prompt += `  - Beginners → Mega Wheel, Dream Catcher, Auto-Roulette, Crazy Coin Flip\n`;
  prompt += `  - Social players → Funky Time, Boom City, MONOPOLY Live\n`;
  prompt += `- Include one tip or strategy per game in your recommendation — make the user feel prepared to play.\n`;
  prompt += `- End with: "Head to BwanaBet Live Casino — the tables are live right now!"\n`;
  prompt += `- Do NOT use emojis.\n`;
  prompt += `- When user asks "how do I play [game]" or wants strategy, use the beginner_tip + strategy + expert_tip fields. Start simple, then offer to go deeper.\n`;

  return prompt;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://bwanabet.com', 'https://www.bwanabet.com', 'https://bwanabet.co.zm', 'https://www.bwanabet.co.zm', 'https://bet-assist.vercel.app'];
  if (process.env.WIDGET_DEV === 'true') allowed.push('http://localhost:3000');
  if (origin.endsWith('-bwanabetcrms-projects.vercel.app')) allowed.push(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed.includes(origin) ? origin : allowed[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    slackAlert('critical', 'API key missing', { message: 'OPENAI_API_KEY not set in Vercel env vars', endpoint: 'widget-chat' });
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

  // Sanitize incoming messages — strip anything that isn't a valid user/assistant message
  // This prevents malformed localStorage data from breaking the OpenAI JSON payload
  let conversationMessages = messages.slice(-30).filter(m => {
    if (!m || typeof m !== 'object') return false;
    if (!['user', 'assistant'].includes(m.role)) return false;
    if (typeof m.content !== 'string' || !m.content.trim()) return false;
    return true;
  }).map(m => ({ role: m.role, content: m.content }));

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let allToolsCalled = [];
  let toolResultsLog = [];

  // Extract user message early so it's available in all error paths
  const lastUserMsg = messages.filter(m => m.role === 'user').pop();
  const userContentFull = (typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '').slice(0, 2000);
  const userContentShort = userContentFull.slice(0, 300);

  try {
    const currentDate = new Date().toLocaleDateString('en-ZA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Africa/Lusaka'
    });
    const dateInjection = `\n\n## CURRENT DATE\nToday is ${currentDate} (Zambia time). Use this to determine the active season for all leagues.\n\n**DATE DISPLAY RULE:** When showing match dates, ALWAYS display the actual date from the tool data (e.g. "Saturday, 19 April 2026 at 13:30 CAT"). NEVER convert to relative terms like "Tomorrow" or "Next week" — users need the exact date to place bets. Calculate the day of week from the ISO date in tool results.\n`;
    // Count previous picks in conversation to trigger accumulator upsell
    const pickCount = conversationMessages.filter(m =>
      m.role === 'assistant' && typeof m.content === 'string' && /My Pick:/i.test(m.content)
    ).length;
    const pickInjection = pickCount >= 3
      ? `\n\n## ACCUMULATOR ALERT\nYou have already given ${pickCount} single-match picks in this conversation. You MUST end your next response with: "You've got ${pickCount + 1} picks so far — want me to combine them into an accumulator for a bigger payout?" and set the first action button to "Build accumulator | Combine my picks into an accumulator betslip".\n`
      : '';
    const enhancedPrompt = SYSTEM_PROMPT + dateInjection + pickInjection;

    // Build OpenAI messages with system prompt
    const openaiMessages = [
      { role: 'system', content: enhancedPrompt },
      ...conversationMessages,
    ];

    let loopCount = 0;
    let finalText = '';

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount++;
      console.log(`[widget] Loop ${loopCount}, messages: ${openaiMessages.length}`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_completion_tokens: MAX_TOKENS,
          messages: openaiMessages,
          tools: TOOL_DEFINITIONS,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error?.message || 'API error';
        const errType = data.error?.type || 'unknown';
        console.error(`[widget] OpenAI error: ${response.status} ${errType} ${errMsg}`);
        supabaseInsert('monitor_errors', {
          session_id: sessionId, source: 'api',
          error_message: `Widget: ${errMsg}`, severity: 'high',
          context: { endpoint: 'widget-chat', loop: loopCount, status: response.status, type: errType },
        });
        slackAlert(response.status >= 500 ? 'critical' : 'high', `OpenAI API ${response.status}`, {
          message: `${errType}: ${errMsg}\n\n*User said:* ${userContentShort}`,
          sessionId, endpoint: 'widget-chat',
        });
        return res.status(502).json({ error: 'Service temporarily unavailable' });
      }

      totalInputTokens += data.usage?.prompt_tokens || 0;
      totalOutputTokens += data.usage?.completion_tokens || 0;

      const choice = data.choices?.[0];
      if (!choice) {
        finalText = "Sorry, I couldn't generate a response. Please try again.";
        break;
      }

      const message = choice.message;
      const toolCalls = message.tool_calls || [];

      // No tool calls — we have the final response
      if (toolCalls.length === 0) {
        finalText = message.content || '';
        break;
      }

      // If model returned text content alongside tool calls, save it as pending
      // (prevents duplicate responses where text arrives with an earlier loop's tools)
      if (message.content && message.content.trim()) {
        finalText = message.content;
      }

      console.log(`[widget] Executing ${toolCalls.length} tools:`, toolCalls.map(t => t.function?.name).join(', '));

      // Add assistant message with tool calls to conversation
      // Ensure content is null (not undefined) — OpenAI requires this for tool_call messages
      openaiMessages.push({
        role: 'assistant',
        content: message.content || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      });

      // Execute all tool calls in parallel for speed
      const toolPromises = toolCalls.map(async (toolCall) => {
        const funcName = toolCall.function?.name;
        const funcArgs = toolCall.function?.arguments;
        if (!funcName) return { toolCall, resultContent: '{"error":"no function name"}' };

        allToolsCalled.push(funcName);
        let resultContent;
        try {
          const input = JSON.parse(funcArgs || '{}');
          const result = await executeTool(funcName, input);
          toolResultsLog.push(result);
          const truncated = truncateResult(result);
          resultContent = JSON.stringify(truncated);
          if (typeof resultContent !== 'string') resultContent = '{"error":"serialization failed"}';
        } catch (e) {
          console.error(`[widget] Tool ${funcName} error:`, e.message);
          slackAlert('medium', `Tool failed: ${funcName}`, {
            message: `${e.message}\n\n*User said:* ${userContentShort}`,
            sessionId, endpoint: 'widget-chat',
          });
          resultContent = JSON.stringify({ error: e.message });
        }
        return { toolCall, resultContent };
      });

      const toolResults = await Promise.all(toolPromises);

      // Add results in order (OpenAI requires tool results match tool_call order)
      for (const { toolCall, resultContent } of toolResults) {
        openaiMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: resultContent,
        });
      }

      // Auto web-search fallback: if any ESPN tool returned empty/error and no web_search was called
      const hasWebSearch = allToolsCalled.includes('web_search');
      const hasFailedEspn = toolResults.some(({ resultContent }) => {
        try { return JSON.parse(resultContent)?._fallbackHint; } catch { return false; }
      });
      if (hasFailedEspn && !hasWebSearch) {
        const userMsg = messages[messages.length - 1]?.content || '';
        console.log(`[widget] Auto web-search fallback triggered for: "${userMsg.slice(0, 80)}"`);
        try {
          const webResult = await executeWebSearch(userMsg);
          allToolsCalled.push('web_search');
          // Inject as a system message so the model sees the web data
          openaiMessages.push({
            role: 'user',
            content: `[SYSTEM: ESPN had no results. Here is web search data for the user's question — use this to answer. IMPORTANT: Only cite specific numbers (scores, dates, stats) that appear explicitly in the web data below. Do NOT invent or estimate stats. If web data mixes league and cup stats, only use league-specific numbers. Display actual dates (e.g. "Saturday, 19 April 2026") not relative terms like "Tomorrow".\n${JSON.stringify(truncateResult(webResult))}]`,
          });
        } catch (e) {
          console.error('[widget] Auto web-search fallback error:', e.message);
        }
      }
    }

    if (loopCount >= MAX_TOOL_LOOPS && !finalText) {
      finalText = "I tried to look that up but it's taking too long. Try asking something more specific.";
    }

    const durationMs = Date.now() - startTime;
    const costUsd = estimateCost(totalInputTokens, totalOutputTokens);

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
        .slice(0, 2);
    }

    // ── Hallucination check + silent retry ────────────────────────
    const hallucinationResult = validateResponseNumbers(finalText, toolResultsLog, allToolsCalled, sessionId);
    let hallucinationFlag = hallucinationResult.flagged;

    if (hallucinationFlag && !req._hallucinationRetried) {
      req._hallucinationRetried = true;
      console.log('[widget] Hallucination detected, retrying with correction...');

      const correctionMsg = `Your previous response contained stats that do not appear in any tool results. These specific numbers are suspicious and likely hallucinated: ${hallucinationResult.suspicious.join(', ')}.\n\nRules:\n- ONLY use numbers that appear exactly in the tool results above.\n- Do NOT invent percentages, records, or stats from memory.\n- If you do not have data for something, say "data not available" instead of guessing.\n\nRewrite your response using only verified data from the tools.`;

      openaiMessages.push({ role: 'assistant', content: finalText });
      openaiMessages.push({ role: 'user', content: correctionMsg });

      const retryResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: openaiMessages,
          max_completion_tokens: MAX_TOKENS,
          tools: TOOL_DEFINITIONS,
        }),
      });

      if (retryResp.ok) {
        const retryData = await retryResp.json();
        const retryChoice = retryData.choices?.[0];
        const retryText = retryChoice?.message?.content || '';
        if (retryText) {
          totalInputTokens += retryData.usage?.prompt_tokens || 0;
          totalOutputTokens += retryData.usage?.completion_tokens || 0;
          finalText = retryText;

          // Re-validate the retry
          const retryValidation = validateResponseNumbers(finalText, toolResultsLog, allToolsCalled, sessionId);
          hallucinationFlag = retryValidation.flagged;
          if (!hallucinationFlag) {
            console.log('[widget] Retry succeeded — hallucination resolved');
          } else {
            console.warn('[widget] Retry still has suspicious numbers, sending anyway');
          }

          // Re-parse actions from retry response
          const retryActionsMatch = finalText.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/);
          if (retryActionsMatch) {
            cleanText = finalText.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/, '').trim();
            actions = retryActionsMatch[1]
              .trim()
              .split('\n')
              .map(line => line.trim())
              .filter(line => line && line.includes('|'))
              .map(line => {
                const [text, query] = line.split('|').map(s => s.trim());
                return { text, q: query };
              })
              .slice(0, 2);
          } else {
            cleanText = finalText;
          }
        }
      }
    }

    // ── Quality metrics ────────────────────────────────────────────
    const isFirstMessage = messages.filter(m => m.role === 'user').length <= 1;
    const isTruncated = finalText.length > 0 && !finalText.includes('[/ACTIONS]')
      && totalOutputTokens >= MAX_TOKENS - 10;
    const hasActions = actions && actions.length > 0;

    const qualitySignals = {
      is_first_message: isFirstMessage,
      truncated: isTruncated,
      has_actions: hasActions,
      actions_count: actions?.length || 0,
      hallucination_flagged: hallucinationFlag,
      response_length: cleanText.length,
      loops: loopCount,
    };

    Promise.all([
      supabaseInsert('monitor_requests', {
        session_id: sessionId, model,
        input_tokens: totalInputTokens, output_tokens: totalOutputTokens, cost_usd: costUsd,
        duration_ms: durationMs, stop_reason: 'end_turn',
        tools_called: allToolsCalled, tool_count: allToolsCalled.length,
        status: durationMs > 30000 ? 'timeout' : 'success',
        quality: qualitySignals,
      }),
      supabaseInsert('monitor_messages', {
        session_id: sessionId, role: 'user', content: userContentFull, tokens_used: totalInputTokens,
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
    ]).catch(() => {});

    // Check error rate + cost thresholds (fire-and-forget)
    checkAlertThresholds(sessionId, costUsd).catch(() => {});

    console.log(`[widget] Done in ${durationMs}ms, ${loopCount} loops, ${allToolsCalled.length} tools, $${costUsd.toFixed(4)}` +
      (isTruncated ? ' [TRUNCATED]' : '') + (!hasActions ? ' [NO_ACTIONS]' : ''));

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
      message: `${error.message}\n\n*User said:* ${userContentShort}`,
      sessionId, endpoint: 'widget-chat',
    });
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }
}
