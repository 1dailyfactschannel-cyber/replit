-- Migration: Add RBAC tables and fields
-- Generated: $(date)

-- Add missing fields to userRoles table
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT NOW();
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create unique index on key
CREATE UNIQUE INDEX IF NOT EXISTS permissions_key_idx ON permissions(key);

-- Create user_hidden_objects table
CREATE TABLE IF NOT EXISTS user_hidden_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  hidden_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, object_type, object_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_hidden_objects_user_idx ON user_hidden_objects(user_id);
CREATE INDEX IF NOT EXISTS user_hidden_objects_type_idx ON user_hidden_objects(object_type);

-- Add index on user_roles for faster queries
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role_id);

-- Ensure roles table has system column (should already exist)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
