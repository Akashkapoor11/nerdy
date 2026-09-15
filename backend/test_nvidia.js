const OpenAI = require('openai');
require('dotenv').config();

async function testNvidia() {
  const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  try {
    const response = await client.chat.completions.create({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: 'Say hi' }],
      max_tokens: 10
    });
    console.log("✅ SUCCESS:", response.choices[0].message.content);
  } catch (err) {
    console.log("❌ ERROR:", err.status, err.message);
  }
}

testNvidia();
