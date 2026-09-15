import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useGameStore from '../store/gameStore.js';
import { getRarityStyle } from '../utils/badges.js';

const CATEGORIES = [
  { id:'milestone', label:'Milestones', emoji:'🏅' },
  { id:'streak',    label:'Streaks',    emoji:'🔥' },
  { id:'accuracy',  label:'Accuracy',   emoji:'🎯' },
  { id:'mastery',   label:'Mastery',    emoji:'📚' },
  { id:'level',     label:'Levels',     emoji:'⭐' },
];

function BadgeCard({ badge, index }) {
  const style = getRarityStyle(badge.rarity);
  return (
    <motion.div
      initial={{ opacity:0, scale:0.8, y:20 }}
      animate={{ opacity:1, scale:1, y:0 }}
      transition={{ delay: index * 0.04, type:'spring', stiffness:300 }}
      className="badge-card"
      style={{
        background: badge.earned ? style.bg : 'rgba(20,10,40,0.5)',
        borderColor: badge.earned ? style.border : 'rgba(60,40,100,0.3)',
        boxShadow: badge.earned && style.glow ? style.glow : 'none',
        opacity: badge.earned ? 1 : 0.55,
      }}>
      <div className="text-4xl" style={{ filter: badge.earned ? 'none' : 'grayscale(0.8) brightness(0.5)' }}>
        {badge.earned ? badge.emoji : '🔒'}
      </div>
      <div className="font-bold text-sm text-center" style={{ color: badge.earned ? style.text : '#4B3B6B' }}>
        {badge.name}
      </div>
      <div className="text-xs text-center leading-tight" style={{ color: badge.earned ? '#A89FC8' : '#3D2B5A' }}>
        {badge.desc}
      </div>
      {badge.earned && badge.earnedAt && (
        <div className="text-xs text-violet-500 text-center">
          {new Date(badge.earnedAt).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}
        </div>
      )}
      {/* Rarity label */}
      <div className="text-xs px-2 py-0.5 rounded-full capitalize mt-1 font-bold"
        style={{ background:`${style.border}20`, color: badge.earned ? style.text : '#3D2B5A', border:`1px solid ${badge.earned?style.border:'#2D1F4E'}` }}>
        {badge.rarity}
      </div>
    </motion.div>
  );
}

export default function Achievements() {
  const navigate = useNavigate();
  const { profile } = useGameStore();
  const allBadges    = useGameStore(s => s.getAllBadges());

  if (!profile) { navigate('/'); return null; }

  const earned = allBadges.filter(b => b.earned).length;

  return (
    <div className="min-h-screen relative z-10 pb-32">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <motion.button whileHover={{scale:1.08}} whileTap={{scale:0.92}}
            onClick={() => navigate('/dashboard')}
            className="px-3 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1"
            style={{ background:'rgba(45,31,78,0.6)', color:'#A78BFA', border:'1px solid rgba(123,95,234,0.3)' }}>
            ← Dashboard
          </motion.button>
          <div>
            <h1 className="font-display text-3xl text-white">Achievements</h1>
            <p className="text-violet-400">{earned} / {allBadges.length} unlocked</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="glass-card p-4">
          <div className="flex justify-between text-xs text-violet-400 mb-2 font-bold">
            <span>Badge Collection</span>
            <span>{Math.round((earned/allBadges.length)*100)}% complete</span>
          </div>
          <div className="w-full h-3 bg-space-800 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ background:'linear-gradient(90deg,#7B5FEA,#FFD700)' }}
              animate={{ width:`${(earned/allBadges.length)*100}%` }}
              transition={{ duration:1, ease:'easeOut' }} />
          </div>
        </div>
      </header>

      <div className="px-4 max-w-3xl mx-auto space-y-6">
        {CATEGORIES.map(cat => {
          const catBadges = allBadges.filter(b => b.category === cat.id);
          if (!catBadges.length) return null;
          return (
            <div key={cat.id}>
              <h2 className="font-display text-xl text-white mb-3">
                {cat.emoji} {cat.label}
                <span className="text-violet-500 text-sm font-normal ml-2">
                  ({catBadges.filter(b=>b.earned).length}/{catBadges.length})
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {catBadges.map((badge, i) => <BadgeCard key={badge.id} badge={badge} index={i} />)}
              </div>
            </div>
          );
        })}

        {/* CTA */}
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          onClick={() => navigate('/game')}
          className="btn-primary w-full py-4 text-lg">
          🚀 Keep Playing to Unlock More!
        </motion.button>
      </div>

      {/* Sticky bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2"
        style={{ background:'linear-gradient(to top, rgba(8,2,20,0.97) 70%, transparent)' }}>
        <div className="max-w-3xl mx-auto flex gap-2">
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
            onClick={() => navigate('/game')}
            className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5"
            style={{ background:'linear-gradient(135deg,#7B5FEA,#5BC8FF)', color:'#fff' }}>
            🚀 Play
          </motion.button>
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5"
            style={{ background:'rgba(45,31,78,0.7)', color:'#A29BFE', border:'1px solid rgba(123,95,234,0.2)' }}>
            📊 Dashboard
          </motion.button>
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
            onClick={() => navigate('/')}
            className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5"
            style={{ background:'rgba(45,31,78,0.7)', color:'#A78BFA', border:'1px solid rgba(123,95,234,0.2)' }}>
            🏠 Home
          </motion.button>
        </div>
      </nav>
    </div>
  );
}
