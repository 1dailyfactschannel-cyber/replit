-- Add description field to board_columns table
ALTER TABLE board_columns ADD COLUMN IF NOT EXISTS description TEXT CHECK (char_length(description) <= 500);
