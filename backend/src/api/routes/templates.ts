import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: any, res) => {
  try {
    const templates = await db.getTemplates(req.user.id);
    res.json({ success: true, data: templates });
  } catch (error: any) {
    logger.error('Get templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const templateData = {
      ...req.body,
      user_id: req.user.id,
      created_at: new Date().toISOString()
    };
    const template = await db.createTemplate(templateData);
    res.json({ success: true, data: template });
  } catch (error: any) {
    logger.error('Create template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const template = await db.updateTemplate(id, req.body);
    res.json({ success: true, data: template });
  } catch (error: any) {
    logger.error('Update template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    await db.deleteTemplate(id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
