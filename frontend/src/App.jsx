import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect as useEff, useRef } from 'react';
import useGameStore from './store/gameStore.js';
import { Health } from './api/index.js';
import Welcome from './pages/Welcome.jsx';
import Game from './pages/Game.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Achievements from './pages/Achievements.jsx';
import Results from './pages/Results.jsx';

function StarField() {
  const ref = useRef(null);
  useEff(() => {
    const c = ref.current; if (!c) return; c.innerHTML = '';
    for (let i = 0; i < 120; i++) {
      const s = document.createElement('div');
      const sz = Math.random() * 2.5 + 0.5;
      s.className = 'star';
      s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--duration:${2+Math.random()*4}s;--delay:${Math.random()*4}s;opacity:${0.2+Math.random()*0.7};`;
      c.appendChild(s);
    }
  }, []);
  return <div ref={ref} className="starfield" />;
}

function AppInit() {
  const { profile } = useGameStore();
  useEff(() => {
    // Check backend availability (non-blocking)
    Health.check().then(ok => {
      if (ok) console.log('✅ Backend connected — AI hints enabled');
      else console.log('ℹ️  Backend offline — using built-in hints');
    });
  }, []);
  return null;
}

function ProtectedRoute({ children }) {
  const profile = useGameStore(s => s.profile);
  if (!profile) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <StarField />
      <AppInit />
      <Toaster position="top-center" toastOptions={{
        style: { background:'#241045', color:'#F0EEFF', border:'1px solid rgba(123,95,234,0.4)', fontFamily:'Nunito,sans-serif', fontWeight:700 },
        duration: 2500,
      }} />
      <Routes>
        <Route path="/"             element={<Welcome />} />
        <Route path="/game"         element={<ProtectedRoute><Game /></ProtectedRoute>} />
        <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
        <Route path="/results"      element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
