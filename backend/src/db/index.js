/**
 * Database layer — uses Node 24's built-in node:sqlite.
 * No native compilation required. Works out of the box on Node 22+.
 *
 * node:sqlite API differences from better-sqlite3:
 *  - import { DatabaseSync } from 'node:sqlite'
 *  - Named params in SQL must use $name (not @name)
 *  - Named params in .run()/.get()/.all() use { $name: value }
 *  - db.pragma() → db.exec("PRAGMA ...")
 *  - Everything else (prepare, run, get, all, exec, transaction) is identical
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_URL || './data/mathquest.db';

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better concurrent performance
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Run schema (CREATE TABLE IF NOT EXISTS — safe to re-run)
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

console.log(`✅ Database ready at ${DB_PATH} (node:sqlite built-in)`);

// ─── Helper: wrap node:sqlite statement to match better-sqlite3 API ──────────
// better-sqlite3 uses @param in SQL + { param: val } in run/get/all
// node:sqlite uses $param in SQL + { $param: val } in run/get/all
// We patch run/get/all to auto-prefix object keys with $
function wrapStmt(stmt) {
  function prefixKeys(params) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) return params;
    const out = {};
    for (const [k, v] of Object.entries(params)) {
      out[k.startsWith('$') ? k : `$${k}`] = v;
    }
    return out;
  }
  return {
    run:  (p) => stmt.run(prefixKeys(p)),
    get:  (...args) => {
      if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
        return stmt.get(prefixKeys(args[0]));
      }
      return stmt.get(...args);
    },
    all:  (...args) => {
      if (args.length === 0) return stmt.all();
      if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
        return stmt.all(prefixKeys(args[0]));
      }
      return stmt.all(...args);
    },
  };
}

// node:sqlite doesn't have .prepare() on db directly for named-param SQL.
// We replace @name with $name in SQL so node:sqlite can parse it.
function prepare(sql) {
  const normalized = sql.replace(/@(\w+)/g, '$$$1');
  return wrapStmt(db.prepare(normalized));
}

// Wrap db.transaction to match better-sqlite3 signature
function transaction(fn) {
  return () => {
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };
}

export default { prepare, transaction, exec: (s) => db.exec(s) };

// ─── User Queries ────────────────────────────────────────────
export const userQueries = {
  create: prepare(`
    INSERT INTO users (id, username, password_hash, name, grade, avatar, xp, level, streak_days, last_played_at)
    VALUES (@id, @username, @password_hash, @name, @grade, @avatar, 0, 1, 0, @last_played_at)
  `),

  findById: prepare(`SELECT * FROM users WHERE id = ?`),
  
  findByUsername: prepare(`SELECT * FROM users WHERE username = ?`),

  updateXP: prepare(`
    UPDATE users SET xp = @xp, level = @level, last_played_at = @last_played_at WHERE id = @id
  `),

  updateStreak: prepare(`
    UPDATE users SET streak_days = @streak_days, last_played_at = @last_played_at WHERE id = @id
  `),

  list: prepare(`SELECT * FROM users ORDER BY xp DESC`),
};

// ─── Skill State Queries ──────────────────────────────────────
export const skillQueries = {
  getAll: prepare(`
    SELECT * FROM skill_states WHERE user_id = ?
  `),

  get: prepare(`
    SELECT * FROM skill_states WHERE user_id = ? AND topic = ? AND difficulty = ?
  `),

  upsert: prepare(`
    INSERT INTO skill_states (user_id, topic, difficulty, p_know, attempts, correct, streak, last_seen)
    VALUES (@user_id, @topic, @difficulty, @p_know, @attempts, @correct, @streak, @last_seen)
    ON CONFLICT(user_id, topic, difficulty) DO UPDATE SET
      p_know = @p_know, attempts = @attempts, correct = @correct,
      streak = @streak, last_seen = @last_seen
  `),
};

// ─── Session Queries ──────────────────────────────────────────
export const sessionQueries = {
  create: prepare(`
    INSERT INTO sessions (id, user_id, started_at) VALUES (@id, @user_id, @started_at)
  `),

  end: prepare(`
    UPDATE sessions SET ended_at = @ended_at, questions_answered = @questions_answered,
    correct_count = @correct_count, xp_earned = @xp_earned, topics_covered = @topics_covered
    WHERE id = @id
  `),

  getRecent: prepare(`
    SELECT * FROM sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 10
  `),

  getById: prepare(`SELECT * FROM sessions WHERE id = ?`),
};

// ─── Answer Queries ───────────────────────────────────────────
export const answerQueries = {
  insert: prepare(`
    INSERT INTO answers (session_id, user_id, topic, difficulty, question_text, correct_answer,
    student_answer, is_correct, time_taken_ms, hint_used)
    VALUES (@session_id, @user_id, @topic, @difficulty, @question_text, @correct_answer,
    @student_answer, @is_correct, @time_taken_ms, @hint_used)
  `),

  getBySession: prepare(`SELECT * FROM answers WHERE session_id = ? ORDER BY answered_at`),

  getRecentByTopic: prepare(`
    SELECT * FROM answers WHERE user_id = ? AND topic = ?
    ORDER BY answered_at DESC LIMIT 20
  `),

  getStats: prepare(`
    SELECT topic, COUNT(*) as total, SUM(is_correct) as correct
    FROM answers WHERE user_id = ?
    GROUP BY topic
  `),
};

// ─── Badge Queries ────────────────────────────────────────────
export const badgeQueries = {
  getAll: prepare(`SELECT * FROM badges WHERE user_id = ? ORDER BY earned_at`),

  insert: prepare(`
    INSERT OR IGNORE INTO badges (user_id, badge_id, badge_name) VALUES (@user_id, @badge_id, @badge_name)
  `),

  has: prepare(`SELECT id FROM badges WHERE user_id = ? AND badge_id = ?`),
};
