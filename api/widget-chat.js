// ============================================
// BetExpert Widget — Chat Endpoint with Server-Side Tool Loop
// One request in from widget → runs full Claude + ESPN tool loop → one response back
// ============================================

import { TOOL_DEFINITIONS, executeTool, truncateResult } from './_lib/sports-engine.js';
import { SYSTEM_PROMPT } from './_lib/system-prompt.js';

const MAX_TOOL_LOOPS = 6;  // Safety cap
const MAX_TOKENS = 1536;

// ---- Monitoring helpers ----
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
// HANDLER
// ============================================
export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowed = ['https://bwanabet.com', 'https://www.bwanabet.com', 'https://bet-assist.vercel.app', 'http://localhost:3000'];
  res.setHeader('Access-Control-Allow-Origin', allowed.includes(origin) ? origin : allowed[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Service temporarily unavailable' });

  const startTime = Date.now();
  const { messages, session_id } = req.body;
  const sessionId = session_id || 'widget_anon';

  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' });

  // Trim to last 20 messages
  let conversationMessages = messages.slice(-20);
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let allToolsCalled = [];

  try {
    // ---- Tool loop: call Claude, execute tools, repeat ----
    let loopCount = 0;
    let finalText = '';

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount++;
      console.log(`[widget] Loop ${loopCount}, messages: ${conversationMessages.length}`);

      const anthropicBody = {
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: conversationMessages,
        tools: TOOL_DEFINITIONS,
      };

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

      if (!response.ok) {
        const errMsg = data.error?.message || 'API error';
        console.error('[widget] Anthropic error:', response.status, errMsg);
        supabaseInsert('monitor_errors', {
          session_id: sessionId, source: 'api',
          error_message: `Widget: ${errMsg}`, severity: 'high',
          context: { endpoint: 'widget-chat', loop: loopCount, status: response.status },
        });
        return res.status(502).json({ error: 'Service temporarily unavailable' });
      }

      totalInputTokens += data.usage?.input_tokens || 0;
      totalOutputTokens += data.usage?.output_tokens || 0;

      // Extract text blocks
      const textBlocks = (data.content || []).filter(b => b.type === 'text');
      const toolBlocks = (data.content || []).filter(b => b.type === 'tool_use');

      // If no tool calls, we're done
      if (data.stop_reason !== 'tool_use' || toolBlocks.length === 0) {
        finalText = textBlocks.map(b => b.text).join('\n');
        break;
      }

      // ---- Execute tools in parallel ----
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
          return {
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: JSON.stringify({ error: e.message }),
          };
        }
      }));

      // Add assistant's response (with tool calls) and tool results to conversation
      conversationMessages.push({ role: 'assistant', content: data.content });
      conversationMessages.push({ role: 'user', content: toolResults });
    }

    // ---- Check for timeout ----
    if (loopCount >= MAX_TOOL_LOOPS && !finalText) {
      finalText = "I tried to look that up but it's taking too long. Try asking something more specific.";
    }

    const durationMs = Date.now() - startTime;
    const costUsd = estimateCost(totalInputTokens, totalOutputTokens);

    // ---- Fire-and-forget monitoring ----
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
    ]).catch(() => {});

    console.log(`[widget] Done in ${durationMs}ms, ${loopCount} loops, ${allToolsCalled.length} tools, ${totalInputTokens}+${totalOutputTokens} tokens, $${costUsd.toFixed(4)}`);

    return res.status(200).json({
      text: finalText,
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
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }
}
