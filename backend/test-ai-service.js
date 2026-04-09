import { aiService } from './src/services/ai.ts';

async function testAIService() {
  try {
    console.log('Testing AI service with agent...');
    
    const response = await aiService.generateResponse(
      'Hello, how are you?',
      'd5a97aa8-713f-4b72-b383-3074eebc5c19',
      {
        instructions: 'You are a helpful assistant.',
        personality: 'professional',
        language: 'english'
      }
    );
    
    console.log('Success! Response:', response);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

testAIService();
