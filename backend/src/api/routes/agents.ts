import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { logger } from '../../utils/logger.js';
import { aiService } from '../../services/ai.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: any, res) => {
  try {
    const agents = await db.getAgents(req.user.id);
    res.json({ success: true, data: agents });
  } catch (error: any) {
    logger.error('Get agents error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const agent = await db.createAgent({
      user_id: req.user.id,
      ...req.body,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, data: agent });
  } catch (error: any) {
    logger.error('Create agent error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const agent = await db.updateAgent(id, req.body);
    res.json({ success: true, data: agent });
  } catch (error: any) {
    logger.error('Update agent error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    await db.deleteAgent(id);
    res.json({ success: true, message: 'Agent deleted' });
  } catch (error: any) {
    logger.error('Delete agent error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/optimize', async (req: any, res) => {
  try {
    const { text, field } = req.body;
    
    logger.info(`Optimizing ${field} text (${text.length} chars)`);
    
    const optimizedText = await aiService.optimizeForBot(text, field);
    
    res.json({ success: true, data: { optimizedText } });
  } catch (error: any) {
    logger.error('Optimize text error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/test', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    logger.info(`Testing agent ${id} with message: ${message}`);
    
    // Get agent details
    const agents = await db.getAgents(req.user.id);
    const agent = agents.find((a: any) => a.id === id);
    
    if (!agent) {
      logger.error('Agent not found:', id);
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    logger.info(`Found agent: ${agent.name}`);
    
    // Generate response using agent configuration
    logger.info('Calling AI service...');
    const response = await aiService.generateResponse(
      message,
      agent.id,
      {
        instructions: agent.instructions,
        personality: agent.personality,
        language: agent.language
      }
    );
    
    logger.info(`AI response generated: ${response.substring(0, 50)}...`);
    
    res.json({ success: true, data: { response } });
  } catch (error: any) {
    logger.error('❌ Test agent error:', error);
    logger.error('Error name:', error?.name);
    logger.error('Error message:', error?.message);
    logger.error('Error stack:', error?.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
