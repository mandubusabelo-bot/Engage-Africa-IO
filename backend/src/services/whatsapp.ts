import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import { logger } from '../utils/logger.js';
import { aiService } from './ai.js';
import { db } from './database.js';

class WhatsAppService {
  private client: any = null;
  private qrCode: string = '';
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private userId: string = '';

  async initialize(userId: string): Promise<string> {
    try {
      this.status = 'connecting';
      this.userId = userId; // Store userId for later use
      
      // Disconnect any existing client first
      if (this.client) {
        await this.disconnect();
      }
      
      // Simple, stable configuration
      this.client = new Client({
        authStrategy: new LocalAuth({ 
          clientId: `user_${userId}`
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        }
      });

      this.client.on('qr', async (qr: string) => {
        logger.info('📱 QR Code received');
        try {
          this.qrCode = await qrcode.toDataURL(qr);
          logger.info('✅ QR Code generated successfully');
        } catch (error) {
          logger.error('❌ QR Code generation error:', error);
        }
      });

      this.client.on('ready', () => {
        logger.info('✅ WhatsApp client is ready and listening for messages');
        this.status = 'connected';
      });

      // Use only 'message' event for incoming messages from others
      this.client.on('message', async (msg: any) => {
        logger.info('📨 New message received');
        await this.handleMessage(msg);
      });

      this.client.on('auth_failure', (msg: any) => {
        logger.error('❌ Authentication failure:', msg);
        this.status = 'disconnected';
      });

      this.client.on('loading_screen', (percent: number) => {
        logger.info(`⏳ Loading... ${percent}%`);
      });

      this.client.on('disconnected', () => {
        logger.info('WhatsApp client disconnected');
        this.status = 'disconnected';
      });

      logger.info('🚀 Initializing WhatsApp client...');
      
      // Initialize in background, return immediately
      this.client.initialize().catch((error: any) => {
        logger.error('❌ WhatsApp initialization error:', error);
        this.status = 'disconnected';
        this.qrCode = '';
      });
      
      // Wait for QR code with timeout
      const maxWait = 60000; // 60 seconds
      const startTime = Date.now();
      let lastLog = 0;
      
      while (!this.qrCode && (Date.now() - startTime) < maxWait) {
        const elapsed = Date.now() - startTime;
        
        // Log progress every 5 seconds
        if (elapsed - lastLog > 5000) {
          logger.info(`⏳ Waiting for QR code... ${Math.round(elapsed / 1000)}s elapsed`);
          lastLog = elapsed;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (!this.qrCode) {
        logger.error('❌ QR code generation timeout after 60 seconds');
        throw new Error('QR code generation timeout. Please try again.');
      }
      
      logger.info('✅ QR Code ready for scanning');
      return this.qrCode;
    } catch (error) {
      logger.error('❌ Initialize error:', error);
      this.status = 'disconnected';
      throw error;
    }
  }

  private async handleMessage(msg: any) {
    try {
      // Log all message details for debugging
      logger.info(`📩 Message received - fromMe: ${msg.fromMe}, from: ${msg.from}, hasQuotedMsg: ${msg.hasQuotedMsg}, type: ${msg.type}`);
      
      // Skip if message is from bot itself or has no body
      if (msg.fromMe) {
        logger.info('⏭️ Skipping message from bot itself');
        return;
      }

      if (!msg.body || msg.body.trim() === '') {
        logger.info('⏭️ Skipping empty message');
        return;
      }

      const content = msg.body;
      const from = msg.from;
      
      // Additional check: Skip if this is a status update or broadcast
      if (from.includes('@broadcast') || from.includes('status@broadcast')) {
        logger.info('⏭️ Skipping broadcast/status message');
        return;
      }

      logger.info(`✅ Processing message from ${from}: ${content}`);

      // Get the first active agent for this user
      // In a real implementation, you'd want to route to specific agents based on conversation context
      const agents = await db.getAgents(this.getCurrentUserId());
      const activeAgent = agents.find((a: any) => a.status === 'active') || agents[0];

      if (!activeAgent) {
        logger.warn('No active agent found, using default response');
        await msg.reply('Hello! No AI agent is currently configured. Please set up an agent in the dashboard.');
        return;
      }

      // Save user message first so history remains consistent in storage
      await db.createMessage({
        agent_id: activeAgent.id,
        content,
        sender: 'user',
        phone: from,
        created_at: new Date().toISOString()
      });

      // Build recent history scoped by phone number
      const history = await db.getMessagesByPhone(activeAgent.id, from, 20);
      const conversationHistory = history
        .filter((m: any) => m.sender === 'user' || m.sender === 'bot')
        .reverse()
        .slice(-20)
        .map((m: any) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      // Lightweight name extraction from WhatsApp metadata when available
      const userName = msg._data?.notifyName || msg._data?.pushname || undefined;

      // Generate AI response using the agent's configuration
      const response = await aiService.generateResponse(
        content, 
        activeAgent.id,
        {
          instructions: activeAgent.instructions,
          personality: activeAgent.personality,
          language: activeAgent.language
        },
        conversationHistory,
        { phone: from, name: userName }
      );
      
      await msg.reply(response);

      // Save bot response
      await db.createMessage({
        agent_id: activeAgent.id,
        content: response,
        sender: 'bot',
        phone: from,
        created_at: new Date().toISOString()
      });

      logger.info(`Response sent by agent ${activeAgent.name}`);
    } catch (error) {
      logger.error('Message handling error:', error);
      try {
        await msg.reply('Sorry, I encountered an error processing your message. Please try again.');
      } catch (replyError) {
        logger.error('Failed to send error message:', replyError);
      }
    }
  }

  private getCurrentUserId(): string {
    return this.userId || '';
  }

  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.client || this.status !== 'connected') {
      throw new Error('WhatsApp client not connected');
    }

    await this.client.sendMessage(to, message);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        logger.info('Disconnecting WhatsApp client...');
        await this.client.destroy();
        this.client = null;
        this.status = 'disconnected';
        this.qrCode = '';
        logger.info('WhatsApp client disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting WhatsApp client:', error);
      // Force cleanup even if destroy fails
      this.client = null;
      this.status = 'disconnected';
      this.qrCode = '';
    }
  }

  getStatus() {
    return {
      status: this.status,
      qrCode: this.qrCode
    };
  }
}

export const whatsappService = new WhatsAppService();
