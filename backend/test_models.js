const OpenAI = require('openai');

const models = [
  'deepseek/deepseek-r1:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'huggingfaceh4/zephyr-7b-beta:free',
  'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free'
];

async function testModels() {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  for (const model of models) {
    try {
      const res = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Say hi' }],
        max_tokens: 10
      });
      console.log(`✅ ${model} WORKS!`);
    } catch (err) {
      console.log(`❌ ${model} FAILED: ${err.status} - ${err.error?.message || err.message}`);
    }
  }
}

testModels();
