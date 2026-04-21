-- Add work start/end time columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_start_time TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_end_time TEXT;
