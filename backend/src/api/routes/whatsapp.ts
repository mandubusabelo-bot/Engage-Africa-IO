import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { whatsappService } from '../../services/whatsapp.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/status', async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json({ success: true, data: status });
  } catch (error: any) {
    logger.error('WhatsApp status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/initialize', async (req: any, res) => {
  try {
    const qrCode = await whatsappService.initialize(req.user.id);
    res.json({ success: true, data: { qrCode } });
  } catch (error: any) {
    logger.error('WhatsApp initialize error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/send', async (req: any, res) => {
  try {
    const { to, message } = req.body;
    await whatsappService.sendMessage(to, message);
    res.json({ success: true, message: 'Message sent' });
  } catch (error: any) {
    logger.error('WhatsApp send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({ success: true, message: 'Disconnected' });
  } catch (error: any) {
    logger.error('WhatsApp disconnect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
