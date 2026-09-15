/**
 * SpeakButton — reads math questions aloud using Web Speech API.
 * Essential for K-2 learners (ages 5-8) who cannot read fluently.
 * Zero API cost — uses browser's built-in speech synthesis.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SpeakButton({ text, autoSpeak = false, grade = 3 }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop any current speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = grade <= 1 ? 0.75 : grade <= 2 ? 0.85 : 0.95; // slower for younger kids
    utterance.pitch = 1.1;  // slightly higher, more child-friendly
    utterance.volume = 1;

    // Pick a friendly voice if available
    const voices = window.speechSynthesis.getVoices();
    const friendly = voices.find(v => v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel') || v.lang === 'en-US');
    if (friendly) utterance.voice = friendly;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend   = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Auto-speak for K-1 grades when text changes
  // (useEffect not used here to keep component pure — parent controls via key)

  if (!window.speechSynthesis) return null; // not supported

  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onClick={speaking ? stop : speak}
      title={speaking ? 'Stop reading' : 'Read question aloud'}
      className="flex items-center justify-center w-9 h-9 rounded-full transition-all"
      style={{
        background: speaking
          ? 'linear-gradient(135deg, #00F5A0, #00B8A9)'
          : 'rgba(123,95,234,0.2)',
        border: speaking
          ? '2px solid #00F5A0'
          : '2px solid rgba(123,95,234,0.4)',
        color: speaking ? '#fff' : '#9B7FFF',
      }}
    >
      {speaking ? (
        <motion.span
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="text-base"
        >
          🔊
        </motion.span>
      ) : (
        <span className="text-base">🔊</span>
      )}
    </motion.button>
  );
}
