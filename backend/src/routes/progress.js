import { Router } from 'express';
import db, { userQueries, skillQueries, sessionQueries, answerQueries, badgeQueries } from '../db/index.js';
import { rowsToSkillState, getTopicMastery, getWeakSkills, TOPICS } from '../services/adaptive.js';
import { computeLevel, BADGE_DEFINITIONS } from '../services/badges.js';

const router = Router();

// Sync local progress to backend
router.post('/sync', (req, res) => {
  try {
    const { userId, skillState, sessions } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Ensure the user exists
    const user = userQueries.findById.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.transaction(() => {
      // 1. Sync skill state
      if (skillState) {
        for (const key of Object.keys(skillState)) {
          const [topic, diffStr] = key.split('_');
          const difficulty = parseInt(diffStr, 10);
          const skill = skillState[key];
          skillQueries.upsert.run({
            user_id: userId,
            topic,
            difficulty,
            p_know: skill.p_know,
            attempts: skill.attempts,
            correct: skill.correct,
            streak: skill.streak,
            last_seen: skill.last_seen || null
          });
        }
      }

      // 2. Sync sessions (only insert ones that don't exist)
      if (sessions && sessions.length > 0) {
        for (const session of sessions) {
          const existing = sessionQueries.getById.get(session.id);
          if (!existing) {
            sessionQueries.create.run({
              id: session.id,
              user_id: userId,
              started_at: new Date(session.startedAt).toISOString()
            });
            sessionQueries.end.run({
              id: session.id,
              ended_at: session.endedAt ? new Date(session.endedAt).toISOString() : new Date().toISOString(),
              questions_answered: session.total || 0,
              correct_count: session.correct || 0,
              xp_earned: session.xpEarned || 0,
              topics_covered: JSON.stringify(session.topicsCovered || [])
            });
          }
        }
      }
    })();

    res.json({ success: true });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync progress' });
  }
});

// Full dashboard data for a user
router.get('/dashboard/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = userQueries.findById.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const skillRows = skillQueries.getAll.all(userId);
    const skillState = rowsToSkillState(skillRows);
    const topicMastery = getTopicMastery(skillState, user.grade);
    const weakSkills = getWeakSkills(skillState, user.grade);
    const recentSessions = sessionQueries.getRecent.all(userId);
    const badges = badgeQueries.getAll.all(userId);
    const levelInfo = computeLevel(user.xp);

    // Topic stats from answers
    const topicStats = answerQueries.getStats.all(userId);
    const topicStatsMap = {};
    for (const s of topicStats) {
      topicStatsMap[s.topic] = {
        total: s.total,
        correct: s.correct,
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      };
    }

    // Skill heatmap: all topic × difficulty combinations
    const skillHeatmap = skillRows
      .filter(r => r.attempts > 0)
      .map(r => ({
        topic: r.topic,
        difficulty: r.difficulty,
        mastery: Math.round(r.p_know * 100),
        attempts: r.attempts,
        correct: r.correct,
        streak: r.streak,
      }));

    // Session history chart data
    const sessionChart = recentSessions.slice(0, 7).reverse().map(s => ({
      date: s.started_at?.split('T')[0],
      correct: s.correct_count || 0,
      total: s.questions_answered || 0,
      accuracy: s.questions_answered > 0 ? Math.round((s.correct_count / s.questions_answered) * 100) : 0,
      xp: s.xp_earned || 0,
    }));

    // All badge definitions with earned status
    const earnedIds = new Set(badges.map(b => b.badge_id));
    const allBadges = BADGE_DEFINITIONS.map(b => ({
      ...b,
      earned: earnedIds.has(b.id),
      earnedAt: badges.find(eb => eb.badge_id === b.id)?.earned_at || null,
    }));

    res.json({
      user,
      levelInfo,
      topicMastery,
      weakSkills,
      skillHeatmap,
      rawSkills: skillRows,
      topicStats: topicStatsMap,
      sessionChart,
      badges: allBadges,
      recentSessions: recentSessions.slice(0, 5),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Skill detail for a specific topic
router.get('/skill/:userId/:topic', (req, res) => {
  try {
    const { userId, topic } = req.params;
    const user = userQueries.findById.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const skillRows = skillQueries.getAll.all(userId);
    const topicSkills = skillRows.filter(r => r.topic === topic);
    const recentAnswers = answerQueries.getRecentByTopic.all(userId, topic);

    res.json({ topic, topicInfo: TOPICS[topic], skills: topicSkills, recentAnswers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load skill detail' });
  }
});

export default router;
