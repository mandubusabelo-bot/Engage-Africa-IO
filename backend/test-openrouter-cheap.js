async function testCheapModel() {
  const cheapModels = [
    'qwen/qwen3.5-9b',
    'qwen/qwen3.5-flash-02-23',
    'mistralai/mistral-small-2603'
  ];
  
  for (const model of cheapModels) {
    try {
      console.log(`Testing cheap model: ${model}`);
      
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
              content: 'Hello, how are you?'
            }
          ],
          temperature: 0.7,
          max_tokens: 100,
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Success with ${model}:`, data.choices[0]?.message?.content);
        console.log(`Cost: $${data.usage ? (data.usage.prompt_tokens * 0.00000005 + data.usage.completion_tokens * 0.00000005).toFixed(8) : 'unknown'}`);
        return model;
      } else {
        const errorData = await response.json();
        console.log(`Failed with ${model}:`, response.status, errorData.error?.message);
      }
    } catch (error) {
      console.log(`Error with ${model}:`, error.message);
    }
  }
}

testCheapModel();
