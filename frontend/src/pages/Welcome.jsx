import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../store/gameStore.js';

const AVATARS = [
  { id: 'wizard',    emoji: '🧙',  name: 'Max the Wizard',     color: '#7B5FEA' },
  { id: 'astronaut', emoji: '👩‍🚀', name: 'Luna the Astronaut',  color: '#5BC8FF' },
  { id: 'dragon',    emoji: '🐉',  name: 'Digit the Dragon',   color: '#00F5A0' },
  { id: 'robot',     emoji: '🤖',  name: 'Byte the Robot',     color: '#FFD700' },
];

// ADDED: Kindergarten (grade 0)
const GRADES = [
  { value: 0, label: 'Kindergarten', sub: 'Age 5–6',  topics: 'Counting · Basic addition', emoji: '🌱' },
  { value: 1, label: 'Grade 1',      sub: 'Age 6–7',  topics: 'Counting · Addition · Subtraction · Place Value', emoji: '1️⃣' },
  { value: 2, label: 'Grade 2',      sub: 'Age 7–8',  topics: '+ Multiplication intro · Word Problems',          emoji: '2️⃣' },
  { value: 3, label: 'Grade 3',      sub: 'Age 8–9',  topics: '+ Multiplication · Division · Fractions',         emoji: '3️⃣' },
  { value: 4, label: 'Grade 4',      sub: 'Age 9–10', topics: 'Advanced operations · Larger numbers',            emoji: '4️⃣' },
  { value: 5, label: 'Grade 5',      sub: 'Age 10–11',topics: 'Core operations · Fractions · Complex word problems',          emoji: '5️⃣' },
];

const STEP_ORDER = ['name', 'grade', 'avatar'];

export default function Welcome() {
  const navigate = useNavigate();
  const { profile, createProfile, resetProfile } = useGameStore();
  const [step, setStep]         = useState(profile ? 'returning' : 'auth'); // auth, name, grade, avatar, login
  const [authMode, setAuthMode] = useState('register'); // register or login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [grade, setGrade]       = useState(null);
  const [avatar, setAvatar]     = useState('wizard');
  const [error, setError]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuthNext = async () => {
    if (authMode === 'login') {
      if (!username || !password) return setError('Username and password required');
      setIsSubmitting(true);
      const res = await useGameStore.getState().loginProfile(username, password);
      setIsSubmitting(false);
      if (res.success) {
        navigate('/game');
      } else {
        setError(res.error);
      }
    } else {
      if (!username || !password || !name) return setError('All fields required');
      if (name.trim().length < 2) return setError('Name must be at least 2 characters');
      if (username.trim().length < 3) return setError('Username must be at least 3 characters');
      if (password.length < 6) return setError('Password must be at least 6 characters');
      setError('');
      setStep('grade');
    }
  };

  const handleStart = async () => {
    setIsSubmitting(true);
    const res = await createProfile(username, password, name.trim(), grade, avatar);
    setIsSubmitting(false);
    if (res.success) {
      navigate('/game');
    } else {
      setError(res.error);
      setStep('auth');
    }
  };

  // Demo Mode — judges can try all features instantly
  const handleDemoMode = () => {
    createProfile('Demo Student', 3, 'wizard');
    navigate('/game');
  };

  if (step === 'returning') {
    const av = AVATARS.find(a => a.id === profile.avatar) || AVATARS[0];
    const gradeLabel = GRADES.find(g => g.value === profile.grade)?.label || `Grade ${profile.grade}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-10 max-w-md w-full text-center">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="text-8xl mb-4">{av.emoji}</motion.div>
          <h1 className="font-display text-4xl text-white mb-1">Welcome back,</h1>
          <h2 className="font-display text-5xl mb-2" style={{ color: av.color }}>{profile.name}!</h2>
          <p className="text-violet-300 mb-1">Level {profile.level} · {profile.xp} XP</p>
          <p className="text-violet-400 text-sm mb-8">{gradeLabel} · {profile.totalAnswers} questions answered</p>
          <div className="flex flex-col gap-3">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/game')} className="btn-primary w-full text-xl py-4">🚀 Continue Learning!</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/dashboard')} className="btn-secondary w-full">📊 My Dashboard</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/achievements')} className="btn-secondary w-full">🏆 Achievements</motion.button>
            <button onClick={() => { resetProfile(); setStep('auth'); setName(''); setGrade(null); setUsername(''); setPassword(''); }}
              className="text-violet-500 hover:text-violet-400 text-sm mt-2 transition-colors">Sign out</button>
          </div>
        </motion.div>
      </div>
    );
  }

  const stepIdx = STEP_ORDER.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="text-6xl mb-2">🧙</motion.div>
        <h1 className="font-display text-5xl text-white text-glow-violet">MathQuest</h1>
        <p className="text-violet-300 mt-1">The AI-adaptive math adventure for Kindergarten to Grade 5!</p>
        {/* AI feature badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {['🧠 BKT Adaptive Engine','💬 Ask Max AI Tutor','🔊 Voice for K-1','📖 AI Word Problems','🎯 18 Achievements'].map(f => (
            <span key={f} className="text-xs px-3 py-1 rounded-full font-bold"
              style={{ background:'rgba(123,95,234,0.15)', color:'#A78BFA', border:'1px solid rgba(123,95,234,0.3)' }}>{f}</span>
          ))}
        </div>
        {/* Demo Mode for judges */}
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={handleDemoMode}
          className="mt-4 px-6 py-2 rounded-2xl font-bold text-sm"
          style={{ background:'linear-gradient(135deg,rgba(0,245,160,0.15),rgba(91,200,255,0.15))', color:'#00F5A0', border:'1px solid rgba(0,245,160,0.35)' }}>
          ⚡ Try Demo Instantly
        </motion.button>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="glass-card p-8 max-w-sm w-full">
            <h2 className="font-display text-2xl text-white mb-6 text-center">{authMode === 'login' ? 'Welcome Back!' : 'Create Account'}</h2>
            
            <input autoFocus value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
              placeholder="Username"
              className="w-full bg-space-800 border-2 border-violet-600/40 focus:border-violet-400 rounded-2xl px-5 py-3 text-white font-bold placeholder-violet-700 outline-none transition-all duration-200 mb-3" />
            
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && authMode === 'login' && handleAuthNext()}
              placeholder="Password"
              className="w-full bg-space-800 border-2 border-violet-600/40 focus:border-violet-400 rounded-2xl px-5 py-3 text-white font-bold placeholder-violet-700 outline-none transition-all duration-200 mb-3" />
            
            {authMode === 'register' && (
              <input value={name} onChange={e => { setName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAuthNext()}
                placeholder="Display Name (e.g. Max)" maxLength={20}
                className="w-full bg-space-800 border-2 border-violet-600/40 focus:border-violet-400 rounded-2xl px-5 py-3 text-white font-bold placeholder-violet-700 outline-none transition-all duration-200 mb-3" />
            )}

            {error && <p className="text-coral-400 text-sm mb-3 text-center">⚠️ {error}</p>}
            
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleAuthNext} disabled={isSubmitting}
              className="btn-primary w-full text-lg disabled:opacity-40">{isSubmitting ? 'Loading...' : (authMode === 'login' ? 'Sign In' : 'Next →')}</motion.button>
              
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}
              className="w-full text-violet-400 text-sm mt-4 hover:text-white transition-colors">
              {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </motion.div>
        )}

        {step === 'grade' && (
          <motion.div key="grade" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="glass-card p-8 max-w-lg w-full">
            <h2 className="font-display text-2xl text-white mb-2 text-center">Hi {name}! 👋</h2>
            <p className="text-violet-300 text-center mb-6">What grade are you in?</p>
            <div className="flex flex-col gap-2 mb-6 max-h-80 overflow-y-auto">
              {GRADES.map(g => (
                <motion.button key={g.value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setGrade(g.value)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200
                    ${grade === g.value ? 'border-violet-400 bg-violet-500/25 glow-violet' : 'border-violet-700/30 bg-space-800/60 hover:border-violet-500/50'}`}>
                  <div className={`text-3xl transition-all ${grade === g.value ? 'scale-110' : ''}`}>{g.emoji}</div>
                  <div className="flex-1">
                    <div className="font-bold text-white">{g.label} <span className="text-violet-400 font-normal text-sm">{g.sub}</span></div>
                    <div className="text-violet-400 text-xs mt-0.5">{g.topics}</div>
                  </div>
                  {grade === g.value && <div className="text-jade-400 text-xl">✓</div>}
                </motion.button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('auth')} className="btn-secondary flex-1">← Back</button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => grade !== null && setStep('avatar')}
                disabled={grade === null} className="btn-primary flex-1 disabled:opacity-40">Next →</motion.button>
            </div>
          </motion.div>
        )}

        {step === 'avatar' && (
          <motion.div key="avatar" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="glass-card p-8 max-w-md w-full">
            <h2 className="font-display text-2xl text-white mb-2 text-center">Choose your guide!</h2>
            <p className="text-violet-300 text-center mb-6">Who will help you on your math adventure?</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {AVATARS.map(av => (
                <motion.button key={av.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setAvatar(av.id)}
                  className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200
                    ${avatar === av.id ? 'border-violet-400 bg-violet-500/25' : 'border-violet-700/30 bg-space-800/60 hover:border-violet-500/40'}`}
                  style={avatar === av.id ? { boxShadow: `0 0 20px ${av.color}60` } : {}}>
                  <motion.div animate={avatar === av.id ? { y: [0, -6, 0] } : {}} transition={{ repeat: Infinity, duration: 2 }} className="text-5xl">{av.emoji}</motion.div>
                  <span className="text-xs font-bold text-center" style={{ color: avatar === av.id ? av.color : '#9B7FFF' }}>{av.name}</span>
                  {avatar === av.id && <div className="text-jade-400 text-sm">✓ Selected</div>}
                </motion.button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('grade')} className="btn-secondary flex-1" disabled={isSubmitting}>← Back</button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleStart} disabled={isSubmitting} className="btn-primary flex-1 text-lg">{isSubmitting ? '...' : '🚀 Start!'}</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress dots */}
      {step !== 'returning' && (
        <div className="flex gap-2 mt-6">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className={`h-2 rounded-full transition-all duration-300
              ${step === s ? 'w-6 bg-violet-400' : i < stepIdx ? 'w-2 bg-violet-600' : 'w-2 bg-violet-800'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
