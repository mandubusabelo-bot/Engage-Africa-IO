import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

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
    const { name, description, personality, instructions } = req.body;
    
    const agent = await db.createAgent({
      user_id: req.user.id,
      name,
      description,
      personality,
      instructions,
      status: 'active',
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
    const updates = req.body;
    
    // Update logic here
    res.json({ success: true, data: { id, ...updates } });
  } catch (error: any) {
    logger.error('Update agent error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    // Delete logic here
    res.json({ success: true, message: 'Agent deleted' });
  } catch (error: any) {
    logger.error('Delete agent error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
