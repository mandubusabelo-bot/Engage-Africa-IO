# Setup OpenRouter (Free API like Groq)

## What is OpenRouter?
OpenRouter is a service that gives you access to multiple LLM models through a single API. It has a free tier and works exactly like Groq!

## Quick Setup (2 minutes)

### 1. Get Free OpenRouter API Key
1. Go to [https://openrouter.ai/](https://openrouter.ai/)
2. Click "Sign up" (free)
3. Verify your email
4. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
5. Click "Create API Key"
6. Copy the key (starts with `sk-or-v1-`)

### 2. Add API Key to .env
Replace line 28 in your `.env` file:
```
OPENROUTER_API_KEY=sk-or-v1-your_actual_api_key_here
```

### 3. Restart Backend Server
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

## Free Models Available
OpenRouter gives you access to these free models:
- `meta-llama/llama-3.2-3b-instruct:free` (Llama 3.2 3B)
- `meta-llama/llama-3.2-1b-instruct:free` (Llama 3.2 1B)
- `microsoft/wizardlm-2-8x22b:free` (WizardLM)
- And more...

## Why OpenRouter is Great:
- **Free Tier** - No credit card needed
- **Like Groq** - Same API format
- **Multiple Models** - Access to different LLMs
- **Fast** - Good response times
- **Easy Setup** - Just get an API key

## Usage
Your chatbot will automatically:
1. Try OpenRouter first (free)
2. Fall back to Groq if you have a key
3. Fall back to Gemini if you have a key
4. Show error message if none work

## Testing
Once you add your OpenRouter API key, test it:
```bash
curl -X POST "http://localhost:3001/api/agents/YOUR_AGENT_ID/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -d '{"message":"Hello, how are you?"}'
```

That's it! Your chatbot will work with the free OpenRouter API.
