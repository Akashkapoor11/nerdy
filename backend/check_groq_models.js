import 'dotenv/config';

async function checkModels() {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      }
    });
    const data = await res.json();
    console.log("Your Groq API key has access to exactly these models:");
    data.data.forEach(m => console.log(`- ${m.id}`));
  } catch (err) {
    console.log("Failed to fetch models:", err.message);
  }
}

checkModels();
