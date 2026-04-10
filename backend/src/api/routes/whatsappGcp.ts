import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { whatsappGcpService } from '../../services/whatsappGcp.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/status', async (req, res) => {
  try {
    const status = whatsappGcpService.getStatus();
    res.json({ success: true, data: status });
  } catch (error: any) {
    logger.error('WhatsApp GCP status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/qr', async (req, res) => {
  try {
    const qrCode = whatsappGcpService.getQrCode();
    if (qrCode) {
      res.json({ success: true, data: { qrCode } });
    } else {
      res.json({ success: false, error: 'No QR code available. Please initialize first.' });
    }
  } catch (error: any) {
    logger.error('WhatsApp GCP QR error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/initialize', async (req: any, res) => {
  try {
    const qrCode = await whatsappGcpService.initialize(req.user.id);
    res.json({ success: true, data: { qrCode } });
  } catch (error: any) {
    logger.error('WhatsApp GCP initialize error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/send', async (req: any, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'to and message are required'
      });
    }

    const success = await whatsappGcpService.sendMessage(to, message);
    
    if (success) {
      res.json({ success: true, message: 'Message sent successfully' });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  } catch (error: any) {
    logger.error('WhatsApp GCP send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await whatsappGcpService.disconnect();
    res.json({ success: true, message: 'Disconnected' });
  } catch (error: any) {
    logger.error('WhatsApp GCP disconnect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
