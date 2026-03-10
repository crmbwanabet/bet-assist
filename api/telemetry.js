// ============================================
// BetAssist AI - Client Telemetry Endpoint
// ============================================

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
    return resp.ok;
  } catch (e) {
    console.error(`[telemetry] ${table} insert error:`, e.message);
    return null;
  }
}

async function supabaseUpsertSession(session) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    await fetch(`${url}/rest/v1/monitor_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(session),
    });
  } catch (e) {
    console.error(`[telemetry] Session upsert error:`, e.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, session_id, data } = req.body;
    if (!type || !session_id) {
      return res.status(400).json({ error: 'Missing type or session_id' });
    }

    switch (type) {
      case 'session_start':
        await supabaseUpsertSession({
          session_id,
          started_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          user_agent: (data?.user_agent || '').slice(0, 500),
        });
        break;

      case 'heartbeat':
      case 'session_heartbeat':
        await supabaseUpsertSession({
          session_id,
          last_active_at: new Date().toISOString(),
          message_count: data?.message_count || 0,
          gambling_warning_shown: data?.gambling_warning || data?.gambling_warning_shown || false,
        });
        break;

      case 'error':
        await supabaseInsert('monitor_errors', {
          session_id,
          source: data?.source || 'client',
          severity: data?.severity || 'medium',
          error_message: (data?.message || 'Unknown client error').slice(0, 500),
          error_raw: (data?.raw || '').slice(0, 2000),
          context: data?.context || {},
        });
        break;

      case 'tool_result':
        await supabaseInsert('monitor_messages', {
          session_id,
          role: 'tool_result',
          tool_name: data?.tool_name,
          content: (data?.result || '').slice(0, 2000),
        });
        break;

      default:
        return res.status(400).json({ error: `Unknown telemetry type: ${type}` });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[telemetry] Error:', error);
    return res.status(500).json({ error: 'Telemetry processing failed' });
  }
}
