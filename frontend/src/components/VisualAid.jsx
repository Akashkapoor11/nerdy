import { motion } from 'framer-motion';

/** Renders visual representations alongside questions for young learners */
export default function VisualAid({ type, data }) {
  if (!type || !data) return null;

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="mb-4 p-4 rounded-2xl bg-space-800/60 border border-violet-700/30 overflow-x-auto">
      {type === 'dots'         && <DotsVisual {...data} />}
      {type === 'array'        && <ArrayVisual {...data} />}
      {type === 'fraction_bar' && <FractionBar {...data} />}
      {type === 'number_line'  && <NumberLine {...data} />}
      {type === 'groups'       && <GroupsVisual {...data} />}
    </motion.div>
  );
}

function DotsVisual({ a, b }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex flex-wrap gap-1.5 max-w-[160px]">
        {Array.from({ length: a }, (_, i) => (
          <motion.div key={i} initial={{ scale:0 }} animate={{ scale:1 }}
            transition={{ delay: i * 0.04, type:'spring' }}
            className="w-5 h-5 rounded-full bg-violet-500" />
        ))}
      </div>
      <span className="text-violet-300 font-bold text-2xl">+</span>
      <div className="flex flex-wrap gap-1.5 max-w-[160px]">
        {Array.from({ length: b }, (_, i) => (
          <motion.div key={i} initial={{ scale:0 }} animate={{ scale:1 }}
            transition={{ delay: (a + i) * 0.04, type:'spring' }}
            className="w-5 h-5 rounded-full bg-jade-500" />
        ))}
      </div>
    </div>
  );
}

function ArrayVisual({ rows, cols }) {
  if (!rows || !cols || rows * cols > 50) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-1.5">
          {Array.from({ length: cols }, (_, c) => (
            <motion.div key={c} initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }}
              transition={{ delay: (r * cols + c) * 0.03, type:'spring' }}
              className="w-5 h-5 rounded bg-violet-500" />
          ))}
        </div>
      ))}
      <p className="text-violet-400 text-xs mt-1">{rows} rows × {cols} columns = ?</p>
    </div>
  );
}

function FractionBar({ num, den }) {
  return (
    <div className="max-w-xs">
      <div className="flex h-8 rounded-xl overflow-hidden border-2 border-violet-500/40">
        {Array.from({ length: den }, (_, i) => (
          <div key={i} className={`flex-1 border-r border-space-700 last:border-r-0 flex items-center justify-center
            ${i < num ? 'bg-violet-500' : 'bg-space-800'}`}>
          </div>
        ))}
      </div>
      <p className="text-violet-400 text-xs mt-1">{num} out of {den} parts are shaded</p>
    </div>
  );
}

function NumberLine({ n }) {
  const start = Math.max(0, n - 5);
  const end   = n + 5;
  const nums  = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-0 min-w-max">
        {nums.map(num => (
          <div key={num} className="flex flex-col items-center">
            <div className={`w-8 h-1 ${num === n ? 'bg-gold-400' : 'bg-violet-700'}`} />
            <span className={`text-xs mt-1 font-bold ${num === n ? 'text-gold-400' : 'text-violet-500'}`}>{num}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupsVisual({ total, groupSize }) {
  if (!total || !groupSize || total > 36) return null;
  const groups = Math.floor(total / groupSize);
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: groups }, (_, g) => (
        <motion.div key={g} initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay: g * 0.1, type:'spring' }}
          className="border-2 border-violet-500/50 rounded-xl p-2 flex flex-wrap gap-1"
          style={{ minWidth: 'fit-content' }}>
          {Array.from({ length: groupSize }, (_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-jade-500" />
          ))}
        </motion.div>
      ))}
      <p className="w-full text-violet-400 text-xs mt-1">{groups} groups of {groupSize}</p>
    </div>
  );
}
