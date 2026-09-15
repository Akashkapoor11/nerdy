import { motion } from 'framer-motion';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { getRarityStyle } from '../utils/badges.js';

export default function BadgePopup({ badge, onDone }) {
  const style = getRarityStyle(badge.rarity);

  useEffect(() => {
    confetti({ particleCount: 60, spread: 80, origin: { x: 0.5, y: 0.3 },
      colors: ['#FFD700', '#7B5FEA', '#00F5A0'], ticks: 120 });
    const timer = setTimeout(onDone, 3500);
    return () => clearTimeout(timer);
  }, [badge.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -80, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed top-4 left-0 right-0 flex justify-center z-[100] px-4"
      style={{ pointerEvents: 'none' }}>
      <div className="px-6 py-4 rounded-3xl flex items-center gap-4 shadow-2xl"
        style={{
          background: style.bg,
          border: `2px solid ${style.border}`,
          boxShadow: style.glow || '0 0 30px rgba(123,95,234,0.4)',
        }}>
        <motion.div animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl">
          {badge.emoji}
        </motion.div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: style.text }}>
            🏆 Badge Unlocked!
          </p>
          <p className="font-display text-xl text-white">{badge.name}</p>
          <p className="text-sm" style={{ color: style.text }}>{badge.desc}</p>
        </div>
      </div>
    </motion.div>
  );
}
