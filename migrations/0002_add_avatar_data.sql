-- Add new avatar_data column for binary storage
ALTER TABLE users ADD COLUMN avatar_data bytea;

-- Update schema to use bytea for new avatar storage
-- The old avatar column will be deprecated but kept for backward compatibility