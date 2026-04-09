async function testAvailableModels() {
  try {
    console.log('Checking available models...');
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': 'Bearer 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'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Find models that might work
      const availableModels = data.data.filter((model) => 
        model.id.includes('llama') || 
        model.id.includes('qwen') || 
        model.id.includes('mistral') ||
        model.id.includes('free')
      ).slice(0, 10);
      
      console.log('Available models to try:');
      availableModels.forEach((model) => {
        console.log(`- ${model.id} (${model.pricing?.prompt || 'unknown pricing'})`);
      });
      
      // Try the first available model
      if (availableModels.length > 0) {
        const testModel = availableModels[0].id;
        console.log(`\nTrying: ${testModel}`);
        
        const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer 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',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'Engage Africa Chatbot'
          },
          body: JSON.stringify({
            model: testModel,
            messages: [
              {
                role: 'user',
                content: 'Hello, how are you?'
              }
            ],
            temperature: 0.7,
            max_tokens: 100,
          })
        });
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('Success! Response:', testData.choices[0]?.message?.content);
          return testModel;
        } else {
          const errorData = await testResponse.json();
          console.log('Test failed:', testResponse.status, errorData.error?.message);
        }
      }
    } else {
      console.log('Failed to get models:', response.status);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAvailableModels();
