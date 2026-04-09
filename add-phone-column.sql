-- Add phone column to messages table for WhatsApp integration
ALTER TABLE messages ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Create index for faster lookups by phone number
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone);
