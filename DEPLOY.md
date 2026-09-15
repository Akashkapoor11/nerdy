# 🚀 MathQuest Deployment Guide

## Option 1: Demo in 30 seconds (Frontend only)

```bash
cd frontend && npm install && npm run dev
# Open http://localhost:5173 — full game, AI uses built-in hints
```

## Option 2: Full stack with AI (2 minutes)

```bash
# 1. Start backend
cd backend && cp .env.example .env
# Edit .env and add your AI key (choose one):
# OPENAI_API_KEY=sk-...          (OpenAI)
# GROQ_API_KEY=gsk_...           (Groq — free)
# OPENROUTER_API_KEY=sk-or-v1-.. (OpenRouter — free tier available)
npm install && npm run dev &

# 2. Start frontend
cd frontend && npm install && npm run dev
```

## Option 3: One-command start

```bash
./start.sh
```

## Deploy to Vercel + Render (production)

### Step 1 — Deploy backend to Render
1. Push to GitHub
2. Go to render.com → New Web Service → Connect repo
3. Root: `backend` | Build: `npm install` | Start: `node src/app.js`
4. Add env vars: `OPENAI_API_KEY` (or `GROQ_API_KEY` or `OPENROUTER_API_KEY`), `NODE_ENV=production`, `FRONTEND_URL=<your-vercel-url>`
5. Note your Render URL: `https://mathquest-backend.onrender.com`

### Step 2 — Deploy frontend to Vercel
1. Go to vercel.com → New Project → Import repo
2. Root: `frontend` | Build: `npm run build` | Output: `dist`
3. Add env var: `VITE_API_BASE_URL=https://mathquest-backend.onrender.com/api`
4. Deploy!

### Step 3 — Test end-to-end
1. Open your Vercel URL
2. Create a profile, play a game, answer wrong
3. Check that "Max explains (AI)" appears → AI is connected ✅

## Environment Variables

| Variable | Where | Required | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | backend/.env | No | OpenAI GPT-4o-mini for AI hints |
| `GROQ_API_KEY` | backend/.env | No | Groq (free) — alternative to OpenAI |
| `OPENROUTER_API_KEY` | backend/.env | No | OpenRouter — 100+ models, free tier |
| `OPENROUTER_MODEL` | backend/.env | No | OpenRouter model (default: llama-3.1-8b:free) |
| `VITE_API_BASE_URL` | Vercel settings | No | Points frontend to Render backend |
| `PORT` | Render | No | Default 3001 |
| `NODE_ENV` | Render | Yes | Set to `production` |

## Verify everything works

```bash
# Backend health check
curl https://your-backend.onrender.com/health

# Expected: {"status":"ok","version":"1.0.0",...}
```
