import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import useGameStore from '../store/gameStore.js';
import { TOPICS } from '../utils/adaptiveEngine.js';
import XPBar from '../components/XPBar.jsx';
import AnswerOption from '../components/AnswerOption.jsx';
import HintPanel from '../components/HintPanel.jsx';
import FeedbackOverlay from '../components/FeedbackOverlay.jsx';
import BadgePopup from '../components/BadgePopup.jsx';
import VisualAid from '../components/VisualAid.jsx';
import SpeakButton from '../components/SpeakButton.jsx';
import MaxChat from '../components/MaxChat.jsx';
import { AI } from '../api/index.js';

const AVATARS = { wizard: '🧙', astronaut: '👩‍🚀', dragon: '🐉', robot: '🤖' };
const SESSION_LENGTH = 15;

const CORRECT_MSGS = ['Great job! 🎉','Correct! ⭐','Brilliant! 🌟','Perfect! 💫','Nailed it! 🎯','Amazing! 🔥'];
const WRONG_MSGS   = ["Don't worry! 💪","Almost there! 🌱","Keep going! 🚀","You'll get it! ⭐","Good try! 🎯"];

const MISCONCEPTION_LABELS = {
  addition_instead_of_multiplication: '💡 It looks like you added instead of multiplied — × means equal groups!',
  reversed_subtraction: '💡 Check the order — subtract the smaller from the bigger number.',
  off_by_one_factor: '💡 Very close! Try counting the groups one more time.',
  counting_error: '💡 So close! Try counting on your fingers one more time.',
  place_value_error: '💡 Watch your place values — tens and ones are in different columns!',
  subtraction_instead_of_division: '💡 Division means splitting into equal groups, not taking away!',
};

const ZONE_COLORS = {
  remediation: '#FF6B9D', weak: '#FF6B9D', learning: '#74B9FF',
  consolidating: '#A29BFE', expert: '#00F5A0', new: '#FDCB6E',
};

export default function Game() {
  const navigate = useNavigate();
  const {
    profile, currentSession, currentQuestion, pendingBadges,
    adaptiveReason, adaptiveZone, sessionStreak, remediationTarget,
    startSession, stopSession, loadNextQuestion, submitAnswer,
    endSession, clearPendingBadges, getLevelInfo, getHint, getExplanation,
  } = useGameStore();

  const [phase, setPhase]             = useState('loading');
  const [selected, setSelected]       = useState(null);
  const [inputVal, setInputVal]       = useState('');
  const [feedback, setFeedback]       = useState(null);
  const [hint, setHint]               = useState(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintUsed, setHintUsed]       = useState(false);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [badgeQueue, setBadgeQueue]   = useState([]);
  const [shaking, setShaking]         = useState(false);
  const [questionNum, setQuestionNum] = useState(0);
  const [showReason, setShowReason]   = useState(false);
  const [wordStory, setWordStory]     = useState(null);  // AI story wrapper
  const inputRef  = useRef(null);
  const startedRef = useRef(false); // StrictMode guard

  // Start session exactly once
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startSession();
    setPhase('answering');
    setQuestionNum(1);
    return () => stopSession();
  }, []);

  // Reset UI on new question + fetch AI story + auto-speak for young grades
  useEffect(() => {
    if (currentQuestion && phase !== 'feedback') {
      setSelected(null);
      setInputVal('');
      setHint(null);
      setHintUsed(false);
      setAiExplanation(null);
      setWordStory(null);
      setPhase('answering');
      setShowReason(true);
      setTimeout(() => inputRef.current?.focus(), 100);
      setTimeout(() => setShowReason(false), 3000);

      // Fetch AI story wrapper for Grade 2+ (background, non-blocking)
      if (profile?.grade >= 2) {
        AI.getWordProblem(currentQuestion, profile.grade).then(story => {
          if (story) setWordStory(story);
        });
      }

      // Auto-speak question for K and Grade 1
      if (profile?.grade <= 1 && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
        utterance.rate = 0.75;
        utterance.pitch = 1.1;
        setTimeout(() => window.speechSynthesis.speak(utterance), 400);
      }
    }
  }, [currentQuestion?.id]);

  // Badge queue
  useEffect(() => {
    if (pendingBadges.length > 0) {
      setBadgeQueue(q => [...q, ...pendingBadges]);
      clearPendingBadges();
    }
  }, [pendingBadges]);

  const handleAnswer = useCallback((answer) => {
    if (phase !== 'answering' || !currentQuestion) return;
    setSelected(answer);
    setShowReason(false);

    const result = submitAnswer(answer, hintUsed);
    const { isCorrect, xpEarned, didLevelUp, sessionStreak: newStreak, misconception } = result;

    if (isCorrect) {
      const msg = newStreak >= 3
        ? `🔥 ${newStreak} in a row! Incredible!`
        : CORRECT_MSGS[Math.floor(Math.random() * CORRECT_MSGS.length)];
      if (newStreak >= 5) confetti({ particleCount: 80, spread: 90, origin: { x:0.5, y:0.6 }, colors:['#FFD700','#7B5FEA','#00F5A0'], ticks:100 });
      if (didLevelUp) setTimeout(() => toast(`🎊 Level Up! Level ${result.levelInfo.level}!`, { duration:4000, icon:'🎊' }), 600);
      setFeedback({ isCorrect:true, xpEarned, message:msg, streak:newStreak });
    } else {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setFeedback({
        isCorrect:false, xpEarned:0,
        message: WRONG_MSGS[Math.floor(Math.random()*WRONG_MSGS.length)],
        correctAnswer: currentQuestion.answer,
        misconception,
        misconceptionLabel: misconception ? MISCONCEPTION_LABELS[misconception] : null,
      });
      // Fetch AI explanation in background (question-scoped)
      getExplanation(answer).then(exp => { if (exp) setAiExplanation(exp); });
    }
    setPhase('feedback');
  }, [phase, currentQuestion, hintUsed, submitAnswer, getExplanation]);

  const handleInputSubmit = e => { e.preventDefault(); if (inputVal.trim()) handleAnswer(inputVal.trim()); };

  const handleHint = async () => {
    setHintUsed(true);
    setHintLoading(true);
    const h = await getHint();
    setHint(h);
    setHintLoading(false);
  };

  const handleNext = () => {
    if (questionNum >= SESSION_LENGTH) {
      const session = endSession();
      navigate('/results', { state: { session: session || { correct:0, total:SESSION_LENGTH, xpEarned:0, topicsCovered:[], durationMin:0 } } });
      return;
    }
    setQuestionNum(q => q + 1);
    setFeedback(null);
    setPhase('loading');
    setTimeout(loadNextQuestion, 80);
  };

  if (!profile || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:'linear' }}
          className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const topicInfo  = TOPICS[currentQuestion.topic] || {};
  const levelInfo  = getLevelInfo();
  const av         = AVATARS[profile.avatar] || '🧙';
  const isFeedback = phase === 'feedback';
  const isInput    = currentQuestion.type === 'input';
  const reasonColor = ZONE_COLORS[adaptiveZone] || '#9B7FFF';
  const isRemediation = adaptiveZone === 'remediation';

  return (
    <div className="game-layout relative z-10 min-h-screen">
      {/* Badge queue */}
      <AnimatePresence>
        {badgeQueue.length > 0 && <BadgePopup badge={badgeQueue[0]} onDone={() => setBadgeQueue(q => q.slice(1))} />}
      </AnimatePresence>

      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <motion.div animate={{ y:[0,-4,0] }} transition={{ repeat:Infinity, duration:2.5 }}
              className="text-3xl cursor-pointer" onClick={() => navigate('/dashboard')}>{av}</motion.div>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-violet-400 mb-1 font-bold">
                <span>Question {questionNum}/{SESSION_LENGTH}</span>
                <span>Lv.{levelInfo.level} · {profile.xp} XP</span>
              </div>
              <div className="w-full h-2 bg-space-800 rounded-full overflow-hidden border border-violet-800/40">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
                  animate={{ width:`${((questionNum-1)/SESSION_LENGTH)*100}%` }} transition={{ duration:0.5 }} />
              </div>
            </div>
          </div>
          <XPBar level={levelInfo.level} progressPct={levelInfo.progressPct} xpIntoLevel={levelInfo.xpIntoLevel} xpForNext={levelInfo.xpForNext} />
          {/* Session streak — now from store, not local state */}
          {sessionStreak >= 3 && (
            <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
              className="flex items-center gap-1 mt-2 text-gold-400 font-bold text-sm">
              🔥 {sessionStreak} in a row!
            </motion.div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-4">
        <div className="max-w-2xl w-full">

          {/* Adaptive AI banner — shows WHY this question was chosen */}
          <AnimatePresence>
            {adaptiveReason && showReason && (
              <motion.div key={currentQuestion.id+'_reason'}
                initial={{ opacity:0, y:-10, height:0 }} animate={{ opacity:1, y:0, height:'auto' }} exit={{ opacity:0, height:0 }}
                className="mb-3 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm border"
                  style={{ background:`${reasonColor}10`, borderColor:`${reasonColor}30` }}>
                  <span className="text-lg">{isRemediation ? '🎯' : '🧠'}</span>
                  <span className="font-semibold" style={{ color: reasonColor }}>{adaptiveReason}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div key={currentQuestion.id}
              initial={{ opacity:0, y:30, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-20, scale:0.96 }}
              transition={{ type:'spring', stiffness:300, damping:30 }}
              className={`glass-card p-6 md:p-8 ${shaking ? 'animate-shake' : ''}`}
              style={isRemediation ? { borderColor:'rgba(255,107,157,0.3)', boxShadow:'0 0 30px rgba(255,107,157,0.1)' } : {}}>

              {/* Topic badge + Speak button */}
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">{topicInfo.emoji}</span>
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ background:`${topicInfo.color}25`, color:topicInfo.color, border:`1px solid ${topicInfo.color}60` }}>
                  {topicInfo.name} · Level {currentQuestion.difficulty}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {Array.from({length:5},(_,i) => <span key={i} className={`text-xs ${i<currentQuestion.difficulty?'text-gold-400':'text-space-600'}`}>★</span>)}
                  <SpeakButton text={currentQuestion.text} grade={profile?.grade || 3} />
                </div>
              </div>

              {/* AI Word Problem story wrapper */}
              <AnimatePresence>
                {wordStory && !isFeedback && (
                  <motion.div
                    initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                    className="mb-4 overflow-hidden">
                    <div className="px-4 py-3 rounded-2xl text-sm italic leading-relaxed"
                      style={{ background:'rgba(91,200,255,0.08)', border:'1px solid rgba(91,200,255,0.2)', color:'#A8D8FF' }}>
                      📖 {wordStory}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Question text */}
              <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed whitespace-pre-line number-display mb-5">
                {currentQuestion.text}
              </p>

              {/* Visual aid */}
              {currentQuestion.visual && !isFeedback && <VisualAid type={currentQuestion.visual} data={currentQuestion.visualData} />}

              {/* MCQ answers */}
              {!isInput ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {currentQuestion.options?.map((opt, i) => (
                    <AnswerOption key={`${opt}-${i}`} label={opt} index={i}
                      selected={selected===opt} correct={isFeedback&&opt===currentQuestion.answer}
                      wrong={isFeedback&&selected===opt&&opt!==currentQuestion.answer}
                      disabled={isFeedback} onClick={() => handleAnswer(opt)} />
                  ))}
                </div>
              ) : (
                <form onSubmit={handleInputSubmit} className="mt-4">
                  <div className="flex gap-3">
                    <input ref={inputRef} value={inputVal} onChange={e => setInputVal(e.target.value)} disabled={isFeedback}
                      placeholder="Type your answer..." className="flex-1 bg-space-800 border-2 border-violet-600/40 focus:border-violet-400
                        rounded-2xl px-5 py-4 text-white text-xl font-bold number-display placeholder-violet-700 outline-none transition-all disabled:opacity-60" />
                    <motion.button type="submit" whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                      disabled={!inputVal.trim()||isFeedback} className="btn-primary px-6 disabled:opacity-40 text-xl">✓</motion.button>
                  </div>
                </form>
              )}

              {/* Hint */}
              {!isFeedback && !hint && (
                <button onClick={handleHint} disabled={hintLoading}
                  className="mt-4 text-violet-500 hover:text-violet-300 text-sm font-bold transition-colors flex items-center gap-1 disabled:opacity-50">
                  {hintLoading ? '⏳ Getting hint...' : '💡 Need a hint?'}
                </button>
              )}
              <AnimatePresence>{hint && !isFeedback && <HintPanel hint={hint} />}</AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Feedback overlay */}
      <AnimatePresence>
        {isFeedback && feedback && (
          <FeedbackOverlay feedback={{ ...feedback, aiExplanation }} question={currentQuestion}
            isLast={questionNum>=SESSION_LENGTH} onNext={handleNext} />
        )}
      </AnimatePresence>

      {/* Ask Max — floating AI tutor chat (always visible during game) */}
      <MaxChat grade={profile?.grade || 3} currentTopic={currentQuestion?.topic || 'math'} avatar={profile?.avatar || 'wizard'} pageContext={`Question: "${currentQuestion?.text}"\nStory: ${wordStory || 'None'}\nOptions: ${currentQuestion?.options?.join(', ') || 'Text input'}\nProgress: Question ${questionNum}/${SESSION_LENGTH}, Topic Level ${currentQuestion?.difficulty}, Streak: ${sessionStreak}`} />

      <footer className="px-4 pb-4 pt-2">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button onClick={() => { endSession(); navigate('/dashboard'); }}
            className="text-violet-500 hover:text-violet-300 text-sm font-bold transition-colors flex items-center gap-1">
            ← Dashboard
          </button>
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background:'rgba(123,95,234,0.15)', color:'#9B7FFF', border:'1px solid rgba(123,95,234,0.25)' }}>
            ✨ MathQuest AI
          </span>
          <button onClick={() => navigate('/achievements')}
            className="text-violet-500 hover:text-violet-300 text-sm font-bold transition-colors flex items-center gap-1">
            🏆 Badges
          </button>
        </div>
      </footer>
    </div>
  );
}
