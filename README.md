# MathQuest ✨ — AI-Adaptive Math Learning for K-5

> **Built for the Nerdy AI Hackathon Challenge** · Prompt 01: K–5 Math Game  
> **Tech:** React · Node.js · BKT Adaptive Engine · OpenRouter AI

---

## 🎯 What It Is

MathQuest is an AI-powered gamified math learning platform for **Kindergarten to Grade 5 students** (ages 5–11). It combines a **Bayesian Knowledge Tracing (BKT)** adaptive engine with a **7-point AI coaching layer** powered by OpenRouter/Llama-3.1, delivering genuine personalised tutoring — not just flashcards.

**⚡ [Try Demo Instantly](http://localhost:5173)** — click "⚡ Try Demo Instantly" on the welcome screen.

---

## 🤖 7 AI Integration Points

| Feature | When | What happens |
|---|---|---|
| 💬 **Ask Max Chat** | Always (floating panel) | Child asks any math question, Max responds with grade + topic awareness |
| 📖 **AI Word Problems** | Every question | AI wraps arithmetic in a story ("Emma has 3 apples...") |
| 💡 **AI Hints** | Before answering | Guided hint without revealing the answer |
| ✨ **AI Explanations** | After wrong answers | Max explains why the answer is correct, in child-friendly language |
| 🎉 **Session Summaries** | Results page | Personalised encouragement based on accuracy, weak topics, streak |
| 🧠 **Dashboard Insights** | Dashboard | AI study recommendation from the student's mastery matrix |
| 🔊 **Voice/TTS** | All questions | Auto-reads for K-1; manual 🔊 button for all grades (Web Speech API) |

> AI falls back gracefully to built-in responses if the backend is offline — the core experience never breaks.

---

## 🧠 Adaptive Engine — How BKT Works

Each student has a **hidden mastery probability P(mastery)** for every skill (8 topics × 5 difficulty levels × 6 grade levels = 240 skill nodes).

After every answer, the engine updates using the standard BKT update equations:
- **Correct answer**: P(mastery) increases via the learning rate P(T)
- **Wrong answer**: P(mastery) decreases, weighted by P(G) (guess probability) and P(S) (slip probability)
- **Next question selection**: Targets the skill with highest learning opportunity for current mastery state

Additionally, **6 misconception types** are detected and labelled:
- `addition_instead_of_multiplication`
- `reversed_subtraction`
- `off_by_one_factor`
- `counting_error`
- `place_value_error`
- `subtraction_instead_of_division`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Zustand + Framer Motion)             │
│  ├── BKT Engine (client-side, works offline)            │
│  ├── 7 AI hooks → Backend API                           │
│  └── localStorage for session persistence               │
├─────────────────────────────────────────────────────────┤
│  Backend (Node.js/Express)                              │
│  ├── AI routes → OpenRouter (Llama-3.1-8b-instruct)    │
│  ├── Fallback: Groq → OpenAI (priority order)           │
│  └── SQLite (node:sqlite) for cross-session persistence  │
└─────────────────────────────────────────────────────────┘
```

**Stack:**
- Frontend: React 18, Zustand, Framer Motion, Recharts, canvas-confetti
- Backend: Node.js, Express, node:sqlite, dotenv, express-rate-limit
- AI: OpenRouter API via openai SDK (`baseURL` override)

---

## 🚀 Running Locally

```bash
# 1. Backend
cd backend
cp .env.example .env          # Add your OPENROUTER_API_KEY
npm install
npm run dev                   # Starts on http://localhost:3001

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # Starts on http://localhost:5173
```

Open **http://localhost:5173** → click **⚡ Try Demo Instantly** to see all features immediately.

### Get a free API key
1. Go to https://openrouter.ai
2. Sign up → API Keys → Create key
3. Paste in `backend/.env` as `OPENROUTER_API_KEY=sk-or-...`

---

## 🎮 Features

- **Grade-gated curriculum**: Kindergarten–Grade 5, topics unlock by grade
- **Visual aids**: Dot arrays, number lines, fraction bars for young learners
- **18 achievement badges**: 5 rarity tiers (Common → Legendary)
- **Gamification**: XP, levels, streaks, confetti for high scores
- **Skill radar chart + heatmap**: Visual mastery dashboard
- **Session history chart**: Accuracy trend over time
- **Progress export**: JSON report for teachers/parents
- **Switch Player**: Multiple students on same device

---

## 📁 Project Structure

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
│   │   ├── routes/         # ai.js, game.js, progress.js, auth.js
│   │   ├── services/       # ai.js (OpenRouter/Groq/OpenAI)
│   │   └── app.js          # Express server
│   └── .env                # OPENROUTER_API_KEY
└── README.md
```

---

## 🌐 Deployment

### Frontend → Vercel
```bash
cd frontend && npx vercel --prod
# Set env: VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

### Backend → Render
- Build: `cd backend && npm install`
- Start: `node src/app.js`
- Env: `OPENROUTER_API_KEY`, `NODE_ENV=production`

---

## 📜 License
MIT · Built with ❤️ for the Nerdy Hackathon 2026
