import { Router } from 'express';
import { generateHint, generateExplanation, generateEncouragement, generateWordProblem, generateChatResponse } from '../services/ai.js';
import OpenAI from 'openai';

const router = Router();

// ── Diagnostic test endpoint — visit /api/ai/test to verify connection ─────────
router.get('/test', async (req, res) => {
  const key = process.env.NVIDIA_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
  const provider = process.env.NVIDIA_API_KEY ? 'nvidia'
    : process.env.OPENAI_API_KEY ? 'openai'
      : process.env.GROQ_API_KEY ? 'groq'
        : process.env.OPENROUTER_API_KEY ? 'openrouter' : null;

  if (!key) {
    return res.json({ ok: false, provider: null, error: 'No API key found in .env' });
  }

  try {
    const client = new OpenAI({
      apiKey: key,
      baseURL: provider === 'nvidia' ? 'https://integrate.api.nvidia.com/v1'
        : provider === 'openrouter' ? 'https://openrouter.ai/api/v1'
          : provider === 'groq' ? 'https://api.groq.com/openai/v1'
            : undefined,
      ...(provider === 'openrouter' && {
        defaultHeaders: { 'HTTP-Referer': 'https://mathquest.app', 'X-Title': 'MathQuest' }
      }),
    });
    const model = provider === 'nvidia' ? 'meta/llama-3.1-8b-instruct'
                : provider === 'openai' ? 'gpt-4o-mini'
                : provider === 'groq'   ? 'qwen/qwen3.8-27b'
                : (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free');

    const result = await client.chat.completions.create({
      model,
      max_tokens: 30,
      messages: [{ role: 'user', content: 'Say "AI connected!" in exactly those words.' }],
    });
    const reply = result.choices[0].message.content;
    console.log(`✅ AI Test passed: "${reply}" (provider: ${provider}, model: ${model})`);
    res.json({ ok: true, provider, model, reply });
  } catch (err) {
    console.error(`❌ AI Test FAILED:`, err.message, err.status, err.error);
    res.json({
      ok: false,
      provider,
      error: err.message,
      status: err.status,
      details: err.error || null,
    });
  }
});

router.post('/hint', async (req, res) => {
  try {
    const { question, studentAnswer } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });
    const hint = await generateHint(question, studentAnswer);
    res.json({ hint });
  } catch { res.status(500).json({ error: 'Failed to generate hint' }); }
});

router.post('/explain', async (req, res) => {
  try {
    const { question, studentAnswer } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });
    const explanation = await generateExplanation(question, studentAnswer);
    res.json({ explanation });
  } catch { res.status(500).json({ error: 'Failed to generate explanation' }); }
});

router.post('/encourage', async (req, res) => {
  try {
    const { stats } = req.body;
    const message = await generateEncouragement(stats || {});
    res.json({ message });
  } catch { res.status(500).json({ error: 'Failed to generate encouragement' }); }
});

router.post('/insight', async (req, res) => {
  try {
    const { weakSkills = [], topicMastery = {}, grade = 3 } = req.body;
    const grades = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
    const gradeLabel = grades[grade] || `Grade ${grade}`;
    const weakNames = weakSkills.slice(0, 2).map(s => s.name || s.topic).join(' and ');
    const stats = { correctCount: 7, totalCount: 10, weakTopics: weakNames ? [weakNames] : [], streakDays: 0 };
    const insight = await generateEncouragement(stats);
    res.json({ insight: insight || (weakNames ? `Focus on ${weakNames} next! 🌟` : `Great progress in ${gradeLabel}! 🚀`) });
  } catch { res.status(500).json({ error: 'Failed to generate insight' }); }
});

// NEW: AI word problem — wraps a procedural question in a story context
router.post('/word-problem', async (req, res) => {
  try {
    const { question, grade = 3 } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });
    const story = await generateWordProblem(question, grade);
    res.json({ story });
  } catch { res.status(500).json({ error: 'Failed to generate word problem' }); }
});

// NEW: Ask Max chat — grade-aware AI tutor chat for children
router.post('/chat', async (req, res) => {
  try {
    const { chatHistory, grade = 3, currentTopic = 'math', pageContext } = req.body;
    if (!chatHistory || !chatHistory.length) return res.status(400).json({ error: 'chatHistory required' });
    const reply = await generateChatResponse(chatHistory, grade, currentTopic, pageContext);
    res.json({ reply });
  } catch { res.status(500).json({ error: 'Failed to generate chat response' }); }
});

export default router;
