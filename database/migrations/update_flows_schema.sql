-- Migration to update flows table for complex trigger support
-- Run this in Supabase SQL Editor

-- Add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'trigger'
  ) THEN
    ALTER TABLE flows ADD COLUMN trigger JSONB DEFAULT '{"type": "manual"}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'steps'
  ) THEN
    ALTER TABLE flows ADD COLUMN steps JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE flows ADD COLUMN is_active BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'run_count'
  ) THEN
    ALTER TABLE flows ADD COLUMN run_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Migrate existing data from trigger_type to trigger JSONB (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'trigger_type'
  ) THEN
    UPDATE flows 
    SET trigger = CASE 
      WHEN trigger_type = 'manual' THEN '{"type": "manual"}'::jsonb
      WHEN trigger_type = 'scheduled' THEN '{"type": "scheduled", "schedule": "0 */6 * * *"}'::jsonb
      WHEN trigger_type = 'webhook' THEN '{"type": "webhook", "webhookUrl": ""}'::jsonb
      WHEN trigger_type = 'event' THEN '{"type": "event", "event": "whatsapp.inbound_message"}'::jsonb
      ELSE '{"type": "manual"}'::jsonb
    END
    WHERE trigger_type IS NOT NULL;
  END IF;
END $$;

-- Migrate nodes to steps if nodes exists and steps is empty (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'nodes'
  ) THEN
    UPDATE flows 
    SET steps = nodes
    WHERE steps = '[]'::jsonb AND nodes != '[]'::jsonb;
  END IF;
END $$;

-- Drop old columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'trigger_type'
  ) THEN
    ALTER TABLE flows DROP COLUMN trigger_type;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'nodes'
  ) THEN
    ALTER TABLE flows DROP COLUMN nodes;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'edges'
  ) THEN
    ALTER TABLE flows DROP COLUMN edges;
  END IF;
END $$;
