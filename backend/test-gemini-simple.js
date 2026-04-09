import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyCOrozbk4z9q2bWT01_UHcHboOOynooZG8';
const genAI = new GoogleGenerativeAI(apiKey);

async function testGeminiSimple() {
  try {
    console.log('Testing Gemini with simple model...');
    
    // Try the most basic model name
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
    
    const result = await model.generateContent('Hello, how are you?');
    const response = await result.response;
    const text = response.text();
    
    console.log('Success! Response:', text);
  } catch (error) {
    console.error('Error:', error.message);
    
    // Try other basic models
    const models = ['gemini-1.0-pro', 'gemini-pro', 'gemini-1.0-pro-latest'];
    
    for (const modelName of models) {
      try {
        console.log(`Trying ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        const text = await result.response.text();
        console.log(`Success with ${modelName}:`, text);
        return;
      } catch (e) {
        console.log(`Failed with ${modelName}:`, e.message);
      }
    }
  }
}

testGeminiSimple();
