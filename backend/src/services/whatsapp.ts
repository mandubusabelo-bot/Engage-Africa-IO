import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { logger } from '../utils/logger.js';
import { aiService } from './ai.js';
import { db } from './database.js';

class WhatsAppService {
  private client: Client | null = null;
  private qrCode: string = '';
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  async initialize(userId: string): Promise<string> {
    try {
      this.status = 'connecting';
      
      this.client = new Client({
        authStrategy: new LocalAuth({ clientId: userId }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });

      this.client.on('qr', async (qr) => {
        logger.info('QR Code received');
        this.qrCode = await qrcode.toDataURL(qr);
      });

      this.client.on('ready', () => {
        logger.info('WhatsApp client is ready');
        this.status = 'connected';
      });

      this.client.on('message', async (msg) => {
        await this.handleMessage(msg);
      });

      this.client.on('disconnected', () => {
        logger.info('WhatsApp client disconnected');
        this.status = 'disconnected';
      });

      await this.client.initialize();
      return this.qrCode;
    } catch (error) {
      logger.error('WhatsApp initialization error:', error);
      this.status = 'disconnected';
      throw error;
    }
  }

  private async handleMessage(msg: any) {
    try {
      const content = msg.body;
      const from = msg.from;

      logger.info(`Message from ${from}: ${content}`);

      const response = await aiService.generateResponse(content, 'default-agent');
      await msg.reply(response);

      await db.createMessage({
        agent_id: 'default-agent',
        content,
        sender: 'user',
        phone: from,
        created_at: new Date().toISOString()
      });

      await db.createMessage({
        agent_id: 'default-agent',
        content: response,
        sender: 'bot',
        phone: from,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Message handling error:', error);
    }
  }

  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.client || this.status !== 'connected') {
      throw new Error('WhatsApp client not connected');
    }

    await this.client.sendMessage(to, message);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.status = 'disconnected';
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
