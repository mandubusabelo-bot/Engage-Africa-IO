import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: any, res) => {
  try {
    // Get templates logic
    const templates = [
      { id: '1', name: 'Welcome Message', category: 'greeting', content: 'Welcome to our service!' },
      { id: '2', name: 'Order Confirmation', category: 'order', content: 'Your order has been confirmed.' },
      { id: '3', name: 'Support Response', category: 'support', content: 'Thank you for contacting support.' }
    ];
    res.json({ success: true, data: templates });
  } catch (error: any) {
    logger.error('Get templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const { name, category, content } = req.body;
    // Create template logic
    res.json({ success: true, data: { name, category, content } });
  } catch (error: any) {
    logger.error('Create template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
