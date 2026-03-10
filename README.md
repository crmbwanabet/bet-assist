# BetAssist AI - Vercel Deployment

AI-powered sports betting assistant for Bwanabet.com (Zambia).

## 🚀 Quick Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/betassist-vercel)

### Option 2: Manual Deploy

1. **Clone/Upload this folder to a GitHub repo**

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repo

3. **Set Environment Variables:**
   In Vercel Dashboard → Settings → Environment Variables:

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `ANTHROPIC_API_KEY` | ✅ Yes | Your Claude API key from [console.anthropic.com](https://console.anthropic.com) |
   | `SUPABASE_URL` | ❌ Optional | Your Supabase project URL |
   | `SUPABASE_ANON_KEY` | ❌ Optional | Your Supabase anon/public key |
   | `CLAUDE_MODEL` | ❌ Optional | Model to use (default: `claude-sonnet-4-20250514`) |

4. **Deploy!**

## 📁 Project Structure

```
betassist-vercel/
├── api/
│   ├── chat.js       # Claude API proxy (keeps API key secure)
│   └── config.js     # Returns public config to frontend
├── public/
│   └── index.html    # Main BetAssist application
├── vercel.json       # Vercel configuration
├── .env.example      # Example environment variables
└── README.md         # This file
```

## 🔐 Security

- **Claude API key** is stored server-side in environment variables
- **Never exposed** to the frontend or browser
- **Supabase anon key** is safe to expose (it's designed to be public)

## 🛠️ Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

4. Run locally:
   ```bash
   vercel dev
   ```

5. Open http://localhost:3000

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Proxy to Claude API |
| `/api/config` | GET | Returns public configuration |

### `/api/chat` Request Format

```json
{
  "messages": [
    { "role": "user", "content": "What EPL matches are on today?" }
  ],
  "system": "You are BetAssist...",
  "tools": [...]
}
```

## 🎯 Features

- ⚽ Live sports data from ESPN API
- 🤖 Claude AI for intelligent responses
- 🎰 Casino game strategies
- 💰 Zambian Kwacha (ZMW) currency
- 🔒 Secure API key handling
- 📱 Mobile-responsive design

## ❓ Troubleshooting

### "Server configuration error: API key not set"
→ Add `ANTHROPIC_API_KEY` in Vercel Dashboard → Settings → Environment Variables

### "Could not load config from /api/config"
→ Make sure you deployed both `api/` folder and `public/` folder

### CORS errors
→ The API routes include CORS headers. If issues persist, check Vercel logs.

## 📄 License

MIT License - Built for Bwanabet.com
