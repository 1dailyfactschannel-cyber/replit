-- Migration: Add team_rooms table for video conferencing rooms
-- Created: 2026-03-10

-- Create team_rooms table
CREATE TABLE IF NOT EXISTS team_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    invite_code TEXT NOT NULL UNIQUE,
    access_type TEXT NOT NULL DEFAULT 'open',
    color TEXT DEFAULT '#3b82f6',
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS team_rooms_slug_idx ON team_rooms(slug);
CREATE INDEX IF NOT EXISTS team_rooms_invite_code_idx ON team_rooms(invite_code);
CREATE INDEX IF NOT EXISTS team_rooms_created_by_idx ON team_rooms(created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_team_rooms_updated_at ON team_rooms;
CREATE TRIGGER update_team_rooms_updated_at
    BEFORE UPDATE ON team_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_team_rooms_updated_at();
