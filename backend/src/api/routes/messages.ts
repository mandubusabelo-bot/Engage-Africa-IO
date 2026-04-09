import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { aiService } from '../../services/ai.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

// Get all messages (for dashboard)
router.get('/', async (req, res) => {
  try {
    const messages = await db.getAllMessages();
    res.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error('Get all messages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get messages by agent
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
    const { agentId, content, sender, phone, name } = req.body;

    if (!agentId || !content || !sender) {
      return res.status(400).json({
        success: false,
        error: 'agentId, content, and sender are required'
      });
    }

    if (sender !== 'user' && sender !== 'bot') {
      return res.status(400).json({
        success: false,
        error: "sender must be either 'user' or 'bot'"
      });
    }

    // Pull recent history BEFORE inserting new message so first-time users trigger greeting
    const history = phone
      ? await db.getMessagesByPhone(agentId, phone, 20)
      : await db.getMessages(agentId, 20);
    
    // Check if this phone has any existing messages (excluding the current one we're about to create)
    const hasExistingMessages = history && history.length > 0;
    
    const conversationHistory = history
      .filter((msg: any) => msg.sender === 'user' || msg.sender === 'bot')
      .reverse() // ensure oldest -> newest
      .slice(-20)
      .map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

    // Create user message record
    const userMessage = await db.createMessage({
      agent_id: agentId,
      content,
      sender,
      phone: phone || null,
      created_at: new Date().toISOString()
    });

    if (sender === 'user') {
      const response = await aiService.generateResponse(
        content,
        agentId,
        undefined,
        hasExistingMessages ? conversationHistory : [],
        { phone, name }
      );

      const botMessage = await db.createMessage({
        agent_id: agentId,
        content: response,
        sender: 'bot',
        phone: phone || null,
        created_at: new Date().toISOString()
      });
      
      res.json({ success: true, data: { userMessage, botMessage } });
    } else {
      res.json({ success: true, data: userMessage });
    }
  } catch (error: any) {
    logger.error('Create message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
