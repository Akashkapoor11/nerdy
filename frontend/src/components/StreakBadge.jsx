import { motion } from 'framer-motion';

const STREAK_MILESTONES = [
  { days: 30, emoji: '👑', label: 'Legendary' },
  { days: 14, emoji: '🔥', label: 'On fire' },
  { days: 7,  emoji: '⚡', label: 'Hot streak' },
  { days: 3,  emoji: '✨', label: 'Building' },
  { days: 1,  emoji: '🌱', label: 'Started' },
];

export default function StreakBadge({ days = 0 }) {
  if (days < 1) return null;
  const milestone = STREAK_MILESTONES.find(m => days >= m.days) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  return (
    <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:400 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm"
      style={{ background:'rgba(255,215,0,0.15)', border:'1px solid rgba(255,215,0,0.5)', color:'#FFD700' }}
      title={`${days}-day streak!`}>
      <motion.span animate={{ rotate:[0,-10,10,0] }} transition={{ repeat:Infinity, duration:2 }}>
        {milestone.emoji}
      </motion.span>
      {days} day{days !== 1 ? 's' : ''}
    </motion.div>
  );
}
