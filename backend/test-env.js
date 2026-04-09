import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env like the server does
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

console.log('Environment variables loaded from:', envPath);
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'Set' : 'Not set');
console.log('OPENROUTER_API_KEY value:', process.env.OPENROUTER_API_KEY?.substring(0, 20) + '...');

// Test with the loaded env var
async function testWithEnv() {
  try {
    console.log('Testing with environment variable...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Engage Africa Chatbot'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-small-2603',
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        temperature: 0.7,
        max_tokens: 50,
      })
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Full response:', JSON.stringify(data, null, 2));
      console.log('Success! Response:', data.choices[0]?.message?.content);
    } else {
      const errorData = await response.json();
      console.log('Error:', response.status, errorData.error?.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWithEnv();
