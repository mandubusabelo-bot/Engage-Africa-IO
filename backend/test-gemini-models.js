import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyCOrozbk4z9q2bWT01_UHcHboOOynooZG8';
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    console.log('Listing available Gemini models...');
    
    // Test common model names
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-pro-vision'
    ];
    
    for (const modelName of models) {
      try {
        console.log(`Testing ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        const response = await result.response;
        console.log(`Success with ${modelName}:`, response.text().substring(0, 50) + '...');
        break;
      } catch (error) {
        console.log(`Failed with ${modelName}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();
