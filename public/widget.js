/**
 * BetExpert AI Widget — Embeddable Chat for BwanaBet.com
 * Usage: <script src="https://bet-assist.vercel.app/widget.js" data-offset-bottom="80" async></script>
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
  const SESSION_ID = 'bew_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

  let isOpen = false;
  let isProcessing = false;
  let messages = [];

  // ============================================
  // STYLES (all scoped inside Shadow DOM)
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
      width: 56px; height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f5c518 0%, #d4a017 100%);
      border: none;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(245,197,24,0.35), 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      position: relative;
    }
    .be-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(245,197,24,0.5), 0 3px 12px rgba(0,0,0,0.4);
    }
    .be-btn:active { transform: scale(0.95); }
    .be-btn svg { width: 28px; height: 28px; fill: #0a0a0a; }

    .be-btn-close svg { width: 20px; height: 20px; fill: #0a0a0a; }

    /* Pulse ring */
    .be-btn::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid rgba(245,197,24,0.4);
      animation: be-pulse 2.5s ease-out infinite;
    }
    .be-btn.be-open::after { display: none; }

    @keyframes be-pulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(1.35); opacity: 0; }
    }

    /* ---- CHAT PANEL ---- */
    .be-panel {
      position: absolute;
      bottom: 68px; right: 0;
      width: 370px;
      height: 520px;
      background: #0c0f1a;
      border: 1px solid #1e2538;
      border-radius: 16px;
      display: flex; flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(12px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,197,24,0.08);
    }
    .be-panel.be-visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    /* Header */
    .be-header {
      padding: 14px 16px;
      background: linear-gradient(135deg, #111525 0%, #0c0f1a 100%);
      border-bottom: 1px solid #1e2538;
      display: flex; align-items: center; gap: 10px;
    }
    .be-header-icon {
      width: 34px; height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f5c518, #d4a017);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .be-header-icon svg { width: 18px; height: 18px; fill: #0a0a0a; }
    .be-header-text h3 {
      font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.01em;
    }
    .be-header-text p {
      font-size: 11px; color: #64748b; margin-top: 1px;
    }
    .be-header-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
      margin-left: auto; flex-shrink: 0;
      box-shadow: 0 0 6px rgba(34,197,94,0.5);
    }

    /* Messages */
    .be-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .be-messages::-webkit-scrollbar { width: 4px; }
    .be-messages::-webkit-scrollbar-track { background: transparent; }
    .be-messages::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

    .be-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.55;
      animation: be-fade 0.25s ease;
      word-wrap: break-word;
    }
    .be-msg-user {
      align-self: flex-end;
      background: linear-gradient(135deg, #f5c518, #d4a017);
      color: #0a0a0a;
      border-bottom-right-radius: 4px;
      font-weight: 500;
    }
    .be-msg-bot {
      align-self: flex-start;
      background: #161b2e;
      border: 1px solid #1e2538;
      color: #d1d5db;
      border-bottom-left-radius: 4px;
    }
    .be-msg-bot strong { color: #f5c518; font-weight: 600; }
    .be-msg-bot a { color: #60a5fa; text-decoration: underline; }

    @keyframes be-fade {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Typing indicator */
    .be-typing {
      display: flex; gap: 4px; padding: 10px 14px;
      align-self: flex-start;
      background: #161b2e; border: 1px solid #1e2538;
      border-radius: 14px; border-bottom-left-radius: 4px;
    }
    .be-typing-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #64748b;
      animation: be-bounce 1.4s ease-in-out infinite;
    }
    .be-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .be-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes be-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    /* Quick actions */
    .be-actions {
      display: flex; flex-wrap: wrap; gap: 6px;
      padding: 0 16px 8px;
    }
    .be-action-btn {
      padding: 6px 12px;
      background: #161b2e;
      border: 1px solid #2a3148;
      border-radius: 20px;
      color: #f5c518;
      font-size: 12px; font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .be-action-btn:hover {
      background: #f5c518; color: #0a0a0a;
      border-color: #f5c518;
    }

    /* Input area */
    .be-input-area {
      padding: 12px 14px;
      border-top: 1px solid #1e2538;
      background: #0e1120;
      display: flex; gap: 8px; align-items: center;
    }
    .be-input {
      flex: 1;
      background: #161b2e;
      border: 1px solid #2a3148;
      border-radius: 22px;
      padding: 9px 16px;
      color: #e2e8f0;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .be-input::placeholder { color: #4a5568; }
    .be-input:focus { border-color: #f5c518; }

    .be-send {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f5c518, #d4a017);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s, opacity 0.15s;
      flex-shrink: 0;
    }
    .be-send:hover { transform: scale(1.08); }
    .be-send:disabled { opacity: 0.4; cursor: default; transform: none; }
    .be-send svg { width: 16px; height: 16px; fill: #0a0a0a; }

    /* Support link */
    .be-support {
      text-align: center;
      padding: 6px;
      border-top: 1px solid #1e2538;
      background: #0c0f1a;
    }
    .be-support a {
      color: #64748b; font-size: 11px; text-decoration: none;
      cursor: pointer; transition: color 0.15s;
    }
    .be-support a:hover { color: #f5c518; }

    /* ---- MOBILE ---- */
    @media (max-width: 480px) {
      .be-panel {
        width: 100vw; height: 100vh;
        bottom: 0; right: 0;
        border-radius: 0;
        position: fixed;
      }
      .be-btn { bottom: 16px; right: 16px; }
    }
  `;

  // ============================================
  // SVG ICONS
  // ============================================
  const ICONS = {
    football: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 3.3l1.35-.95c1.82.56 3.37 1.76 4.38 3.34l-.39 1.34-1.35.46L13 6.7V5.3zM9.65 4.35L11 5.3v1.4L7.01 9.49l-1.35-.46-.39-1.34c1.01-1.58 2.56-2.78 4.38-3.34zM7.08 17.11l-1.14.1C4.73 15.81 4 13.99 4 12c0-.12.01-.23.02-.35l1-.73 1.38.48 1.46 4.34-.78 1.37zm7.42 2.48c-.79.26-1.63.41-2.5.41s-1.71-.15-2.5-.41l-.69-1.49.64-1.1h5.11l.64 1.11-.7 1.48zM14.27 15H9.73l-1.35-4.02L12 8.44l3.63 2.54L14.27 15zm3.79 2.21l-1.14-.1-.78-1.37 1.46-4.34 1.38-.48 1 .73c.01.12.02.23.02.35 0 1.99-.73 3.81-1.94 5.21z"/></svg>',
    close: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12 5.7 16.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"/></svg>',
    send: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
  };

  // ============================================
  // CREATE DOM
  // ============================================
  const host = document.createElement('div');
  host.id = 'betexpert-widget';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = CSS;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'be-widget';
  container.innerHTML = `
    <div class="be-panel" id="bePanel">
      <div class="be-header">
        <div class="be-header-icon">${ICONS.football}</div>
        <div class="be-header-text">
          <h3>BetExpert AI</h3>
          <p>Sports Assistant</p>
        </div>
        <div class="be-header-dot"></div>
      </div>
      <div class="be-messages" id="beMessages"></div>
      <div class="be-actions" id="beActions">
        <button class="be-action-btn" data-q="What EPL matches are on today?">EPL Today</button>
        <button class="be-action-btn" data-q="Show me La Liga standings">La Liga Table</button>
        <button class="be-action-btn" data-q="Give me some sports picks">Sports Picks</button>
        <button class="be-action-btn" data-q="How do casino slots work?">Casino Tips</button>
      </div>
      <div class="be-input-area">
        <input class="be-input" id="beInput" type="text" placeholder="Ask about matches, stats, odds..." autocomplete="off" />
        <button class="be-send" id="beSend">${ICONS.send}</button>
      </div>
      <div class="be-support">
        <a id="beSupportLink">Need account help? Talk to support</a>
      </div>
    </div>
    <button class="be-btn" id="beToggle" aria-label="Open BetExpert AI">${ICONS.football}</button>
  `;
  shadow.appendChild(container);
  document.body.appendChild(host);

  // ============================================
  // ELEMENTS
  // ============================================
  const $ = (sel) => shadow.querySelector(sel);
  const panel = $('#bePanel');
  const messagesEl = $('#beMessages');
  const input = $('#beInput');
  const sendBtn = $('#beSend');
  const toggleBtn = $('#beToggle');
  const actionsEl = $('#beActions');
  const supportLink = $('#beSupportLink');

  // ============================================
  // TOGGLE
  // ============================================
  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('be-visible', isOpen);
    toggleBtn.classList.toggle('be-open', isOpen);
    toggleBtn.innerHTML = isOpen ? ICONS.close : ICONS.football;
    toggleBtn.classList.toggle('be-btn-close', isOpen);
    if (isOpen && messages.length === 0) {
      addBotMessage("Hey! I'm BetExpert — your sports and betting assistant. Ask me about any match, league, or team.");
    }
    if (isOpen) setTimeout(() => input.focus(), 100);
  });

  // ============================================
  // SEND MESSAGE
  // ============================================
  function send(text) {
    if (!text.trim() || isProcessing) return;
    const userText = text.trim();

    addUserMessage(userText);
    actionsEl.style.display = 'none';

    messages.push({ role: 'user', content: userText });
    input.value = '';
    isProcessing = true;
    sendBtn.disabled = true;
    showTyping();

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, session_id: SESSION_ID }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        hideTyping();
        const reply = data.text || 'Sorry, I couldn\'t process that. Try again.';
        messages.push({ role: 'assistant', content: reply });
        addBotMessage(reply);
      })
      .catch(err => {
        hideTyping();
        console.error('[BetExpert Widget]', err);
        addBotMessage('Couldn\'t connect right now. Check your internet and try again.');
      })
      .finally(() => {
        isProcessing = false;
        sendBtn.disabled = false;
      });
  }

  sendBtn.addEventListener('click', () => send(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input.value);
    }
  });

  // Quick action buttons
  actionsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.be-action-btn');
    if (btn) send(btn.getAttribute('data-q'));
  });

  // Support link → open Tawk.to
  supportLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
      window.Tawk_API.maximize();
    } else {
      window.open('https://bwanabet.com', '_blank');
    }
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
    el.innerHTML = renderMarkdown(text);
    messagesEl.appendChild(el);
    scrollDown();
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'be-typing';
    el.id = 'beTyping';
    el.innerHTML = '<div class="be-typing-dot"></div><div class="be-typing-dot"></div><div class="be-typing-dot"></div>';
    messagesEl.appendChild(el);
    scrollDown();
  }

  function hideTyping() {
    const el = shadow.querySelector('#beTyping');
    if (el) el.remove();
  }

  function scrollDown() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // Basic markdown → HTML
  function renderMarkdown(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n- /g, '\n• ')
      .replace(/\n/g, '<br>');
  }

})();
