/**
 * MaxChat — floating AI tutor chat panel.
 * Children can ask Max any math question in natural language.
 * Grade-aware and topic-aware: Max knows what the student is working on.
 * This directly mirrors Nerdy's AI tutoring copilot product.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AI } from '../api/index.js';

const AVATARS = { wizard: '🧙', astronaut: '👩‍🚀', dragon: '🐉', robot: '🤖' };

const STARTER_MESSAGES = [
  "Why do we carry the 1?",
  "What does divide mean?",
  "How do I add big numbers?",
  "What is a fraction?",
];

export default function MaxChat({ grade = 3, currentTopic = 'math', avatar = 'wizard', pageContext }) {
  const [open, setOpen]       = useState(true);
  const [messages, setMessages] = useState([
    { from: 'max', text: `Hi! I'm Max, your math wizard! 🧙✨ Ask me anything about math — I'm here to help!` }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(m => [...m, { from: 'child', text: msg }]);
    setLoading(true);

    const historyToSend = [...messages, { from: 'child', text: msg }].slice(1);
    const chatHistory = historyToSend.map(m => ({ role: m.from === 'max' ? 'assistant' : 'user', content: m.text }));
    const reply = await AI.chat(chatHistory, grade, currentTopic, pageContext);
    setMessages(m => [...m, {
      from: 'max',
      text: reply || `Great question! 🌟 Math is about patterns. Try breaking it into small steps — you can do it! 💪`
    }]);
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #7B5FEA, #5BC8FF)',
          boxShadow: '0 0 24px rgba(123,95,234,0.5)',
        }}
        title="Ask Max anything!"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} className="text-2xl">✕</motion.span>
          ) : (
            <motion.span key="open" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-2xl">
              {AVATARS[avatar] || '🧙'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat label */}
      {!open && (
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-[5.5rem] right-20 z-50 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: 'rgba(123,95,234,0.85)', color: '#fff', backdropFilter: 'blur(8px)' }}>
          Ask Max! 🧙
        </motion.div>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-36 right-4 z-50 w-80 rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(20,10,40,0.97)',
              border: '1px solid rgba(123,95,234,0.4)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, rgba(123,95,234,0.3), rgba(91,200,255,0.2))' }}>
              <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-2xl">
                {AVATARS[avatar] || '🧙'}
              </motion.span>
              <div>
                <div className="font-bold text-white text-sm">Max the Math Wizard</div>
                <div className="text-violet-400 text-xs">AI Tutor · Always here to help</div>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Online" />
            </div>

            {/* Messages */}
            <div className="h-56 overflow-y-auto p-3 space-y-2 flex flex-col">
              {messages.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.from === 'child' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug"
                    style={msg.from === 'child'
                      ? { background: 'linear-gradient(135deg,#7B5FEA,#5BC8FF)', color: '#fff', borderBottomRightRadius: '4px' }
                      : { background: 'rgba(45,31,78,0.8)', color: '#E8E0FF', border: '1px solid rgba(123,95,234,0.3)', borderBottomLeftRadius: '4px' }
                    }>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 rounded-2xl text-sm" style={{ background: 'rgba(45,31,78,0.8)', color: '#9B7FFF' }}>
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                      Max is thinking... ✨
                    </motion.span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Starter prompts */}
            {messages.length === 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1">
                {STARTER_MESSAGES.map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="text-xs px-2 py-1 rounded-full font-bold transition-all hover:opacity-80"
                    style={{ background: 'rgba(123,95,234,0.2)', color: '#A78BFA', border: '1px solid rgba(123,95,234,0.3)' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask Max anything..."
                className="flex-1 bg-space-800 rounded-2xl px-3 py-2 text-sm text-white placeholder-violet-700 outline-none"
                style={{ border: '1px solid rgba(123,95,234,0.3)' }}
                disabled={loading}
              />
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#7B5FEA,#5BC8FF)', color: '#fff' }}>
                ↑
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
