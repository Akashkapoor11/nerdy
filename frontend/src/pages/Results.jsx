/**
 * Results Page — session summary with AI insight, improvement metrics, next steps
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import useGameStore from '../store/gameStore.js';
import { TOPICS } from '../utils/adaptiveEngine.js';
import { AI } from '../api/index.js';

const AVATARS = { wizard:'🧙', astronaut:'👩‍🚀', dragon:'🐉', robot:'🤖' };

export default function Results() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const store      = useGameStore();
  const { profile, sessions } = store;
  const session    = location.state?.session;
  const weakSkills = store.getWeakSkills();
  const topicMastery = store.getTopicMastery();

  const [aiSummary, setAiSummary]     = useState(null);
  const [aiLoading, setAiLoading]     = useState(true);
  const [improvement, setImprovement] = useState(null);

  useEffect(() => {
    if (!session) return;
    const pct = session.total > 0 ? session.correct / session.total : 0;
    if (pct >= 0.8) confetti({ particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.4 }, colors: ['#FFD700','#7B5FEA','#00F5A0'], ticks: 200 });

    // Calculate improvement vs previous session
    const prev = sessions[1]; // second most recent = previous session
    if (prev && session.total > 0) {
      const currAcc = Math.round((session.correct / session.total) * 100);
      const prevAcc = prev.accuracy || 0;
      setImprovement(currAcc - prevAcc);
    }

    // Fetch AI session summary
    AI.getSessionSummary({
      correctCount: session.correct,
      totalCount: session.total,
      weakTopics: weakSkills.map(s => s.name),
      streakDays: profile?.streakDays || 0,
    }).then(msg => {
      setAiSummary(msg);
      setAiLoading(false);
    }).catch(() => setAiLoading(false));
  }, []);

  if (!session || !profile) { navigate('/'); return null; }

  const accuracy    = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;
  const stars       = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;
  const durationMin = session.durationMin || Math.round((session.durationMs || 0) / 60000);
  const av          = AVATARS[profile.avatar] || '🧙';

  const getMessage = () => {
    if (accuracy >= 90) return { title: 'Outstanding! 🌟', color: '#FFD700' };
    if (accuracy >= 70) return { title: 'Great work! 🎉',  color: '#00F5A0' };
    if (accuracy >= 50) return { title: 'Good effort! 💪', color: '#7B5FEA' };
    return                   { title: 'Keep going! 🚀',   color: '#5BC8FF' };
  };
  const { title, color } = getMessage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
      <div className="max-w-md w-full space-y-4">

        {/* Stars */}
        <motion.div className="flex justify-center gap-3" initial={{ opacity:0, scale:0 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.1 }}>
          {[0,1,2].map(i => (
            <motion.span key={i} initial={{ rotate:-30, scale:0 }} animate={{ rotate:0, scale:1 }}
              transition={{ delay:0.2+i*0.15, type:'spring', stiffness:400 }}
              className="text-5xl" style={{ filter:i<stars?'drop-shadow(0 0 12px #FFD700)':'grayscale(1) brightness(0.3)' }}>⭐</motion.span>
          ))}
        </motion.div>

        {/* Main card */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="glass-card p-6 text-center">
          <div className="text-4xl mb-2">{av}</div>
          <h1 className="font-display text-3xl mb-4" style={{ color }}>{title}</h1>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label:'Correct',   value:`${session.correct}/${session.total}`, emoji:'✅', color:'#00F5A0' },
              { label:'Accuracy',  value:`${accuracy}%`,                        emoji:'🎯', color:'#7B5FEA' },
              { label:'XP',        value:`+${session.xpEarned||0}`,             emoji:'⚡', color:'#FFD700' },
              { label:'Time',      value:durationMin>0?`${durationMin}m`:`—`, emoji:'⏱️', color:'#5BC8FF' },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
                className="bg-space-800/60 rounded-xl p-3 border border-violet-700/30">
                <div className="text-xl mb-0.5">{s.emoji}</div>
                <div className="font-display text-lg font-bold" style={{ color:s.color }}>{s.value}</div>
                <div className="text-xs text-violet-400">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Improvement vs last session */}
          {improvement !== null && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }}
              className="mb-4 p-3 rounded-xl border flex items-center gap-3"
              style={{ borderColor: improvement >= 0 ? '#00F5A020' : '#FF6B9D20', background: improvement >= 0 ? '#00F5A008' : '#FF6B9D08' }}>
              <span className="text-2xl">{improvement >= 0 ? '📈' : '📉'}</span>
              <div className="text-left">
                <p className="font-bold text-sm" style={{ color: improvement >= 0 ? '#00F5A0' : '#FF6B9D' }}>
                  {improvement >= 0 ? `+${improvement}%` : `${improvement}%`} vs last session
                </p>
                <p className="text-violet-400 text-xs">{improvement >= 0 ? 'You improved! Keep it up!' : 'A tougher session — that\'s how you grow!'}</p>
              </div>
            </motion.div>
          )}

          {/* Topics covered */}
          {session.topicsCovered?.length > 0 && (
            <div className="mb-4">
              <p className="text-violet-400 text-xs mb-2 font-bold uppercase tracking-wider">Topics Practised</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {session.topicsCovered.map(t => {
                  const info = TOPICS[t];
                  return info ? (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full font-bold"
                      style={{ background:`${info.color}20`, color:info.color, border:`1px solid ${info.color}40` }}>
                      {info.emoji} {info.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* AI Session Summary */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.7 }}
            className="mb-4 p-4 rounded-xl bg-violet-600/10 border border-violet-500/20 text-left">
            <p className="text-violet-400 text-xs font-bold mb-1">✨ AI Coach says:</p>
            {aiLoading ? (
              <div className="flex items-center gap-2">
                <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:'linear' }}
                  className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full" />
                <span className="text-violet-400 text-sm">Getting your personalised feedback...</span>
              </div>
            ) : (
              <p className="text-violet-200 text-sm leading-relaxed">
                {aiSummary || (accuracy >= 70 ? `Excellent session! You answered ${session.correct} out of ${session.total} correctly. ${weakSkills.length > 0 ? `Let's keep practising ${weakSkills[0].name} next time!` : 'Keep up the amazing work!'}` : `Great effort today! Every question you practice makes you stronger. ${weakSkills.length > 0 ? `Focus on ${weakSkills[0].name} next session.` : 'Keep going!'}`)}
              </p>
            )}
          </motion.div>

          {/* Next focus */}
          {weakSkills.length > 0 && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
              className="p-3 rounded-xl bg-coral-500/10 border border-coral-500/30 text-left">
              <p className="text-coral-400 font-bold text-xs mb-1">🎯 Adaptive engine — next session focus:</p>
              <p className="text-white font-bold">{weakSkills[0].emoji} {weakSkills[0].name} · Level {weakSkills[0].difficulty}</p>
              <p className="text-violet-300 text-xs mt-0.5">{Math.round(weakSkills[0].mastery * 100)}% mastery → practice scheduled automatically</p>
            </motion.div>
          )}
        </motion.div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
            onClick={() => navigate('/game')} className="btn-primary w-full text-xl py-4">
            🚀 Play Again!
          </motion.button>
          <div className="flex gap-3">
            <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
              onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">📊 Dashboard</motion.button>
            <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
              onClick={() => navigate('/achievements')} className="btn-secondary flex-1">🏆 Badges</motion.button>
          </div>
          <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
            onClick={() => { if(window.confirm(`Switch player? ${profile.name}'s progress is saved.`)) { localStorage.removeItem('mathquest_profile'); navigate('/'); } }}
            className="w-full py-2 text-sm rounded-xl font-bold"
            style={{ background:'rgba(45,31,78,0.4)', color:'#A78BFA', border:'1px solid rgba(123,95,234,0.25)' }}>
            👤 Switch Player
          </motion.button>
        </div>
      </div>
    </div>
  );
}
