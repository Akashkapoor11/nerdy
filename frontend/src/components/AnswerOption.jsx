import { motion } from 'framer-motion';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function AnswerOption({ label, index, selected, correct, wrong, disabled, onClick }) {
  const variant = correct ? 'correct' : wrong ? 'wrong' : selected ? 'selected' : 'default';

  const styles = {
    default:  { border:'2px solid rgba(98,71,208,0.3)',  bg:'rgba(26,11,53,0.8)',  text:'#E0D8FF', badge:'#3D2B6B' },
    selected: { border:'2px solid #9B7FFF',              bg:'rgba(123,95,234,0.2)', text:'#E0D8FF', badge:'#7B5FEA' },
    correct:  { border:'2px solid #00F5A0',              bg:'rgba(0,245,160,0.15)', text:'#4FFFB0', badge:'#00F5A0', glow:'0 0 20px rgba(0,245,160,0.3)' },
    wrong:    { border:'2px solid #FF6B9D',              bg:'rgba(255,107,157,0.15)',text:'#FF8FAB', badge:'#FF6B9D', glow:'0 0 20px rgba(255,107,157,0.3)' },
  };

  const s = styles[variant];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.07, type:'spring', stiffness:400 }}
      whileHover={!disabled ? { scale:1.02, y:-2 } : {}}
      whileTap={!disabled ? { scale:0.97 } : {}}
      className="w-full p-4 rounded-2xl text-left font-bold text-lg transition-all duration-200 flex items-center gap-3 cursor-pointer disabled:cursor-default"
      style={{ border: s.border, background: s.bg, color: s.text, boxShadow: s.glow || 'none' }}>
      {/* Label badge */}
      <span className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold transition-all duration-200"
        style={{ background: s.badge + '30', color: s.badge, border: `1px solid ${s.badge}60` }}>
        {correct ? '✓' : wrong ? '✗' : OPTION_LABELS[index] || index + 1}
      </span>
      <span className="flex-1 number-display">{label}</span>
      {correct && <motion.span initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:400 }} className="text-jade-400 text-xl">⭐</motion.span>}
    </motion.button>
  );
}
