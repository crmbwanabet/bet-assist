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
 */
(function () {
  'use strict';

  // ============================================
  // CONFIG
  // ============================================
  const SCRIPT = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const API_URL = (SCRIPT?.src ? new URL(SCRIPT.src).origin : '') + '/api/widget-chat';
  const OFFSET_BOTTOM = parseInt(SCRIPT?.getAttribute('data-offset-bottom') || '80', 10);
  const OFFSET_RIGHT = parseInt(SCRIPT?.getAttribute('data-offset-right') || '20', 10);
  const STORAGE_KEY = 'betexpert_widget';

  // ============================================
  // STATE (loaded from localStorage)
  // ============================================
  let state = loadState();
  let isOpen = false;
  let isProcessing = false;
  let currentView = state.user ? 'chat' : 'login'; // 'login' | 'chat'

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      sessionId: 'bew_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      user: null,          // { name }
      messages: [],        // conversation history for API
      chatHtml: '',        // rendered chat HTML to restore
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
  // BWANABET DEEP LINKS
  // ============================================
  const BWANA_LINKS = {
    sport: 'https://bwanabet.com/en/sport',
    football: 'https://bwanabet.com/en/sport/football',
    live: 'https://bwanabet.com/en/live',
    casino: 'https://bwanabet.com/en/casino',
    aviator: 'https://bwanabet.com/en/aviator',
    promotions: 'https://bwanabet.com/en/promotions',
    register: 'https://bwanabet.com/en/register',
  };

  // ============================================
  // CSS
  // ============================================
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
    :host { all: initial; font-family: 'DM Sans', sans-serif; }
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
    .be-btn svg { width: 28px; height: 28px; fill: #0a0a0a; transition: transform 0.2s; }
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
    .be-header-icon svg { width: 18px; height: 18px; fill: #0a0a0a; }
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

    /* ---- LOGIN VIEW ---- */
    .be-login {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 32px 28px; gap: 16px; text-align: center;
    }
    .be-login-icon {
      width: 56px; height: 56px; border-radius: 16px;
      background: linear-gradient(135deg, #f5c518, #c9a20e);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 4px;
    }
    .be-login-icon svg { width: 28px; height: 28px; fill: #0a0a0a; }
    .be-login h2 { font-size: 18px; font-weight: 700; color: #fff; }
    .be-login p { font-size: 13px; color: #64748b; max-width: 260px; }
    .be-login-input {
      width: 100%;
      background: #161b2e; border: 1px solid #2a3148;
      border-radius: 12px; padding: 12px 16px;
      color: #e2e8f0; font-size: 14px; font-family: inherit;
      outline: none; text-align: center;
      transition: border-color 0.2s;
    }
    .be-login-input::placeholder { color: #4a5568; }
    .be-login-input:focus { border-color: #f5c518; }
    .be-login-btn {
      width: 100%; padding: 12px;
      background: linear-gradient(135deg, #f5c518, #c9a20e);
      border: none; border-radius: 12px;
      color: #0a0a0a; font-size: 14px; font-weight: 700;
      cursor: pointer; font-family: inherit;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .be-login-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(245,197,24,0.3);
    }
    .be-login-skip {
      background: none; border: none;
      color: #475569; font-size: 12px; cursor: pointer;
      font-family: inherit; transition: color 0.15s;
    }
    .be-login-skip:hover { color: #94a3b8; }

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
      .be-panel {
        width: 100vw; height: 100dvh;
        bottom: 0; right: 0;
        border-radius: 0;
        position: fixed;
      }
    }
  `;

  // ============================================
  // ICONS
  // ============================================
  const ICO = {
    ball: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 3.3l1.35-.95c1.82.56 3.37 1.76 4.38 3.34l-.39 1.34-1.35.46L13 6.7V5.3zM9.65 4.35L11 5.3v1.4L7.01 9.49l-1.35-.46-.39-1.34c1.01-1.58 2.56-2.78 4.38-3.34zM7.08 17.11l-1.14.1C4.73 15.81 4 13.99 4 12c0-.12.01-.23.02-.35l1-.73 1.38.48 1.46 4.34-.78 1.37zm7.42 2.48c-.79.26-1.63.41-2.5.41s-1.71-.15-2.5-.41l-.69-1.49.64-1.1h5.11l.64 1.11-.7 1.48zM14.27 15H9.73l-1.35-4.02L12 8.44l3.63 2.54L14.27 15zm3.79 2.21l-1.14-.1-.78-1.37 1.46-4.34 1.38-.48 1 .73c.01.12.02.23.02.35 0 1.99-.73 3.81-1.94 5.21z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12 5.7 16.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
  };

  // ============================================
  // QUICK ACTIONS (context-aware)
  // ============================================
  const DEFAULT_ACTIONS = [
    { text: 'EPL Today', q: 'What EPL matches are on today?' },
    { text: 'Live Scores', q: 'Show me live scores right now' },
    { text: 'Sports Picks', q: 'Give me some betting picks for today' },
    { text: 'Casino Tips', q: 'How do casino slots work?' },
  ];

  function getSmartActions(lastBotMsg) {
    if (!lastBotMsg) return DEFAULT_ACTIONS;
    const m = lastBotMsg.toLowerCase();

    if (m.includes('ready to go') || m.includes('place') || m.includes('bet')) {
      return [
        { text: 'Place Bet on BwanaBet', q: null, link: BWANA_LINKS.sport },
        { text: 'Another pick', q: 'Give me a different pick' },
        { text: 'More details', q: 'Tell me more about this match' },
        { text: 'Live betting', q: null, link: BWANA_LINKS.live },
      ];
    }
    if (m.includes('premier league') || m.includes('epl') || m.includes('eng.1')) {
      return [
        { text: 'EPL Standings', q: 'Show me EPL standings' },
        { text: 'Bet on Football', q: null, link: BWANA_LINKS.football },
        { text: 'Champions League', q: 'Any Champions League matches?' },
        { text: 'Top scorers', q: 'Who are the EPL top scorers?' },
      ];
    }
    if (m.includes('casino') || m.includes('slots') || m.includes('roulette') || m.includes('blackjack')) {
      return [
        { text: 'Play Casino', q: null, link: BWANA_LINKS.casino },
        { text: 'Try Aviator', q: null, link: BWANA_LINKS.aviator },
        { text: 'Slot strategies', q: 'What are the best slot strategies?' },
        { text: 'Back to sports', q: 'Show me today\'s matches' },
      ];
    }
    if (m.includes('standings') || m.includes('table')) {
      return [
        { text: 'Bet on a match', q: 'Pick a match from this league for me to bet on' },
        { text: 'Open BwanaBet', q: null, link: BWANA_LINKS.sport },
        { text: 'Another league', q: 'Show me La Liga standings' },
      ];
    }
    return DEFAULT_ACTIONS;
  }

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
      </div>

      <!-- LOGIN VIEW -->
      <div class="be-login" id="beLoginView">
        <div class="be-login-icon">${ICO.ball}</div>
        <h2>Welcome to BetExpert</h2>
        <p>Your AI sports and betting assistant. What should I call you?</p>
        <input class="be-login-input" id="beNameInput" type="text" placeholder="Enter your name..." maxlength="30" />
        <button class="be-login-btn" id="beLoginBtn">Start Chatting</button>
        <button class="be-login-skip" id="beSkipBtn">Skip for now</button>
      </div>

      <!-- CHAT VIEW -->
      <div class="be-chat" id="beChatView" style="display:none">
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
  const loginView = $('beLoginView');
  const chatView = $('beChatView');
  const messagesEl = $('beMessages');
  const actionsEl = $('beActions');
  const input = $('beInput');
  const sendBtn = $('beSend');
  const nameInput = $('beNameInput');
  const loginBtn = $('beLoginBtn');
  const skipBtn = $('beSkipBtn');
  const logoutBtn = $('beLogout');
  const userInfo = $('beUserInfo');
  const userName = $('beUserName');
  const headerDot = $('beHeaderDot');
  const headerSub = $('beHeaderSub');
  const supportLink = $('beSupportLink');
  const clearBtn = $('beClearChat');

  // ============================================
  // INIT — restore previous session
  // ============================================
  if (state.user) {
    currentView = 'chat';
    showUserInfo();
  }

  // ============================================
  // TOGGLE
  // ============================================
  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('be-visible', isOpen);
    toggleBtn.classList.toggle('be-open', isOpen);
    toggleBtn.innerHTML = isOpen
      ? ICO.close + '<div class="be-badge" id="beBadge"></div>'
      : ICO.ball + '<div class="be-badge" id="beBadge"></div>';

    if (isOpen) {
      if (currentView === 'chat') {
        showChatView();
        if (state.messages.length === 0) {
          const greeting = state.user
            ? `Hey ${state.user.name}! What match or team do you want to know about?`
            : "Hey! I'm BetExpert — your sports and betting assistant. Ask me anything.";
          addBotMessage(greeting);
          renderActions(DEFAULT_ACTIONS);
        } else {
          // Restore previous chat
          restoreChat();
        }
        setTimeout(() => input.focus(), 150);
      } else {
        showLoginView();
        setTimeout(() => nameInput.focus(), 150);
      }
    }
  });

  // ============================================
  // LOGIN
  // ============================================
  function doLogin(name) {
    state.user = { name: name || 'Bwana' };
    saveState();
    currentView = 'chat';
    showChatView();
    showUserInfo();
    addBotMessage(`Hey ${state.user.name}! I'm BetExpert — your AI sports assistant. What match or team do you want to know about?`);
    renderActions(DEFAULT_ACTIONS);
    setTimeout(() => input.focus(), 150);
  }

  loginBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    doLogin(name);
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = nameInput.value.trim();
      if (name) doLogin(name);
    }
  });
  skipBtn.addEventListener('click', () => doLogin('Bwana'));

  logoutBtn.addEventListener('click', () => {
    state = {
      sessionId: 'bew_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      user: null, messages: [], chatHtml: '', preferences: {},
    };
    saveState();
    messagesEl.innerHTML = '';
    currentView = 'login';
    showLoginView();
    userInfo.style.display = 'none';
    headerDot.style.display = '';
  });

  // ============================================
  // VIEW SWITCHING
  // ============================================
  function showLoginView() {
    loginView.style.display = 'flex';
    chatView.style.display = 'none';
    nameInput.value = '';
  }
  function showChatView() {
    loginView.style.display = 'none';
    chatView.style.display = 'flex';
  }
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
    const userText = text.trim();

    addUserMessage(userText);
    state.messages.push({ role: 'user', content: userText });
    input.value = '';
    actionsEl.innerHTML = '';
    isProcessing = true;
    sendBtn.disabled = true;
    showTyping();

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages.slice(-20),
        session_id: state.sessionId,
      }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        hideTyping();
        const reply = data.text || 'Something went wrong. Try again.';
        state.messages.push({ role: 'assistant', content: reply });
        addBotMessage(reply);
        renderActions(getSmartActions(reply));
        saveState();
      })
      .catch(err => {
        hideTyping();
        console.error('[BetExpert]', err);
        addBotMessage("Couldn't connect right now. Check your internet and try again.");
        renderActions(DEFAULT_ACTIONS);
      })
      .finally(() => {
        isProcessing = false;
        sendBtn.disabled = false;
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
    state.chatHtml = '';
    saveState();
    messagesEl.innerHTML = '';
    const greeting = state.user
      ? `Chat cleared! What do you want to know, ${state.user.name}?`
      : 'Chat cleared! Ask me anything.';
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
    // Save rendered HTML for restore
    state.chatHtml = messagesEl.innerHTML;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'be-typing'; el.id = 'beTyping';
    el.innerHTML = '<div class="be-dot"></div><div class="be-dot"></div><div class="be-dot"></div>';
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
    if (state.chatHtml) {
      messagesEl.innerHTML = state.chatHtml;
      scrollDown();
      // Restore actions from last bot message
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
