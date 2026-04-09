-- =====================================================
-- FRESH INSTALL - COMPLETE SUPABASE SCHEMA
-- This will DROP existing tables and recreate everything
-- WARNING: This will delete all existing data!
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS conversation_assignments CASCADE;
DROP TABLE IF EXISTS agent_actions CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS whatsapp_sessions CASCADE;
DROP TABLE IF EXISTS knowledge_base CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS flows CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- BASE TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  personality VARCHAR(50) DEFAULT 'professional',
  language VARCHAR(50) DEFAULT 'english',
  status VARCHAR(20) DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  response_rate INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flows table
CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50),
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  variables JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  contact_phone VARCHAR(50),
  contact_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'open',
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by VARCHAR(20),
  closure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  sender VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base table
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  file_url TEXT,
  file_type VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp sessions table
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_data JSONB,
  qr_code TEXT,
  status VARCHAR(20) DEFAULT 'disconnected',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  response_time FLOAT DEFAULT 0,
  satisfaction FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  stock_status VARCHAR(50),
  category VARCHAR(100),
  image_url TEXT,
  url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AGENT ACTIONS TABLES
-- =====================================================

-- Contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(50),
  email VARCHAR(255),
  name VARCHAR(255),
  lifecycle_stage VARCHAR(50) DEFAULT 'lead',
  custom_fields JSONB DEFAULT '{}',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  members JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent actions table
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  action_config JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation assignments table
CREATE TABLE conversation_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  assigned_to_type VARCHAR(20),
  assigned_to_id UUID,
  assigned_by VARCHAR(20) DEFAULT 'ai',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active'
);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flows_updated_at BEFORE UPDATE ON flows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_actions_updated_at BEFORE UPDATE ON agent_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_flows_user_id ON flows(user_id);
CREATE INDEX idx_flows_status ON flows(status);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_agent_id ON messages(agent_id);
CREATE INDEX idx_knowledge_base_agent_id ON knowledge_base(agent_id);
CREATE INDEX idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);
CREATE INDEX idx_analytics_user_id ON analytics(user_id);
CREATE INDEX idx_analytics_agent_id ON analytics(agent_id);
CREATE INDEX idx_analytics_date ON analytics(date);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_lifecycle_stage ON contacts(lifecycle_stage);
CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_agent_actions_agent_id ON agent_actions(agent_id);
CREATE INDEX idx_agent_actions_action_type ON agent_actions(action_type);
CREATE INDEX idx_agent_actions_enabled ON agent_actions(enabled);
CREATE INDEX idx_conversation_assignments_conversation_id ON conversation_assignments(conversation_id);
CREATE INDEX idx_conversation_assignments_assigned_to_id ON conversation_assignments(assigned_to_id);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

INSERT INTO users (email, name) VALUES ('demo@engage.io', 'Demo User');

INSERT INTO contacts (user_id, phone, email, name, lifecycle_stage, custom_fields)
VALUES (
  (SELECT id FROM users WHERE email = 'demo@engage.io'),
  '+27123456789',
  'customer@example.com',
  'John Doe',
  'lead',
  '{"company": "Acme Corp", "source": "website"}'::jsonb
);

INSERT INTO teams (user_id, name, description, members)
VALUES (
  (SELECT id FROM users WHERE email = 'demo@engage.io'),
  'Customer Support',
  'Main customer support team',
  '[]'::jsonb
);

-- Insert sample agent for testing actions
INSERT INTO agents (user_id, name, description, status)
SELECT 
  (SELECT id FROM users WHERE email = 'demo@engage.io'),
  'Demo Agent',
  'Sample agent for testing actions',
  'active'
WHERE NOT EXISTS (SELECT 1 FROM agents WHERE name = 'Demo Agent');

-- =====================================================
-- SUCCESS!
-- All tables created with agent actions support
-- =====================================================
