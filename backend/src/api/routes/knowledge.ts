import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../services/database.js';
import { supabase } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const knowledge = await db.getKnowledgeBase(agentId);
    const normalized = (knowledge || []).map((item: any) => ({
      ...item,
      category: item.category || item.metadata?.category || 'general',
      tags: Array.isArray(item.tags) ? item.tags : (Array.isArray(item.metadata?.tags) ? item.metadata.tags : [])
    }));
    res.json({ success: true, data: normalized });
  } catch (error: any) {
    logger.error('Get knowledge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/upload', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { agentId } = req.body;
    const file = req.file;
    const fileName = `${agentId}/${Date.now()}_${file.originalname}`;

    // Upload to Supabase Storage
    if (supabase) {
      const { data, error } = await supabase.storage
        .from('agent-knowledge')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        logger.error('Supabase upload error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('agent-knowledge')
        .getPublicUrl(fileName);

      // Save to database
      const knowledgeData = {
        agent_id: agentId,
        title: file.originalname,
        file_url: urlData.publicUrl,
        file_type: file.mimetype,
        created_at: new Date().toISOString()
      };
      
      console.log('Knowledge data to insert:', knowledgeData);
      console.log('Title length:', file.originalname?.length || 0);
      console.log('Title value:', file.originalname);
      
      const knowledge = await db.addKnowledge(knowledgeData);

      res.json({ success: true, data: knowledge });
    } else {
      // Mock response if Supabase not configured
      res.json({ 
        success: true, 
        data: { 
          id: '1', 
          agent_id: agentId, 
          title: file.originalname,
          file_url: 'mock-url',
          file_type: file.mimetype
        } 
      });
    }
  } catch (error: any) {
    logger.error('Upload knowledge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      agentId,
      agent_id,
      title,
      content,
      type,
      category,
      tags,
      metadata
    } = req.body;

    const resolvedAgentId = agentId || agent_id;

    if (!resolvedAgentId || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'agentId (or agent_id), title, and content are required'
      });
    }
    
    const knowledge = await db.addKnowledge({
      agent_id: resolvedAgentId,
      title,
      content,
      metadata: {
        ...(metadata || {}),
        category: category || type || 'general',
        tags: Array.isArray(tags) ? tags : []
      },
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
    await db.deleteKnowledge(id);
    res.json({ success: true, message: 'Knowledge deleted' });
  } catch (error: any) {
    logger.error('Delete knowledge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, category, tags, metadata } = req.body;

    const updates: any = {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {})
    };

    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: 'tags must be an array when provided'
      });
    }

    if (category !== undefined || tags !== undefined || metadata !== undefined) {
      updates.metadata = {
        ...(metadata || {}),
        ...(category !== undefined ? { category } : {}),
        ...(tags !== undefined ? { tags } : {})
      };
    }

    const knowledge = await db.updateKnowledge(id, updates);
    const normalized = {
      ...knowledge,
      category: knowledge.category || knowledge.metadata?.category || 'general',
      tags: Array.isArray(knowledge.tags) ? knowledge.tags : (Array.isArray(knowledge.metadata?.tags) ? knowledge.metadata.tags : [])
    };
    res.json({ success: true, data: normalized });
  } catch (error: any) {
    logger.error('Update knowledge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
