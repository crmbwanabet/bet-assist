// ============================================
// BetAssist AI - Admin Dashboard API
// ============================================
// Protected by ADMIN_SECRET env var.
// Serves monitoring data to admin.html.

async function supabaseQuery(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: 'Supabase not configured' };

  try {
    const resp = await fetch(`${url}/rest/v1/${path}`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });
    if (!resp.ok) return { error: `Query failed: ${resp.status}` };
    return await resp.json();
  } catch (e) {
    return { error: e.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'ADMIN_SECRET not set in environment variables' });
  }
  if (req.headers['x-admin-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const view = req.query.view;

  try {
    switch (view) {

      // ---- OVERVIEW ----
      case 'overview': {
        const [todayReqs, activeNow, errors24h, dailyUsage] = await Promise.all([
          supabaseQuery('monitor_requests?select=id,status,input_tokens,output_tokens,estimated_cost_usd,duration_ms&created_at=gte.' + todayStart()),
          supabaseQuery('monitor_active_sessions?select=*'),
          supabaseQuery('monitor_errors?select=id,severity&created_at=gte.' + hoursAgo(24)),
          supabaseQuery('monitor_daily_usage?select=*&limit=14'),
        ]);

        const reqs = Array.isArray(todayReqs) ? todayReqs : [];
        const errs = Array.isArray(errors24h) ? errors24h : [];

        return res.json({
          today: {
            requests: reqs.length,
            errors: reqs.filter(r => r.status === 'error').length,
            error_rate: reqs.length ? Math.round(reqs.filter(r => r.status === 'error').length / reqs.length * 100 * 10) / 10 : 0,
            tokens: reqs.reduce((s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0), 0),
            cost_usd: reqs.reduce((s, r) => s + parseFloat(r.estimated_cost_usd || 0), 0),
            avg_duration_ms: reqs.length ? Math.round(reqs.reduce((s, r) => s + (r.duration_ms || 0), 0) / reqs.length) : 0,
          },
          active_sessions: Array.isArray(activeNow) ? activeNow.length : 0,
          critical_errors_24h: errs.filter(e => e.severity === 'critical').length,
          daily_usage: Array.isArray(dailyUsage) ? dailyUsage : [],
        });
      }

      // ---- ERROR LOG ----
      case 'errors': {
        const limit = req.query.limit || 50;
        const severity = req.query.severity;
        let path = `monitor_errors?select=*&order=created_at.desc&limit=${limit}`;
        if (severity) path += `&severity=eq.${severity}`;
        const data = await supabaseQuery(path);
        return res.json(Array.isArray(data) ? data : []);
      }

      // ---- CONVERSATIONS ----
      case 'sessions': {
        const limit = req.query.limit || 30;
        const data = await supabaseQuery(`monitor_sessions?select=*&order=last_active_at.desc&limit=${limit}`);
        return res.json(Array.isArray(data) ? data : []);
      }

      case 'conversation': {
        const sid = req.query.session_id;
        if (!sid) return res.status(400).json({ error: 'session_id required' });
        const data = await supabaseQuery(`monitor_messages?select=*&session_id=eq.${sid}&order=created_at.asc`);
        return res.json(Array.isArray(data) ? data : []);
      }

      // ---- API CREDITS ----
      case 'credits': {
        const data = await supabaseQuery('monitor_daily_usage?select=*&limit=30');
        return res.json(Array.isArray(data) ? data : []);
      }

      // ---- TOOL USAGE ----
      case 'tools': {
        const data = await supabaseQuery('monitor_tool_stats?select=*');
        return res.json(Array.isArray(data) ? data : []);
      }

      // ---- SLOW REQUESTS ----
      case 'slow': {
        const limit = req.query.limit || 30;
        const data = await supabaseQuery(`monitor_requests?select=*&is_slow=eq.true&order=created_at.desc&limit=${limit}`);
        return res.json(Array.isArray(data) ? data : []);
      }

      // ---- RESPONSIBLE GAMBLING ----
      case 'gambling': {
        const data = await supabaseQuery('monitor_rg_flags?select=*&limit=50');
        return res.json(Array.isArray(data) ? data : []);
      }

      // ---- MODEL ERRORS ----
      case 'model_errors': {
        const limit = req.query.limit || 30;
        const data = await supabaseQuery(`monitor_requests?select=*&error_type=eq.empty_response&order=created_at.desc&limit=${limit}`);
        return res.json(Array.isArray(data) ? data : []);
      }

      default:
        return res.status(400).json({ error: 'Unknown view. Options: overview, errors, sessions, conversation, credits, tools, slow, gambling, model_errors' });
    }
  } catch (error) {
    console.error('[admin] Error:', error);
    return res.status(500).json({ error: 'Admin query failed' });
  }
}

// Helpers
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600000).toISOString();
}
