# Database Setup Guide

## Supabase Configuration

### Step 1: Run the Schema

1. Go to your Supabase project: https://gjizhfacvjklggxfrxxc.supabase.co
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste and run it in the SQL Editor
5. Verify all tables were created successfully

### Step 2: Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Create a new bucket named: `agent-knowledge`
3. Set it to **Public** or **Private** based on your needs
4. Run the storage policies (see below)

### Step 3: Storage Policies

Run these in the SQL Editor to set up storage policies:

```sql
-- Allow authenticated uploads
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-knowledge');

-- Allow authenticated reads
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'agent-knowledge');

-- Allow authenticated deletes
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-knowledge');

-- Allow authenticated updates
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agent-knowledge');
```

### Step 4: Enable Row Level Security (RLS)

For production, enable RLS on all tables:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies (example for agents table)
CREATE POLICY "Users can view their own agents"
  ON agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agents"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
  ON agents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
  ON agents FOR DELETE
  USING (auth.uid() = user_id);
```

## Database Tables

### Core Tables
- **users**: User accounts
- **agents**: AI agents configuration
- **flows**: Workflow automation
- **templates**: Message templates
- **conversations**: Chat conversations
- **messages**: Individual messages
- **knowledge_base**: Agent knowledge documents
- **whatsapp_sessions**: WhatsApp connection sessions
- **analytics**: Usage analytics
- **products**: Product catalog

### Agent Actions Tables
- **contacts**: Customer contact management
- **teams**: Team management
- **agent_actions**: Agent action configurations
- **conversation_assignments**: Conversation routing

## Verification

After setup, verify the database:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check sample data
SELECT * FROM users WHERE email = 'demo@engage.io';
SELECT * FROM contacts LIMIT 5;
SELECT * FROM teams LIMIT 5;
```

## Next Steps

1. Update your `.env.local` file with Supabase credentials
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Test the database connection at `/api/health`
