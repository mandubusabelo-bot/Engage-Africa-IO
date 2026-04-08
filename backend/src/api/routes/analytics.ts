import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await db.getAnalytics(
      req.user.id,
      startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate as string || new Date().toISOString()
    );
    
    const summary = {
      totalMessages: analytics.reduce((sum: number, a: any) => sum + (a.messages || 0), 0),
      totalUsers: analytics.reduce((sum: number, a: any) => sum + (a.users || 0), 0),
      avgResponseTime: analytics.reduce((sum: number, a: any) => sum + (a.response_time || 0), 0) / analytics.length,
      satisfactionRate: analytics.reduce((sum: number, a: any) => sum + (a.satisfaction || 0), 0) / analytics.length
    };

    res.json({ success: true, data: { analytics, summary } });
  } catch (error: any) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
