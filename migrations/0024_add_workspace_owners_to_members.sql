-- Migration: Add existing workspace owners to workspace_members table
-- This ensures workspace owners retain access after workspace filtering is enabled

INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT id, owner_id, 'owner', created_at
FROM workspaces
WHERE owner_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;
