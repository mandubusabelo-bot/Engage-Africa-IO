import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

let supabaseInstance: any = null;
let initialized = false;

function getSupabase() {
  if (!initialized) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
    
    console.log('🔍 Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
    console.log('🔍 Supabase Key:', supabaseKey ? 'Found' : 'Missing');
    
    if (supabaseUrl && supabaseKey) {
      try {
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
        logger.info('✅ Supabase connected successfully');
        console.log('✅ Supabase client created');
      } catch (error) {
        logger.error('❌ Failed to create Supabase client:', error);
      }
    } else {
      logger.warn('Supabase not configured - using mock data for local development');
      console.log('❌ Missing Supabase credentials');
    }
    initialized = true;
  }
  return supabaseInstance;
}

// Export a getter instead of initializing immediately
export let supabase: any = null;

// Initialize on first access
export function initSupabase() {
  if (!supabase) {
    supabase = getSupabase();
  }
  return supabase;
}

export const db = {
  async getUsers() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  },

  async getUserById(id: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getUserByEmail(email: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  },

  async createUser(user: any) {
    if (!supabase) return { id: '1', ...user };
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return data;
  },

  async getAgents(userId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  },

  async createAgent(agent: any) {
    if (!supabase) return { id: '1', ...agent };
    const { data, error } = await supabase.from('agents').insert(agent).select().single();
    if (error) throw error;
    return data;
  },

  async getAllMessages() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },

  async getMessages(agentId: string, limit = 100) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getMessagesByPhone(agentId: string, phone: string, limit = 100) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('agent_id', agentId)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async createMessage(message: any) {
    if (!supabase) return { id: '1', ...message };
    const { data, error } = await supabase.from('messages').insert(message).select().single();
    if (error) throw error;
    return data;
  },

  async getKnowledgeBase(agentId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addKnowledge(knowledge: any) {
    if (!supabase) return { id: '1', ...knowledge };

    const { data, error } = await supabase.from('knowledge_base').insert(knowledge).select().single();

    if (error) throw error;

    return data;
  },

  async updateKnowledge(id: string, updates: any) {
    if (!supabase) return { id, ...updates };
    const { data, error } = await supabase
      .from('knowledge_base')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteKnowledge(id: string) {
    if (!supabase) return true;
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async getAnalytics(userId: string, startDate: string, endDate: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;
    return data;
  },

  // Product methods
  async getProducts(filters?: any) {
    if (!supabase) return [];
    let query = supabase.from('products').select('*');
    
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.stock_status) {
      query = query.eq('stock_status', filters.stock_status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getProductById(id: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getProductByName(name: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('name', name)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createProduct(product: any) {
    if (!supabase) return { id: '1', ...product };
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id: string, updates: any) {
    if (!supabase) return { id, ...updates };
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async searchProducts(query: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    if (error) throw error;
    return data;
  },

  // Flow methods
  async getFlows(userId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('flows')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  },

  async createFlow(flow: any) {
    if (!supabase) return { id: '1', ...flow };
    const { data, error } = await supabase
      .from('flows')
      .insert(flow)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateFlow(id: string, updates: any) {
    if (!supabase) return { id, ...updates };
    const { data, error } = await supabase
      .from('flows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteFlow(id: string) {
    if (!supabase) return true;
    const { error } = await supabase
      .from('flows')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Template methods
  async getTemplates(userId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  },

  async createTemplate(template: any) {
    if (!supabase) return { id: '1', ...template };
    const { data, error } = await supabase
      .from('templates')
      .insert(template)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTemplate(id: string, updates: any) {
    if (!supabase) return { id, ...updates };
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTemplate(id: string) {
    if (!supabase) return true;
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async updateAgent(id: string, updates: any) {
    if (!supabase) return { id, ...updates };
    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAgent(id: string) {
    if (!supabase) return true;
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Agent Actions
  async getAgentActions(agentId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('agent_id', agentId)
      .order('priority', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createAgentAction(action: any) {
    if (!supabase) return { id: '1', ...action };
    const { data, error } = await supabase
      .from('agent_actions')
      .insert(action)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAgentAction(id: string, updates: any) {
    if (!supabase) return { id, ...updates };
    const { data, error } = await supabase
      .from('agent_actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAgentAction(id: string) {
    if (!supabase) return true;
    const { error } = await supabase
      .from('agent_actions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Contacts
  async getContacts(userId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getContactByPhone(phone: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', phone)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createContact(contact: any) {
    if (!supabase) return { id: '1', ...contact };
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateContact(id: string, updates: any) {
    if (!supabase) return { id, ...updates };
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Teams
  async getTeams(userId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createTeam(team: any) {
    if (!supabase) return { id: '1', ...team };
    const { data, error } = await supabase
      .from('teams')
      .insert(team)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Conversation Management
  async closeConversation(conversationId: string, reason: string, closedBy: string = 'ai') {
    if (!supabase) return { id: conversationId, status: 'closed' };
    const { data, error } = await supabase
      .from('conversations')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: closedBy,
        closure_reason: reason
      })
      .eq('id', conversationId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async assignConversation(conversationId: string, assignedToType: string, assignedToId: string, assignedBy: string = 'ai') {
    if (!supabase) return { id: '1' };
    
    // Update conversation status
    await supabase
      .from('conversations')
      .update({ status: 'assigned' })
      .eq('id', conversationId);
    
    // Create assignment record
    const { data, error } = await supabase
      .from('conversation_assignments')
      .insert({
        conversation_id: conversationId,
        assigned_to_type: assignedToType,
        assigned_to_id: assignedToId,
        assigned_by: assignedBy
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateContactLifecycle(contactId: string, newStage: string) {
    if (!supabase) return { id: contactId, lifecycle_stage: newStage };
    const { data, error } = await supabase
      .from('contacts')
      .update({ lifecycle_stage: newStage })
      .eq('id', contactId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
