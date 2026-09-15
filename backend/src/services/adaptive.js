/**
 * Backend Adaptive Engine — BKT + Mastery Gating
 * FIXED: word_problems key split, mastery progression gating
 * Kept in sync with frontend/src/utils/adaptiveEngine.js
 */

export const TOPICS = {
  counting:       { name: 'Counting',        emoji: '🔢', color: '#FF6B9D', grades: [0, 1, 2] },
  addition:       { name: 'Addition',        emoji: '➕', color: '#00CEC9', grades: [0, 1, 2, 3, 4, 5] },
  subtraction:    { name: 'Subtraction',     emoji: '➖', color: '#74B9FF', grades: [1, 2, 3, 4, 5] },
  multiplication: { name: 'Multiplication',  emoji: '✖️', color: '#A29BFE', grades: [2, 3, 4, 5] },
  division:       { name: 'Division',        emoji: '➗', color: '#FD79A8', grades: [3, 4, 5] },
  fractions:      { name: 'Fractions',       emoji: '½',  color: '#FDCB6E', grades: [3, 4, 5] },
  place_value:    { name: 'Place Value',     emoji: '🏛️', color: '#55EFC4', grades: [1, 2, 3, 4, 5] }, // FIXED: grade 5
  word_problems:  { name: 'Word Problems',   emoji: '📖', color: '#E17055', grades: [2, 3, 4, 5] },
};

const BKT = { p_learn: 0.25, p_guess: 0.20, p_slip: 0.10 };

const GRADE_DIFFICULTY_MAP = {
  0: { counting: 2, addition: 1 },
  1: { counting: 3, addition: 2, subtraction: 1, place_value: 1 },
  2: { counting: 4, addition: 3, subtraction: 2, place_value: 2, multiplication: 1, word_problems: 1 },
  3: { addition: 4, subtraction: 3, multiplication: 2, division: 1, fractions: 1, place_value: 3, word_problems: 2 },
  4: { addition: 5, subtraction: 4, multiplication: 3, division: 2, fractions: 2, place_value: 4, word_problems: 3 },
  5: { multiplication: 4, division: 3, fractions: 3, word_problems: 4, place_value: 5, addition: 5, subtraction: 5 },
};

const MASTERY_GATE = 0.60;

// FIXED: use lastIndexOf so word_problems_3 parses correctly
function parseSkillKey(key) {
  const lastIdx = key.lastIndexOf('_');
  return { topic: key.slice(0, lastIdx), difficulty: parseInt(key.slice(lastIdx + 1), 10) };
}

export function getTopicsForGrade(grade) {
  return Object.entries(TOPICS)
    .filter(([, info]) => info.grades.includes(grade))
    .map(([key]) => key);
}

export function getMaxDifficulty(topic, grade) {
  return GRADE_DIFFICULTY_MAP[grade]?.[topic] || 0;
}

function isDifficultyUnlocked(state, topic, difficulty) {
  if (difficulty <= 1) return true;
  const prevKey = `${topic}_${difficulty - 1}`;
  const prev = state[prevKey];
  if (!prev || prev.attempts === 0) return false;
  return prev.p_know >= MASTERY_GATE;
}

export function updateKnowledge(currentState, topicKey, difficulty, isCorrect) {
  const key = `${topicKey}_${difficulty}`;
  const skill = currentState[key] || { p_know: 0.1, attempts: 0, correct: 0, streak: 0 };
  const { p_learn, p_guess, p_slip } = BKT;
  const p = skill.p_know;

  let posterior;
  if (isCorrect) {
    const p_correct = p * (1 - p_slip) + (1 - p) * p_guess;
    posterior = p_correct > 0 ? (p * (1 - p_slip)) / p_correct : p;
  } else {
    const p_wrong = p * p_slip + (1 - p) * (1 - p_guess);
    posterior = p_wrong > 0 ? (p * p_slip) / p_wrong : p;
  }
  const p_know_next = Math.min(0.99, Math.max(0.01, posterior + p_learn * (1 - posterior)));

  return {
    ...currentState,
    [key]: {
      p_know: p_know_next,
      attempts: skill.attempts + 1,
      correct: skill.correct + (isCorrect ? 1 : 0),
      streak: isCorrect ? (skill.streak || 0) + 1 : 0,
      last_seen: new Date().toISOString(),
    },
  };
}

export function selectNextQuestion(skillState, grade, sessionHistory = []) {
  const topics = getTopicsForGrade(grade);
  const recentKeys = new Set(sessionHistory.slice(-4).map(h => `${h.topic}_${h.difficulty}`));
  const candidates = [];

  for (const topic of topics) {
    const maxDiff = getMaxDifficulty(topic, grade);
    for (let d = 1; d <= maxDiff; d++) {
      if (!isDifficultyUnlocked(skillState, topic, d)) continue;
      const key = `${topic}_${d}`;
      if (recentKeys.has(key)) continue;

      const skill = skillState[key] || { p_know: 0.1, attempts: 0, last_seen: null };
      const p = skill.p_know;
      let score = 0;

      if (p < 0.30)       score = d <= 2 ? 80 + (0.30 - p) * 100 : 25;
      else if (p < 0.60)  score = 100 - Math.abs(0.45 - p) * 80;
      else if (p < 0.80)  score = 60;
      else if (p < 0.90)  score = 40;
      else                score = 20;

      if (skill.attempts === 0) score += 35;
      if (!sessionHistory.find(h => h.topic === topic)) score += 15;

      candidates.push({ topic, difficulty: d, score, mastery: p });
    }
  }

  if (!candidates.length) return { topic: topics[0], difficulty: 1, reason: "Let's start!" };

  const total = candidates.reduce((s, c) => s + c.score, 0);
  let rand = Math.random() * total;
  let selected = candidates[candidates.length - 1];
  for (const c of candidates) { rand -= c.score; if (rand <= 0) { selected = c; break; } }

  const p = Math.round((selected.mastery || 0) * 100);
  const info = TOPICS[selected.topic];
  const reason = selected.mastery < 0.30
    ? `💪 Practising ${info.name} Level ${selected.difficulty} (${p}% — needs work!)`
    : selected.mastery < 0.60
    ? `📈 Building ${info.name} Level ${selected.difficulty} (${p}%)`
    : `🌟 Consolidating ${info.name} Level ${selected.difficulty} (${p}%)`;

  return { ...selected, reason };
}

// FIXED: use parseSkillKey for word_problems
export function getWeakSkills(skillState, grade) {
  return Object.entries(skillState)
    .filter(([key, s]) => {
      const { topic } = parseSkillKey(key);
      return s.attempts > 0 && s.p_know < 0.55 && getTopicsForGrade(grade).includes(topic);
    })
    .sort((a, b) => a[1].p_know - b[1].p_know)
    .slice(0, 3)
    .map(([key, s]) => {
      const { topic, difficulty } = parseSkillKey(key);
      return { topic, difficulty, mastery: s.p_know, attempts: s.attempts, ...TOPICS[topic] };
    });
}

// FIXED: use parseSkillKey for word_problems
export function getTopicMastery(skillState, grade) {
  const result = {};
  for (const topic of getTopicsForGrade(grade)) {
    const skills = Object.entries(skillState)
      .filter(([k, s]) => {
        const { topic: t } = parseSkillKey(k);
        return t === topic && s.attempts > 0;
      })
      .map(([, s]) => s);
    result[topic] = skills.length > 0
      ? skills.reduce((sum, s) => sum + s.p_know, 0) / skills.length
      : null;
  }
  return result;
}

export function rowsToSkillState(rows) {
  const state = {};
  for (const row of rows) {
    state[`${row.topic}_${row.difficulty}`] = {
      p_know: row.p_know, attempts: row.attempts, correct: row.correct,
      streak: row.streak, last_seen: row.last_seen,
    };
  }
  return state;
}
