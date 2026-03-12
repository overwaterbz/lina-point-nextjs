-- Upgrade agent_prompts table for prompt versioning system
-- Adds version numbering, approval workflow, and change tracking

-- Add version column (integer, default 1)
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add approval status for autonomy-first workflow
-- auto_applied = operational tweaks (applied immediately)
-- pending_review = directional/strategic changes (needs admin approval)
-- approved = admin approved a pending change
-- rejected = admin rejected a pending change
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'auto_applied'
  CHECK (approval_status IN ('auto_applied', 'pending_review', 'approved', 'rejected'));

-- Type of change for routing autonomy decisions
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS change_type TEXT
  CHECK (change_type IN ('operational', 'directional'));

-- Store previous prompt for diff/rollback
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS previous_prompt TEXT;

-- Mark existing rows as auto_applied so they're immediately active
UPDATE agent_prompts SET approval_status = 'auto_applied' WHERE approval_status IS NULL;

-- Index for fast lookups: active prompts per agent
CREATE INDEX IF NOT EXISTS idx_agent_prompts_active
  ON agent_prompts (agent_name, approval_status, version DESC);

-- Index for admin dashboard: pending reviews
CREATE INDEX IF NOT EXISTS idx_agent_prompts_pending
  ON agent_prompts (approval_status) WHERE approval_status = 'pending_review';
