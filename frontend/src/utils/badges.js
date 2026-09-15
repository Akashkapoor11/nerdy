/**
 * Badge System v4
 * FIX: grade passed in badgeStats → minGrade filter works correctly
 * FIX: all_topics uses eligibleTopicCount (actual curriculum length)
 * FIX: full_mastery uses min(3, eligibleTopicCount) → achievable for Kindergarten
 * FIX: session streak used consistently (not per-skill streak)
 */

export const BADGES = [
  // ── Milestone ─────────────────────────────────────────────────────────────
  { id:'first_answer',    name:'First Step',      emoji:'👣', desc:'Answer your first question',                    rarity:'common',    category:'milestone', check:s=>s.totalAnswers>=1 },
  { id:'ten_answers',     name:'Getting Started',  emoji:'🌱', desc:'Answer 10 questions',                          rarity:'common',    category:'milestone', check:s=>s.totalAnswers>=10 },
  { id:'fifty_answers',   name:'Math Explorer',   emoji:'🗺️', desc:'Answer 50 questions',                         rarity:'uncommon',  category:'milestone', check:s=>s.totalAnswers>=50 },
  { id:'hundred_answers', name:'Century Club',    emoji:'💯', desc:'Answer 100 questions',                         rarity:'rare',      category:'milestone', check:s=>s.totalAnswers>=100 },

  // ── Streak (session-level — ONE unified definition) ────────────────────────
  { id:'streak_3',  name:'On Fire!',       emoji:'🔥', desc:'3 correct in a row in one session',  rarity:'common',   category:'streak', check:s=>s.currentStreak>=3 },
  { id:'streak_7',  name:'Unstoppable',    emoji:'⚡', desc:'7 correct in a row in one session',  rarity:'uncommon', category:'streak', check:s=>s.currentStreak>=7 },
  { id:'streak_15', name:'Legendary Run',  emoji:'🌊', desc:'15 correct in a row in one session', rarity:'rare',     category:'streak', check:s=>s.currentStreak>=15 },

  // ── Accuracy ──────────────────────────────────────────────────────────────
  { id:'perfect_session', name:'Perfection!',  emoji:'🏆', desc:'100% correct in a session (min 5 Qs)',  rarity:'rare',     category:'accuracy', check:s=>s.sessionTotal>=5&&s.sessionCorrect===s.sessionTotal },
  { id:'sharp_mind',      name:'Sharp Mind',   emoji:'🎯', desc:'90%+ correct in a session (min 5 Qs)', rarity:'uncommon', category:'accuracy', check:s=>s.sessionTotal>=5&&s.sessionCorrect/s.sessionTotal>=0.9 },
  { id:'speed_demon',     name:'Speed Demon',  emoji:'💨', desc:'Answer 5 questions under 8 seconds each', rarity:'rare',  category:'accuracy', check:s=>(s.fastAnswers||0)>=5 },
  { id:'no_hints',        name:'Solo Flyer',   emoji:'🦅', desc:'Complete 5+ questions with zero hints', rarity:'uncommon', category:'accuracy', check:s=>s.sessionTotal>=5&&(s.hintsUsed||0)===0 },

  // ── Topic mastery (minGrade prevents impossible badges for young learners) ─
  { id:'addition_master',    name:'Addition Ace',     emoji:'➕', desc:'80%+ mastery in Addition',        rarity:'uncommon', category:'mastery',                  check:s=>(s.topicMastery?.addition||0)>=0.8 },
  { id:'subtraction_master', name:'Subtraction Star', emoji:'➖', desc:'80%+ mastery in Subtraction',    rarity:'uncommon', category:'mastery', minGrade:1,       check:s=>(s.topicMastery?.subtraction||0)>=0.8 },
  { id:'times_table_hero',   name:'Times Hero',       emoji:'✖️', desc:'80%+ mastery in Multiplication', rarity:'rare',     category:'mastery', minGrade:2,       check:s=>(s.topicMastery?.multiplication||0)>=0.8 },
  { id:'fraction_wizard',    name:'Fraction Wizard',  emoji:'½',  desc:'80%+ mastery in Fractions',      rarity:'rare',     category:'mastery', minGrade:3,       check:s=>(s.topicMastery?.fractions||0)>=0.8 },

  // FIX: uses eligibleTopicCount — actual number of topics in this grade's curriculum
  { id:'all_topics',    name:'Math Adventurer', emoji:'🧙', desc:'Try every topic in your curriculum',
    rarity:'uncommon', category:'mastery',
    check: s => {
      const needed = s.eligibleTopicCount || 6;
      return (s.topicsAttempted||[]).length >= needed;
    }
  },

  // FIX: min(3, eligibleTopicCount) so K students (2 topics) can earn this with 2 mastered
  { id:'full_mastery', name:'Grand Master', emoji:'👑', desc:'80%+ mastery in at least 3 curriculum topics',
    rarity:'legendary', category:'mastery',
    check: s => {
      const required = Math.min(3, s.eligibleTopicCount || 3);
      return Object.values(s.topicMastery||{}).filter(m=>m!==null&&m>=0.8).length >= required;
    }
  },

  // ── Level ─────────────────────────────────────────────────────────────────
  { id:'level_5',  name:'Rising Star',   emoji:'⭐', desc:'Reach Level 5',  rarity:'common',    category:'level', check:s=>s.level>=5 },
  { id:'level_10', name:'Math Champion', emoji:'🥇', desc:'Reach Level 10', rarity:'uncommon',  category:'level', check:s=>s.level>=10 },
  { id:'level_25', name:'Math Legend',   emoji:'🌟', desc:'Reach Level 25', rarity:'legendary', category:'level', check:s=>s.level>=25 },
];

const RARITY_STYLES = {
  common:    { bg:'rgba(100,100,120,0.3)', border:'rgba(150,150,170,0.5)', text:'#C8C8D8', glow:null },
  uncommon:  { bg:'rgba(0,200,160,0.15)',  border:'rgba(0,245,160,0.5)',   text:'#4FFFB0', glow:'0 0 15px rgba(0,245,160,0.4)' },
  rare:      { bg:'rgba(123,95,234,0.2)',  border:'rgba(155,127,255,0.6)', text:'#9B7FFF', glow:'0 0 20px rgba(123,95,234,0.5)' },
  legendary: { bg:'rgba(255,215,0,0.15)', border:'rgba(255,215,0,0.7)',   text:'#FFD700', glow:'0 0 25px rgba(255,215,0,0.6)' },
};
export const getRarityStyle = r => RARITY_STYLES[r] || RARITY_STYLES.common;

/**
 * FIX: stats MUST include grade: profile.grade and eligibleTopicCount
 * so minGrade filtering works correctly.
 */
export function checkNewBadges(stats, alreadyEarned = []) {
  const earned = new Set(alreadyEarned.map(b => b.id || b.badge_id));
  return BADGES.filter(b => {
    if (earned.has(b.id)) return false;
    // minGrade guard — stats.grade must be defined (passed from profile)
    if (b.minGrade !== undefined && (stats.grade === undefined || stats.grade < b.minGrade)) return false;
    try { return b.check(stats); } catch { return false; }
  });
}

export function computeLevel(xp) {
  const BASE = 100;
  let level=1, used=0, next=BASE;
  while (used+next<=xp) { used+=next; level++; next=Math.floor(BASE*Math.pow(1.1,level-1)); }
  return { level, xpForNext:next, xpIntoLevel:xp-used, progressPct:Math.min(99,Math.floor(((xp-used)/next)*100)) };
}

export function calculateXP(isCorrect, difficulty, sessionStreak, timeTakenMs=9999) {
  if (!isCorrect) return 0;
  let xp = 10 + difficulty * 5;
  if (sessionStreak>=3)  xp = Math.floor(xp*1.2);
  if (sessionStreak>=7)  xp = Math.floor(xp*1.5);
  if (sessionStreak>=15) xp = Math.floor(xp*2.0);
  if (timeTakenMs<8000)  xp += 5;
  return xp;
}

const BK = 'mathquest_badges';
export const loadEarnedBadges = () => { try { return JSON.parse(localStorage.getItem(BK)||'[]'); } catch { return []; } };
export const saveEarnedBadges = b => { try { localStorage.setItem(BK,JSON.stringify(b)); } catch {} };
