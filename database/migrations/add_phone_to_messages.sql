-- Add phone column to messages table for WhatsApp integration
-- Run this in Supabase SQL Editor

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS phone VARCHAR(100);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone);

-- Add comment
COMMENT ON COLUMN messages.phone IS 'WhatsApp phone number in format: 27685037221@s.whatsapp.net';
