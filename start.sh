#!/bin/bash
# MathQuest — one-command local start
set -e

echo "🌟 Starting MathQuest..."
echo ""

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js v18+ required (found v$NODE_VER)"
  exit 1
fi

# Backend (optional — app works without it)
if [ -f "backend/.env" ] || [ -f "backend/.env.example" ]; then
  if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "📝 Created backend/.env — add one of:"
    echo "   OPENAI_API_KEY=sk-...          (OpenAI)"
    echo "   GROQ_API_KEY=gsk_...           (Groq — free)"
    echo "   OPENROUTER_API_KEY=sk-or-v1-.. (OpenRouter — free tier)"
  fi
  echo "🔧 Starting backend..."
  cd backend && npm install --silent && npm run dev &
  BACKEND_PID=$!
  cd ..
  sleep 2
fi

# Frontend
echo "🎨 Starting frontend..."
cd frontend
npm install --silent
echo ""
echo "✅ MathQuest is starting!"
echo "🌐 Open: http://localhost:5173"
echo "📚 Press Ctrl+C to stop"
echo ""
npm run dev
