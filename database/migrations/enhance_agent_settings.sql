-- Migration: Enhance agent settings with new fields
-- Created: 2026-04-17

-- Add new columns to agents table for enhanced settings
ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_name TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS greeting_message TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS fallback_message TEXT DEFAULT 'I apologize, but I don''t have enough information to answer that. Let me connect you with a human agent who can help.';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS never_say TEXT DEFAULT '';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'professional';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT '';

-- Response behavior fields
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_response_length TEXT DEFAULT 'medium';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS response_language TEXT DEFAULT 'auto';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS unknown_answer_action TEXT DEFAULT 'Apologise briefly, tell the contact you will find out, and assign the conversation to a human agent immediately.';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ask_one_question BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS confirm_before_closing BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS inactivity_timeout_message TEXT DEFAULT 'Just checking in — are you still there? 😊';

-- Conversation continuity fields
ALTER TABLE agents ADD COLUMN IF NOT EXISTS suppress_intro_returning BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS returning_contact_message TEXT DEFAULT 'Welcome back, {{contact.name}}! How can I help you today?';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS returning_contact_window_hours INTEGER DEFAULT 24;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS remember_last_topic BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS inject_summary_on_reassign BOOLEAN DEFAULT true;

-- Context memory fields
ALTER TABLE agents ADD COLUMN IF NOT EXISTS remember_contact_name BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS remember_last_product BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS remember_open_issues BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_context_turns INTEGER DEFAULT 10;

-- Follow-up behavior
ALTER TABLE agents ADD COLUMN IF NOT EXISTS follow_up_behavior TEXT DEFAULT 'natural';

-- Actions configuration (JSONB for structured action settings)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS actions_config JSONB DEFAULT '{}';

-- Knowledge base configuration per agent
ALTER TABLE agents ADD COLUMN IF NOT EXISTS kb_config JSONB DEFAULT '{}';

-- Create conversations metadata table for greeting tracking
CREATE TABLE IF NOT EXISTS conversation_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  greeting_sent BOOLEAN DEFAULT false,
  last_topic TEXT,
  open_issues JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_metadata_conversation_id ON conversation_metadata(conversation_id);

-- Update existing agents with default values
UPDATE agents SET 
  agent_name = COALESCE(agent_name, name),
  tone = COALESCE(tone, 'professional'),
  fallback_message = COALESCE(fallback_message, 'I apologize, but I don''t have enough information to answer that. Let me connect you with a human agent who can help.'),
  system_prompt = COALESCE(system_prompt, instructions, '');

-- Create knowledge base file settings table
CREATE TABLE IF NOT EXISTS knowledge_base_file_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id UUID NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  search_strategy TEXT DEFAULT 'relevant', -- 'always', 'relevant', 'never'
  confidence_threshold INTEGER DEFAULT 70,
  last_trained_at TIMESTAMPTZ,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kb_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_kb_file_settings_kb_id ON knowledge_base_file_settings(kb_id);
CREATE INDEX IF NOT EXISTS idx_kb_file_settings_agent_id ON knowledge_base_file_settings(agent_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at (using DO block to check existence)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversation_metadata_updated_at'
  ) THEN
    CREATE TRIGGER update_conversation_metadata_updated_at
      BEFORE UPDATE ON conversation_metadata
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_kb_file_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_kb_file_settings_updated_at
      BEFORE UPDATE ON knowledge_base_file_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add actions table for structured action definitions
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'close_conversation', 'assign_agent', 'update_lifecycle', etc.
  is_enabled BOOLEAN DEFAULT false,
  trigger_condition TEXT DEFAULT '',
  instruction TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_id ON agent_actions(agent_id);

-- Ensure all columns exist (for existing tables)
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT false;
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS trigger_condition TEXT DEFAULT '';
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS instruction TEXT DEFAULT '';
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Alter priority column type if it exists as integer (migration fix)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_actions' 
    AND column_name = 'priority' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE agent_actions ALTER COLUMN priority TYPE TEXT USING 
      CASE priority
        WHEN 1 THEN 'low'
        WHEN 2 THEN 'medium'
        WHEN 3 THEN 'high'
        ELSE 'medium'
      END;
  END IF;
END $$;

-- Insert default actions for existing agents
INSERT INTO agent_actions (agent_id, action_type, is_enabled, priority)
SELECT id, 'close_conversation', false, 'medium'::TEXT
FROM agents
ON CONFLICT DO NOTHING;

INSERT INTO agent_actions (agent_id, action_type, is_enabled, priority)
SELECT id, 'assign_to_agent', false, 'medium'::TEXT
FROM agents
ON CONFLICT DO NOTHING;

INSERT INTO agent_actions (agent_id, action_type, is_enabled, priority)
SELECT id, 'update_lifecycle', false, 'medium'::TEXT
FROM agents
ON CONFLICT DO NOTHING;

INSERT INTO agent_actions (agent_id, action_type, is_enabled, priority)
SELECT id, 'update_contact_field', false, 'medium'::TEXT
FROM agents
ON CONFLICT DO NOTHING;

INSERT INTO agent_actions (agent_id, action_type, is_enabled, priority)
SELECT id, 'update_tags', false, 'medium'::TEXT
FROM agents
ON CONFLICT DO NOTHING;

INSERT INTO agent_actions (agent_id, action_type, is_enabled, priority)
SELECT id, 'trigger_workflow', false, 'medium'::TEXT
FROM agents
ON CONFLICT DO NOTHING;

INSERT INTO agent_actions (agent_id, action_type, is_enabled, priority)
SELECT id, 'add_comment', false, 'low'::TEXT
FROM agents
ON CONFLICT DO NOTHING;

INSERT INTO agent_actions (agent_id, action_type, is_enabled, priority)
SELECT id, 'handle_call', false, 'high'::TEXT
FROM agents
ON CONFLICT DO NOTHING;

INSERT INTO agent_actions (agent_id, action_type, is_enabled, priority)
SELECT id, 'http_request', false, 'medium'::TEXT
FROM agents
ON CONFLICT DO NOTHING;

COMMENT ON TABLE agent_actions IS 'Stores configured actions for each agent with their trigger conditions and instructions';
COMMENT ON TABLE conversation_metadata IS 'Tracks conversation state like greeting sent, last topic, open issues';
COMMENT ON TABLE knowledge_base_file_settings IS 'Per-agent settings for KB files including search strategy and confidence threshold';
