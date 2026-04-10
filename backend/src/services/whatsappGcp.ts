import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import { logger } from '../utils/logger.js';
import { aiService } from './ai.js';
import { db } from './database.js';

class WhatsAppGcpService {
  private client: any = null;
  private qrCode: string = '';
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private userId: string = '';

  async initialize(userId: string): Promise<string> {
    try {
      this.status = 'connecting';
      this.userId = userId;
      
      // Disconnect any existing client first
      if (this.client) {
        await this.disconnect();
      }
      
      // GCP-optimized configuration
      this.client = new Client({
        authStrategy: new LocalAuth({ 
          clientId: `user_${userId}`,
          dataPath: '/app/whatsapp-sessions' // Persistent storage path
        }),
        puppeteer: {
          headless: 'new',
          executablePath: '/usr/bin/google-chrome-stable',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Important for GCP
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ]
        }
      });

      this.client.on('qr', async (qr: string) => {
        logger.info('WhatsApp QR Code received for GCP deployment');
        try {
          this.qrCode = await qrcode.toDataURL(qr);
          logger.info('WhatsApp QR Code generated successfully');
        } catch (error) {
          logger.error('WhatsApp QR Code generation error:', error);
        }
      });

      this.client.on('ready', () => {
        logger.info('WhatsApp client is ready and listening for messages on GCP');
        this.status = 'connected';
      });

      this.client.on('message', async (msg: any) => {
        logger.info('WhatsApp message received on GCP');
        await this.handleMessage(msg);
      });

      this.client.on('auth_failure', (msg: any) => {
        logger.error('WhatsApp authentication failure:', msg);
        this.status = 'disconnected';
      });

      this.client.on('disconnected', () => {
        logger.info('WhatsApp client disconnected');
        this.status = 'disconnected';
      });

      this.client.on('remote_session_saved', () => {
        logger.info('WhatsApp remote session saved');
      });

      logger.info('Initializing WhatsApp client for GCP environment...');
      
      // Initialize in background
      this.client.initialize().catch((error: any) => {
        logger.error('WhatsApp initialization error:', error);
        this.status = 'disconnected';
        this.qrCode = '';
      });
      
      // Wait for QR code with timeout (GCP should be faster)
      const maxWait = 45000; // 45 seconds
      const startTime = Date.now();
      let lastLog = 0;
      
      while (!this.qrCode && (Date.now() - startTime) < maxWait) {
        const elapsed = Date.now() - startTime;
        
        if (elapsed - lastLog > 5000) {
          logger.info(`Waiting for WhatsApp QR code... ${Math.round(elapsed / 1000)}s elapsed`);
          lastLog = elapsed;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (!this.qrCode) {
        logger.error('WhatsApp QR code generation timeout after 45 seconds');
        throw new Error('QR code generation timeout. Please check Chrome installation and permissions.');
      }
      
      logger.info('WhatsApp QR Code ready for scanning');
      return this.qrCode;
    } catch (error) {
      logger.error('WhatsApp GCP initialize error:', error);
      this.status = 'disconnected';
      throw error;
    }
  }

  private async handleMessage(msg: any) {
    try {
      logger.info(`WhatsApp message - fromMe: ${msg.fromMe}, from: ${msg.from}, type: ${msg.type}`);
      
      if (msg.fromMe) {
        logger.info('Skipping message from bot itself');
        return;
      }

      if (!msg.body || msg.body.trim() === '') {
        logger.info('Skipping empty message');
        return;
      }

      const content = msg.body;
      const phone = msg.from.replace('@c.us', '').replace('@g.us', '');
      
      // Extract sender name if available
      let senderName = 'WhatsApp User';
      if (msg.pushname) {
        senderName = msg.pushname;
      } else if (msg.notifyName) {
        senderName = msg.notifyName;
      }

      logger.info(`Processing message from ${phone}: ${content}`);

      // Get agent configuration
      const agentId = 'd5a97aa8-713f-4b72-b383-3074eebc5c19';
      
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
        content,
        sender: 'user',
        phone: phone,
        created_at: new Date().toISOString()
      });

      // Generate AI response
      const response = await aiService.generateResponse(
        content,
        agentId,
        undefined,
        conversationHistory,
        { phone, name: senderName }
      );

      // Save bot message
      await db.createMessage({
        agent_id: agentId,
        content: response,
        sender: 'bot',
        phone: phone,
        created_at: new Date().toISOString()
      });

      // Send response back to WhatsApp
      await msg.reply(response);
      logger.info(`WhatsApp response sent to ${phone}`);
    } catch (error: any) {
      logger.error('WhatsApp message handling error:', error);
    }
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      if (!this.client || this.status !== 'connected') {
        throw new Error('WhatsApp client not connected');
      }

      const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
      await this.client.sendMessage(formattedNumber, message);
      
      logger.info(`WhatsApp message sent to ${to}`);
      return true;
    } catch (error: any) {
      logger.error('WhatsApp send error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.destroy();
        this.client = null;
      }
      this.status = 'disconnected';
      this.qrCode = '';
      logger.info('WhatsApp client disconnected');
    } catch (error: any) {
      logger.error('WhatsApp disconnect error:', error);
    }
  }

  getStatus(): { connected: boolean; status: string; type: string } {
    return {
      connected: this.status === 'connected',
      status: this.status,
      type: 'WhatsApp Web.js (GCP Optimized)'
    };
  }

  getQrCode(): string {
    return this.qrCode;
  }
}

export const whatsappGcpService = new WhatsAppGcpService();
