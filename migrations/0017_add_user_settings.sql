-- Migration: Add user_settings table
-- Description: Table for storing user preferences (UI state, collapsed projects, etc.)

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Comment for documentation
COMMENT ON TABLE user_settings IS 'Stores user preferences and UI state (selected workspace, project, board, collapsed projects, etc.)';
