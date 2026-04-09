-- Supabase Storage Policies for Agent Knowledge Base
-- Run this in Supabase SQL Editor after creating the bucket

-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-knowledge');

-- Policy 2: Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'agent-knowledge');

-- Policy 3: Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-knowledge');

-- Policy 4: Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agent-knowledge')
WITH CHECK (bucket_id = 'agent-knowledge');
