/**
 * BetPredict AI Widget v2 — Embeddable Chat for BwanaBet.com
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
  const SCRIPT = document.getElementById('betpredict-widget') || document.currentScript || document.querySelector('script[src*="bet-assist"]');
  const BASE_URL = SCRIPT?.src ? new URL(SCRIPT.src).origin : '';
  const API_URL = BASE_URL + '/api/widget-chat';
  const HOT_GAMES_URL = BASE_URL + '/api/hot-games';
  const OFFSET_BOTTOM = parseInt(SCRIPT?.getAttribute('data-offset-bottom') || '80', 10);
  const OFFSET_RIGHT = parseInt(SCRIPT?.getAttribute('data-offset-right') || '20', 10);
  const STORAGE_KEY = 'betpredict_widget';

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
  // USER PREFERENCE TRACKING
  // ============================================
  let userPreference = state.preferences?.mode || null; // 'sports' | 'casino' | null

  // ============================================
  // QUICK ACTIONS — 2-button funnel design
  // Button 1: Forward (deeper into funnel toward a bet)
  // Button 2: Lateral (alternative path, still within funnel)
  // ============================================
  const DEFAULT_ACTIONS = [
    { text: 'Sports Betting', q: 'I want to try sports betting' },
    { text: 'Casino Games', q: 'Show me casino games' },
  ];

  function getSmartActions(lastBotMsg) {
    if (!lastBotMsg) return DEFAULT_ACTIONS;
    const m = lastBotMsg.toLowerCase();

    // ---- MATCH LIST (multiple matches shown) ----
    const matchPattern = /\*\*([A-Za-z\s]+)\s+vs\s+([A-Za-z\s]+)\*\*/gi;
    const matchFound = [...lastBotMsg.matchAll(matchPattern)];
    if (matchFound.length > 0) {
      // Pick was given (confidence, bet type mentioned)
      if (m.includes('confidence') || m.includes('my pick') || m.includes('pick:')) {
        return [
          { text: 'Build accumulator', q: 'Check today\'s other matches and build me an accumulator' },
          { text: 'Different pick', q: 'Show me a different betting pick' },
        ];
      }
      // Match list without a pick — push toward getting a pick
      return [
        { text: 'Pick me a bet', q: 'Pick me the best bet from these matches' },
        { text: 'Different league', q: 'Show me matches from a different league' },
      ];
    }

    // ---- BETSLIP / ACCUMULATOR SHOWN ----
    if (m.includes('my betslip') || m.includes('accumulator') || m.includes('overall confidence')) {
      return [
        { text: 'Explain these picks', q: 'Explain the reasoning behind each pick in more detail' },
        { text: 'Start fresh', q: 'Clear my betslip and show me today\'s matches' },
      ];
    }

    // ---- SPORTS PICK / BET SUGGESTION ----
    if (m.includes('to win') || m.includes('over 2.5') || m.includes('both teams') || m.includes('ready to go')) {
      return [
        { text: 'Build accumulator', q: 'Check today\'s other matches and build me an accumulator' },
        { text: 'Different pick', q: 'Show me a different betting pick' },
      ];
    }

    // ---- TEAM STATS (position, record, points) ----
    if (m.includes('position:') || m.includes('record:') || m.includes('points:') || m.includes('win rate:')) {
      return [
        { text: 'Give me a pick', q: 'Give me a betting pick based on this' },
        { text: 'Compare another team', q: 'Compare with another team' },
      ];
    }

    // ---- STANDINGS / TABLE ----
    if (m.includes('standings') || m.includes('table') || m.includes('rank')) {
      return [
        { text: 'Pick a match to bet', q: 'Pick a match from this league for me to bet on' },
        { text: 'Different league', q: 'Show me standings for a different league' },
      ];
    }

    // ---- CASINO CONTENT ----
    if (m.includes('aviator') || m.includes('blackjack') || m.includes('roulette') || m.includes('cash out') || m.includes('multiplier') || m.includes('rtp') || m.includes('casino') || m.includes('slot')) {
      userPreference = 'casino';
      return [
        { text: 'How do I play this?', q: 'Explain how to play this game and give me a winning strategy' },
        { text: 'Show another game', q: 'Recommend a different casino game' },
      ];
    }

    // ---- EDUCATIONAL / EXPLANATION ----
    if (m.includes('how it works') || m.includes('meaning') || m.includes('means that') || m.includes('explained') || m.includes('what is')) {
      return [
        { text: 'Show me picks', q: 'Now show me some betting picks' },
        { text: 'Explain more', q: 'Explain this in more detail' },
      ];
    }

    // ---- STRATEGY / TIPS ----
    if (m.includes('strategy') || m.includes('tip:') || m.includes('pro tip') || m.includes('tips')) {
      return [
        { text: 'Give me picks', q: 'Give me betting picks using this strategy' },
        { text: 'More strategies', q: 'Give me more winning strategies' },
      ];
    }

    // ---- PLACEMENT INSTRUCTIONS ----
    if (m.includes('how to place') || m.includes('step 1') || m.includes('open bwanabet') || m.includes('tap "place bet"')) {
      return [
        { text: 'Give me more picks', q: 'Now give me some more betting picks' },
        { text: 'Build accumulator', q: 'Build me an accumulator for today' },
      ];
    }

    // ---- USER PREFERENCE DEFAULTS ----
    if (userPreference === 'casino') {
      return [
        { text: 'Show me casino games', q: 'Show me the top casino games right now' },
        { text: 'Try sports betting', q: 'Show me sports betting picks' },
      ];
    }

    if (userPreference === 'sports') {
      return [
        { text: 'Show me picks', q: "Show me today's best picks" },
        { text: 'Try casino games', q: 'Show me casino games' },
      ];
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

    .be-scroll-down {
      position: absolute; bottom: 110px; left: 50%;
      transform: translateX(-50%);
      width: 34px; height: 34px;
      border-radius: 50%; border: none;
      background: #f59e0b; color: #0f172a;
      cursor: pointer; display: none;
      align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 10; font-size: 18px; line-height: 1;
      transition: opacity 0.2s;
    }
    .be-scroll-down:hover { background: #fbbf24; }
    .be-scroll-down.be-visible { display: flex; }

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
      /* Hide the floating button when panel is open — header ✕ is the close action */
      .be-btn.be-open { display: none !important; }
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
      /* Larger fonts for mobile readability */
      .be-msg { font-size: 15px; }
      .be-input { font-size: 16px; } /* 16px prevents iOS Safari auto-zoom */
      .be-act { font-size: 13px; }
      .be-h-title { font-size: 15px; }
      .be-h-sub { font-size: 12px; }
      .be-typing-text { font-size: 12px; }
      .be-footer-link { font-size: 12px; }
      /* Bigger tap target for header close button */
      .be-h-dismiss {
        min-width: 44px; min-height: 44px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        padding: 8px 12px;
        border-radius: 10px;
      }
      .be-h-user { display: none !important; }
      .be-h-dot { display: none !important; }
      .be-scroll-down { bottom: 100px; }
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
  host.id = 'betpredict-widget';
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
          <div class="be-h-title">BetPredict AI</div>
          <div class="be-h-sub" id="beHeaderSub">Sports Assistant</div>
        </div>
        <div class="be-h-user" id="beUserInfo" style="display:none">
          <span id="beUserName"></span>
          <button class="be-h-logout" id="beLogout" title="Log out">✕</button>
        </div>
        <div class="be-h-dot" id="beHeaderDot"></div>
        <button class="be-h-dismiss" id="beDismiss" aria-label="Dismiss widget" title="Close BetPredict">✕</button>
      </div>

      <!-- CHAT VIEW -->
      <div class="be-chat" id="beChatView">
        <div class="be-messages" id="beMessages"></div>
        <button class="be-scroll-down" id="beScrollDown">↓</button>
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
    <button class="be-btn" id="beToggle" aria-label="Open BetPredict AI">
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
    return hotGames.slice(0, 1).map(g => ({
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
          ? `Hey ${state.user.name}! I am BetPredict the BwanaBet AI.\n\nI am here to give you expert AI sports analysis and tips.\n\nYou can use me to help analyse your bets and sports picks.\n\nI can help you to explain different betting options and what they mean.\n\nI can also tell you which slot games are worth playing right now to get payouts.\n\nAsk me any question!`
          : `Hi!\n\nI am BetPredict the BwanaBet AI.\n\nI am here to give you expert AI sports analysis and tips.\n\nYou can use me to help analyse your bets and sports picks.\n\nI can help you to explain different betting options and what they mean.\n\nI can also tell you which slot games are worth playing right now to get payouts.\n\nAsk me any question!`;
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
    addBotMessage(`Hi!\n\nI am BetPredict the BwanaBet AI.\n\nI am here to give you expert AI sports analysis and tips.\n\nYou can use me to help analyse your bets and sports picks.\n\nI can help you to explain different betting options and what they mean.\n\nI can also tell you which slot games are worth playing right now to get payouts.\n\nAsk me any question!`);
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

    // #1: AbortController with 90s timeout (betslips need multiple ESPN + Claude API calls)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

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
        console.error('[BetPredict]', err);
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
    scrollDown(true);
  }

  function addBotMessage(text) {
    const el = document.createElement('div');
    el.className = 'be-msg be-msg-bot';
    el.innerHTML = renderMd(text);
    messagesEl.appendChild(el);
    // Scroll so the top of the new message is visible with ~20% showing,
    // giving the user a peek and encouraging them to scroll for the rest.
    // For short messages, just show the whole thing.
    requestAnimationFrame(() => {
      const msgTop = el.offsetTop;
      const containerH = messagesEl.clientHeight;
      if (el.offsetHeight > containerH * 0.5) {
        messagesEl.scrollTo({ top: msgTop - 10, behavior: 'smooth' });
        // Show scroll-down arrow since there's more content below
        shadow.getElementById('beScrollDown')?.classList.add('be-visible');
      } else {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'be-typing'; el.id = 'beTyping';
    el.innerHTML = '<div class="be-dot"></div><div class="be-dot"></div><div class="be-dot"></div><span class="be-typing-text" id="beTypingText"></span>';
    messagesEl.appendChild(el);
    scrollDown(true);
  }

  function hideTyping() {
    shadow.getElementById('beTyping')?.remove();
  }

  function isNearBottom() {
    const threshold = 60;
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < threshold;
  }

  function scrollDown(force) {
    if (force || isNearBottom()) {
      requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
    }
  }

  // Scroll-down arrow button
  const scrollBtn = shadow.getElementById('beScrollDown');
  messagesEl.addEventListener("scroll", () => {
    if (isNearBottom()) scrollBtn.classList.remove('be-visible');
    else scrollBtn.classList.add('be-visible');
  });
  scrollBtn.addEventListener("click", () => { scrollDown(true); });

  function restoreChat() {
    if (state.messages.length > 0) {
      messagesEl.innerHTML = '';
      state.messages.forEach(m => {
        if (m.role === 'user') addUserMessage(m.content);
        else if (m.role === 'assistant') addBotMessage(m.content);
      });
      scrollDown(true);
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
    actions.slice(0, 2).forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'be-act';
      btn.textContent = a.text;
      btn.addEventListener('click', () => send(a.q));
      actionsEl.appendChild(btn);
    });
  }

})();
