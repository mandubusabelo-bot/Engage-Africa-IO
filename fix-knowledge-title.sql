-- Fix knowledge_base title field length
ALTER TABLE knowledge_base ALTER COLUMN title TYPE VARCHAR(255);
