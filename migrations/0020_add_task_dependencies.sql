-- Task dependencies table for linking tasks
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  target_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('blocks', 'relates_to')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_task_id, target_task_id, type)
);

CREATE INDEX IF NOT EXISTS idx_task_deps_source ON task_dependencies(source_task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_target ON task_dependencies(target_task_id);
