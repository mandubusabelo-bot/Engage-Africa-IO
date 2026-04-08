import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { db } from './database.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const aiService = {
  async generateResponse(message: string, agentId: string): Promise<string> {
    try {
      const knowledge = await db.getKnowledgeBase(agentId);
      const context = knowledge.map((k: any) => k.content).join('\n');

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Context: ${context}\n\nUser message: ${message}\n\nProvide a helpful response:`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('AI generation error:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  },

  async analyzeIntent(message: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Analyze the intent of this message and return one word: greeting, question, complaint, order, or other.\n\nMessage: ${message}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().toLowerCase().trim();
    } catch (error) {
      logger.error('Intent analysis error:', error);
      return 'other';
    }
  }
};
