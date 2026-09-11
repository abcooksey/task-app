-- Phase 2: House Repair Tables and Functions
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql

-- =============================================================================
-- ADD ENUM VALUE
-- =============================================================================

-- Add repair_refund to ledger_reason (for undo functionality)
ALTER TYPE ledger_reason ADD VALUE IF NOT EXISTS 'repair_refund';

-- =============================================================================
-- TABLES
-- =============================================================================

-- House repairs (one row per user per completed repair)
CREATE TABLE house_repairs (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repair_id       TEXT NOT NULL,  -- e.g., "int_floor", "ext_roof"
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ledger_id       UUID REFERENCES coin_ledger(id),  -- The spend transaction
  PRIMARY KEY (user_id, repair_id)
);

CREATE INDEX house_repairs_user_idx ON house_repairs(user_id);

-- House state (user preferences for the house view)
CREATE TABLE house_state (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_view       TEXT NOT NULL DEFAULT 'interior' CHECK (last_view IN ('interior', 'exterior')),
  sfx_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  first_repair_done BOOLEAN NOT NULL DEFAULT FALSE,  -- For first-repair guidance
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE house_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_state ENABLE ROW LEVEL SECURITY;

-- House repairs policies
CREATE POLICY "Users can view their own house repairs"
  ON house_repairs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own house repairs"
  ON house_repairs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own house repairs"
  ON house_repairs FOR DELETE
  USING (auth.uid() = user_id);

-- House state policies
CREATE POLICY "Users can view their own house state"
  ON house_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own house state"
  ON house_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own house state"
  ON house_state FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER house_state_updated_at
  BEFORE UPDATE ON house_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Atomic spend function with advisory lock to prevent race conditions
CREATE OR REPLACE FUNCTION spend_coins(
  p_user_id    UUID,
  p_amount     INTEGER,
  p_reason     ledger_reason,
  p_ref_type   TEXT,
  p_ref_id     TEXT
) RETURNS TABLE(new_balance INTEGER, ledger_id UUID) AS $$
DECLARE
  v_current_balance INTEGER;
  v_ledger_id UUID;
BEGIN
  -- Advisory lock on user to prevent concurrent spends
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Get current balance
  SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
  FROM coin_ledger
  WHERE user_id = p_user_id;

  -- Check sufficient funds
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_current_balance, p_amount
      USING ERRCODE = 'P0001';
  END IF;

  -- Insert negative ledger row
  INSERT INTO coin_ledger (user_id, amount, reason, ref_type, ref_id)
  VALUES (p_user_id, -p_amount, p_reason, p_ref_type, p_ref_id)
  RETURNING id INTO v_ledger_id;

  RETURN QUERY SELECT v_current_balance - p_amount, v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Perform repair function (idempotent - safe to call multiple times)
CREATE OR REPLACE FUNCTION perform_repair(
  p_repair_id  TEXT,
  p_cost       INTEGER
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, already_done BOOLEAN) AS $$
DECLARE
  v_user_id UUID;
  v_existing RECORD;
  v_spend_result RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already completed (idempotent)
  SELECT * INTO v_existing
  FROM house_repairs
  WHERE user_id = v_user_id AND repair_id = p_repair_id;

  IF FOUND THEN
    -- Already done, return success without charging
    SELECT COALESCE(SUM(amount), 0) INTO v_spend_result.new_balance
    FROM coin_ledger WHERE user_id = v_user_id;

    RETURN QUERY SELECT TRUE, v_spend_result.new_balance::INTEGER, TRUE;
    RETURN;
  END IF;

  -- Spend the coins
  SELECT * INTO v_spend_result
  FROM spend_coins(v_user_id, p_cost, 'repair', 'repair', p_repair_id);

  -- Record the repair
  INSERT INTO house_repairs (user_id, repair_id, ledger_id)
  VALUES (v_user_id, p_repair_id, v_spend_result.ledger_id);

  -- Ensure house_state exists and mark first repair done
  INSERT INTO house_state (user_id, first_repair_done)
  VALUES (v_user_id, TRUE)
  ON CONFLICT (user_id) DO UPDATE
  SET first_repair_done = TRUE, updated_at = NOW();

  RETURN QUERY SELECT TRUE, v_spend_result.new_balance, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Undo repair function (only works within 5-second window)
CREATE OR REPLACE FUNCTION undo_repair(
  p_repair_id  TEXT,
  p_max_age_seconds INTEGER DEFAULT 5
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, reason TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_repair RECORD;
  v_ledger_row RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the repair
  SELECT * INTO v_repair
  FROM house_repairs
  WHERE user_id = v_user_id AND repair_id = p_repair_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'Repair not found'::TEXT;
    RETURN;
  END IF;

  -- Check time window
  IF v_repair.completed_at < NOW() - (p_max_age_seconds || ' seconds')::INTERVAL THEN
    RETURN QUERY SELECT FALSE, 0, 'Undo window expired'::TEXT;
    RETURN;
  END IF;

  -- Get the original ledger row
  SELECT * INTO v_ledger_row
  FROM coin_ledger
  WHERE id = v_repair.ledger_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'Ledger entry not found'::TEXT;
    RETURN;
  END IF;

  -- Write refund row (positive amount)
  INSERT INTO coin_ledger (user_id, amount, reason, ref_type, ref_id)
  VALUES (v_user_id, ABS(v_ledger_row.amount), 'repair_refund', 'repair', p_repair_id);

  -- Delete the repair record
  DELETE FROM house_repairs
  WHERE user_id = v_user_id AND repair_id = p_repair_id;

  -- Get new balance
  SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
  FROM coin_ledger WHERE user_id = v_user_id;

  RETURN QUERY SELECT TRUE, v_new_balance, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update house state preferences
CREATE OR REPLACE FUNCTION update_house_state(
  p_last_view  TEXT DEFAULT NULL,
  p_sfx_enabled BOOLEAN DEFAULT NULL
) RETURNS house_state AS $$
DECLARE
  v_user_id UUID;
  v_result house_state;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert house state
  INSERT INTO house_state (user_id, last_view, sfx_enabled)
  VALUES (
    v_user_id,
    COALESCE(p_last_view, 'interior'),
    COALESCE(p_sfx_enabled, FALSE)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_view = COALESCE(p_last_view, house_state.last_view),
    sfx_enabled = COALESCE(p_sfx_enabled, house_state.sfx_enabled),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get house data (repairs + state) in one call
CREATE OR REPLACE FUNCTION get_house_data()
RETURNS TABLE(
  repair_ids TEXT[],
  last_view TEXT,
  sfx_enabled BOOLEAN,
  first_repair_done BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(ARRAY_AGG(hr.repair_id), ARRAY[]::TEXT[]) as repair_ids,
    COALESCE(hs.last_view, 'interior') as last_view,
    COALESCE(hs.sfx_enabled, FALSE) as sfx_enabled,
    COALESCE(hs.first_repair_done, FALSE) as first_repair_done
  FROM (SELECT 1) dummy
  LEFT JOIN house_repairs hr ON hr.user_id = v_user_id
  LEFT JOIN house_state hs ON hs.user_id = v_user_id
  GROUP BY hs.last_view, hs.sfx_enabled, hs.first_repair_done;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
