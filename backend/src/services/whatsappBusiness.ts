import axios from 'axios';
import { logger } from '../utils/logger.js';

interface WhatsAppBusinessConfig {
  accessToken: string;
  phoneNumberId: string;
  version: string;
  baseUrl: string;
}

class WhatsAppBusinessService {
  private config: WhatsAppBusinessConfig;
  private webhookUrl: string;

  constructor() {
    this.config = {
      accessToken: process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      version: 'v18.0',
      baseUrl: 'https://graph.facebook.com'
    };
    this.webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || '';
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/${this.config.version}/${this.config.phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: to.replace(/[^\d]/g, ''), // Remove non-digits
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info('WhatsApp Business message sent successfully:', response.data);
      return true;
    } catch (error: any) {
      logger.error('WhatsApp Business send error:', error.response?.data || error.message);
      return false;
    }
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<string | null> {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    
    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('Webhook verified successfully');
      return challenge;
    }
    
    logger.warn('Webhook verification failed');
    return null;
  }

  async handleIncomingMessage(body: any): Promise<void> {
    try {
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      
      if (message && message.type === 'text') {
        const from = message.from;
        const text = message.text.body;
        
        logger.info(`Received WhatsApp message from ${from}: ${text}`);
        
        // Process message with AI service
        // This would integrate with your existing message handling logic
        await this.processMessage(from, text);
      }
    } catch (error: any) {
      logger.error('Webhook message handling error:', error.message);
    }
  }

  private async processMessage(phone: string, message: string): Promise<void> {
    // Import your existing AI service and database
    const { aiService } = await import('./ai.js');
    const { db } = await import('./database.js');
    
    try {
      // Get agent configuration (you might need to determine which agent to use)
      const agentId = 'd5a97aa8-713f-4b72-b383-3074eebc5c19'; // Your default agent
      
      // Get conversation history
      const history = await db.getMessagesByPhone(agentId, phone, 20);
      const conversationHistory = history
        .filter((msg: any) => msg.sender === 'user' || msg.sender === 'bot')
        .reverse()
        .slice(-20)
        .map((msg: any) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      // Save user message
      await db.createMessage({
        agent_id: agentId,
        content: message,
        sender: 'user',
        phone: phone,
        created_at: new Date().toISOString()
      });

      // Generate AI response
      const response = await aiService.generateResponse(
        message,
        agentId,
        undefined,
        conversationHistory,
        { phone, name: 'WhatsApp User' }
      );

      // Save bot message
      await db.createMessage({
        agent_id: agentId,
        content: response,
        sender: 'bot',
        phone: phone,
        created_at: new Date().toISOString()
      });

      // Send response back via WhatsApp
      await this.sendMessage(phone, response);
    } catch (error: any) {
      logger.error('Message processing error:', error.message);
    }
  }

  getStatus(): { connected: boolean; type: string } {
    return {
      connected: !!(this.config.accessToken && this.config.phoneNumberId),
      type: 'WhatsApp Business API'
    };
  }
}

export const whatsappBusinessService = new WhatsAppBusinessService();
