CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255),
  profile_pic_url TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  assigned_agent_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
