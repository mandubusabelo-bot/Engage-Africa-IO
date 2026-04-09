import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { db } from './database.js';

// Ensure environment variables are loaded
import { config } from 'dotenv';
config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const GREETING_MESSAGE = `🌿 Welcome to Intandokazi Herbal Products 🌿

Hi, thank you for reaching out!

Please send a detailed message about what you need help with (e.g. skin issues, isichitho, love matters, luck, fertility, or any product enquiry), and our team will assist you as quickly as possible.

📍 Branches: Durban | PMB | Cape Town | Johannesburg  
🕘 Operating Hours: Mon - Fri | 09:00 – 17:00  
📞 Urgent calls only: 062 584 2441 (No WhatsApp calls please)

📦 Order follow-up: Please wait 5 days after confirmation before following up.

Thank you for choosing Intandokazi Herbal 💚
We’re here to help!`;

interface UserContext {
  name?: string;
  phone?: string;
}

export const aiService = {
  async generateResponse(
    message: string, 
    agentId: string, 
    agentConfig?: { instructions?: string; personality?: string; language?: string },
    conversationHistory?: Array<{role: string, content: string}>,
    userContext?: UserContext
  ): Promise<string> {
    try {
      logger.info(`Generating AI response for agent: ${agentId}`);
      
      const knowledge = await db.getKnowledgeBase(agentId);
      logger.info(`Knowledge base entries found: ${knowledge.length}`);
      logger.info(`Conversation history: ${conversationHistory?.length || 0} messages`);
      if (userContext?.phone) {
        logger.info(`User phone detected: ${userContext.phone}`);
      }
      if (userContext?.name) {
        logger.info(`User name detected: ${userContext.name}`);
      }

      const context = knowledge.map((k: any) => k.content).join('\n');
      
      // Build system message with agent configuration
      let systemMessage = '';
      
      if (agentConfig?.instructions) {
        systemMessage += `${agentConfig.instructions}\n\n`;
        logger.info(`Using agent instructions (${agentConfig.instructions.length} chars)`);
      }
      
      if (agentConfig?.personality) {
        systemMessage += `Personality: Respond in a ${agentConfig.personality} manner.\n\n`;
        logger.info(`Personality: ${agentConfig.personality}`);
      }
      
      if (agentConfig?.language) {
        systemMessage += `Language: Respond in ${agentConfig.language}.\n\n`;
        logger.info(`Language: ${agentConfig.language}`);
      }
      
      // Add user context
      if (userContext?.name || userContext?.phone) {
        systemMessage += `User Context: ${userContext?.name ? `Name: ${userContext.name}. ` : ''}${userContext?.phone ? `Phone: ${userContext.phone}.` : ''}\n\n`;
      }

      if (context) {
        systemMessage += `Knowledge Base:\n${context}`;
        logger.info(`Knowledge base context added (${context.length} chars)`);
      }

      // If no conversation history yet, send the provided greeting once and exit
      if (!conversationHistory || conversationHistory.length === 0) {
        logger.info('Sending first-time greeting message');
        return GREETING_MESSAGE;
      }

      // Instruction to avoid repeating greetings
      systemMessage += `\n\nBehavior: Do NOT repeat greetings. Assume you already greeted. Continue the conversation naturally. If user name is known, address them by name. Avoid asking for name/phone if already provided.`;

      // Try OpenRouter first (free API like Groq)
      try {
        logger.info(`Sending request to OpenRouter (free API)`);
        logger.info(`OpenRouter API key: ${OPENROUTER_API_KEY ? 'Set' : 'Not set'}`);
        logger.info(`API key length: ${OPENROUTER_API_KEY?.length || 0}`);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'Engage Africa Chatbot'
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-small-2603',
            messages: [
              {
                role: 'system',
                content: systemMessage
              },
              ...(conversationHistory || []),
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
          
          logger.info(`OpenRouter response received (${responseText.length} chars)`);
          
          return responseText;
        } else {
          throw new Error(`OpenRouter HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (openrouterError: any) {
        logger.warn(`OpenRouter failed, trying Groq: ${openrouterError.message}`);
        
        // Try Groq as fallback
        try {
          logger.info(`Sending request to Groq (${systemMessage.length} chars system message)`);
          
          const completion = await groq.chat.completions.create({
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
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 1024,
          });
          
          const responseText = completion.choices[0]?.message?.content || '';
          
          logger.info(`Groq response received (${responseText.length} chars)`);
          
          return responseText;
        } catch (groqError: any) {
          logger.warn(`Groq failed, trying Gemini: ${groqError.message}`);
          
          // Fallback to Gemini
          if (!gemini) {
            throw new Error('All AI providers (OpenRouter, Groq, Gemini) are unavailable');
          }
          
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
            throw new Error('All AI providers (OpenRouter, Groq, Gemini) are unavailable');
          }
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
      return 'AI service is currently unavailable. Please check your API key configuration in the .env file. You need a valid OpenRouter, Groq, or Gemini API key to use this feature.';
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
      logger.info(`Optimizing ${field} for bot usage`);
      
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
- Structure it logically (greeting -> understanding -> responding -> closing)
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
      
      logger.info(`Optimization complete (${optimizedText.length} chars)`);
      
      return optimizedText;
    } catch (error) {
      logger.error('Text optimization error:', error);
      throw new Error('Failed to optimize text. Please try again.');
    }
  }
};
