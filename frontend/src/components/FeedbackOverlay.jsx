import { motion } from 'framer-motion';
import { TOPICS } from '../utils/adaptiveEngine.js';

export default function FeedbackOverlay({ feedback, question, isLast, onNext }) {
  const { isCorrect, xpEarned, message, correctAnswer, streak, aiExplanation, misconceptionLabel } = feedback;
  const topicInfo = TOPICS[question.topic] || {};

  return (
    <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
      transition={{ type:'spring', stiffness:400, damping:40 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4"
      style={{ pointerEvents:'all' }}>
      <div className={`max-w-2xl mx-auto rounded-3xl p-5 border-2 shadow-2xl backdrop-blur-xl
        ${isCorrect ? 'border-jade-500/60 bg-jade-500/10' : 'border-coral-500/60 bg-coral-500/10'}`}>

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <motion.div initial={{ scale:0, rotate:-20 }} animate={{ scale:1, rotate:0 }}
            transition={{ type:'spring', stiffness:400 }} className="text-4xl flex-shrink-0">
            {isCorrect ? '🎉' : '💪'}
          </motion.div>
          <div className="flex-1">
            <h3 className={`font-display text-xl ${isCorrect ? 'text-jade-400' : 'text-coral-400'}`}>{message}</h3>
            {!isCorrect && correctAnswer && (
              <p className="text-violet-300 text-sm mt-0.5">
                Answer: <span className="font-bold text-white number-display bg-space-800 px-2 py-0.5 rounded-lg">{correctAnswer}</span>
              </p>
            )}
          </div>
          {isCorrect && xpEarned > 0 && (
            <motion.div initial={{ scale:0, y:10 }} animate={{ scale:1, y:0 }} transition={{ delay:0.2, type:'spring' }}
              className="flex-shrink-0 text-center">
              <div className="font-display text-xl text-gold-400 text-glow-gold">+{xpEarned}</div>
              <div className="text-xs text-gold-600 font-bold">XP</div>
            </motion.div>
          )}
        </div>

        {/* Streak */}
        {isCorrect && streak >= 3 && (
          <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.15 }}
            className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl bg-gold-500/10 border border-gold-500/30 w-fit">
            <span>🔥</span><span className="text-gold-400 font-bold text-sm">{streak} in a row!</span>
          </motion.div>
        )}

        {/* Misconception label */}
        {!isCorrect && misconceptionLabel && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.15 }}
            className="mb-3 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30">
            <p className="text-sky-400 font-bold text-xs mb-0.5">🔍 What happened:</p>
            <p className="text-sky-200 text-sm">{misconceptionLabel}</p>
          </motion.div>
        )}

        {/* AI explanation or built-in hint */}
        {!isCorrect && (aiExplanation || question.hint) && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.25 }}
            className="mb-3 p-3 rounded-xl bg-space-800/60 border border-violet-700/30">
            <p className="text-violet-400 font-bold text-xs mb-0.5">
              {aiExplanation ? '✨ Max explains:' : '💡 Hint:'}
            </p>
            <p className="text-violet-200 text-sm leading-relaxed">{aiExplanation || question.hint}</p>
          </motion.div>
        )}

        {/* Learning objective — shows what skill was practised */}
        {question.learningObjective && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background:`${topicInfo.color}20`, color:topicInfo.color, border:`1px solid ${topicInfo.color}40` }}>
              {topicInfo.emoji} {topicInfo.name} · Level {question.difficulty}
            </span>
            <span className="text-xs text-violet-500 truncate">📚 {question.learningObjective}</span>
          </div>
        )}

        {/* Next button */}
        <motion.button onClick={onNext} whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
          className={`w-full py-3.5 rounded-2xl font-display text-xl text-white font-bold transition-all
            ${isCorrect ? 'bg-jade-500 hover:bg-jade-400 shadow-lg shadow-jade-500/30' : 'bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/30'}`}>
          {isLast ? '🏁 See Results!' : 'Next Question →'}
        </motion.button>
      </div>
    </motion.div>
  );
}
