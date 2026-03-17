/**
 * BetExpert AI Widget v2 — Embeddable Chat for BwanaBet.com
 * 
 * Features:
 *  - Shadow DOM isolation
 *  - localStorage persistence (user, chat history, preferences)
 *  - Context-aware quick actions
 *  - BwanaBet deep links
 *  - Simple login (name-based, stored locally)
 *  - Mobile fullscreen
 *  - Tawk.to escalation
 * 
 * Usage:
 * <script src="https://bet-assist.vercel.app/widget.js" data-offset-bottom="80" async></script>
 *
 * Last updated: 2026-03-17
 */
(function () {
  'use strict';

  // ============================================
  // CONFIG
  // ============================================
  const SCRIPT = document.getElementById('betexpert-widget') || document.currentScript || document.querySelector('script[src*="bet-assist"]');
  const BASE_URL = SCRIPT?.src ? new URL(SCRIPT.src).origin : '';
  const API_URL = BASE_URL + '/api/widget-chat';
  const HOT_GAMES_URL = BASE_URL + '/api/hot-games';
  const OFFSET_BOTTOM = parseInt(SCRIPT?.getAttribute('data-offset-bottom') || '80', 10);
  const OFFSET_RIGHT = parseInt(SCRIPT?.getAttribute('data-offset-right') || '20', 10);
  const STORAGE_KEY = 'betexpert_widget';

  // Hot games (fetched on first open)
  let hotGames = null;

  // ============================================
  // STATE (loaded from localStorage)
  // ============================================
  let state = loadState();
  let isOpen = false;
  let isProcessing = false;
  let currentView = 'chat';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      sessionId: 'bew_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      user: null,          // { name }
      messages: [],        // conversation history for API
      preferences: {},
    };
  }

  function saveState() {
    try {
      // Keep only last 30 messages to avoid storage bloat
      const toSave = { ...state, messages: state.messages.slice(-30) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {}
  }

  // ============================================
  // BWANABET LEAGUE-SPECIFIC DEEP LINKS
  // ============================================
  const BWANABET_LEAGUE_LINKS = {
    'Premier League': 'https://bwanabet.com/en/sports/prematch/Football/England/Premier%20League',
    'Serie A': 'https://bwanabet.com/en/sports/prematch/Football/Italy/Serie%20A',
    'La Liga': 'https://bwanabet.com/en/sports/prematch/Football/Spain/La%20Liga',
    'Bundesliga': 'https://bwanabet.com/en/sports/prematch/Football/Germany/Bundesliga',
    'Champions League': 'https://bwanabet.com/en/sports/prematch/Football/Europe/UEFA%20Champions%20League',
  };

  const BWANA_LINKS = {
    sport: 'https://bwanabet.com/en/sport',
    football: 'https://bwanabet.com/en/sport/football',
    live: 'https://bwanabet.com/en/live',
    casino: 'https://bwanabet.com/en/casino',
    aviator: 'https://bwanabet.com/en/aviator',
    promotions: 'https://bwanabet.com/en/promotions',
    register: 'https://bwanabet.com/en/register',
  };

  const TEAM_TO_LEAGUE = {
    'arsenal': 'Premier League', 'chelsea': 'Premier League', 'liverpool': 'Premier League',
    'manchester united': 'Premier League', 'manchester city': 'Premier League', 'man utd': 'Premier League',
    'man city': 'Premier League', 'tottenham': 'Premier League', 'spurs': 'Premier League',
    'newcastle': 'Premier League', 'aston villa': 'Premier League', 'west ham': 'Premier League',
    'brighton': 'Premier League', 'wolves': 'Premier League', 'everton': 'Premier League',
    'crystal palace': 'Premier League', 'fulham': 'Premier League', 'nottingham forest': 'Premier League',
    'napoli': 'Serie A', 'inter': 'Serie A', 'inter milan': 'Serie A', 'ac milan': 'Serie A',
    'juventus': 'Serie A', 'roma': 'Serie A', 'lazio': 'Serie A', 'atalanta': 'Serie A',
    'real madrid': 'La Liga', 'barcelona': 'La Liga', 'atletico madrid': 'La Liga',
    'sevilla': 'La Liga', 'villarreal': 'La Liga', 'real betis': 'La Liga',
    'bayern munich': 'Bundesliga', 'bayern': 'Bundesliga', 'dortmund': 'Bundesliga',
    'rb leipzig': 'Bundesliga', 'leverkusen': 'Bundesliga',
  };

  function detectLeague(text) {
    const lower = text.toLowerCase();
    const patterns = [
      { re: /premier league|epl/i, league: 'Premier League' },
      { re: /serie a/i, league: 'Serie A' },
      { re: /la liga|laliga/i, league: 'La Liga' },
      { re: /bundesliga/i, league: 'Bundesliga' },
      { re: /champions league|ucl/i, league: 'Champions League' },
    ];
    for (const { re, league } of patterns) {
      if (re.test(lower)) return league;
    }
    for (const [team, league] of Object.entries(TEAM_TO_LEAGUE)) {
      if (lower.includes(team)) return league;
    }
    return null;
  }

  function getLeagueLink(league) {
    return BWANABET_LEAGUE_LINKS[league] || BWANA_LINKS.sport;
  }

  // ============================================
  // USER PREFERENCE TRACKING
  // ============================================
  let userPreference = state.preferences?.mode || null; // 'sports' | 'casino' | null

  // ============================================
  // QUICK ACTIONS — interactive, bet-driving design
  // ============================================
  const DEFAULT_ACTIONS = [
    { text: 'Sports Betting', q: 'I want to try sports betting' },
    { text: 'Casino Games', q: 'Show me casino games' },
    { text: 'How betting works', q: 'Explain how betting works' },
    { text: 'Winning tips', q: 'Give me tips to win more' },
  ];

  function getSmartActions(lastBotMsg) {
    if (!lastBotMsg) return DEFAULT_ACTIONS;
    const m = lastBotMsg.toLowerCase();
    const detectedLeague = detectLeague(lastBotMsg);
    const leagueLink = detectedLeague ? getLeagueLink(detectedLeague) : null;

    // ---- MATCH DETECTED (Team vs Team in response) ----
    const matchPattern = /\*\*([A-Za-z\s]+)\s+vs\s+([A-Za-z\s]+)\*\*/gi;
    const matchFound = [...lastBotMsg.matchAll(matchPattern)];
    if (matchFound.length > 0) {
      const home = matchFound[0][1].trim();
      const away = matchFound[0][2].trim();
      const actions = [
        { text: 'How do I place this bet?', q: `Show me how to place a bet on ${home} vs ${away}` },
        { text: 'Show me a different match', q: 'Show me other matches today' },
      ];
      if (leagueLink && detectedLeague) {
        actions.push({ text: `Go to ${detectedLeague}`, q: null, link: leagueLink });
      }
      actions.push({ text: 'Play casino', q: 'Show me casino games' });
      return actions.slice(0, 4);
    }

    // ---- TEAM STATS (position, record, points) ----
    if (m.includes('position:') || m.includes('record:') || m.includes('points:') || m.includes('win rate:')) {
      const actions = [];
      if (leagueLink && detectedLeague) {
        actions.push({ text: `Go to ${detectedLeague}`, q: null, link: leagueLink });
      }
      actions.push({ text: 'More team stats', q: 'Show me more detailed stats' });
      actions.push({ text: 'Different team', q: 'Show me stats for a different team' });
      actions.push({ text: 'Upcoming matches', q: 'Show me upcoming matches' });
      return actions.slice(0, 4);
    }

    // ---- SPORTS PICK / BET SUGGESTION ----
    if (m.includes('to win') || m.includes('pick:') || m.includes('my pick') || m.includes('confidence') || m.includes('over 2.5') || m.includes('both teams') || m.includes('ready to go')) {
      const actions = [
        { text: 'How do I place this?', q: 'Show me step by step how to place this bet' },
      ];
      if (leagueLink && detectedLeague) {
        actions.push({ text: `Go to ${detectedLeague}`, q: null, link: leagueLink });
      } else {
        actions.push({ text: 'Place Bet', q: null, link: BWANA_LINKS.sport });
      }
      actions.push({ text: 'Show me another pick', q: 'Show me a different betting pick' });
      actions.push({ text: 'Play casino', q: 'Show me casino games' });
      return actions.slice(0, 4);
    }

    // ---- CASINO CONTENT ----
    if (m.includes('aviator') || m.includes('blackjack') || m.includes('roulette') || m.includes('cash out') || m.includes('multiplier') || m.includes('rtp') || m.includes('casino') || m.includes('slot')) {
      userPreference = 'casino';
      const hotActions = getHotGameActions();
      if (hotActions.length > 0) {
        return [
          { text: 'Where do I find this game?', q: 'Show me where to find this game on BwanaBet' },
          ...hotActions.slice(0, 2),
          { text: 'Try sports betting', q: 'Show me sports betting picks' },
        ].slice(0, 4);
      }
      return [
        { text: 'Where do I find this game?', q: 'Show me where to find this game on BwanaBet' },
        { text: 'Show me a different game', q: 'Recommend a different casino game' },
        { text: 'More winning tips', q: 'Give me more tips to win at this game' },
        { text: 'Try sports betting', q: 'Show me sports betting picks' },
      ];
    }

    // ---- EDUCATIONAL / EXPLANATION ----
    if (m.includes('how it works') || m.includes('meaning') || m.includes('means that') || m.includes('explained') || m.includes('what is')) {
      return [
        { text: 'I understand, show me picks', q: 'Now show me some betting picks' },
        { text: 'Explain more', q: 'Explain this in more detail' },
        { text: 'Show me examples', q: 'Show me examples of this bet type' },
        { text: 'Play casino', q: 'Show me casino games' },
      ];
    }

    // ---- STRATEGY / TIPS ----
    if (m.includes('strategy') || m.includes('tip:') || m.includes('pro tip') || m.includes('tips')) {
      return [
        { text: 'Let me try this', q: 'Show me where to play this' },
        { text: 'More strategies', q: 'Give me more winning strategies' },
        { text: 'Beginner tips', q: 'Give me beginner-friendly tips' },
        { text: 'Try sports betting', q: 'Show me sports betting picks' },
      ];
    }

    // ---- STANDINGS / TABLE ----
    if (m.includes('standings') || m.includes('table') || m.includes('rank')) {
      const actions = [];
      if (leagueLink && detectedLeague) {
        actions.push({ text: `Bet on ${detectedLeague}`, q: null, link: leagueLink });
      }
      actions.push({ text: 'Pick a match to bet on', q: 'Pick a match from this league for me to bet on' });
      actions.push({ text: 'Another league', q: 'Show me standings for a different league' });
      actions.push({ text: 'Play casino', q: 'Show me casino games' });
      return actions.slice(0, 4);
    }

    // ---- FINDING HELP ----
    if (m.includes('how to place') || m.includes('step 1') || m.includes('open bwanabet') || m.includes('tap "place bet"')) {
      return [
        { text: 'Got it, show me picks', q: 'Now give me some betting picks' },
        { text: 'Open BwanaBet', q: null, link: BWANA_LINKS.sport },
        { text: 'Show me something else', q: 'Show me other options' },
        { text: 'Play casino', q: 'Show me casino games' },
      ];
    }

    // ---- USER PREFERENCE DEFAULTS ----
    if (userPreference === 'casino') {
      const hotActions = getHotGameActions();
      if (hotActions.length > 0) {
        return [
          ...hotActions.slice(0, 2),
          { text: 'Try sports betting', q: 'Show me sports betting picks' },
          { text: 'What\'s hot today?', q: 'What casino games are hot on BwanaBet right now?' },
        ].slice(0, 4);
      }
      return [
        { text: 'Show me casino games', q: 'Show me top casino games' },
        { text: 'Try sports betting', q: 'Show me sports betting picks' },
        { text: 'Winning strategies', q: 'Teach me casino winning strategies' },
        { text: 'Best payouts', q: 'Which games have the best payout rates?' },
      ];
    }

    if (userPreference === 'sports') {
      const actions = [
        { text: 'Show me sports picks', q: "Show me today's best picks" },
      ];
      if (leagueLink && detectedLeague) {
        actions.push({ text: `Go to ${detectedLeague}`, q: null, link: leagueLink });
      }
      actions.push({ text: 'Try casino games', q: 'Show me casino games' });
      actions.push({ text: 'Different league', q: 'Show me picks from a different league' });
      return actions.slice(0, 4);
    }

    // ---- FALLBACK ----
    return DEFAULT_ACTIONS;
  }
  const CSS = `
    :host { all: initial; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .be-widget {
      position: fixed;
      bottom: ${OFFSET_BOTTOM}px;
      right: ${OFFSET_RIGHT}px;
      z-index: 2000000001;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #e2e8f0;
    }

    /* ---- FLOATING BUTTON ---- */
    .be-btn {
      width: 58px; height: 58px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f5c518 0%, #c9a20e 100%);
      border: 2px solid rgba(255,255,255,0.15);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 24px rgba(245,197,24,0.35), 0 2px 8px rgba(0,0,0,0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      position: relative;
    }
    .be-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 32px rgba(245,197,24,0.5), 0 3px 12px rgba(0,0,0,0.5);
    }
    .be-btn:active { transform: scale(0.95); }
    .be-btn svg { width: 38px; height: 38px; fill: #0a0a0a; transition: transform 0.2s; }
    .be-btn.be-open svg { transform: rotate(90deg); }

    /* Pulse */
    .be-btn::after {
      content: '';
      position: absolute; inset: -5px;
      border-radius: 50%;
      border: 2px solid rgba(245,197,24,0.3);
      animation: be-pulse 2.5s ease-out infinite;
    }
    .be-btn.be-open::after { display: none; }
    @keyframes be-pulse {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    /* Notification badge */
    .be-badge {
      position: absolute; top: -2px; right: -2px;
      width: 16px; height: 16px;
      background: #ef4444; border-radius: 50%;
      border: 2px solid #0c0f1a;
      display: none;
    }

    /* Dismiss X on the floating button */
    .be-dismiss-float {
      position: absolute; top: -6px; right: -6px;
      width: 20px; height: 20px;
      background: #1e293b;
      border: 1.5px solid #475569;
      border-radius: 50%;
      color: #94a3b8;
      font-size: 11px; font-weight: 700;
      line-height: 1;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      z-index: 2;
      transition: all 0.15s;
      font-family: inherit;
      padding: 0;
    }
    .be-dismiss-float:hover {
      background: #ef4444; border-color: #ef4444;
      color: #fff;
      transform: scale(1.15);
    }

    /* ---- PANEL ---- */
    .be-panel {
      position: absolute;
      bottom: 70px; right: 0;
      width: 380px;
      height: 540px;
      background: #0c0f1a;
      border: 1px solid #1a2035;
      border-radius: 16px;
      display: flex; flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(14px) scale(0.96);
      pointer-events: none;
      transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 16px 56px rgba(0,0,0,0.7), 0 0 1px rgba(245,197,24,0.15);
    }
    .be-panel.be-visible {
      opacity: 1; transform: translateY(0) scale(1); pointer-events: all;
    }

    /* Header */
    .be-header {
      padding: 14px 16px;
      background: linear-gradient(180deg, #111729 0%, #0c0f1a 100%);
      border-bottom: 1px solid #1a2035;
      display: flex; align-items: center; gap: 10px;
    }
    .be-header-icon {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f5c518, #c9a20e);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .be-header-icon svg { width: 26px; height: 26px; fill: #0a0a0a; }
    .be-h-title { font-size: 14px; font-weight: 700; color: #fff; }
    .be-h-sub { font-size: 11px; color: #4b5e7a; margin-top: 1px; }
    .be-h-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
      margin-left: auto; flex-shrink: 0;
      box-shadow: 0 0 8px rgba(34,197,94,0.5);
    }
    .be-h-user {
      margin-left: auto;
      font-size: 11px; color: #f5c518; font-weight: 600;
      display: flex; align-items: center; gap: 6px;
    }
    .be-h-logout {
      background: none; border: none; cursor: pointer;
      color: #475569; font-size: 10px; padding: 2px 6px;
      border-radius: 4px; transition: color 0.15s;
      font-family: inherit;
    }
    .be-h-logout:hover { color: #ef4444; }

    .be-h-dismiss {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
      color: #94a3b8; font-size: 14px; font-weight: 600;
      padding: 4px 8px;
      margin-left: auto;
      border-radius: 6px; transition: all 0.15s;
      font-family: inherit; flex-shrink: 0;
      line-height: 1;
    }
    .be-h-dismiss:hover { color: #fff; background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.3); }

    /* ---- CHAT VIEW ---- */
    .be-chat { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    .be-messages {
      flex: 1; overflow-y: auto;
      padding: 14px 14px 8px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .be-messages::-webkit-scrollbar { width: 4px; }
    .be-messages::-webkit-scrollbar-track { background: transparent; }
    .be-messages::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }

    /* Messages */
    .be-msg {
      max-width: 88%; padding: 10px 14px;
      border-radius: 14px; font-size: 13px; line-height: 1.6;
      animation: be-fade 0.25s ease; word-wrap: break-word;
    }
    .be-msg-user {
      align-self: flex-end;
      background: linear-gradient(135deg, #f5c518, #c9a20e);
      color: #0a0a0a; font-weight: 500;
      border-bottom-right-radius: 4px;
    }
    .be-msg-bot {
      align-self: flex-start;
      background: #131829; border: 1px solid #1a2035;
      color: #cbd5e1;
      border-bottom-left-radius: 4px;
    }
    .be-msg-bot strong, .be-msg-bot b { color: #f5c518; font-weight: 600; }

    @keyframes be-fade {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Typing */
    .be-typing {
      display: flex; gap: 5px; padding: 10px 14px;
      align-self: flex-start;
      background: #131829; border: 1px solid #1a2035;
      border-radius: 14px; border-bottom-left-radius: 4px;
    }
    .be-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #4b5e7a;
      animation: be-bounce 1.4s ease-in-out infinite;
    }
    .be-dot:nth-child(2) { animation-delay: 0.2s; }
    .be-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes be-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
      30% { transform: translateY(-5px); opacity: 1; }
    }
    .be-typing-text {
      font-size: 11px; color: #4b5e7a; margin-left: 6px;
      white-space: nowrap;
    }

    /* Quick actions row */
    .be-actions {
      padding: 6px 14px 4px;
      display: flex; flex-wrap: wrap; gap: 6px;
      max-height: 72px; overflow: hidden;
    }
    .be-act {
      padding: 7px 14px;
      background: linear-gradient(135deg, #111729 0%, #0c1020 100%);
      border: 1px solid #1e2b45;
      border-radius: 20px;
      color: #f5c518; font-size: 12px; font-weight: 500;
      cursor: pointer; font-family: inherit;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .be-act:hover {
      background: #f5c518; color: #0a0a0a;
      border-color: #f5c518;
      transform: translateY(-1px);
    }
    /* BwanaBet link style */
    .be-act-link {
      background: linear-gradient(135deg, #2a1a00 0%, #1a1000 100%);
      border-color: #b8860b;
      color: #fbbf24;
    }
    .be-act-link:hover {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #0a0a0a; border-color: #f59e0b;
    }
    .be-act-link::after { content: ' \\2197'; font-size: 10px; }

    /* Input */
    .be-input-row {
      padding: 10px 14px;
      border-top: 1px solid #1a2035;
      background: #0b0e19;
      display: flex; gap: 8px; align-items: center;
    }
    .be-input {
      flex: 1;
      background: #131829; border: 1px solid #1e2b45;
      border-radius: 22px; padding: 10px 16px;
      color: #e2e8f0; font-size: 13px; font-family: inherit;
      outline: none; transition: border-color 0.2s;
    }
    .be-input::placeholder { color: #3d4a63; }
    .be-input:focus { border-color: #f5c518; }
    .be-send {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #f5c518, #c9a20e);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s, opacity 0.15s;
      flex-shrink: 0;
    }
    .be-send:hover { transform: scale(1.08); }
    .be-send:disabled { opacity: 0.35; cursor: default; transform: none; }
    .be-send svg { width: 16px; height: 16px; fill: #0a0a0a; }

    /* Footer */
    .be-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 14px;
      border-top: 1px solid #1a2035;
      background: #0a0d17;
    }
    .be-footer-link {
      color: #3d4a63; font-size: 11px; text-decoration: none;
      cursor: pointer; transition: color 0.15s; background: none;
      border: none; font-family: inherit;
    }
    .be-footer-link:hover { color: #f5c518; }

    /* ---- MOBILE ---- */
    @media (max-width: 480px) {
      .be-widget { bottom: 0; right: 0; left: 0; }
      .be-btn {
        position: fixed;
        bottom: ${OFFSET_BOTTOM}px;
        right: ${OFFSET_RIGHT}px;
      }
      .be-panel {
        width: 100vw;
        height: 65dvh;
        bottom: 0; right: 0; left: 0;
        border-radius: 20px 20px 0 0;
        position: fixed;
        transform: translateY(100%);
        opacity: 1;
      }
      .be-panel.be-visible {
        transform: translateY(0);
        opacity: 1;
      }
      .be-h-user { display: none !important; }
      .be-h-dot { display: none !important; }
    }
  `;

  // ============================================
  // ICONS
  // ============================================
  const ICO = {
    ball: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 29 L50 16 L37 16" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="35" cy="16" r="5" fill="#1a1a1a"/><rect x="25" y="30" width="50" height="40" rx="11" fill="none" stroke="#1a1a1a" stroke-width="6"/><rect x="14" y="45" width="13" height="7" rx="3.5" fill="#1a1a1a"/><rect x="73" y="45" width="13" height="7" rx="3.5" fill="#1a1a1a"/><rect x="35" y="41" width="10" height="9" rx="2.5" fill="#1a1a1a"/><rect x="55" y="41" width="10" height="9" rx="2.5" fill="#1a1a1a"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12 5.7 16.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
  };

  // ============================================
  // BUILD DOM
  // ============================================
  const host = document.createElement('div');
  host.id = 'betexpert-widget';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = CSS;
  shadow.appendChild(style);

  const root = document.createElement('div');
  root.className = 'be-widget';
  root.innerHTML = `
    <div class="be-panel" id="bePanel">
      <div class="be-header">
        <div class="be-header-icon">${ICO.ball}</div>
        <div>
          <div class="be-h-title">BetExpert AI</div>
          <div class="be-h-sub" id="beHeaderSub">Sports Assistant</div>
        </div>
        <div class="be-h-user" id="beUserInfo" style="display:none">
          <span id="beUserName"></span>
          <button class="be-h-logout" id="beLogout" title="Log out">✕</button>
        </div>
        <div class="be-h-dot" id="beHeaderDot"></div>
        <button class="be-h-dismiss" id="beDismiss" aria-label="Dismiss widget" title="Close BetExpert">✕</button>
      </div>

      <!-- CHAT VIEW -->
      <div class="be-chat" id="beChatView">
        <div class="be-messages" id="beMessages"></div>
        <div class="be-actions" id="beActions"></div>
        <div class="be-input-row">
          <input class="be-input" id="beInput" type="text" placeholder="Ask about matches, odds, picks..." autocomplete="off" />
          <button class="be-send" id="beSend">${ICO.send}</button>
        </div>
        <div class="be-footer">
          <button class="be-footer-link" id="beSupportLink">Need account help? Talk to support</button>
          <button class="be-footer-link" id="beClearChat">Clear chat</button>
        </div>
      </div>
    </div>
    <button class="be-btn" id="beToggle" aria-label="Open BetExpert AI">
      ${ICO.ball}
      <div class="be-badge" id="beBadge"></div>
      <div class="be-dismiss-float" id="beDismissFloat" title="Remove widget">✕</div>
    </button>
  `;
  shadow.appendChild(root);
  document.body.appendChild(host);

  // ============================================
  // ELEMENTS
  // ============================================
  const $ = (id) => shadow.getElementById(id);
  const panel = $('bePanel');
  const toggleBtn = $('beToggle');
  const messagesEl = $('beMessages');
  const actionsEl = $('beActions');
  const input = $('beInput');
  const sendBtn = $('beSend');
  const logoutBtn = $('beLogout');
  const userInfo = $('beUserInfo');
  const userName = $('beUserName');
  const headerDot = $('beHeaderDot');
  const headerSub = $('beHeaderSub');
  const supportLink = $('beSupportLink');
  const clearBtn = $('beClearChat');
  const dismissBtn = $('beDismiss');
  const dismissFloat = $('beDismissFloat');

  // ============================================
  // INIT — restore previous session
  // ============================================
  if (state.user) {
    showUserInfo();
  }

  // Close panel from header X — just hides panel, does not remove widget
  dismissBtn.addEventListener('click', () => {
    isOpen = false;
    panel.classList.remove('be-visible');
    toggleBtn.classList.remove('be-open');
    toggleBtn.innerHTML = ICO.ball + '<div class="be-badge" id="beBadge"></div><div class="be-dismiss-float" id="beDismissFloat" title="Remove widget">✕</div>';
    bindDismissFloat();
  });

  // Dismiss widget from floating button X
  function bindDismissFloat() {
    const btn = shadow.getElementById('beDismissFloat');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger toggle
        host.remove();
      });
    }
  }
  bindDismissFloat();

  // ============================================
  // LAZY FONT LOADING (#10)
  // ============================================
  let fontLoaded = false;
  function loadFont() {
    if (fontLoaded) return;
    fontLoaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  // ============================================
  // OFFLINE DETECTION (#11)
  // ============================================
  let isOffline = !navigator.onLine;
  window.addEventListener('online', () => { isOffline = false; updateOnlineStatus(); });
  window.addEventListener('offline', () => { isOffline = true; updateOnlineStatus(); });
  function updateOnlineStatus() {
    if (!headerDot) return;
    headerDot.style.background = isOffline ? '#ef4444' : '#22c55e';
    headerDot.style.boxShadow = isOffline ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 8px rgba(34,197,94,0.5)';
    headerSub.textContent = isOffline ? 'Offline' : 'Sports Assistant';
  }

  // ============================================
  // RATE LIMIT — client-side cooldown (#2)
  // ============================================
  let lastSendTime = 0;
  const SEND_COOLDOWN = 3000; // 3 seconds

  // ============================================
  // HOT GAMES — fetch on first open
  // ============================================
  async function loadHotGames() {
    if (hotGames) return hotGames;
    try {
      const r = await fetch(HOT_GAMES_URL);
      if (!r.ok) return null;
      const data = await r.json();
      hotGames = data.games || [];
      return hotGames;
    } catch (e) { return null; }
  }

  function getHotGameGreeting() {
    if (!hotGames || hotGames.length === 0) return '';
    const topGame = hotGames[0];
    return ` **${topGame.name}** is trending on BwanaBet right now — ${topGame.rtp}% RTP.`;
  }

  function getHotGameActions() {
    if (!hotGames || hotGames.length === 0) return [];
    return hotGames.slice(0, 3).map(g => ({
      text: `Try ${g.name}`, q: `Tell me about ${g.name} and how to win`
    }));
  }

  // ============================================
  // TOGGLE
  // ============================================
  toggleBtn.addEventListener('click', async () => {
    isOpen = !isOpen;
    loadFont();
    panel.classList.toggle('be-visible', isOpen);
    toggleBtn.classList.toggle('be-open', isOpen);
    toggleBtn.innerHTML = isOpen
      ? ICO.close + '<div class="be-badge" id="beBadge"></div>'
      : ICO.ball + '<div class="be-badge" id="beBadge"></div><div class="be-dismiss-float" id="beDismissFloat" title="Remove widget">✕</div>';
    if (!isOpen) bindDismissFloat();

    if (isOpen) {
      // Fetch hot games in background on first open
      if (!hotGames) loadHotGames();

      if (state.messages.length === 0) {
        const hotLine = getHotGameGreeting();
        const greeting = state.user
          ? `Hey ${state.user.name}! I am BetExpert. I'm here to give you match statistics, analysis, AND tips. I can also help you pick top paying casino games and tell you which games are hot right now.${hotLine} Just let me know what you want to do.`
          : `I am BetExpert. An AI assistant from Bwana Bet. I'm here to give you match statistics, analysis, AND tips. I can also help you to pick top paying casino games and tell you which games are hot right now.${hotLine} Just let me know what you want to do.\n\nLet me know your name or let's get right into it.`;
        addBotMessage(greeting);
        renderActions(DEFAULT_ACTIONS);
      } else {
        restoreChat();
      }
      setTimeout(() => input.focus(), 150);
    }
  });

  // ============================================
  // NAME DETECTION (Task 2)
  // ============================================
  // Detects if the user's message is a name (short, not a question/command)
  function detectName(text) {
    const trimmed = text.trim();
    // Skip if already have a name, or if it looks like a command/question
    if (state.user) return null;
    if (trimmed.length > 30 || trimmed.length < 2) return null;
    if (trimmed.includes('?') || trimmed.includes('!')) return null;
    
    // Common non-name patterns
    const nonNames = ['hi', 'hey', 'hello', 'yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'thank you',
      'sports', 'casino', 'betting', 'show', 'give', 'tell', 'help', 'what', 'how', 'which', 'get',
      'epl', 'nba', 'nfl', 'football', 'match', 'picks', 'tips', 'live', 'scores', 'standings'];
    if (nonNames.includes(trimmed.toLowerCase())) return null;
    if (trimmed.split(' ').length > 3) return null;
    
    // Check for "my name is X" / "I'm X" / "call me X" patterns
    const patterns = [
      /^(?:my name is|i'm|im|i am|call me|it's|its)\s+(.+)$/i,
      /^(?:name:?\s*)(.+)$/i,
    ];
    for (const p of patterns) {
      const match = trimmed.match(p);
      if (match) return match[1].trim();
    }
    
    // If it's 1-2 words, starts with uppercase, and is the first message — likely a name
    if (state.messages.length <= 1 && trimmed.split(' ').length <= 2) {
      const firstChar = trimmed.charAt(0);
      if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
        return trimmed;
      }
    }
    
    return null;
  }

  function setUserName(name) {
    state.user = { name };
    saveState();
    showUserInfo();
  }

  // Logout clears everything but stays in chat
  logoutBtn.addEventListener('click', () => {
    state = {
      sessionId: 'bew_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      user: null, messages: [], preferences: {},
    };
    saveState();
    messagesEl.innerHTML = '';
    userInfo.style.display = 'none';
    headerDot.style.display = '';
    const hotLine = getHotGameGreeting();
    addBotMessage(`I am BetExpert. An AI assistant from Bwana Bet. I'm here to give you match statistics, analysis, AND tips. I can also help you to pick top paying casino games and tell you which games are hot right now.${hotLine} Just let me know what you want to do.\n\nLet me know your name or let's get right into it.`);
    renderActions(DEFAULT_ACTIONS);
  });

  // ============================================
  // VIEW HELPERS
  // ============================================
  function showUserInfo() {
    if (!state.user) return;
    userInfo.style.display = 'flex';
    userName.textContent = state.user.name;
    headerDot.style.display = 'none';
    headerSub.textContent = 'Sports Assistant';
  }

  // ============================================
  // SEND MESSAGE
  // ============================================
  function send(text) {
    if (!text.trim() || isProcessing) return;

    // #2 client: cooldown check
    const now = Date.now();
    if (now - lastSendTime < SEND_COOLDOWN) return;
    lastSendTime = now;

    // #11: offline check
    if (isOffline) {
      addBotMessage("You're offline. Check your internet connection and try again.");
      return;
    }

    const userText = text.trim();

    // Task 2: Detect if user is giving their name
    const detectedName = detectName(userText);
    if (detectedName) {
      setUserName(detectedName);
      addUserMessage(userText);
      addBotMessage(`Nice to meet you, ${detectedName}! What would you like to know? Sports picks, casino games, or something specific?`);
      state.messages.push({ role: 'user', content: userText });
      state.messages.push({ role: 'assistant', content: `Nice to meet you, ${detectedName}! What would you like to know?` });
      saveState();
      renderActions(DEFAULT_ACTIONS);
      return;
    }

    // Track user preference from what they ask about
    const lowerText = userText.toLowerCase();
    if (lowerText.includes('sport') || lowerText.includes('pick') || lowerText.includes('match') || lowerText.includes('epl') || lowerText.includes('league')) {
      userPreference = 'sports';
      state.preferences.mode = 'sports';
    } else if (lowerText.includes('casino') || lowerText.includes('slot') || lowerText.includes('aviator') || lowerText.includes('blackjack') || lowerText.includes('roulette')) {
      userPreference = 'casino';
      state.preferences.mode = 'casino';
    }

    addUserMessage(userText);
    state.messages.push({ role: 'user', content: userText });
    input.value = '';
    actionsEl.innerHTML = '';
    isProcessing = true;
    sendBtn.disabled = true;
    input.disabled = true;           // #8: disable input
    input.placeholder = 'Waiting for response...';
    showTyping();

    // #12: typing progress messages
    let typingTimer = null;
    let typingStage = 0;
    const typingMessages = ['Fetching live data...', 'Almost there...', 'Taking longer than usual...'];
    typingTimer = setInterval(() => {
      if (typingStage < typingMessages.length) {
        const typingEl = shadow.getElementById('beTypingText');
        if (typingEl) typingEl.textContent = typingMessages[typingStage];
        typingStage++;
      }
    }, 5000);

    // #1: AbortController with 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages.slice(-20),
        session_id: state.sessionId,
      }),
      signal: controller.signal,
    })
      .then(r => {
        if (r.status === 429) throw new Error('RATE_LIMITED');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        hideTyping();
        if (data.error) {
          addBotMessage("Something went wrong on our end. Try again in a moment.");
          renderActions(DEFAULT_ACTIONS);
          return;
        }
        const reply = (data.text && data.text.trim()) ? data.text : "I couldn't generate a response. Try asking differently.";
        state.messages.push({ role: 'assistant', content: reply });
        addBotMessage(reply);

        // Use server-provided actions if available, fall back to client-side detection
        if (data.actions && data.actions.length > 0) {
          renderActions(data.actions);
        } else {
          renderActions(getSmartActions(reply));
        }
        saveState();
      })
      .catch(err => {
        hideTyping();
        console.error('[BetExpert]', err);
        if (err.name === 'AbortError') {
          addBotMessage("That took too long. Try a simpler question or try again.");
        } else if (err.message === 'RATE_LIMITED') {
          addBotMessage("You're sending messages too fast. Take a breath and try again in a minute.");
        } else {
          addBotMessage("Couldn't connect right now. Check your internet and try again.");
        }
        renderActions(DEFAULT_ACTIONS);
      })
      .finally(() => {
        clearTimeout(timeout);
        clearInterval(typingTimer);
        isProcessing = false;
        sendBtn.disabled = false;
        input.disabled = false;       // #8: re-enable input
        input.placeholder = 'Ask about matches, odds, picks...';
        input.focus();
      });
  }

  sendBtn.addEventListener('click', () => send(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
  });

  // Support → Tawk.to
  supportLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.Tawk_API?.maximize) window.Tawk_API.maximize();
    else window.open('https://bwanabet.com', '_blank');
  });

  // Clear chat
  clearBtn.addEventListener('click', () => {
    state.messages = [];
    saveState();
    messagesEl.innerHTML = '';
    const greeting = state.user
      ? `Chat cleared, ${state.user.name}! What do you want to know?`
      : 'Chat cleared! What do you want to know?';
    addBotMessage(greeting);
    renderActions(DEFAULT_ACTIONS);
  });

  // ============================================
  // MESSAGE RENDERING
  // ============================================
  function addUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'be-msg be-msg-user';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollDown();
  }

  function addBotMessage(text) {
    const el = document.createElement('div');
    el.className = 'be-msg be-msg-bot';
    el.innerHTML = renderMd(text);
    messagesEl.appendChild(el);
    scrollDown();
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'be-typing'; el.id = 'beTyping';
    el.innerHTML = '<div class="be-dot"></div><div class="be-dot"></div><div class="be-dot"></div><span class="be-typing-text" id="beTypingText"></span>';
    messagesEl.appendChild(el);
    scrollDown();
  }

  function hideTyping() {
    shadow.getElementById('beTyping')?.remove();
  }

  function scrollDown() {
    requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
  }

  function restoreChat() {
    if (state.messages.length > 0) {
      messagesEl.innerHTML = '';
      state.messages.forEach(m => {
        if (m.role === 'user') addUserMessage(m.content);
        else if (m.role === 'assistant') addBotMessage(m.content);
      });
      scrollDown();
      const lastBot = state.messages.filter(m => m.role === 'assistant').pop();
      renderActions(getSmartActions(lastBot?.content || ''));
    }
  }

  function renderMd(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n- /g, '\n• ')
      .replace(/\n(\d+)\. /g, '\n$1. ')
      .replace(/\n/g, '<br>');
  }

  // ============================================
  // QUICK ACTIONS
  // ============================================
  function renderActions(actions) {
    actionsEl.innerHTML = '';
    actions.forEach(a => {
      const btn = document.createElement('button');
      if (a.link) {
        btn.className = 'be-act be-act-link';
        btn.textContent = a.text;
        btn.addEventListener('click', () => window.open(a.link, '_blank'));
      } else {
        btn.className = 'be-act';
        btn.textContent = a.text;
        btn.addEventListener('click', () => send(a.q));
      }
      actionsEl.appendChild(btn);
    });
  }

})();
