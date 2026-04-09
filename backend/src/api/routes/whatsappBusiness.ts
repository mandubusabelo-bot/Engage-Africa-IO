import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { whatsappBusinessService } from '../../services/whatsappBusiness.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// Webhook endpoint for WhatsApp Business API
router.get('/webhook', async (req, res) => {
  try {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    
    const result = await whatsappBusinessService.verifyWebhook(
      mode as string,
      token as string,
      challenge as string
    );
    
    if (result) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Verification failed');
    }
  } catch (error: any) {
    logger.error('Webhook verification error:', error);
    res.status(500).send('Internal server error');
  }
});

// Handle incoming messages from WhatsApp
router.post('/webhook', async (req, res) => {
  try {
    await whatsappBusinessService.handleIncomingMessage(req.body);
    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Webhook message error:', error);
    res.status(500).send('Internal server error');
  }
});

// Send message endpoint
router.post('/send', async (req: any, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'to and message are required'
      });
    }

    const success = await whatsappBusinessService.sendMessage(to, message);
    
    if (success) {
      res.json({ success: true, message: 'Message sent successfully' });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  } catch (error: any) {
    logger.error('WhatsApp Business send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get status
router.get('/status', async (req, res) => {
  try {
    const status = whatsappBusinessService.getStatus();
    res.json({ success: true, data: status });
  } catch (error: any) {
    logger.error('WhatsApp Business status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
