-- Add missing columns that exist in schema but were dropped by earlier migrations

-- tasks.tags was dropped in 0002_young_steel_serpent.sql but still exists in schema
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Ensure users work time columns exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_start_time TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_end_time TEXT;
