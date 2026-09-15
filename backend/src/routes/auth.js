import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { userQueries, skillQueries } from '../db/index.js';
import { getTopicsForGrade } from '../services/adaptive.js';

const router = Router();

router.post('/profile', (req, res) => {
  try {
    const { name, avatar = 'wizard' } = req.body;
    // FIXED: use explicit undefined check so grade 0 (Kindergarten) is accepted
    const grade = req.body.grade;
    if (!name || grade === undefined || grade === null) {
      return res.status(400).json({ error: 'name and grade are required' });
    }
    const gradeInt = parseInt(grade, 10);
    // FIXED: 0-5 range (0 = Kindergarten)
    if (isNaN(gradeInt) || gradeInt < 0 || gradeInt > 5) {
      return res.status(400).json({ error: 'grade must be 0 (Kindergarten) through 5' });
    }
    if (name.trim().length < 1 || name.trim().length > 30) {
      return res.status(400).json({ error: 'name must be 1–30 characters' });
    }

    const id  = uuid();
    const now = new Date().toISOString();
    userQueries.create.run({ id, name: name.trim(), grade: gradeInt, avatar, last_played_at: now });

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
    res.status(201).json({ user, token: id });
  } catch (err) {
    console.error('Profile creation error:', err);
    res.status(500).json({ error: 'Failed to create profile' });
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
