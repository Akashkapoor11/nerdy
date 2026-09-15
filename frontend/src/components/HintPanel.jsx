import { motion } from 'framer-motion';

export default function HintPanel({ hint }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="overflow-hidden">
      <div className="p-4 rounded-2xl bg-gold-500/10 border border-gold-500/30">
        <div className="flex items-start gap-3">
          <motion.span animate={{ rotate: [0, -15, 15, 0] }} transition={{ repeat: Infinity, duration: 2 }}
            className="text-2xl flex-shrink-0">💡</motion.span>
          <div>
            <p className="text-gold-400 font-bold text-sm mb-1">Hint from Max:</p>
            <p className="text-gold-200 leading-relaxed">{hint}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
