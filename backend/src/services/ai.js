import OpenAI from 'openai';

let openai = null;

// Supports OpenAI, Groq (free), and OpenRouter (multi-model).
// Priority: OPENAI_API_KEY → GROQ_API_KEY → OPENROUTER_API_KEY
// All use the same OpenAI SDK — just different baseURL + model.
function getClient() {
  if (!openai) {
    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else if (process.env.GROQ_API_KEY) {
      openai = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    } else if (process.env.NVIDIA_API_KEY) {
      openai = new OpenAI({
        apiKey: process.env.NVIDIA_API_KEY,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
    } else if (process.env.OPENROUTER_API_KEY) {
      openai = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://mathquest.app',
          'X-Title': 'MathQuest — AI Adaptive Learning',
        },
      });
    }
  }
  return openai;
}

// Model selection:
// - NVIDIA:      meta/llama-3.1-8b-instruct
// - OpenAI:      gpt-4o-mini
// - Groq:        qwen/qwen3.8-27b
// - OpenRouter:  OPENROUTER_MODEL env var
const PRIMARY_MODEL = process.env.NVIDIA_API_KEY
  ? 'meta/llama-3.1-8b-instruct'
  : process.env.OPENAI_API_KEY
    ? 'gpt-4o-mini'
    : process.env.GROQ_API_KEY
      ? 'qwen/qwen3.8-27b'
      : (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free');

// List of free fallback models to try if the primary OpenRouter model is overloaded
const FALLBACK_MODELS = [
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'huggingfaceh4/zephyr-7b-beta:free'
];

// Log which model/provider is active on startup
console.log(`\n🤖 AI Service initialized:`);
const providerName = process.env.NVIDIA_API_KEY ? 'NVIDIA NIM'
  : process.env.OPENAI_API_KEY ? 'OpenAI'
    : process.env.GROQ_API_KEY ? 'Groq'
      : process.env.OPENROUTER_API_KEY ? 'OpenRouter' : 'NONE';
console.log(`   Provider: ${providerName}`);
console.log(`   Primary Model: ${PRIMARY_MODEL}\n`);

// Helper to log full OpenRouter/OpenAI errors
function logAIError(context, err) {
  console.error(`\n❌ AI ERROR [${context}]:`);
  console.error(`   Message: ${err.message}`);
  if (err.status) console.error(`   Status: ${err.status}`);
  if (err.code) console.error(`   Code: ${err.code}`);
  if (err.error) console.error(`   Body: ${JSON.stringify(err.error)}`);
  if (err.response) {
    console.error(`   Response status: ${err.response.status}`);
    err.response.json?.().then(b => console.error(`   Response body:`, b)).catch(() => { });
  }
  console.error('');
}

/**
 * Advanced Fallback Execution
 * Retries the request with backup free models if OpenRouter is overloaded.
 */
async function executeWithFallback(client, messages, max_tokens) {
  const isOpenRouter = !!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY;
  const modelsToTry = isOpenRouter ? [PRIMARY_MODEL, ...FALLBACK_MODELS] : [PRIMARY_MODEL];

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const res = await client.chat.completions.create({
        model,
        max_tokens,
        messages,
      });
      return res.choices[0].message.content.trim();
    } catch (err) {
      // 429 = Rate Limit, 503 = Overloaded, 502 = Bad Gateway (Common on OpenRouter free tier)
      const isOverloaded = err.status === 429 || err.status === 503 || err.status === 502 || err.status === 404;

      if (isOverloaded && i < modelsToTry.length - 1) {
        console.warn(`⚠️ Model ${model} overloaded. Retrying with fallback model: ${modelsToTry[i + 1]}...`);
        continue;
      }
      // If it's not an overload error, or we're out of fallbacks, throw it
      throw err;
    }
  }
}

const SYSTEM_PROMPT = `You are Max, a friendly and encouraging math wizard who helps children aged 5–11 learn math.
Your explanations are:
- Simple, clear, and kind
- Use short sentences and everyday examples
- Never say "wrong" or make the child feel bad
- Always encourage them to try again
- Use emojis occasionally to be fun
- Maximum 3 sentences per response`;

/**
 * Generate a contextual hint for a question.
 * Falls back to the question's built-in hint if OpenAI is unavailable.
 */
export async function generateHint(question, studentAnswer = null) {
  const client = getClient();
  if (!client) {
    return question.hint || `Try thinking about it step by step! You've got this! 💪`;
  }

  try {
    const prompt = studentAnswer
      ? `A student answered "${studentAnswer}" to this math question: "${question.text}". The correct answer is "${question.answer}". Give a helpful, encouraging hint WITHOUT revealing the answer directly.`
      : `Give a helpful hint for this math question for a child: "${question.text}". The answer is "${question.answer}" but don't reveal it directly.`;

    return await executeWithFallback(client, [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ], 100);
  } catch (err) {
    logAIError('generateHint', err);
    return question.hint || `Let's think about this together! Try breaking the problem into smaller steps. 🧩`;
  }
}

/**
 * Generate an explanation of why the answer is correct.
 */
export async function generateExplanation(question, studentAnswer) {
  const client = getClient();
  if (!client) {
    return getFallbackExplanation(question);
  }

  try {
    return await executeWithFallback(client, [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `A child answered "${studentAnswer}" to: "${question.text}". The correct answer is "${question.answer}". Explain why in a simple, kind way that helps them understand for next time. Topic: ${question.topic}.`,
      },
    ], 150);
  } catch (err) {
    logAIError('generateExplanation', err);
    return getFallbackExplanation(question);
  }
}

/**
 * Generate a personalised encouragement message based on session performance.
 */
export async function generateEncouragement(stats) {
  const client = getClient();
  const {
    correctCount = 0,
    totalCount = 0,
    weakTopics = [],
    streakDays = 0,
  } = stats || {};
  // Guard divide-by-zero — pct is 0 when no questions answered yet
  const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  if (!client) {
    return getFallbackEncouragement(pct, weakTopics);
  }

  try {
    return await executeWithFallback(client, [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `A child just finished a math session. They got ${correctCount}/${totalCount} correct (${pct}%). ${weakTopics.length > 0 ? `They struggled with: ${weakTopics.join(', ')}.` : 'They did great on everything!'} ${streakDays > 1 ? `They've practised ${streakDays} days in a row!` : ''} Give a short (2 sentences), warm, specific encouragement message.`,
      },
    ], 80);
  } catch (err) {
    logAIError('generateEncouragement', err);
    return getFallbackEncouragement(pct, weakTopics);
  }
}

// ─── Fallback responses (no API needed) ───────────────────────────────────────
function getFallbackExplanation(question) {
  const explanations = {
    addition: `To find the answer, we add the numbers together! ${question.answer} is the sum. Remember: addition means putting amounts together! ➕`,
    subtraction: `We subtract to find what's left! The answer is ${question.answer}. Think of it as taking away from the total! ➖`,
    multiplication: `Multiplication is like adding groups! The answer is ${question.answer}. You can think of it as repeated addition! ✖️`,
    division: `Division splits things into equal groups! The answer is ${question.answer}. It's the opposite of multiplication! ➗`,
    fractions: `Fractions show parts of a whole! The answer is ${question.answer}. The bottom number (denominator) shows total parts, the top (numerator) shows how many we have! 🍕`,
    counting: `Counting is all about the order of numbers! The answer is ${question.answer}. Keep practising and you'll get faster! 🔢`,
    place_value: `Each digit in a number has a special place! The answer is ${question.answer}. Understanding place value helps with all of math! 🏛️`,
    word_problems: `Reading carefully is the key! The answer is ${question.answer}. Look for keywords like "total" (add), "left" (subtract), or "each" (multiply)! 📖`,
  };
  return explanations[question.topic] || `The answer is ${question.answer}. Great try! Every mistake helps you learn! 🌟`;
}

function getFallbackEncouragement(pct, weakTopics = []) {
  if (pct >= 90) return `Incredible work! 🌟 You're a math superstar! Keep that amazing streak going!`;
  if (pct >= 70) return `Great job today! 🎉 You're getting better every session! ${weakTopics.length > 0 ? `A little more practice on ${weakTopics[0]} and you'll be unstoppable!` : ''}`;
  if (pct >= 50) return `Good effort! 💪 Every question you try makes you stronger. ${weakTopics.length > 0 ? `Let's keep working on ${weakTopics[0]} together!` : 'You can do this!'}`;
  return `Don't give up — every expert was once a beginner! 🌱 Math gets easier the more you practise. You've got this!`;
}

/**
 * Wrap a procedural math question in an AI-generated story context.
 * The answer stays the same — AI only adds the narrative wrapper.
 */
export async function generateWordProblem(question, grade) {
  const client = getClient();
  if (!client) return getFallbackWordProblem(question);

  const gradeLabel = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'][grade] || 'Grade 3';
  try {
    return await executeWithFallback(client, [
      { role: 'system', content: `You create short, fun math story problems for children. Keep it to 1-2 sentences max. Use relatable characters (Emma, Leo, a wizard, a dragon). The story must naturally lead to exactly this calculation: ${question.text}. The answer must still be ${question.answer}. Do NOT include the calculation itself or the answer. Just the story setup.` },
      { role: 'user', content: `Topic: ${question.topic}, ${gradeLabel}, Difficulty ${question.difficulty}. Create a 1-sentence story that leads to: ${question.text} = ${question.answer}` },
    ], 80);
  } catch (err) {
    logAIError('generateWordProblem', err);
    return getFallbackWordProblem(question);
  }
}

/**
 * Answer a child's free-form math question via the Ask Max chat panel.
 * Grade-aware — Max adjusts vocabulary and examples to the child's level.
 */
export async function generateChatResponse(chatHistory, grade, currentTopic, pageContext) {
  const client = getClient();
  const gradeLabel = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'][grade] || 'Grade 3';

  if (!client) {
    return `Great question! 🌟 I'm Max, your math wizard. For ${gradeLabel} math, always try to break the problem into small steps. You've got this! 💪`;
  }

  try {
    // Inject the current page context into the very last user message so the AI always knows what is on the screen right now
    const messages = [...chatHistory];
    const lastUserMsgIndex = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserMsgIndex >= 0 && pageContext) {
      messages[lastUserMsgIndex].content = `[Context about the current Math Problem: \n${pageContext}]\n\nStudent asks: ${messages[lastUserMsgIndex].content}`;
    }

    return await executeWithFallback(client, [
      {
        role: 'system',
        content: `You are Max, a friendly math wizard helping a ${gradeLabel} student (age ${5 + (grade || 0)}–${6 + (grade || 0)}). Current topic: ${currentTopic || 'math'}. Keep answers to 2-3 short sentences. Use simple words, relatable examples, and 1-2 emojis. Never make the child feel bad. Always be warm and encouraging.
        
IMPORTANT: You have been provided with Context about the current Math Problem in the user's latest message. Use this context to answer the student's question. If the student says "this problem" or "this page", they are referring to the problem in the context. DO NOT say you cannot see the problem. DO NOT ask them to provide the numbers. You already have the numbers in the Context.`,
      },
      ...messages,
    ], 120);
  } catch (err) {
    logAIError('generateChatResponse', err);
    return `That's a wonderful question! 🌟 Math is all about patterns. Try thinking of it step by step — you're smarter than you think! 💪`;
  }
}

// ─── Fallback word problems (no API needed) ────────────────────────────────────
function getFallbackWordProblem(question) {
  const stories = {
    addition: `Emma and her friend are collecting stars. Can you help them count how many they have together?`,
    subtraction: `Leo the dragon had some gold coins, but he spent a few at the market. How many are left?`,
    multiplication: `The wizard planted flowers in equal rows in the garden. How many flowers are there in total?`,
    division: `Max wants to share his magic candies equally with his friends. How many does each friend get?`,
    fractions: `Luna the astronaut cut her space pizza into equal slices. How much of the pizza is that?`,
    counting: `Byte the robot is counting the stars in the sky. What number comes next?`,
    place_value: `The wizard found a mysterious number on a treasure map. Can you read it correctly?`,
    word_problems: `Read the clues carefully and help our hero solve the mystery!`,
  };
  return stories[question.topic] || `Max the wizard needs your help with a math challenge! 🧙`;
}
