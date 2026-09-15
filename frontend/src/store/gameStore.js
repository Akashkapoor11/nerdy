import { create } from 'zustand';
import {
  initSkillState, updateKnowledge, selectNextQuestion,
  getWeakSkills, getTopicMastery, getSkillMatrix,
  saveSkillState, loadSkillState, detectMisconception,
  getEligibleTopicCount,
} from '../utils/adaptiveEngine.js';
import { generateQuestion } from '../utils/questionBank.js';
import { calculateXP, computeLevel, checkNewBadges, loadEarnedBadges, saveEarnedBadges, BADGES } from '../utils/badges.js';
import { AI } from '../api/index.js';

const PROFILE_KEY = 'mathquest_profile';
const SESSION_KEY = 'mathquest_sessions';
const REMEDIATION_MASTERY_THRESHOLD = 0.62; // Raised: BKT fast learner needs higher bar

const load = (k, d) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const useGameStore = create((set, get) => ({
  // ── Profile ──────────────────────────────────────────────────────────────
  profile:      load(PROFILE_KEY, null),
  skillState:   loadSkillState() || initSkillState(),
  earnedBadges: loadEarnedBadges(),
  sessions:     load(SESSION_KEY, []),

  createProfile: (name, grade, avatar = 'wizard') => {
    const profile = {
      id: `user_${Date.now()}`, name, grade: parseInt(grade), avatar,
      xp: 0, level: 1, totalAnswers: 0, totalCorrect: 0,
      streakDays: 1, fastAnswers: 0, topicsEverAttempted: [],
      createdAt: new Date().toISOString(), lastPlayedAt: null,
    };
    const skillState = initSkillState();
    save(PROFILE_KEY, profile); saveSkillState(skillState);
    set({ profile, skillState, earnedBadges: [], sessions: [] });
  },

  updateDailyStreak: () => {
    const { profile } = get();
    if (!profile?.lastPlayedAt) return;
    const last  = new Date(profile.lastPlayedAt).toDateString();
    const today = new Date().toDateString();
    const yest  = new Date(Date.now() - 86400000).toDateString();
    let newStreak = profile.streakDays || 0;
    if (last === today) return; // already played today
    if (last === yest) newStreak += 1; // consecutive
    else newStreak = 0; // broke streak
    const updated = { ...profile, streakDays: newStreak };
    save(PROFILE_KEY, updated);
    set({ profile: updated });
  },

  resetProfile: () => {
    ['mathquest_profile','mathquest_skill_state','mathquest_badges','mathquest_sessions'].forEach(k => localStorage.removeItem(k));
    set({ profile: null, skillState: initSkillState(), earnedBadges: [], sessions: [] });
  },

  // ── Session ──────────────────────────────────────────────────────────────
  currentSession:    null,
  sessionHistory:    [],
  currentQuestion:   null,
  questionStartTime: null,
  adaptiveReason:    null,
  adaptiveZone:      null,
  remediationTarget: null,
  sessionStreak:     0,
  pendingBadges:     [],
  sessionStarted:    false,

  startSession: () => {
    if (get().sessionStarted) return;
    get().updateDailyStreak();
    const session = { id:`sess_${Date.now()}`, startedAt:Date.now(), correct:0, total:0, xpEarned:0, hintsUsed:0, durationMs:0, topicsCovered:[] };
    set({ currentSession:session, sessionHistory:[], pendingBadges:[], adaptiveReason:null, remediationTarget:null, sessionStreak:0, sessionStarted:true });
    get().loadNextQuestion();
  },

  stopSession: () => set({ sessionStarted: false }),

  loadNextQuestion: () => {
    const { skillState, profile, sessionHistory, remediationTarget } = get();
    if (!profile) return;
    const sel = selectNextQuestion(skillState, profile.grade, sessionHistory, remediationTarget);
    const q   = generateQuestion(sel.topic, sel.difficulty);
    set({ currentQuestion:q, questionStartTime:Date.now(), adaptiveReason:sel.reason||null, adaptiveZone:sel.zone||null });
  },

  // ── AI via clean API client ───────────────────────────────────────────────
  getHint: async () => {
    const { currentQuestion } = get();
    if (!currentQuestion) return null;
    const qId = currentQuestion.id;
    const hint = await AI.getHint(currentQuestion);
    if (get().currentQuestion?.id !== qId) return null;
    return hint || currentQuestion.hint || 'Try breaking the problem into smaller steps! 🧩';
  },

  getExplanation: async (studentAnswer) => {
    const { currentQuestion } = get();
    if (!currentQuestion) return null;
    const qId = currentQuestion.id;
    const result = await AI.getExplanation(currentQuestion, studentAnswer);
    if (get().currentQuestion?.id !== qId) return null;
    return result;
  },

  // ── Submit Answer ─────────────────────────────────────────────────────────
  submitAnswer: (studentAnswer, hintUsed = false) => {
    const { currentQuestion, currentSession, skillState, profile, sessionHistory, earnedBadges, sessionStreak } = get();
    if (!currentQuestion || !profile) return {};

    const isCorrect = String(studentAnswer).trim().toLowerCase() === String(currentQuestion.answer).trim().toLowerCase();
    const timeTakenMs = Date.now() - (get().questionStartTime || Date.now());
    const newStreak = isCorrect ? sessionStreak + 1 : 0;

    const newSkillState = updateKnowledge(skillState, currentQuestion.topic, currentQuestion.difficulty, isCorrect);
    const updatedSkill  = newSkillState[`${currentQuestion.topic}_${currentQuestion.difficulty}`];
    const misconception = isCorrect ? null : detectMisconception(currentQuestion, studentAnswer);

    // Remediation: set on wrong+misconception, clear when mastery ≥ threshold
    let remediationTarget = get().remediationTarget;
    if (isCorrect) {
      if (remediationTarget && updatedSkill.p_know >= REMEDIATION_MASTERY_THRESHOLD) remediationTarget = null;
    } else if (misconception) {
      remediationTarget = { topic: currentQuestion.topic, difficulty: currentQuestion.difficulty };
    } else {
      remediationTarget = null;
    }

    const xpEarned   = calculateXP(isCorrect, currentQuestion.difficulty, newStreak, timeTakenMs);
    const newXP      = profile.xp + xpEarned;
    const levelInfo  = computeLevel(newXP);
    const didLevelUp = levelInfo.level > profile.level;

    const topicsCovered = currentSession.topicsCovered.includes(currentQuestion.topic)
      ? currentSession.topicsCovered : [...currentSession.topicsCovered, currentQuestion.topic];
    const updatedSession = { ...currentSession, correct:currentSession.correct+(isCorrect?1:0), total:currentSession.total+1, xpEarned:currentSession.xpEarned+xpEarned, hintsUsed:currentSession.hintsUsed+(hintUsed?1:0), topicsCovered, durationMs:Date.now()-currentSession.startedAt };

    const topicsEver = profile.topicsEverAttempted || [];
    const newTopicsEver = topicsEver.includes(currentQuestion.topic) ? topicsEver : [...topicsEver, currentQuestion.topic];
    const fastAnswers = timeTakenMs < 8000 && isCorrect ? (profile.fastAnswers||0)+1 : (profile.fastAnswers||0);
    const updatedProfile = { ...profile, xp:newXP, level:levelInfo.level, totalAnswers:profile.totalAnswers+1, totalCorrect:profile.totalCorrect+(isCorrect?1:0), fastAnswers, topicsEverAttempted:newTopicsEver, lastPlayedAt:new Date().toISOString() };

    const newHistory = [...sessionHistory, { topic:currentQuestion.topic, difficulty:currentQuestion.difficulty, isCorrect }];
    const topicMastery = getTopicMastery(newSkillState, profile.grade);
    const eligibleTopicCount = getEligibleTopicCount(profile.grade);

    const badgeStats = {
      totalAnswers:   updatedProfile.totalAnswers,
      currentStreak:  newStreak,
      streakDays:     profile.streakDays,
      sessionCorrect: updatedSession.correct,
      sessionTotal:   updatedSession.total,
      topicMastery,
      topicsAttempted: newTopicsEver,
      level:          levelInfo.level,
      fastAnswers,
      hintsUsed:      updatedSession.hintsUsed,
      grade:          profile.grade,
      eligibleTopicCount,
    };

    const newBadges = checkNewBadges(badgeStats, earnedBadges);
    const allBadges = [...earnedBadges, ...newBadges.map(b=>({...b, earnedAt:new Date().toISOString()}))];

    save(PROFILE_KEY, updatedProfile);
    saveSkillState(newSkillState);
    saveEarnedBadges(allBadges);

    set({ skillState:newSkillState, profile:updatedProfile, earnedBadges:allBadges, currentSession:updatedSession, sessionHistory:newHistory, pendingBadges:newBadges, sessionStreak:newStreak, remediationTarget });

    return { isCorrect, xpEarned, levelInfo, didLevelUp, newBadges, sessionStreak:newStreak, timeTakenMs, misconception };
  },

  clearPendingBadges: () => set({ pendingBadges:[] }),

  endSession: () => {
    const { currentSession, sessions } = get();
    if (!currentSession) return null;
    const now = Date.now();
    const session = { ...currentSession, endedAt:new Date().toISOString(), durationMs:now-currentSession.startedAt, durationMin:Math.round((now-currentSession.startedAt)/60000), accuracy:currentSession.total>0?Math.round((currentSession.correct/currentSession.total)*100):0 };
    const newSessions = [session, ...sessions].slice(0, 50);
    save(SESSION_KEY, newSessions);
    set({ sessions:newSessions, currentSession:null, sessionHistory:[], sessionStarted:false, remediationTarget:null, sessionStreak:0 });
    return session;
  },

  getWeakSkills:   () => { const { skillState, profile } = get(); return profile ? getWeakSkills(skillState, profile.grade) : []; },
  getTopicMastery: () => { const { skillState, profile } = get(); return profile ? getTopicMastery(skillState, profile.grade) : {}; },
  getSkillMatrix:  () => { const { skillState, profile } = get(); return profile ? getSkillMatrix(skillState, profile.grade) : {}; },
  getLevelInfo:    () => computeLevel(get().profile?.xp || 0),
  getAllBadges:     () => {
    const { earnedBadges, profile } = get();
    const ids = new Set(earnedBadges.map(b => b.id));
    const grade = profile?.grade ?? 0;
    return BADGES.filter(b => b.minGrade === undefined || grade >= b.minGrade)
      .map(b => ({ ...b, earned:ids.has(b.id), earnedAt:earnedBadges.find(e=>e.id===b.id)?.earnedAt||null }));
  },
}));

export default useGameStore;
