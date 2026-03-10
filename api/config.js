// /api/config.js
// Returns public configuration to the frontend
// Only exposes PUBLIC keys (anon key is designed to be public)

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Only allow GET
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Return public config from environment variables
  const publicConfig = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    supabaseEnabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    // Claude API is proxied through /api/chat, so no key exposed
    claudeProxyUrl: '/api/chat',
  };

  return new Response(JSON.stringify(publicConfig), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    },
  });
}
