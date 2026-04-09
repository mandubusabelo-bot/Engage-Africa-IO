import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: any, res) => {
  try {
    const flows = await db.getFlows(req.user.id);
    res.json({ success: true, data: flows });
  } catch (error: any) {
    logger.error('Get flows error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const flowData = {
      ...req.body,
      user_id: req.user.id,
      status: req.body.status || 'draft',
      created_at: new Date().toISOString()
    };
    const flow = await db.createFlow(flowData);
    res.json({ success: true, data: flow });
  } catch (error: any) {
    logger.error('Create flow error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const flow = await db.updateFlow(id, req.body);
    res.json({ success: true, data: flow });
  } catch (error: any) {
    logger.error('Update flow error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    await db.deleteFlow(id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete flow error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
