# Supabase Storage Setup for Agent Knowledge Base

## Create Storage Bucket

1. **Go to your Supabase project:**
   https://oaeirdgffwodkbcstdfh.supabase.co

2. **Click "Storage" in the left sidebar**

3. **Click "New bucket"**

4. **Create bucket with these settings:**
   - **Name:** `agent-knowledge`
   - **Public bucket:** OFF (keep it private)
   - **File size limit:** 50 MB
   - **Allowed MIME types:** Leave empty (allow all) or add:
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `text/plain`
     - `text/csv`

5. **Click "Create bucket"**

## Set Bucket Policies

After creating the bucket, set up RLS (Row Level Security) policies:

1. Click on the `agent-knowledge` bucket
2. Click "Policies" tab
3. Click "New Policy"
4. Create these policies:

### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-knowledge');
```

### Policy 2: Allow authenticated users to read
```sql
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'agent-knowledge');
```

### Policy 3: Allow authenticated users to delete
```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-knowledge');
```

## Usage in App

Once the bucket is created, you can upload documents for agent knowledge base:

1. Go to Agents page
2. Click on an agent
3. Upload documents (PDF, Word, TXT, CSV)
4. The AI will use these documents to answer questions

## API Integration

The backend will use these endpoints:

```typescript
// Upload document
const { data, error } = await supabase.storage
  .from('agent-knowledge')
  .upload(`${agentId}/${fileName}`, file);

// List agent documents
const { data, error } = await supabase.storage
  .from('agent-knowledge')
  .list(agentId);

// Download document
const { data, error } = await supabase.storage
  .from('agent-knowledge')
  .download(`${agentId}/${fileName}`);

// Delete document
const { data, error } = await supabase.storage
  .from('agent-knowledge')
  .remove([`${agentId}/${fileName}`]);
```
