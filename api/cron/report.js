// ============================================
// BetExpert — 4-Hour Scheduled Report (Vercel Cron)
// Runs every 4 hours, queries Supabase, sends summary to Slack
// Self-contained — no imports
// ============================================

async function supabaseQuery(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    });
    if (!r.ok) return null;
    return r.json();
  } catch (e) { return null; }
}

async function sendToSlack(blocks, text) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }),
    });
    return r.ok;
  } catch (e) { return false; }
}

export default async function handler(req, res) {
  // Verify this is a cron call (Vercel sends this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !process.env.WIDGET_DEV) {
    // Also allow manual trigger with admin secret
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const now = new Date();
  const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000).toISOString();
  const todayStart = now.toISOString().split('T')[0] + 'T00:00:00Z';
  const periodStart = fourHoursAgo.replace('T', ' ').slice(0, 16) + ' UTC';
  const periodEnd = now.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  try {
    // Fetch data in parallel
    const [requests, errors, sessions, todayRequests] = await Promise.all([
      supabaseQuery(`monitor_requests?select=input_tokens,output_tokens,cost_usd,status,duration_ms,tools_called,tool_count&created_at=gte.${fourHoursAgo}&order=created_at.desc&limit=2000`),
      supabaseQuery(`monitor_errors?select=severity&created_at=gte.${fourHoursAgo}`),
      supabaseQuery(`monitor_sessions?select=session_id,last_active_at,session_duration_minutes,gambling_warning_shown&last_active_at=gte.${fourHoursAgo}`),
      supabaseQuery(`monitor_requests?select=cost_usd&created_at=gte.${todayStart}`),
    ]);

    if (!requests) {
      return res.status(500).json({ error: 'Could not query Supabase' });
    }

    // Calculate metrics
    const totalRequests = requests.length;
    const errorCount = requests.filter(r => r.status === 'error').length;
    const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(1) : '0.0';
    const totalInputTokens = requests.reduce((s, r) => s + (r.input_tokens || 0), 0);
    const totalOutputTokens = requests.reduce((s, r) => s + (r.output_tokens || 0), 0);
    const periodCost = requests.reduce((s, r) => s + parseFloat(r.cost_usd || 0), 0);
    const dailyCost = (todayRequests || []).reduce((s, r) => s + parseFloat(r.cost_usd || 0), 0);
    const avgDuration = totalRequests > 0 ? Math.round(requests.reduce((s, r) => s + (r.duration_ms || 0), 0) / totalRequests) : 0;
    const slowRequests = requests.filter(r => r.duration_ms > 10000).length;

    const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
    const activeSessions = (sessions || []).filter(s => s.last_active_at >= fiveMinAgo).length;
    const totalSessions = (sessions || []).length;
    const gamblingWarnings = (sessions || []).filter(s => s.gambling_warning_shown).length;
    const criticalErrors = (errors || []).filter(e => e.severity === 'critical').length;

    // Top tools
    const toolCounts = {};
    requests.forEach(r => {
      (r.tools_called || []).forEach(t => { toolCounts[t] = (toolCounts[t] || 0) + 1; });
    });
    const topTools = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `\`${name}\` × ${count}`);

    // Build Slack message
    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📊 BETEXPERT — 4 Hour Report' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Requests:*\n${totalRequests}` },
          { type: 'mrkdwn', text: `*Error Rate:*\n${errorRate}% (${errorCount} errors)` },
          { type: 'mrkdwn', text: `*Active Now:*\n${activeSessions} sessions` },
          { type: 'mrkdwn', text: `*Period Cost:*\n$${periodCost.toFixed(2)}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Daily Cost:*\n$${dailyCost.toFixed(2)}` },
          { type: 'mrkdwn', text: `*Avg Response:*\n${avgDuration > 1000 ? (avgDuration / 1000).toFixed(1) + 's' : avgDuration + 'ms'}` },
          { type: 'mrkdwn', text: `*Slow (>10s):*\n${slowRequests}` },
          { type: 'mrkdwn', text: `*Sessions:*\n${totalSessions}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Input Tokens:*\n${totalInputTokens.toLocaleString()}` },
          { type: 'mrkdwn', text: `*Output Tokens:*\n${totalOutputTokens.toLocaleString()}` },
          { type: 'mrkdwn', text: `*Gambling Warnings:*\n${gamblingWarnings}` },
          { type: 'mrkdwn', text: `*Critical Errors:*\n${criticalErrors}` },
        ],
      },
    ];

    if (topTools.length > 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Top Tools:* ${topTools.join(', ')}` },
      });
    }

    if (criticalErrors > 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `🔴 *${criticalErrors} critical error(s) — check dashboard immediately*` },
      });
    }

    // Cost limit warning
    const limit = parseFloat(process.env.DAILY_COST_LIMIT || '50');
    if (dailyCost > limit * 0.8) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `💰 *Daily cost $${dailyCost.toFixed(2)} is at ${((dailyCost / limit) * 100).toFixed(0)}% of $${limit} limit*` },
      });
    }

    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${periodStart} → ${periodEnd} | <https://bet-assist.vercel.app/admin.html|Open Dashboard>` }],
    });

    // No-data report
    if (totalRequests === 0) {
      blocks.splice(1, blocks.length - 2, {
        type: 'section',
        text: { type: 'mrkdwn', text: '_No requests in the last 4 hours. System is idle._' },
      });
    }

    const sent = await sendToSlack(blocks, `📊 BetExpert: ${totalRequests} requests, $${periodCost.toFixed(2)} cost, ${errorRate}% errors`);

    return res.status(200).json({
      sent,
      period: { start: periodStart, end: periodEnd },
      metrics: {
        totalRequests, errorCount, errorRate, periodCost: periodCost.toFixed(2),
        dailyCost: dailyCost.toFixed(2), activeSessions, slowRequests, criticalErrors,
      },
    });

  } catch (error) {
    console.error('[cron/report] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
