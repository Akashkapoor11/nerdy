import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { userQueries, skillQueries, sessionQueries, answerQueries, badgeQueries } from '../db/index.js';
import { selectNextQuestion, updateKnowledge, rowsToSkillState, getWeakSkills, getTopicMastery } from '../services/adaptive.js';
import { generateQuestion } from '../services/questions.js';
import { checkNewBadges, calculateQuestionXP, computeLevel, BADGE_DEFINITIONS } from '../services/badges.js';

const router = Router();

// Start a new session
router.post('/session/start', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = userQueries.findById.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sessionId = uuid();
    sessionQueries.create.run({ id: sessionId, user_id: userId, started_at: new Date().toISOString() });

    res.json({ sessionId, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Get next adaptive question
router.post('/question/next', (req, res) => {
  try {
    const { userId, sessionId, sessionHistory = [] } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = userQueries.findById.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Load current skill state
    const skillRows = skillQueries.getAll.all(userId);
    const skillState = rowsToSkillState(skillRows);

    // Select next question adaptively
    const selection = selectNextQuestion(skillState, user.grade, sessionHistory);
    const question = generateQuestion(selection.topic, selection.difficulty);

    res.json({
      question,
      reason: selection.reason,
      topicName: selection.topic,
    });
  } catch (err) {
    console.error('Next question error:', err);
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

// Submit answer
router.post('/answer', (req, res) => {
  try {
    const {
      userId, sessionId, question, studentAnswer,
      timeTakenMs = 0, hintUsed = false,
      sessionStreak: clientSessionStreak = 0,
      sessionCorrect = 0, sessionTotal = 0,
    } = req.body;
    if (!userId || !question) return res.status(400).json({ error: 'userId and question required' });

    const user = userQueries.findById.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isCorrect = String(studentAnswer).trim().toLowerCase() === String(question.answer).trim().toLowerCase();

    // Load and update skill state
    const skillRows = skillQueries.getAll.all(userId);
    let skillState = rowsToSkillState(skillRows);
    skillState = updateKnowledge(skillState, question.topic, question.difficulty, isCorrect);

    // Persist updated skill
    const updatedSkill = skillState[`${question.topic}_${question.difficulty}`];

    // Current streak: prefer session-wide streak from client (consistent with XP calc);
    // fall back to per-skill streak for standalone API use
    const currentStreak = clientSessionStreak > 0 ? clientSessionStreak : updatedSkill.streak;

    // Calculate XP
    const xpEarned = calculateQuestionXP(isCorrect, question.difficulty, currentStreak, timeTakenMs);

    // Update user XP
    const newXP = user.xp + xpEarned;
    const levelInfo = computeLevel(newXP);
    const didLevelUp = levelInfo.level > user.level;

    const transaction = db.transaction(() => {
      // Save answer
      if (sessionId) {
        answerQueries.insert.run({
          session_id: sessionId,
          user_id: userId,
          topic: question.topic,
          difficulty: question.difficulty,
          question_text: question.text,
          correct_answer: question.answer,
          student_answer: String(studentAnswer),
          is_correct: isCorrect ? 1 : 0,
          time_taken_ms: timeTakenMs,
          hint_used: hintUsed ? 1 : 0,
        });
      }

      // Update skill state
      skillQueries.upsert.run({
        user_id: userId,
        topic: question.topic,
        difficulty: question.difficulty,
        p_know: updatedSkill.p_know,
        attempts: updatedSkill.attempts,
        correct: updatedSkill.correct,
        streak: updatedSkill.streak,
        last_seen: updatedSkill.last_seen,
      });

      // Update user XP and level
      userQueries.updateXP.run({
        id: userId,
        xp: newXP,
        level: levelInfo.level,
        last_played_at: new Date().toISOString(),
      });
    });
    transaction();

    // Check for new badges
    const allSkillRows = skillQueries.getAll.all(userId);
    const fullSkillState = rowsToSkillState(allSkillRows);
    const topicMastery = getTopicMastery(fullSkillState, user.grade);
    const topicsAttempted = allSkillRows.filter(r => r.attempts > 0).map(r => r.topic);
    const totalAnswers = allSkillRows.reduce((s, r) => s + r.attempts, 0);
    const alreadyEarned = badgeQueries.getAll.all(userId);
    const updatedUser = userQueries.findById.get(userId);

    const newBadges = checkNewBadges({
      totalAnswers,
      currentStreak,
      streakDays: updatedUser.streak_days,
      // Wire sessionCorrect/sessionTotal from client for accuracy badges
      sessionCorrect: isCorrect ? sessionCorrect + 1 : sessionCorrect,
      sessionTotal: sessionTotal + 1,
      topicMastery,
      topicsAttempted: [...new Set(topicsAttempted)],
      level: levelInfo.level,
      grade: user.grade, // Required for grade-adaptive badge thresholds
    }, alreadyEarned);

    // Award new badges
    if (newBadges.length > 0) {
      for (const badge of newBadges) {
        badgeQueries.insert.run({ user_id: userId, badge_id: badge.id, badge_name: badge.name });
      }
    }

    const weakSkills = getWeakSkills(fullSkillState, user.grade);

    res.json({
      isCorrect,
      correctAnswer: question.answer,
      xpEarned,
      newXP,
      levelInfo,
      didLevelUp,
      newBadges,
      updatedSkill: {
        topic: question.topic,
        difficulty: question.difficulty,
        mastery: updatedSkill.p_know,
        streak: updatedSkill.streak,
      },
      weakSkills,
    });
  } catch (err) {
    console.error('Answer error:', err);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// End session
router.post('/session/end', (req, res) => {
  try {
    const { sessionId, correctCount, totalCount, xpEarned, topicsCovered = [] } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    sessionQueries.end.run({
      id: sessionId,
      ended_at: new Date().toISOString(),
      questions_answered: totalCount || 0,
      correct_count: correctCount || 0,
      xp_earned: xpEarned || 0,
      topics_covered: JSON.stringify(topicsCovered),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end session' });
  }
});

export default router;
