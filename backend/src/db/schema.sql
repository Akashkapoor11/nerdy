-- MathQuest Database Schema v3
-- FIXED: grade BETWEEN 0 AND 5 (0 = Kindergarten)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK(grade BETWEEN 0 AND 5),
  avatar TEXT DEFAULT 'wizard',
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  fast_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  topics_ever_attempted TEXT DEFAULT '[]',
  last_played_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 5),
  p_know REAL DEFAULT 0.1,
  attempts INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_seen TEXT,
  UNIQUE(user_id, topic, difficulty)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  questions_answered INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  topics_covered TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  student_answer TEXT,
  is_correct INTEGER NOT NULL,
  time_taken_ms INTEGER,
  hint_used INTEGER DEFAULT 0,
  misconception TEXT,
  answered_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_states_user ON skill_states(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);
