import 'dotenv/config';
import OpenAI from 'openai';

async function testChat() {
  const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  try {
    const res = await openai.chat.completions.create({
      model: 'groq/compound',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 50
    });
    console.log("Success! Output:", res.choices[0].message.content);
  } catch (err) {
    console.error("API ERROR with groq/compound:");
    console.error(err.message);
  }
}

testChat();
