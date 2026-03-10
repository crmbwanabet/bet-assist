// ============================================
// BetAssist AI - Claude API Proxy + Monitoring
// ============================================

// Helper: insert row into Supabase table via REST API
async function supabaseInsert(table, row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const resp = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!resp.ok) {
      console.error(`[monitor] Failed to insert into ${table}:`, resp.status, await resp.text());
    }
    return resp.ok;
  } catch (e) {
    console.error(`[monitor] ${table} insert error:`, e.message);
    return null;
  }
}

// Helper: upsert session
async function supabaseUpsertSession(session) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const resp = await fetch(`${url}/rest/v1/monitor_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(session),
    });
    if (!resp.ok) {
      console.error(`[monitor] Session upsert failed:`, resp.status, await resp.text());
    }
  } catch (e) {
    console.error(`[monitor] Session upsert error:`, e.message);
  }
}

// Estimate cost based on Claude Sonnet 4 pricing
// Input: $3/MTok, Output: $15/MTok
function estimateCost(inputTokens, outputTokens) {
  return (inputTokens * 3 / 1_000_000) + (outputTokens * 15 / 1_000_000);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[chat] ANTHROPIC_API_KEY not set');
    // Log critical error
    await supabaseInsert('monitor_errors', {
      session_id: req.body?.session_id || 'unknown',
      source: 'api',
      severity: 'critical',
      error_message: 'API key not configured',
      error_raw: 'ANTHROPIC_API_KEY environment variable is missing',
    });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const startTime = Date.now();

  try {
    const { messages, system, tools, session_id } = req.body;
    const sid = session_id || 'no-session';

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid "messages" array' });
    }

    const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

    // Separate web_search from custom tools
    const customTools = [];
    let includeWebSearch = false;
    if (tools && Array.isArray(tools)) {
      for (const tool of tools) {
        if (tool.name === 'web_search') {
          includeWebSearch = true;
        } else {
          customTools.push(tool);
        }
      }
    }

    const apiTools = [...customTools];
    if (includeWebSearch) {
      apiTools.push({ type: 'web_search_20250305', name: 'web_search', max_uses: 5 });
    }

    // Build Anthropic request
    const anthropicBody = { model, max_tokens: 4096, system: system || '', messages };
    if (apiTools.length > 0) anthropicBody.tools = apiTools;

    console.log(`[chat] sid=${sid} model=${model} msgs=${messages.length} tools=${apiTools.length}`);

    // Log user message to monitor_messages
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      const content = typeof lastUserMsg.content === 'string' 
        ? lastUserMsg.content 
        : JSON.stringify(lastUserMsg.content);
      supabaseInsert('monitor_messages', {
        session_id: sid,
        role: 'user',
        content: content.slice(0, 2000),
      });
    }

    // Call Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });

    const data = await response.json();
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      console.error('[chat] Anthropic API error:', response.status, JSON.stringify(data));

      // Log error
      const errorMsg = data.error?.message || 'Anthropic API error';
      await Promise.all([
        supabaseInsert('monitor_requests', {
          session_id: sid, model, duration_ms: durationMs,
          status: 'error', error_type: data.error?.type || 'api_error',
          error_message: errorMsg,
        }),
        supabaseInsert('monitor_errors', {
          session_id: sid, source: 'api', severity: response.status >= 500 ? 'high' : 'medium',
          error_message: errorMsg,
          error_raw: JSON.stringify(data).slice(0, 2000),
          context: { status: response.status, model, msg_count: messages.length },
        }),
      ]);

      return res.status(response.status).json({
        error: data.error?.message || 'Anthropic API error',
        type: data.error?.type,
        status: response.status,
      });
    }

    // Extract metrics from successful response
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const costUsd = estimateCost(inputTokens, outputTokens);

    // Extract tool calls from response
    const toolsCalled = (data.content || [])
      .filter(b => b.type === 'tool_use')
      .map(b => b.name);

    // Extract assistant text
    const assistantText = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Check for model errors (empty response, no text)
    const isModelError = !assistantText && data.stop_reason !== 'tool_use';

    console.log(`[chat] sid=${sid} ok in=${inputTokens} out=${outputTokens} cost=$${costUsd.toFixed(4)} dur=${durationMs}ms tools=[${toolsCalled.join(',')}]`);

    // Log everything (non-blocking)
    Promise.all([
      // Log request
      supabaseInsert('monitor_requests', {
        session_id: sid,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_usd: costUsd,
        duration_ms: durationMs,
        tools_called: JSON.stringify(toolsCalled),
        tool_count: toolsCalled.length,
        status: isModelError ? 'error' : 'success',
        stop_reason: data.stop_reason,
        error_type: isModelError ? 'empty_response' : null,
        error_message: isModelError ? 'Model returned no text content' : null,
      }),

      // Log assistant message
      supabaseInsert('monitor_messages', {
        session_id: sid,
        role: 'assistant',
        content: (assistantText || `[tool_use: ${toolsCalled.join(', ')}]`).slice(0, 2000),
        tokens_used: inputTokens + outputTokens,
      }),

      // Log individual tool calls
      ...toolsCalled.map(tn => supabaseInsert('monitor_messages', {
        session_id: sid,
        role: 'tool_call',
        tool_name: tn,
        content: `Tool call: ${tn}`,
      })),

      // Update session
      supabaseUpsertSession({
        session_id: sid,
        last_active_at: new Date().toISOString(),
        message_count: messages.length,
        request_count: 1, // Will increment via trigger or app logic
        total_tokens: inputTokens + outputTokens,
        total_cost_usd: costUsd,
      }),

      // Log model error if detected
      isModelError ? supabaseInsert('monitor_errors', {
        session_id: sid, source: 'api', severity: 'medium',
        error_message: 'Model returned empty response',
        error_raw: JSON.stringify(data.content).slice(0, 2000),
        context: { stop_reason: data.stop_reason, model, tools: toolsCalled },
      }) : Promise.resolve(),
    ]).catch(e => console.error('[monitor] Background log error:', e.message));

    return res.status(200).json(data);

  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[chat] Unexpected error:', error);

    // Log crash
    await Promise.all([
      supabaseInsert('monitor_requests', {
        session_id: req.body?.session_id || 'unknown',
        duration_ms: durationMs,
        status: 'error',
        error_type: 'crash',
        error_message: error.message,
      }),
      supabaseInsert('monitor_errors', {
        session_id: req.body?.session_id || 'unknown',
        source: 'api', severity: 'critical',
        error_message: 'Server crash in chat handler',
        error_raw: error.stack || error.message,
      }),
    ]).catch(() => {});

    return res.status(500).json({ error: 'Internal server error' });
  }
}
