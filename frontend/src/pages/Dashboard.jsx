import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import useGameStore from '../store/gameStore.js';
import { TOPICS } from '../utils/adaptiveEngine.js';

const AVATARS = { wizard:'🧙', astronaut:'👩‍🚀', dragon:'🐉', robot:'🤖' };

const MASTERY_ZONES = [
  { min:0,    max:0.30, label:'Foundation',  color:'#FF6B9D', bg:'#FF6B9D20' },
  { min:0.30, max:0.55, label:'Learning',    color:'#FDCB6E', bg:'#FDCB6E20' },
  { min:0.55, max:0.75, label:'Developing',  color:'#74B9FF', bg:'#74B9FF20' },
  { min:0.75, max:0.90, label:'Proficient',  color:'#A29BFE', bg:'#A29BFE20' },
  { min:0.90, max:1.01, label:'Mastered ✓', color:'#00F5A0', bg:'#00F5A020' },
];
const getZone = p => p === null ? null : MASTERY_ZONES.find(z => p >= z.min && p < z.max) || MASTERY_ZONES[0];

function MasteryBar({ label, emoji, value, color }) {
  const pct  = value === null ? 0 : Math.round(value * 100);
  const zone = getZone(value);
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-lg w-6">{emoji}</span>
      <span className="text-sm text-violet-200 font-bold w-28 truncate">{label}</span>
      <div className="flex-1 h-3 bg-space-800 rounded-full overflow-hidden border border-violet-800/40">
        <motion.div className="h-full rounded-full" style={{ background: zone?.color || '#2D1F4E', width:`${pct}%` }}
          initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:1, delay:0.2 }} />
      </div>
      <div className="flex items-center gap-1 min-w-[110px] justify-end">
        <span className="text-xs font-bold" style={{ color: zone?.color || '#4B3B6B' }}>{value!==null?`${pct}%`:'—'}</span>
        {zone && value!==null && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
            style={{ background:zone.bg, color:zone.color, border:`1px solid ${zone.color}40` }}>{zone.label}</span>
        )}
      </div>
    </div>
  );
}

// FIXED: shows locked/unlocked states using getSkillMatrix
function SkillHeatmap({ skillMatrix, grade }) {
  const topics = Object.keys(TOPICS).filter(t => TOPICS[t].grades.includes(grade));
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-violet-400 pb-2 pr-2 font-bold">Topic</th>
              {[1,2,3,4,5].map(d => <th key={d} className="text-center text-violet-500 pb-2 w-10">D{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {topics.map(topic => {
              const info = TOPICS[topic];
              const topicMatrix = skillMatrix[topic] || {};
              return (
                <tr key={topic}>
                  <td className="pr-3 pb-2 font-bold text-violet-200 whitespace-nowrap">{info.emoji} {info.name}</td>
                  {[1,2,3,4,5].map(d => {
                    const cell = topicMatrix[d] || { inCurriculum:false, unlocked:false, attempted:false, mastery:null };
                    if (!cell.inCurriculum) {
                      return (
                        <td key={d} className="pb-2 px-1">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs"
                            style={{ background:'#0B0118', color:'#1A0B35', border:'1px solid #1A0B35' }}>—</div>
                        </td>
                      );
                    }
                    if (!cell.unlocked && !cell.attempted) {
                      return (
                        <td key={d} className="pb-2 px-1" title="Complete previous level to unlock">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
                            style={{ background:'#130225', color:'#3D2B6B', border:'1px solid #241045' }}>🔒</div>
                        </td>
                      );
                    }
                    const p    = cell.mastery;
                    const zone = getZone(p);
                    return (
                      <td key={d} className="pb-2 px-1">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition-all"
                          style={{ background:zone?zone.bg:'#1A0B35', color:zone?zone.color:'#55EFC4', border:`1px solid ${zone?zone.color+'40':'#3D2B6B'}` }}
                          title={p!==null?`${Math.round(p*100)}% — ${zone?.label}`:'Not attempted yet'}>
                          {p!==null?`${Math.round(p*100)}`:'·'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 mt-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs"><div className="w-4 h-4 rounded flex items-center justify-center text-xs" style={{background:'#130225',border:'1px solid #241045'}}>🔒</div><span className="text-violet-500">Locked (complete previous)</span></div>
        {MASTERY_ZONES.map(z => (
          <div key={z.label} className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded" style={{ background:z.bg, border:`1px solid ${z.color}` }} />
            <span className="text-violet-400">{z.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate      = useNavigate();
  const store         = useGameStore();
  const { profile, sessions } = store;
  const topicMastery  = store.getTopicMastery();
  const weakSkills    = store.getWeakSkills();
  const levelInfo     = store.getLevelInfo();
  const skillMatrix   = store.getSkillMatrix();

  // Switch User: clears profile so Welcome screen shows for a new student
  // Skill state is preserved so returning users resume exactly where they left off
  const handleSwitchUser = () => {
    if (window.confirm(`Switch player? ${profile?.name}'s progress is saved and can be resumed later.`)) {
      localStorage.removeItem('mathquest_profile');
      navigate('/');
    }
  };

  if (!profile) { navigate('/'); return null; }

  const av = AVATARS[profile.avatar] || '🧙';
  const radarData = Object.entries(TOPICS)
    .filter(([,info]) => info.grades.includes(profile.grade))
    .map(([key,info]) => ({ topic: info.name.split(' ')[0], mastery: topicMastery[key]!==null?Math.round((topicMastery[key]||0)*100):0, fullMark:100 }));

  const sessionChart = sessions.slice(0,7).reverse().map((s,i) => ({ session:`S${i+1}`, accuracy:s.accuracy||0, xp:s.xpEarned||0 }));

  const totalAnswers = profile.totalAnswers || 0;
  const totalCorrect = profile.totalCorrect || 0;
  const overallAcc   = totalAnswers > 0 ? Math.round((totalCorrect/totalAnswers)*100) : 0;
  // FIXED: real study time from timestamps
  const totalStudyMs  = sessions.reduce((s,sess) => s+(sess.durationMs||0), 0);
  const totalStudyMin = Math.round(totalStudyMs/60000);
  const gradeLabel    = ['K','1','2','3','4','5'][profile.grade] || String(profile.grade);

  return (
    <div className="min-h-screen relative z-10 pb-8">
      <header className="px-4 pt-6 pb-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <motion.div animate={{ y:[0,-5,0] }} transition={{ repeat:Infinity, duration:2.5 }} className="text-5xl">{av}</motion.div>
          <div className="flex-1">
            <h1 className="font-display text-3xl text-white">{profile.name}'s Dashboard</h1>
            <p className="text-violet-400">Grade {gradeLabel} · Level {levelInfo.level} · {profile.xp.toLocaleString()} XP</p>
          </div>
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={() => navigate('/game')} className="btn-primary px-4 py-2 text-sm">🚀 Play</motion.button>
          <motion.button
            whileHover={{scale:1.05}} whileTap={{scale:0.95}}
            onClick={handleSwitchUser}
            title="Switch to a different player"
            className="px-3 py-2 text-sm rounded-xl font-bold transition-all"
            style={{ background:'rgba(45,31,78,0.6)', color:'#A78BFA', border:'1px solid rgba(123,95,234,0.3)' }}
          >👤 Switch Player</motion.button>
        </div>
        {/* XP bar */}
        <div className="mt-4 glass-card p-4">
          <div className="flex justify-between text-xs text-violet-400 mb-2 font-bold">
            <span>Level {levelInfo.level}</span>
            <span>{levelInfo.xpIntoLevel} / {levelInfo.xpForNext} XP → Level {levelInfo.level+1}</span>
          </div>
          <div className="w-full h-4 bg-space-800 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full xp-bar-fill"
              animate={{ width:`${levelInfo.progressPct}%` }} transition={{ duration:1, ease:'easeOut' }} />
          </div>
        </div>
      </header>

      <div className="px-4 max-w-3xl mx-auto space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Questions', value:totalAnswers, emoji:'📝', color:'#7B5FEA' },
            { label:'Accuracy',  value:`${overallAcc}%`, emoji:'🎯', color:'#00F5A0' },
            { label:'Sessions',  value:sessions.length, emoji:'📅', color:'#FFD700' },
            { label:'Study Time',value:totalStudyMin>0?`${totalStudyMin}m`:'—', emoji:'⏱️', color:'#5BC8FF' },
          ].map(s => (
            <motion.div key={s.label} whileHover={{scale:1.03}} className="glass-card p-4 text-center cursor-default">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="font-display text-xl font-bold" style={{color:s.color}}>{s.value}</div>
              <div className="text-xs text-violet-400 mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Weak skill alert */}
        {weakSkills.length > 0 && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="glass-card p-5 border border-coral-500/30 bg-coral-500/5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="font-bold text-coral-400 mb-2">🧠 Adaptive engine will prioritise these in your next session:</h3>
                <div className="flex flex-wrap gap-2">
                  {weakSkills.map(s => (
                    <span key={`${s.topic}_${s.difficulty}`} className="px-3 py-1 rounded-full text-sm font-bold"
                      style={{ background:`${s.color}20`, color:s.color, border:`1px solid ${s.color}40` }}>
                      {s.emoji} {s.name} · D{s.difficulty} ({Math.round(s.mastery*100)}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Topic mastery bars */}
        <div className="glass-card p-6">
          <h2 className="font-display text-xl text-white mb-4">📊 Topic Mastery</h2>
          {Object.entries(TOPICS).filter(([,info]) => info.grades.includes(profile.grade)).map(([key,info]) => (
            <MasteryBar key={key} label={info.name} emoji={info.emoji} value={topicMastery[key]} color={info.color} />
          ))}
        </div>

        {/* Radar + Heatmap with locked states */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass-card p-6">
            <h2 className="font-display text-xl text-white mb-4">🕸️ Skill Radar</h2>
            {radarData.some(d=>d.mastery>0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#3D2B6B" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill:'#9B7FFF', fontSize:10, fontWeight:'bold' }} />
                  <Radar name="Mastery" dataKey="mastery" stroke="#7B5FEA" fill="#7B5FEA" fillOpacity={0.4} dot={{ fill:'#00F5A0', r:3 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-violet-500 text-center">
                <div><div className="text-4xl mb-2">🌟</div><p>Play a few sessions to see your radar!</p></div>
              </div>
            )}
          </div>
          <div className="glass-card p-6">
            {/* FIXED: shows 🔒 for locked difficulties */}
            <h2 className="font-display text-xl text-white mb-4">🔥 Skill Heatmap</h2>
            <SkillHeatmap skillMatrix={skillMatrix} grade={profile.grade} />
          </div>
        </div>

        {/* Session history chart */}
        {sessionChart.length > 1 && (
          <div className="glass-card p-6">
            <h2 className="font-display text-xl text-white mb-4">📈 Session Accuracy</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={sessionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D1F4E" />
                <XAxis dataKey="session" tick={{ fill:'#9B7FFF', fontSize:11 }} />
                <YAxis domain={[0,100]} tick={{ fill:'#9B7FFF', fontSize:11 }} unit="%" />
                <Tooltip contentStyle={{ background:'#241045', border:'1px solid #7B5FEA', borderRadius:'12px', color:'#F0EEFF' }} />
                <Line type="monotone" dataKey="accuracy" stroke="#00F5A0" strokeWidth={3} dot={{ fill:'#00F5A0', r:4 }} activeDot={{ r:6, fill:'#FFD700' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Learning Progress Report (renamed from Parent/Teacher) */}
        <div className="glass-card p-6">
          <h2 className="font-display text-xl text-white mb-3">📋 Learning Progress Report</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label:'Recorded Study Time', value:totalStudyMin>0?`${totalStudyMin} min`:'—', emoji:'⏱️' },
              { label:'Best Accuracy',       value:sessions.length?`${Math.max(...sessions.map(s=>s.accuracy||0))}%`:'—', emoji:'🏆' },
              { label:'Sessions Completed',  value:sessions.length, emoji:'📅' },
              { label:'Avg Questions/Session',value:sessions.length?`${Math.round(totalAnswers/sessions.length)} Q`:'—', emoji:'📝' },
            ].map(s => (
              <div key={s.label} className="bg-space-800/60 rounded-2xl p-3 border border-violet-700/20">
                <span className="text-lg">{s.emoji}</span>
                <div className="font-bold text-violet-200 mt-1">{s.value}</div>
                <div className="text-xs text-violet-500">{s.label}</div>
              </div>
            ))}
          </div>
          {weakSkills.length>0 && (
            <div className="bg-space-800/40 rounded-2xl p-4 border border-violet-700/20 mb-3">
              <p className="text-violet-400 text-xs font-bold uppercase tracking-wider mb-2">Recommended focus areas</p>
              {weakSkills.map(s => (
                <div key={`${s.topic}_${s.difficulty}`} className="flex items-center gap-2 mb-1">
                  <span>{s.emoji}</span>
                  <span className="text-violet-200 text-sm font-bold">{s.name}</span>
                  <span className="text-violet-500 text-xs">— {Math.round(s.mastery*100)}% mastery</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => {
            const report = {
              student:profile.name, grade:gradeLabel, level:levelInfo.level,
              totalAnswers, overallAccuracy:`${overallAcc}%`,
              recordedStudyMinutes:totalStudyMin,
              weakAreas:weakSkills.map(s=>`${s.name} Level ${s.difficulty}`),
              topicMastery:Object.fromEntries(Object.entries(topicMastery).map(([k,v])=>[k,v!==null?`${Math.round(v*100)}%`:'Not attempted'])),
              generated:new Date().toLocaleString(),
            };
            const a=document.createElement('a');
            a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
            a.download=`${profile.name}-mathquest-report.json`; a.click();
          }} className="w-full text-sm text-violet-400 hover:text-violet-200 font-bold transition-colors py-2 border border-violet-700/30 rounded-xl hover:border-violet-500/40">
            ⬇️ Export Progress Report (JSON)
          </button>
        </div>

        <div className="flex gap-3 pb-24">
          <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={()=>navigate('/achievements')} className="btn-secondary flex-1">🏆 Achievements</motion.button>
          <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={()=>navigate('/')} className="btn-secondary flex-1">🏠 Home</motion.button>
        </div>
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
            onClick={() => navigate('/achievements')}
            className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5"
            style={{ background:'rgba(45,31,78,0.7)', color:'#FFD700', border:'1px solid rgba(255,215,0,0.2)' }}>
            🏆 Badges
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
