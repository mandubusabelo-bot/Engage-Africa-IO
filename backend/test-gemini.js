import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyBk_aA6YyWctiGm7W_-TU6a3Rz4kiHW4B4';
const genAI = new GoogleGenerativeAI(apiKey);

async function testGemini() {
  try {
    console.log('Testing Gemini API...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Say hello');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Success! Response:', text);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testGemini();
