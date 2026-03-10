// ============================================
// BetExpert Widget - Dedicated Chat Endpoint
// System prompt is server-side (not visible to users)
// ============================================

async function supabaseInsert(table, data) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error(`[widget-monitor] Insert ${table} failed:`, e.message);
  }
}

function estimateCost(inputTokens, outputTokens) {
  return ((inputTokens / 1_000_000) * 3.0) + ((outputTokens / 1_000_000) * 15.0);
}

// ============================================
// SYSTEM PROMPT (hidden from client)
// ============================================
const SYSTEM_PROMPT = `You are BetExpert, the AI sports assistant for BwanaBet.com — Zambia's premier betting platform.

## YOUR ROLE
You help BwanaBet users with:
- Live scores and upcoming match info
- League standings and team stats
- Match analysis and betting insights
- Casino game rules and strategies
- General sports knowledge

## RULES
- Currency: ZMW (Zambian Kwacha)
- Keep responses SHORT (3-5 lines for stats, 1-2 for greetings)
- No emojis
- Never fabricate statistics — if you don't have data, say so
- End stat responses with "Ready to go?" to encourage engagement
- For account issues (deposits, withdrawals, login), tell users to contact BwanaBet support
- Promote responsible gambling — never pressure users to bet

## GREETINGS
If user says hello/hi, respond briefly:
"Hey! What match or team do you want to know about?"

## CASINO
For casino questions (roulette, slots, blackjack), use general knowledge about game rules, RTP, and basic strategy. No search needed.

## FORMATTING
Use **bold** for team names and key numbers. Use short bullet points for stats. Keep it scannable — users are on a betting site, they want quick answers.`;

export default async function handler(req, res) {
  // CORS — allow bwanabet.com and the Vercel domain
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://bwanabet.com',
    'https://www.bwanabet.com',
    'https://bet-assist.vercel.app',
    'http://localhost:3000',
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }

  const startTime = Date.now();
  const { messages, session_id } = req.body;
  const sessionId = session_id || 'widget_anonymous';

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  // Limit conversation length to control token usage
  const trimmedMessages = messages.slice(-20);

  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: trimmedMessages,
      }),
    });

    const data = await response.json();
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorMsg = data.error?.message || 'API error';
      console.error('[widget-chat] Anthropic error:', response.status, errorMsg);
      supabaseInsert('monitor_errors', {
        session_id: sessionId, source: 'api',
        error_message: `Widget: ${errorMsg}`,
        severity: response.status >= 500 ? 'high' : 'medium',
        context: { endpoint: 'widget-chat', status: response.status },
      });
      return res.status(502).json({ error: 'Service temporarily unavailable' });
    }

    // Extract response text
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const costUsd = estimateCost(inputTokens, outputTokens);
    const textContent = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Fire-and-forget monitoring
    Promise.all([
      supabaseInsert('monitor_requests', {
        session_id: sessionId, model,
        input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: costUsd,
        duration_ms: durationMs, stop_reason: data.stop_reason,
        tools_called: [], tool_count: 0,
        status: 'success',
      }),
      supabaseInsert('monitor_messages', {
        session_id: sessionId, role: 'user',
        content: (typeof trimmedMessages[trimmedMessages.length - 1]?.content === 'string'
          ? trimmedMessages[trimmedMessages.length - 1].content : '').slice(0, 2000),
        tokens_used: inputTokens,
      }),
      supabaseInsert('monitor_messages', {
        session_id: sessionId, role: 'assistant',
        content: textContent.slice(0, 2000),
        tokens_used: outputTokens,
      }),
      durationMs > 10000 ? supabaseInsert('monitor_errors', {
        session_id: sessionId, source: 'api',
        error_message: `Widget slow: ${durationMs}ms`,
        severity: 'medium',
        context: { endpoint: 'widget-chat', duration_ms: durationMs },
      }) : Promise.resolve(),
    ]).catch(() => {});

    return res.status(200).json({
      text: textContent,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    });

  } catch (error) {
    console.error('[widget-chat] Error:', error);
    supabaseInsert('monitor_errors', {
      session_id: sessionId, source: 'api',
      error_message: `Widget exception: ${error.message}`,
      error_raw: error.stack?.slice(0, 3000),
      severity: 'critical',
    });
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }
}
