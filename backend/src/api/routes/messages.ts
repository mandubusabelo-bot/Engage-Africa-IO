import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { aiService } from '../../services/ai.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const messages = await db.getMessages(agentId);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error('Get messages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const { agentId, content, sender } = req.body;
    
    const message = await db.createMessage({
      agent_id: agentId,
      content,
      sender,
      created_at: new Date().toISOString()
    });

    if (sender === 'user') {
      const response = await aiService.generateResponse(content, agentId);
      const botMessage = await db.createMessage({
        agent_id: agentId,
        content: response,
        sender: 'bot',
        created_at: new Date().toISOString()
      });
      
      res.json({ success: true, data: { userMessage: message, botMessage } });
    } else {
      res.json({ success: true, data: message });
    }
  } catch (error: any) {
    logger.error('Create message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
