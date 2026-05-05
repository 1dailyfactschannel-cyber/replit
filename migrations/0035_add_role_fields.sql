-- Add missing fields to roles table
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update system roles with proper priorities
UPDATE roles SET priority = 1, color = '#1e1b4b' WHERE name = 'Владелец';
UPDATE roles SET priority = 2, color = '#ef4444' WHERE name = 'Администратор';
UPDATE roles SET priority = 3, color = '#3b82f6' WHERE name = 'Менеджер';
UPDATE roles SET priority = 4, color = '#22c55e' WHERE name = 'Сотрудник';
UPDATE roles SET priority = 5, color = '#6b7280' WHERE name = 'Гость';

-- Set default role
UPDATE roles SET is_default = TRUE WHERE name = 'Сотрудник';
