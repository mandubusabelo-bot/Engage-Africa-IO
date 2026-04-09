import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { db } from './database.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Free API-based LLM options (like Groq)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || '';

export const aiService = {
  async generateResponse(
    message: string, 
    agentId: string, 
    agentConfig?: { instructions?: string; personality?: string; language?: string }
  ): Promise<string> {
    try {
      logger.info(`🤖 Generating AI response for agent: ${agentId}`);
      
      const knowledge = await db.getKnowledgeBase(agentId);
      logger.info(`📚 Knowledge base entries found: ${knowledge.length}`);
      
      const context = knowledge.map((k: any) => k.content).join('\n');
      
      // Build system message with agent configuration
      let systemMessage = '';
      
      if (agentConfig?.instructions) {
        systemMessage += `${agentConfig.instructions}\n\n`;
        logger.info(`📋 Using agent instructions (${agentConfig.instructions.length} chars)`);
      }
      
      if (agentConfig?.personality) {
        systemMessage += `Personality: Respond in a ${agentConfig.personality} manner.\n\n`;
        logger.info(`🎭 Personality: ${agentConfig.personality}`);
      }
      
      if (agentConfig?.language) {
        systemMessage += `Language: Respond in ${agentConfig.language}.\n\n`;
        logger.info(`🌍 Language: ${agentConfig.language}`);
      }
      
      if (context) {
        systemMessage += `Knowledge Base:\n${context}`;
        logger.info(`📖 Knowledge base context added (${context.length} chars)`);
      }
      
      // Try OpenRouter first (free API like Groq)
      try {
        logger.info(`Sending request to OpenRouter (free API)`);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'Engage Africa Chatbot'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            messages: [
              {
                role: 'system',
                content: systemMessage
              },
              {
                role: 'user',
                content: message
              }
            ],
            temperature: 0.7,
            max_tokens: 1024,
          })
        });
        
        if (response.ok) {
          const data = await response.json() as any;
          const responseText = data.choices[0]?.message?.content || '';
        try {
          logger.info(`Sending request to Gemini`);
          
          // Convert system message and user message to Gemini format
          const fullPrompt = `${systemMessage}\n\nUser: ${message}`;
          
          const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
          const result = await model.generateContent(fullPrompt);
          const responseText = result.response.text();
          
          logger.info(`Gemini response received (${responseText.length} chars)`);
          
          return responseText;
        } catch (geminiError: any) {
          logger.error(`Gemini also failed: ${geminiError.message}`);
          throw geminiError;
        }
      }
    } catch (error: any) {
      logger.error('AI generation error:', error);
      logger.error('Error message:', error?.message);
      logger.error('Error stack:', error?.stack);
      if (error?.response) {
        logger.error('API Response:', error.response);
      }
      
      // Return a clear error message about API configuration
      return 'AI service is currently unavailable. Please check your API key configuration in the .env file. You need a valid Groq or Gemini API key to use this feature.';
    }
  },

  async analyzeIntent(message: string): Promise<string> {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Analyze the intent of messages and return only one word: greeting, question, complaint, order, or other.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 10,
      });
      
      return completion.choices[0]?.message?.content?.toLowerCase().trim() || 'other';
    } catch (error) {
      logger.error('Intent analysis error:', error);
      return 'other';
    }
  },

  async optimizeForBot(text: string, field: 'description' | 'instructions'): Promise<string> {
    try {
      logger.info(`🔧 Optimizing ${field} for bot usage`);
      
      let systemPrompt = '';
      
      if (field === 'description') {
        systemPrompt = `You are an AI assistant that optimizes agent descriptions for chatbot systems.

Task: Rewrite agent descriptions to be clear, concise, and optimized for AI chatbot usage.

Requirements:
- Keep it under 200 characters
- Make it specific and actionable
- Focus on what the agent does and who it helps
- Use professional language
- Remove any redundant information

Provide ONLY the optimized description, nothing else.`;
      } else {
        systemPrompt = `You are an AI assistant that optimizes agent instructions for chatbot systems.

Task: Rewrite agent instructions to be clear, structured, and optimized for AI chatbot usage.

Requirements:
- Use numbered lists or bullet points for clarity
- Be specific and actionable
- Include clear do's and don'ts
- Structure it logically (greeting → understanding → responding → closing)
- Make it easy for an AI to follow step-by-step
- Keep the original intent but improve clarity and structure
- Use markdown formatting for better readability

Provide ONLY the optimized instructions in markdown format, nothing else.`;
      }
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 2048,
      });
      
      const optimizedText = completion.choices[0]?.message?.content?.trim() || text;
      
      logger.info(`✅ Optimization complete (${optimizedText.length} chars)`);
      
      return optimizedText;
    } catch (error) {
      logger.error('Text optimization error:', error);
      throw new Error('Failed to optimize text. Please try again.');
    }
  }
};
