import pg from 'pg';
import 'dotenv/config';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connected to DB!');
    await client.query('BEGIN');
    
    const id = uuid();
    const password_hash = await bcrypt.hash('123456', 10);
    
    console.log('Inserting user...');
    await client.query(
      `INSERT INTO users (id, username, password_hash, name, grade, avatar, xp, level, streak_days, last_played_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 1, 0, $7)`,
      [id, 'test_user_' + Date.now(), password_hash, 'Test', 3, 'wizard', new Date().toISOString()]
    );
    
    console.log('Inserting skill...');
    await client.query(`
      INSERT INTO skill_states (user_id, topic, difficulty, p_know, attempts, correct, streak, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT(user_id, topic, difficulty) DO UPDATE SET
        p_know = $4, attempts = $5, correct = $6, streak = $7, last_seen = $8
    `, [id, 'Addition', 1, 0.1, 0, 0, 0, null]);

    await client.query('COMMIT');
    console.log('Success!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
