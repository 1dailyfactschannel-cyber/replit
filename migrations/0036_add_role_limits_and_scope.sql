-- Add max_users and scope to roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS max_users INTEGER;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'global';

-- Add scope columns to user_roles (nullable, not part of PK)
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add indexes for scoped lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_workspace ON user_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_project ON user_roles(project_id);
