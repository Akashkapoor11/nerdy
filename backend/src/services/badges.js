/**
 * Badge System — 15+ achievements across categories.
 * Each badge has: id, name, emoji, description, category, rarity, check function.
 */

export const BADGE_DEFINITIONS = [
  // ── Milestone badges ──
  {
    id: 'first_answer',
    name: 'First Step',
    emoji: '👣',
    description: 'Answer your very first question',
    category: 'milestone',
    rarity: 'common',
    check: ({ totalAnswers }) => totalAnswers >= 1,
  },
  {
    id: 'ten_answers',
    name: 'Getting Started',
    emoji: '🌱',
    description: 'Answer 10 questions total',
    category: 'milestone',
    rarity: 'common',
    check: ({ totalAnswers }) => totalAnswers >= 10,
  },
  {
    id: 'fifty_answers',
    name: 'Math Explorer',
    emoji: '🗺️',
    description: 'Answer 50 questions total',
    category: 'milestone',
    rarity: 'uncommon',
    check: ({ totalAnswers }) => totalAnswers >= 50,
  },
  {
    id: 'hundred_answers',
    name: 'Century Club',
    emoji: '💯',
    description: 'Answer 100 questions total',
    category: 'milestone',
    rarity: 'rare',
    check: ({ totalAnswers }) => totalAnswers >= 100,
  },

  // ── Streak badges ──
  {
    id: 'streak_3',
    name: 'On Fire!',
    emoji: '🔥',
    description: 'Answer 3 questions correctly in a row',
    category: 'streak',
    rarity: 'common',
    check: ({ currentStreak }) => currentStreak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Unstoppable',
    emoji: '⚡',
    description: 'Answer 7 questions correctly in a row',
    category: 'streak',
    rarity: 'uncommon',
    check: ({ currentStreak }) => currentStreak >= 7,
  },
  {
    id: 'streak_15',
    name: 'Legendary Run',
    emoji: '🌊',
    description: 'Answer 15 questions correctly in a row',
    category: 'streak',
    rarity: 'rare',
    check: ({ currentStreak }) => currentStreak >= 15,
  },
  {
    id: 'daily_7',
    name: 'Week Warrior',
    emoji: '📅',
    description: 'Play 7 days in a row',
    category: 'streak',
    rarity: 'rare',
    check: ({ streakDays }) => streakDays >= 7,
  },

  // ── Accuracy badges ──
  {
    id: 'perfect_session',
    name: 'Perfection!',
    emoji: '🏆',
    description: 'Get 100% correct in a session (min 5 questions)',
    category: 'accuracy',
    rarity: 'rare',
    check: ({ sessionCorrect, sessionTotal }) => sessionTotal >= 5 && sessionCorrect === sessionTotal,
  },
  {
    id: 'ninety_session',
    name: 'Sharp Mind',
    emoji: '🎯',
    description: 'Score 90% or above in a session (min 5 questions)',
    category: 'accuracy',
    rarity: 'uncommon',
    check: ({ sessionCorrect, sessionTotal }) => sessionTotal >= 5 && sessionCorrect / sessionTotal >= 0.9,
  },

  // ── Topic mastery badges ──
  {
    id: 'addition_master',
    name: 'Addition Ace',
    emoji: '➕',
    description: 'Master addition skills (80% mastery)',
    category: 'mastery',
    rarity: 'uncommon',
    check: ({ topicMastery }) => (topicMastery?.addition || 0) >= 0.8,
  },
  {
    id: 'multiplication_master',
    name: 'Times Table Hero',
    emoji: '✖️',
    description: 'Master multiplication skills (80% mastery)',
    category: 'mastery',
    rarity: 'rare',
    check: ({ topicMastery }) => (topicMastery?.multiplication || 0) >= 0.8,
  },
  {
    id: 'all_topics',
    name: 'Math Wizard',
    emoji: '🧙',
    // Grade-adaptive: uses actual number of curriculum topics for the student's grade
    // (Kindergarten has 2, Grade 1 has 4, Grade 5 has 7 — no grade ever has exactly 8)
    description: 'Try all topics in your grade curriculum',
    category: 'mastery',
    rarity: 'uncommon',
    check: ({ topicsAttempted, grade }) => {
      // Topic counts per grade (matches TOPICS definition)
      const countByGrade = { 0: 2, 1: 4, 2: 6, 3: 7, 4: 7, 5: 7 };
      const needed = countByGrade[grade] ?? 7;
      return (topicsAttempted?.length ?? 0) >= needed;
    },
  },
  {
    id: 'full_mastery',
    name: 'Grand Master',
    emoji: '👑',
    // Requires 3 topics at 80%+ (matches frontend min(3, eligibleTopicCount) logic)
    description: 'Achieve 80%+ mastery in 3 or more topics',
    category: 'mastery',
    rarity: 'legendary',
    check: ({ topicMastery, grade }) => {
      if (!topicMastery) return false;
      const countByGrade = { 0: 2, 1: 4, 2: 6, 3: 7, 4: 7, 5: 7 };
      const eligible = countByGrade[grade] ?? 7;
      const required = Math.min(3, eligible);
      return Object.values(topicMastery).filter(m => m !== null && m >= 0.8).length >= required;
    },
  },

  // ── XP / Level badges ──
  {
    id: 'level_5',
    name: 'Rising Star',
    emoji: '⭐',
    description: 'Reach Level 5',
    category: 'level',
    rarity: 'common',
    check: ({ level }) => level >= 5,
  },
  {
    id: 'level_10',
    name: 'Math Champion',
    emoji: '🥇',
    description: 'Reach Level 10',
    category: 'level',
    rarity: 'uncommon',
    check: ({ level }) => level >= 10,
  },
  {
    id: 'level_25',
    name: 'Math Legend',
    emoji: '🌟',
    description: 'Reach Level 25',
    category: 'level',
    rarity: 'legendary',
    check: ({ level }) => level >= 25,
  },
];

const BADGE_MAP = new Map(BADGE_DEFINITIONS.map(b => [b.id, b]));

/**
 * Check which new badges a user has earned based on their current stats.
 * Returns only newly earned badges (not already earned ones).
 */
export function checkNewBadges(stats, alreadyEarned = []) {
  const earnedIds = new Set(alreadyEarned.map(b => b.badge_id));
  const newBadges = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (earnedIds.has(badge.id)) continue;
    try {
      if (badge.check(stats)) {
        newBadges.push(badge);
      }
    } catch (e) {
      // Silently skip if check throws (missing data)
    }
  }

  return newBadges;
}

/**
 * Compute XP to next level and level from total XP.
 * Levelling curve: each level requires 10% more XP than the previous.
 */
export function computeLevel(totalXP) {
  const BASE_XP = 100;
  let level = 1;
  let xpForNext = BASE_XP;
  let xpUsed = 0;

  while (xpUsed + xpForNext <= totalXP) {
    xpUsed += xpForNext;
    level++;
    xpForNext = Math.floor(BASE_XP * Math.pow(1.1, level - 1));
  }

  return {
    level,
    xpForNext,
    xpIntoLevel: totalXP - xpUsed,
    progressPct: Math.min(99, Math.floor(((totalXP - xpUsed) / xpForNext) * 100)),
  };
}

/**
 * Calculate XP earned for a question.
 */
export function calculateQuestionXP(isCorrect, difficulty, streak, timeTakenMs) {
  if (!isCorrect) return 0;

  let xp = 10 + difficulty * 5; // Base: 15–35 XP

  // Streak bonus
  if (streak >= 3) xp = Math.floor(xp * 1.2);
  if (streak >= 7) xp = Math.floor(xp * 1.5);
  if (streak >= 15) xp = Math.floor(xp * 2.0);

  // Speed bonus (under 10 seconds)
  if (timeTakenMs < 10000) xp += 5;

  return xp;
}

export function getBadgeById(id) {
  return BADGE_MAP.get(id);
}

export { BADGE_MAP };
