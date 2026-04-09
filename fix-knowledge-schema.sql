-- Fix knowledge_base table schema
-- Drop and recreate if needed to ensure correct structure

-- First, let's check if the table exists and drop it
DROP TABLE IF EXISTS knowledge_base CASCADE;

-- Recreate with correct schema
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

-- Add trigger for updated_at
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index
CREATE INDEX idx_knowledge_base_agent_id ON knowledge_base(agent_id);
