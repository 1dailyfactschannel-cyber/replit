-- Add workspace visibility to Knowledge Base tables
ALTER TABLE knowledge_sections ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE knowledge_articles ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add indexes for filtering
CREATE INDEX idx_kb_sections_workspace ON knowledge_sections(workspace_id);
CREATE INDEX idx_kb_articles_workspace ON knowledge_articles(workspace_id);
