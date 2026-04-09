async function testOpenRouter() {
  try {
    console.log('Testing OpenRouter API directly...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Engage Africa Chatbot'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
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
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.choices) {
      console.log('Success! Response:', data.choices[0]?.message?.content);
    } else {
      console.log('Error in response');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOpenRouter();
