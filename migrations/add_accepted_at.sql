-- Add acceptedAt and timeSpent fields to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;

-- Update existing tasks: set acceptedAt to createdAt for tasks that are already in progress or done
UPDATE tasks 
SET accepted_at = created_at 
WHERE status IN ('in_progress', 'done', 'В работе', 'Готово', 'review', 'На проверке') 
  AND accepted_at IS NULL;
