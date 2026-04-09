import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyCOrozbk4z9q2bWT01_UHcHboOOynooZG8';
const genAI = new GoogleGenerativeAI(apiKey);

async function testGeminiPro() {
  try {
    console.log('Testing Gemini Pro API...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const result = await model.generateContent('Hello, how are you?');
    const response = await result.response;
    const text = response.text();
    
    console.log('Success! Response:', text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGeminiPro();
