import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { userQueries, skillQueries, getClient } from '../db/index.js';
import { getTopicsForGrade } from '../services/adaptive.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, grade, avatar = 'wizard' } = req.body;
    
    if (!username || !password || !name || grade === undefined || grade === null) {
      return res.status(400).json({ error: 'username, password, name, and grade are required' });
    }
    
    const gradeInt = parseInt(grade, 10);
    if (isNaN(gradeInt) || gradeInt < 0 || gradeInt > 5) {
      return res.status(400).json({ error: 'grade must be 0 (Kindergarten) through 5' });
    }
    if (name.trim().length < 1 || name.trim().length > 30) {
      return res.status(400).json({ error: 'name must be 1–30 characters' });
    }

    // Check if username exists
    const existing = await userQueries.findByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuid();
    const now = new Date().toISOString();

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await userQueries.create({ 
        id, 
        username: username.trim().toLowerCase(), 
        password_hash, 
        name: name.trim(), 
        grade: gradeInt, 
        avatar, 
        last_played_at: now 
      }, client);

      // Initialise all skill nodes for this grade
      const topics = getTopicsForGrade(gradeInt);
      for (const topic of topics) {
        for (let d = 1; d <= 5; d++) {
          await skillQueries.upsert({ user_id: id, topic, difficulty: d, p_know: 0.1, attempts: 0, correct: 0, streak: 0, last_seen: null }, client);
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const user = await userQueries.findById(id);
    delete user.password_hash;
    res.status(201).json({ user, token: id });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create profile: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = await userQueries.findByUsername(username.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    delete user.password_hash;
    res.json({ user, token: user.id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/profile/:id', async (req, res) => {
  const user = await userQueries.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Profile not found' });
  res.json({ user });
});

router.get('/profiles', async (req, res) => {
  const users = await userQueries.list();
  res.json({ users });
});

export default router;
