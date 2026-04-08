import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Supabase credentials not configured');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const db = {
  async getUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  },

  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async createUser(user: any) {
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return data;
  },

  async getAgents(userId: string) {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  },

  async createAgent(agent: any) {
    const { data, error } = await supabase.from('agents').insert(agent).select().single();
    if (error) throw error;
    return data;
  },

  async getMessages(agentId: string, limit = 100) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async createMessage(message: any) {
    const { data, error } = await supabase.from('messages').insert(message).select().single();
    if (error) throw error;
    return data;
  },

  async getKnowledgeBase(agentId: string) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('agent_id', agentId);
    if (error) throw error;
    return data;
  },

  async addKnowledge(knowledge: any) {
    const { data, error } = await supabase.from('knowledge_base').insert(knowledge).select().single();
    if (error) throw error;
    return data;
  },

  async getAnalytics(userId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;
    return data;
  }
};
