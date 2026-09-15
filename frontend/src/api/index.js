/**
 * MathQuest API Client
 *
 * Architecture decision (documented):
 * ┌─────────────────────────────────────────────────────┐
 * │  Layer 1 — Math Engine (frontend, always available) │
 * │  BKT adaptive engine + question generation          │
 * │  Works offline. Source of truth for the demo.       │
 * ├─────────────────────────────────────────────────────┤
 * │  Layer 2 — AI Coach (backend, graceful fallback)    │
 * │  OpenAI for hints, explanations, session insights   │
 * │  Built-in hints used when backend unavailable.      │
 * ├─────────────────────────────────────────────────────┤
 * │  Layer 3 — Persistence (backend, optional)          │
 * │  SQLite/PostgreSQL for cross-device progress sync   │
 * │  localStorage used when backend unavailable.        │
 * └─────────────────────────────────────────────────────┘
 *
 * This layered design means the demo ALWAYS works, even
 * without internet — unlike apps that depend on APIs for
 * every feature.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const TIMEOUT_MS = 5000;

async function post(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function get(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── AI Coach endpoints ────────────────────────────────────────────────────────
export const AI = {
  /** Get a contextual hint for a question. Returns null if backend unavailable. */
  getHint: (question) =>
    post('/ai/hint', { question }).then(d => d?.hint || null),

  /** Get an explanation of why an answer is wrong. */
  getExplanation: (question, studentAnswer) =>
    post('/ai/explain', { question, studentAnswer }).then(d => d?.explanation || null),

  /** Get a personalised session summary from AI. */
  getSessionSummary: (stats) =>
    post('/ai/encourage', { stats }).then(d => d?.message || null),

  /** Get an AI learning insight for the dashboard. */
  getLearningInsight: (weakSkills, topicMastery, grade) =>
    post('/ai/insight', { weakSkills, topicMastery, grade }).then(d => d?.insight || null),

  /** Get an AI-generated story wrapper for a math question. */
  getWordProblem: (question, grade) =>
    post('/ai/word-problem', { question, grade }).then(d => d?.story || null),

  /** Send a message to Max the AI tutor and get a grade-aware response. */
  chat: async (chatHistory, grade, currentTopic, pageContext) => {
    try {
      const res = await fetch(`${BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory, grade, currentTopic, pageContext }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.reply || null;
    } catch {
      return null;
    }
  },
};

// ── Progress / Persistence endpoints ─────────────────────────────────────────
export const Progress = {
  /** Sync local progress to backend (best-effort). */
  sync: (userId, skillState, sessions) =>
    post('/progress/sync', { userId, skillState, sessions }),

  /** Get full dashboard data. */
  getDashboard: (userId) =>
    get(`/progress/dashboard/${userId}`),
};

// ── Auth endpoints ──────────────────────────────────────────────────────────────
export const Auth = {
  login: async (username, password) => {
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return await res.json();
    } catch (e) {
      return { error: 'Network error. Backend might be offline.' };
    }
  },
  register: async (username, password, name, grade, avatar) => {
    try {
      const res = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, grade, avatar })
      });
      return await res.json();
    } catch (e) {
      return { error: 'Network error. Backend might be offline.' };
    }
  },
};

// ── Health check ──────────────────────────────────────────────────────────────
export const Health = {
  check: () => get('/health').then(d => !!d?.status),
};

export default { Auth, AI, Progress, Health };
