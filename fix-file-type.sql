-- Fix file_type field length in knowledge_base table
ALTER TABLE knowledge_base ALTER COLUMN file_type TYPE VARCHAR(255);
