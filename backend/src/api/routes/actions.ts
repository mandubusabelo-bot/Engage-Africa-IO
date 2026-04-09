import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authenticate);

// Get all actions for an agent
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const actions = await db.getAgentActions(agentId);
    res.json({ success: true, data: actions });
  } catch (error: any) {
    logger.error('Get agent actions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new action
router.post('/', async (req: any, res) => {
  try {
    const actionData = {
      ...req.body,
      created_at: new Date().toISOString()
    };
    const action = await db.createAgentAction(actionData);
    res.json({ success: true, data: action });
  } catch (error: any) {
    logger.error('Create agent action error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update an action
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const action = await db.updateAgentAction(id, req.body);
    res.json({ success: true, data: action });
  } catch (error: any) {
    logger.error('Update agent action error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete an action
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteAgentAction(id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete agent action error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all contacts
router.get('/contacts', async (req: any, res) => {
  try {
    const contacts = await db.getContacts(req.user.id);
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    logger.error('Get contacts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create contact
router.post('/contacts', async (req: any, res) => {
  try {
    const contactData = {
      ...req.body,
      user_id: req.user.id,
      created_at: new Date().toISOString()
    };
    const contact = await db.createContact(contactData);
    res.json({ success: true, data: contact });
  } catch (error: any) {
    logger.error('Create contact error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update contact
router.put('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await db.updateContact(id, req.body);
    res.json({ success: true, data: contact });
  } catch (error: any) {
    logger.error('Update contact error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all teams
router.get('/teams', async (req: any, res) => {
  try {
    const teams = await db.getTeams(req.user.id);
    res.json({ success: true, data: teams });
  } catch (error: any) {
    logger.error('Get teams error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create team
router.post('/teams', async (req: any, res) => {
  try {
    const teamData = {
      ...req.body,
      user_id: req.user.id,
      created_at: new Date().toISOString()
    };
    const team = await db.createTeam(teamData);
    res.json({ success: true, data: team });
  } catch (error: any) {
    logger.error('Create team error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute action - close conversation
router.post('/execute/close-conversation', async (req, res) => {
  try {
    const { conversationId, reason } = req.body;
    const result = await db.closeConversation(conversationId, reason, 'ai');
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Close conversation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute action - assign conversation
router.post('/execute/assign-conversation', async (req, res) => {
  try {
    const { conversationId, assignedToType, assignedToId } = req.body;
    const result = await db.assignConversation(conversationId, assignedToType, assignedToId, 'ai');
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Assign conversation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute action - update lifecycle
router.post('/execute/update-lifecycle', async (req, res) => {
  try {
    const { contactId, newStage } = req.body;
    const result = await db.updateContactLifecycle(contactId, newStage);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Update lifecycle error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
