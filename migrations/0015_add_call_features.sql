-- Migration: Add call settings, participants and room admins tables
-- Created: 2026-03-10

-- Create call_settings table
CREATE TABLE IF NOT EXISTS call_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_mic TEXT,
    preferred_camera TEXT,
    preferred_speaker TEXT,
    mic_volume INTEGER DEFAULT 100,
    speaker_volume INTEGER DEFAULT 100,
    video_quality TEXT DEFAULT 'medium',
    noise_suppression BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create call_participants table
CREATE TABLE IF NOT EXISTS call_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES team_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_mic_on BOOLEAN DEFAULT true,
    is_video_on BOOLEAN DEFAULT true,
    is_speaking BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(room_id, user_id)
);

-- Create team_room_admins table
CREATE TABLE IF NOT EXISTS team_room_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES team_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS call_settings_user_id_idx ON call_settings(user_id);
CREATE INDEX IF NOT EXISTS call_participants_room_id_idx ON call_participants(room_id);
CREATE INDEX IF NOT EXISTS call_participants_user_id_idx ON call_participants(user_id);
CREATE INDEX IF NOT EXISTS call_participants_active_idx ON call_participants(is_active);
CREATE INDEX IF NOT EXISTS team_room_admins_room_id_idx ON team_room_admins(room_id);
CREATE INDEX IF NOT EXISTS team_room_admins_user_id_idx ON team_room_admins(user_id);

-- Create trigger to update updated_at timestamp for call_settings
CREATE OR REPLACE FUNCTION update_call_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_call_settings_updated_at ON call_settings;
CREATE TRIGGER update_call_settings_updated_at
    BEFORE UPDATE ON call_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_call_settings_updated_at();
