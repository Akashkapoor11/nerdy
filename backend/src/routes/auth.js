import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { userQueries, skillQueries } from '../db/index.js';
import { getTopicsForGrade } from '../services/adaptive.js';

const router = Router();

import bcrypt from 'bcryptjs';

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
    const existing = userQueries.findByUsername.get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuid();
    const now = new Date().toISOString();

    userQueries.create.run({ 
      id, 
      username: username.trim().toLowerCase(), 
      password_hash, 
      name: name.trim(), 
      grade: gradeInt, 
      avatar, 
      last_played_at: now 
    });

    // Initialise all skill nodes for this grade
    const topics = getTopicsForGrade(gradeInt);
    const initSkills = db.transaction(() => {
      for (const topic of topics) {
        for (let d = 1; d <= 5; d++) {
          skillQueries.upsert.run({ user_id:id, topic, difficulty:d, p_know:0.1, attempts:0, correct:0, streak:0, last_seen:null });
        }
      }
    });
    initSkills();

    const user = userQueries.findById.get(id);
    delete user.password_hash;
    res.status(201).json({ user, token: id });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = userQueries.findByUsername.get(username.trim().toLowerCase());
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

router.get('/profile/:id', (req, res) => {
  const user = userQueries.findById.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Profile not found' });
  res.json({ user });
});

router.get('/profiles', (req, res) => {
  const users = userQueries.list.all();
  res.json({ users });
});

export default router;
