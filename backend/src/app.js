import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import progressRoutes from './routes/progress.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Dynamically allow any origin (perfect for hackathon sharing)
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get(['/health', '/api/health'], (req, res) => {
  const aiProvider = process.env.NVIDIA_API_KEY
    ? 'nvidia'
    : process.env.OPENAI_API_KEY
      ? 'openai'
      : process.env.GROQ_API_KEY
        ? 'groq'
        : process.env.OPENROUTER_API_KEY
          ? 'openrouter'
          : null;
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ai: {
      provider: aiProvider || 'none',
      enabled: !!aiProvider,
      model: aiProvider === 'nvidia' ? 'meta/llama-3.1-8b-instruct'
        : aiProvider === 'openai' ? 'gpt-4o-mini'
          : aiProvider === 'groq' ? 'qwen/qwen3.8-27b'
            : aiProvider === 'openrouter' ? (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free')
              : null,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 MathQuest API running at http://localhost:${PORT}`);
  const aiStatus = process.env.NVIDIA_API_KEY
    ? '✅ NVIDIA NIM Connected (meta/llama-3.1-8b-instruct)'
    : process.env.OPENAI_API_KEY
      ? '✅ OpenAI Connected (gpt-4o-mini)'
      : process.env.GROQ_API_KEY
        ? '✅ Groq Connected (qwen/qwen3.8-27b) — FREE'
        : process.env.OPENROUTER_API_KEY
          ? `✅ OpenRouter Connected (${process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free'})`
          : '⚠️  Not configured (AI hints disabled)';
  console.log(`🔑 AI: ${aiStatus}`);
  console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
