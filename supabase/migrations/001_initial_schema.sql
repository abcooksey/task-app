-- Homestead Initial Schema
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- CUSTOM TYPES
-- =============================================================================

CREATE TYPE ledger_reason AS ENUM (
  'task_completion',
  'variable_bonus',
  'jackpot_bonus',
  'dread_bonus',
  'first_of_day_bonus',
  'subtask_completion',
  'reversal',
  'repair',
  'purchase'
);

-- =============================================================================
-- TABLES
-- =============================================================================

-- Tasks table
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  context         TEXT NOT NULL DEFAULT 'personal' CHECK (context IN ('work', 'personal')),
  size            TEXT NOT NULL DEFAULT 'small' CHECK (size IN ('tiny', 'small', 'medium', 'large')),
  notes           TEXT,
  due_date        DATE,
  due_time        TIME,
  recurrence      JSONB,
  times_per_day   INTEGER NOT NULL DEFAULT 1 CHECK (times_per_day >= 1),
  is_paused       BOOLEAN NOT NULL DEFAULT FALSE,
  defer_count     INTEGER NOT NULL DEFAULT 0,
  pinned          BOOLEAN NOT NULL DEFAULT FALSE,
  last_completed_at TIMESTAMPTZ,  -- For interval recurrence initial state
  sort_index      INTEGER,
  is_template     BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subtasks table
CREATE TABLE subtasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  sort_index      INTEGER NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Completions table (records each task/occurrence completion)
CREATE TABLE completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurrence_key  TEXT,  -- e.g., "2024-09-15" or "2024-09-15-1" for multi-per-day
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reversed_at     TIMESTAMPTZ  -- Set when uncompleted (soft reversal)
);

-- Coin ledger (append-only)
CREATE TABLE coin_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,  -- Positive or negative
  reason          ledger_reason NOT NULL,
  ref_type        TEXT,  -- 'task', 'subtask', 'completion', etc.
  ref_id          UUID,  -- ID of referenced entity
  meta            JSONB,  -- Additional context
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Day state (per-day user preferences)
CREATE TABLE day_state (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key         DATE NOT NULL,
  low_energy      BOOLEAN NOT NULL DEFAULT FALSE,
  custom_order    JSONB,  -- Array of task IDs
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day_key)
);

-- User settings
CREATE TABLE settings (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  day_boundary_minutes  INTEGER NOT NULL DEFAULT 240,  -- 4am
  quiet_hours           JSONB,
  contexts              JSONB,
  reduced_motion        BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_context     TEXT NOT NULL DEFAULT 'personal' CHECK (last_used_context IN ('work', 'personal')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Tasks
CREATE INDEX tasks_user_id_idx ON tasks(user_id);
CREATE INDEX tasks_due_date_idx ON tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX tasks_deleted_idx ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX tasks_template_idx ON tasks(user_id) WHERE is_template = TRUE;
CREATE INDEX tasks_pinned_idx ON tasks(user_id) WHERE pinned = TRUE AND deleted_at IS NULL;

-- Subtasks
CREATE INDEX subtasks_task_id_idx ON subtasks(task_id);

-- Completions
CREATE INDEX completions_task_id_idx ON completions(task_id);
CREATE INDEX completions_user_completed_idx ON completions(user_id, completed_at);
CREATE INDEX completions_occurrence_idx ON completions(task_id, occurrence_key);

-- Coin ledger
CREATE INDEX coin_ledger_user_id_idx ON coin_ledger(user_id);
CREATE INDEX coin_ledger_created_at_idx ON coin_ledger(user_id, created_at);
CREATE INDEX coin_ledger_ref_idx ON coin_ledger(ref_type, ref_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Subtasks policies (via task ownership)
CREATE POLICY "Users can view subtasks of their tasks"
  ON subtasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can create subtasks for their tasks"
  ON subtasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can update subtasks of their tasks"
  ON subtasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete subtasks of their tasks"
  ON subtasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
  ));

-- Completions policies
CREATE POLICY "Users can view their own completions"
  ON completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own completions"
  ON completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions"
  ON completions FOR UPDATE
  USING (auth.uid() = user_id);

-- Coin ledger policies
CREATE POLICY "Users can view their own ledger entries"
  ON coin_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ledger entries"
  ON coin_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Day state policies
CREATE POLICY "Users can view their own day state"
  ON day_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own day state"
  ON day_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own day state"
  ON day_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Settings policies
CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER day_state_updated_at
  BEFORE UPDATE ON day_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- COMPUTED VIEWS (for convenience)
-- =============================================================================

-- View for user balance
CREATE OR REPLACE VIEW user_balance AS
SELECT
  user_id,
  COALESCE(SUM(amount), 0) as balance
FROM coin_ledger
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON user_balance TO authenticated;
