-- Add config column to agent_actions table
-- This column stores JSON configuration for actions (e.g., phone numbers, API endpoints)

ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS config JSONB DEFAULT NULL;

COMMENT ON COLUMN agent_actions.config IS 'JSON configuration for the action (e.g., humanAgentPhone, API endpoints, etc.)';
