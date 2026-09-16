# MathQuest - AI-Adaptive Math Learning for K-5

##  What It Is

MathQuest is an AI-powered gamified math learning platform for **Kindergarten to Grade 5 students** (ages 5–11). It combines a **Bayesian Knowledge Tracing (BKT)** adaptive engine with a **Context-Aware AI Copilot (Max)** powered by Groq (Qwen 3.8B), delivering genuine personalised tutoring - not just flashcards.

** [Try Demo Instantly](http://localhost:5173)** - click " Try Demo Instantly" on the welcome screen.

## Deployment link- 
[https://frontend-kappa-nine-ycc7kdmdbg.vercel.app/](https://frontend-git-main-akashkapoor12004-gmailcoms-projects.vercel.app/game)

---

##  AI Integration Points

| Feature | When | What happens |
|---|---|---|
|  **Context-Aware Copilot (Max)** | Always (floating panel) | Max reads the student's screen (Score, Question, UI Options) and provides Socratic hints without revealing answers. Features full Chat Memory. |
|  **Procedural Word Problems** | Every question | AI wraps arithmetic in a story ("Emma has 3 apples...") |
|  **AI Hints** | Before answering | Guided hint perfectly targeted to the child's grade level |
|  **AI Explanations** | After wrong answers | Max explains why the answer is correct |
|  **Session Summaries** | Results page | Personalised encouragement based on accuracy and weak topics |
|  **Dashboard Insights** | Dashboard | AI study recommendation from the student's mastery matrix |

> **Zero-Downtime Architecture:** AI falls back gracefully to secondary models (OpenRouter) or built-in responses if the primary Groq backend is offline — the core learning experience never breaks.

---

##  Adaptive Engine - How BKT Works

Each student has a **hidden mastery probability P(mastery)** for every skill (8 topics × 5 difficulty levels × 6 grade levels = 240 skill nodes).

After every answer, the engine updates using the standard BKT update equations:
- **Correct answer**: P(mastery) increases via the learning rate P(T)
- **Wrong answer**: P(mastery) decreases, weighted by P(G) (guess probability) and P(S) (slip probability)
- **Next question selection**: Targets the skill with highest learning opportunity for current mastery state

---

##  Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Zustand + Framer Motion)             │
│  ├── BKT Engine (client-side, works offline)            │
│  ├── Context-Injection Layer → Page State to LLM        │
│  └── localStorage for session persistence               │
├─────────────────────────────────────────────────────────┤
│  Backend (Node.js/Express)                              │
│  ├── Auth & Cloud Sync (bcryptjs + JWT-ready)           │
│  ├── AI routes → Groq (qwen/qwen3.8-27b)                │
│  ├── Fallback: OpenRouter / OpenAI (priority order)     │
│  └── PostgreSQL (pg) for permanent cloud storage        │
└─────────────────────────────────────────────────────────┘
```

**Stack:**
- **Frontend**: React 18, Zustand, Framer Motion, Recharts, canvas-confetti
- **Backend**: Node.js, Express, pg (PostgreSQL), dotenv, express-rate-limit
- **AI**: Groq API (`qwen/qwen3.8-27b`) with advanced prompt-engineering for Vision-Bypass context injection.

---

##  Running Locally

```bash
# 1. Backend
cd backend
cp .env.example .env          # Add your GROQ_API_KEY and DATABASE_URL
npm install
npm run dev                   # Starts on http://localhost:3001 (auto-reloads)

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # Starts on http://localhost:5173
```

**Frontend runs on `http://localhost:5173`** | **Backend runs on `http://localhost:3001`**

Open **http://localhost:5173** → click **⚡ Try Demo Instantly** to see all features immediately.

### Get a free API key
1. Go to https://console.groq.com
2. Sign up → API Keys → Create key
3. Paste in `backend/.env` as `GROQ_API_KEY=gsk_...`

---

##  Features

- **Grade-gated curriculum**: Kindergarten–Grade 5, topics unlock by grade
- **Visual aids**: Dot arrays, number lines, fraction bars for young learners
- **18 achievement badges**: 5 rarity tiers (Common → Legendary)
- **Gamification**: XP, levels, streaks, confetti for high scores
- **Skill radar chart + heatmap**: Visual mastery dashboard
- **Session history chart**: Accuracy trend over time
- **Cloud Sync & Auth**: Secure Login/Registration with `bcryptjs` password hashing
- **Permanent Cloud Storage**: Progress is permanently synced via a PostgreSQL database hosted on Render
- **Frictionless Hackathon Deployment**: Dynamic CORS automatically accepts any frontend origin
- **Switch Player**: Multiple students can log into their accounts on the same device

---

##  Project Structure

```
mathquest/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Welcome, Game, Dashboard, Results, Achievements
│   │   ├── components/     # MaxChat, SpeakButton, XPBar, AnswerOption, ...
│   │   ├── store/          # Zustand store (gameStore.js)
│   │   ├── utils/          # adaptiveEngine.js, badges.js
│   │   └── api/            # API client (index.js)
│   └── vite.config.js      # Proxy: /api → localhost:3001
├── backend/
│   ├── src/
│   │   ├── routes/         # ai.js, progress.js, auth.js
│   │   ├── services/       # ai.js (Groq Copilot Integration)
│   │   ├── db/             # PostgreSQL connection pool and schema
│   │   └── app.js          # Express server
│   └── .env                # GROQ_API_KEY, DATABASE_URL
└── README.md
```

---

##  Deployment

### Frontend → Vercel
```bash
cd frontend && npx vercel --prod
# Set env: VITE_API_BASE_URL=https://nerdy-4jqm.onrender.com/api
```

### Backend → Render
- Build: `cd backend && npm install`
- Start: `node src/app.js`
- Env: `GROQ_API_KEY`, `DATABASE_URL`, `NODE_ENV=production`
- *Note: Backend uses dynamic `origin: true` CORS, so it automatically supports any frontend URL without extra configuration!*
