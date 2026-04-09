async function testOpenRouterModels() {
  const freeModels = [
    'meta-llama/llama-3.2-1b-instruct:free',
    'microsoft/wizardlm-2-8x22b:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'qwen/qwen-2.5-7b-instruct:free'
  ];
  
  for (const model of freeModels) {
    try {
      console.log(`Testing model: ${model}`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3001',
          'X-Title': 'Engage Africa Chatbot'
        },
        body: JSON.stringify({
          model: model,
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
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Success with ${model}:`, data.choices[0]?.message?.content?.substring(0, 50) + '...');
        return model; // Found working model
      } else {
        const errorData = await response.json();
        console.log(`Failed with ${model}:`, response.status, errorData.error?.message || 'Unknown error');
      }
    } catch (error) {
      console.log(`Error with ${model}:`, error.message);
    }
  }
  
  console.log('No free models worked');
}

testOpenRouterModels();
