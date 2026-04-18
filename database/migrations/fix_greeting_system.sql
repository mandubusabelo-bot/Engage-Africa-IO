-- Migration: Fix greeting system to prevent repeated greetings
-- Created: 2026-04-18

-- Add greeting_sent flag to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS greeting_sent BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_greeting_sent ON conversations(greeting_sent);

-- Update existing conversations to mark as greeted (assume all existing convos have been greeted)
UPDATE conversations SET greeting_sent = TRUE WHERE greeting_sent IS NULL OR greeting_sent = FALSE;
