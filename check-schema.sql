-- Check the actual structure of the knowledge_base table
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'knowledge_base' 
ORDER BY ordinal_position;
