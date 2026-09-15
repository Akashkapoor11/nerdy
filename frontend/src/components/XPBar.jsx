import { motion } from 'framer-motion';

export default function XPBar({ level, progressPct, xpIntoLevel, xpForNext }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-full font-display font-bold text-sm text-white glow-violet"
        style={{ background: 'linear-gradient(135deg, #7B5FEA, #4F3CC9)', border: '2px solid #9B7FFF' }}>
        {level}
      </div>
      <div className="flex-1">
        <div className="w-full h-2.5 bg-space-800 rounded-full overflow-hidden border border-violet-800/40">
          <motion.div className="xp-bar-fill h-full"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }} />
        </div>
      </div>
      <span className="text-xs text-violet-500 font-bold whitespace-nowrap">
        {xpIntoLevel}/{xpForNext} XP
      </span>
    </div>
  );
}
