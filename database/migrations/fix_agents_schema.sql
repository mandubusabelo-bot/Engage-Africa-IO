ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT 'You are a helpful AI assistant for Engage Africa. Be friendly, concise, and helpful.';

UPDATE agents SET is_active = true WHERE is_active IS NULL;
