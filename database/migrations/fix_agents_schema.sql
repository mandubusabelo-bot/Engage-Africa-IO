-- Fix agents table schema to match application requirements
-- Run this in Supabase SQL Editor

-- Add missing columns
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT 'You are a helpful AI assistant for Engage Africa. Be friendly, concise, and helpful.';

-- Update existing agents to be active
UPDATE agents SET is_active = true WHERE is_active IS NULL;

-- Add comments
COMMENT ON COLUMN agents.is_active IS 'Whether the agent is active and can respond to messages';
COMMENT ON COLUMN agents.system_prompt IS 'AI system prompt that defines agent behavior and personality';
