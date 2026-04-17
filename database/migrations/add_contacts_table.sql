-- Create contacts table for storing WhatsApp contact information
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255),
  profile_pic_url TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_agent ON contacts(assigned_agent_id);

-- Add comments
COMMENT ON TABLE contacts IS 'WhatsApp contacts with their information and assigned agents';
COMMENT ON COLUMN contacts.phone IS 'WhatsApp phone number in format: 27685037221@s.whatsapp.net';
COMMENT ON COLUMN contacts.assigned_agent_id IS 'Agent assigned to handle this contact';
