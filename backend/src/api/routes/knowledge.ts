import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const knowledge = await db.getKnowledgeBase(agentId);
    res.json({ success: true, data: knowledge });
  } catch (error: any) {
    logger.error('Get knowledge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { agentId, title, content, type } = req.body;
    
    const knowledge = await db.addKnowledge({
      agent_id: agentId,
      title,
      content,
      type,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, data: knowledge });
  } catch (error: any) {
    logger.error('Add knowledge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Delete logic here
    res.json({ success: true, message: 'Knowledge deleted' });
  } catch (error: any) {
    logger.error('Delete knowledge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
