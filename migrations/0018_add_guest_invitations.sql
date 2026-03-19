-- Guest Invitations and Sessions
-- Table for storing guest invitations with one-time use tokens

-- Guest invitations table
CREATE TABLE IF NOT EXISTS guest_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES team_rooms(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    device_fingerprint VARCHAR(255),
    bound_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_invitations_token ON guest_invitations(token);
CREATE INDEX IF NOT EXISTS idx_guest_invitations_room_id ON guest_invitations(room_id);

-- Guest sessions table
CREATE TABLE IF NOT EXISTS guest_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES guest_invitations(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_invitation ON guest_sessions(invitation_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires ON guest_sessions(expires_at);

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_guest_invitations()
RETURNS void AS $$
BEGIN
    DELETE FROM guest_invitations WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_guest_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM guest_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE guest_invitations IS 'One-time use invitations for guest access to team rooms';
COMMENT ON TABLE guest_sessions IS 'Active guest sessions with limited access';
COMMENT ON COLUMN guest_invitations.token IS 'Unique token for invitation link';
COMMENT ON COLUMN guest_invitations.device_fingerprint IS 'Hashed fingerprint of bound device';
COMMENT ON COLUMN guest_invitations.expires_at IS 'Invitation expiry time (24 hours from creation)';
COMMENT ON COLUMN guest_invitations.used_at IS 'Timestamp when invitation was first used';
