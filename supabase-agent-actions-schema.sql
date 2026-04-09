-- =====================================================
-- AGENT ACTIONS SCHEMA
-- Supports AI Agent automated actions like Respond.io
-- =====================================================

-- Contacts table for managing customer contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(50),
  email VARCHAR(255),
  name VARCHAR(255),
  lifecycle_stage VARCHAR(50) DEFAULT 'lead', -- lead, prospect, customer, churned
  custom_fields JSONB DEFAULT '{}',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table for agent assignment
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  members JSONB DEFAULT '[]', -- Array of user IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent actions configuration table
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- close_conversation, assign_to_agent, assign_to_team, update_lifecycle, update_contact_fields
  enabled BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}', -- When should this action trigger
  action_config JSONB DEFAULT '{}', -- What should the action do
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation assignments table
CREATE TABLE IF NOT EXISTS conversation_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  assigned_to_type VARCHAR(20), -- 'agent', 'team', 'human'
  assigned_to_id UUID, -- ID of agent, team, or user
  assigned_by VARCHAR(20) DEFAULT 'ai', -- 'ai' or 'manual'
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' -- active, completed, transferred
);

-- Update conversations table to support lifecycle and closure
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open'; -- open, closed, assigned
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_by VARCHAR(20); -- ai, human, system
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closure_reason TEXT;

-- Update contacts table trigger
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

-- Update teams table trigger
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- Update agent_actions table trigger
CREATE OR REPLACE FUNCTION update_agent_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agent_actions_updated_at ON agent_actions;
CREATE TRIGGER update_agent_actions_updated_at
  BEFORE UPDATE ON agent_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_actions_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_lifecycle_stage ON contacts(lifecycle_stage);

CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_id ON agent_actions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_action_type ON agent_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_agent_actions_enabled ON agent_actions(enabled);

CREATE INDEX IF NOT EXISTS idx_conversation_assignments_conversation_id ON conversation_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_assigned_to_id ON conversation_assignments(assigned_to_id);

CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- Sample data for testing
INSERT INTO contacts (user_id, phone, email, name, lifecycle_stage, custom_fields)
SELECT 
  (SELECT id FROM users LIMIT 1),
  '+27123456789',
  'customer@example.com',
  'John Doe',
  'lead',
  '{"company": "Acme Corp", "source": "website"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE phone = '+27123456789');

INSERT INTO teams (user_id, name, description, members)
SELECT 
  (SELECT id FROM users LIMIT 1),
  'Customer Support',
  'Main customer support team',
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Customer Support');

-- Example agent actions
INSERT INTO agent_actions (agent_id, action_type, enabled, conditions, action_config)
SELECT 
  (SELECT id FROM agents LIMIT 1),
  'close_conversation',
  true,
  '{"rules": ["Contact confirms issue is resolved", "No further help required"]}'::jsonb,
  '{"closure_reason": "Issue resolved by AI"}'::jsonb
WHERE EXISTS (SELECT 1 FROM agents LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM agent_actions WHERE action_type = 'close_conversation');

INSERT INTO agent_actions (agent_id, action_type, enabled, conditions, action_config)
SELECT 
  (SELECT id FROM agents LIMIT 1),
  'assign_to_team',
  true,
  '{"rules": ["Issue cannot be resolved using Knowledge source", "Contact requests a human"]}'::jsonb,
  '{"team_name": "Customer Support"}'::jsonb
WHERE EXISTS (SELECT 1 FROM agents LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM agent_actions WHERE action_type = 'assign_to_team');

INSERT INTO agent_actions (agent_id, action_type, enabled, conditions, action_config)
SELECT 
  (SELECT id FROM agents LIMIT 1),
  'update_contact_fields',
  true,
  '{"rules": ["Contact provides email, name, or phone number"]}'::jsonb,
  '{"fields": ["email", "name", "phone"]}'::jsonb
WHERE EXISTS (SELECT 1 FROM agents LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM agent_actions WHERE action_type = 'update_contact_fields');

INSERT INTO agent_actions (agent_id, action_type, enabled, conditions, action_config)
SELECT 
  (SELECT id FROM agents LIMIT 1),
  'update_lifecycle',
  true,
  '{"rules": ["Contact makes a purchase", "Contact shows buying intent"]}'::jsonb,
  '{"new_stage": "customer"}'::jsonb
WHERE EXISTS (SELECT 1 FROM agents LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM agent_actions WHERE action_type = 'update_lifecycle');
