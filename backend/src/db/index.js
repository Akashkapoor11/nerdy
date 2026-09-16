import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('✅ Database schema initialized in PostgreSQL');
}

export const getClient = () => pool.connect();

export default {
  pool,
  initDb
};

// ─── User Queries ────────────────────────────────────────────
export const userQueries = {
  create: async (u, client = pool) => client.query(
    `INSERT INTO users (id, username, password_hash, name, grade, avatar, xp, level, streak_days, last_played_at)
     VALUES ($1, $2, $3, $4, $5, $6, 0, 1, 0, $7)`,
    [u.id, u.username, u.password_hash, u.name, u.grade, u.avatar, u.last_played_at]
  ),
  findById: async (id, client = pool) => (await client.query(`SELECT * FROM users WHERE id = $1`, [id])).rows[0],
  findByUsername: async (username, client = pool) => (await client.query(`SELECT * FROM users WHERE username = $1`, [username])).rows[0],
  updateXP: async (u, client = pool) => client.query(
    `UPDATE users SET xp = $1, level = $2, last_played_at = $3 WHERE id = $4`,
    [u.xp, u.level, u.last_played_at, u.id]
  ),
  updateStreak: async (u, client = pool) => client.query(
    `UPDATE users SET streak_days = $1, last_played_at = $2 WHERE id = $3`,
    [u.streak_days, u.last_played_at, u.id]
  ),
  list: async (client = pool) => (await client.query(`SELECT * FROM users ORDER BY xp DESC`)).rows,
};

// ─── Skill State Queries ──────────────────────────────────────
export const skillQueries = {
  getAll: async (userId, client = pool) => (await client.query(`SELECT * FROM skill_states WHERE user_id = $1`, [userId])).rows,
  get: async (userId, topic, difficulty, client = pool) => (await client.query(
    `SELECT * FROM skill_states WHERE user_id = $1 AND topic = $2 AND difficulty = $3`,
    [userId, topic, difficulty]
  )).rows[0],
  upsert: async (s, client = pool) => client.query(`
    INSERT INTO skill_states (user_id, topic, difficulty, p_know, attempts, correct, streak, last_seen)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT(user_id, topic, difficulty) DO UPDATE SET
      p_know = EXCLUDED.p_know, attempts = EXCLUDED.attempts, correct = EXCLUDED.correct, streak = EXCLUDED.streak, last_seen = EXCLUDED.last_seen
  `, [s.user_id, s.topic, s.difficulty, s.p_know, s.attempts, s.correct, s.streak, s.last_seen]),
};

// ─── Session Queries ──────────────────────────────────────────
export const sessionQueries = {
  create: async (s, client = pool) => client.query(
    `INSERT INTO sessions (id, user_id, started_at) VALUES ($1, $2, $3)`,
    [s.id, s.user_id, s.started_at]
  ),
  end: async (s, client = pool) => client.query(`
    UPDATE sessions SET ended_at = $1, questions_answered = $2,
    correct_count = $3, xp_earned = $4, topics_covered = $5
    WHERE id = $6
  `, [s.ended_at, s.questions_answered, s.correct_count, s.xp_earned, s.topics_covered, s.id]),
  getRecent: async (userId, client = pool) => (await client.query(
    `SELECT * FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 10`,
    [userId]
  )).rows,
  getById: async (id, client = pool) => (await client.query(`SELECT * FROM sessions WHERE id = $1`, [id])).rows[0],
};

// ─── Answer Queries ───────────────────────────────────────────
export const answerQueries = {
  insert: async (a, client = pool) => client.query(`
    INSERT INTO answers (session_id, user_id, topic, difficulty, question_text, correct_answer,
    student_answer, is_correct, time_taken_ms, hint_used)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [a.session_id, a.user_id, a.topic, a.difficulty, a.question_text, a.correct_answer, a.student_answer, a.is_correct, a.time_taken_ms, a.hint_used]),
  getBySession: async (sessionId, client = pool) => (await client.query(`SELECT * FROM answers WHERE session_id = $1 ORDER BY answered_at`, [sessionId])).rows,
  getRecentByTopic: async (userId, topic, client = pool) => (await client.query(`
    SELECT * FROM answers WHERE user_id = $1 AND topic = $2 ORDER BY answered_at DESC LIMIT 20
  `, [userId, topic])).rows,
  getStats: async (userId, client = pool) => (await client.query(`
    SELECT topic, COUNT(*) as total, SUM(is_correct) as correct
    FROM answers WHERE user_id = $1 GROUP BY topic
  `, [userId])).rows,
};

// ─── Badge Queries ────────────────────────────────────────────
export const badgeQueries = {
  getAll: async (userId, client = pool) => (await client.query(`SELECT * FROM badges WHERE user_id = $1 ORDER BY earned_at`, [userId])).rows,
  insert: async (b, client = pool) => client.query(`
    INSERT INTO badges (user_id, badge_id, badge_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
  `, [b.user_id, b.badge_id, b.badge_name]),
  has: async (userId, badgeId, client = pool) => (await client.query(`SELECT id FROM badges WHERE user_id = $1 AND badge_id = $2`, [userId, badgeId])).rows.length > 0,
};
