import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: any, res) => {
  try {
    // Get agents and messages for analytics
    const agents = await db.getAgents(req.user.id);
    const messages = await db.getAllMessages();
    
    const activeAgents = agents.filter((a: any) => a.status === 'active').length;
    const totalMessages = messages.length;
    const avgResponseTime = 2.3; // Calculate from actual data later
    const responseRate = agents.reduce((sum: number, a: any) => sum + (a.response_rate || 0), 0) / (agents.length || 1);
    
    // Calculate message data for chart (last 7 days)
    const messageData = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      messageData.push({
        day: days[i],
        messages: Math.floor(Math.random() * 500) + 100 // Replace with actual data
      });
    }
    
    // Top performing agents
    const topAgents = agents
      .sort((a: any, b: any) => (b.message_count || 0) - (a.message_count || 0))
      .slice(0, 5)
      .map((a: any) => ({
        name: a.name,
        messages: a.message_count || 0,
        responseRate: a.response_rate || 0
      }));
    
    const analyticsData = {
      totalMessages,
      activeAgents,
      responseRate: Math.round(responseRate),
      avgResponseTime,
      activeConversations: Math.floor(totalMessages * 0.3),
      messageGrowth: 23,
      userGrowth: 18,
      agentGrowth: 12,
      responseImprovement: -15,
      messageData,
      maxMessages: Math.max(...messageData.map(d => d.messages)),
      topAgents
    };

    res.json({ success: true, data: analyticsData });
  } catch (error: any) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
