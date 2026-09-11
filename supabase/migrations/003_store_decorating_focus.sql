-- Phase 3: Store, Decorating, and Focus Timer
-- Run this in your Supabase SQL Editor after 002_house_tables.sql

-- =============================================================================
-- ADD ENUM VALUES
-- =============================================================================

-- Add new ledger_reason values for Phase 3
ALTER TYPE ledger_reason ADD VALUE IF NOT EXISTS 'mystery_box';
ALTER TYPE ledger_reason ADD VALUE IF NOT EXISTS 'focus';
ALTER TYPE ledger_reason ADD VALUE IF NOT EXISTS 'focus_bonus';
ALTER TYPE ledger_reason ADD VALUE IF NOT EXISTS 'starter';

-- =============================================================================
-- TABLES
-- =============================================================================

-- Catalog items (seeded from catalog.json, source of truth for item definitions)
CREATE TABLE catalog_items (
  id              TEXT PRIMARY KEY,  -- e.g., "sofa_blue", "rug_round_cream"
  name            TEXT NOT NULL,
  blurb           TEXT,
  category        TEXT NOT NULL CHECK (category IN (
    'furniture', 'decor', 'rug', 'wall', 'surface_decor', 'outdoor',
    'wall_finish', 'floor_finish',
    'clothing_top', 'clothing_bottom', 'clothing_shoes', 'hair', 'accessory'
  )),
  price           INTEGER NOT NULL CHECK (price >= 0),
  placement       TEXT NOT NULL CHECK (placement IN (
    'floor', 'rug', 'wall', 'surface', 'outdoor', 'wall_finish', 'floor_finish', 'wearable'
  )),
  footprint_w     INTEGER NOT NULL DEFAULT 1 CHECK (footprint_w > 0),
  footprint_h     INTEGER NOT NULL DEFAULT 1 CHECK (footprint_h > 0),
  is_surface      BOOLEAN NOT NULL DEFAULT FALSE,
  slots_json      JSONB,  -- [{ "x": 0, "y": 0 }, ...] for surface items
  allow_multiple  BOOLEAN NOT NULL DEFAULT FALSE,
  availability    JSONB NOT NULL,  -- { "kind": "always" } | { "kind": "rotation", "pool": "..." } | etc.
  rarity          TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare')),
  texture_key     TEXT NOT NULL,
  flipped_texture TEXT,
  tags            TEXT[] DEFAULT '{}',
  version         INTEGER NOT NULL DEFAULT 1,  -- For drift detection
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory (user-owned items)
CREATE TABLE inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id         TEXT NOT NULL REFERENCES catalog_items(id),
  source          TEXT NOT NULL CHECK (source IN ('purchase', 'mystery', 'starter')),
  ledger_id       UUID REFERENCES coin_ledger(id),  -- The purchase transaction (null for starter)
  acquired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX inventory_user_idx ON inventory(user_id);
CREATE INDEX inventory_item_idx ON inventory(user_id, item_id);

-- Placements (placed items in the room)
CREATE TABLE placements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id          UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  view                  TEXT NOT NULL CHECK (view IN ('interior', 'exterior')),
  region                TEXT NOT NULL CHECK (region IN ('floor', 'wall', 'yard')),
  x                     INTEGER NOT NULL CHECK (x >= 0),
  y                     INTEGER NOT NULL CHECK (y >= 0),
  flipped               BOOLEAN NOT NULL DEFAULT FALSE,
  parent_placement_id   UUID REFERENCES placements(id) ON DELETE CASCADE,  -- For surface decor
  slot_index            INTEGER,  -- Which slot on the parent
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inventory_id)  -- One placement per inventory item
);

CREATE INDEX placements_user_idx ON placements(user_id);
CREATE INDEX placements_view_idx ON placements(user_id, view);
CREATE INDEX placements_parent_idx ON placements(parent_placement_id);

-- Room finishes (applied wall/floor finishes per view)
CREATE TABLE room_finishes (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view            TEXT NOT NULL CHECK (view IN ('interior', 'exterior')),
  wall_item_id    TEXT REFERENCES catalog_items(id),  -- Currently applied wallpaper
  floor_item_id   TEXT REFERENCES catalog_items(id),  -- Currently applied flooring
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, view)
);

-- Mystery box openings (daily tracking)
CREATE TABLE mystery_openings (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key         DATE NOT NULL,  -- The "app day" (4am boundary)
  inventory_id    UUID NOT NULL REFERENCES inventory(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day_key)
);

-- Focus sessions
CREATE TABLE focus_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  planned_minutes INTEGER NOT NULL CHECK (planned_minutes BETWEEN 5 AND 90),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_json     JSONB DEFAULT '[]',  -- [{ "paused_at": "...", "resumed_at": "..." }, ...]
  ended_at        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'done', 'stopped')),
  chunks_paid     INTEGER NOT NULL DEFAULT 0,  -- Number of 5-min chunks already paid
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX focus_sessions_user_idx ON focus_sessions(user_id);
CREATE INDEX focus_sessions_running_idx ON focus_sessions(user_id, status) WHERE status IN ('running', 'paused');

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_finishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Catalog items: everyone can read (it's public data)
CREATE POLICY "Anyone can read catalog items"
  ON catalog_items FOR SELECT
  USING (true);

-- Only service role can modify catalog items (via seed script)
CREATE POLICY "Service role can manage catalog items"
  ON catalog_items FOR ALL
  USING (auth.role() = 'service_role');

-- Inventory policies
CREATE POLICY "Users can view their own inventory"
  ON inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inventory"
  ON inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory"
  ON inventory FOR DELETE
  USING (auth.uid() = user_id);

-- Placements policies
CREATE POLICY "Users can view their own placements"
  ON placements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own placements"
  ON placements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own placements"
  ON placements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own placements"
  ON placements FOR DELETE
  USING (auth.uid() = user_id);

-- Room finishes policies
CREATE POLICY "Users can view their own room finishes"
  ON room_finishes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own room finishes"
  ON room_finishes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own room finishes"
  ON room_finishes FOR UPDATE
  USING (auth.uid() = user_id);

-- Mystery openings policies
CREATE POLICY "Users can view their own mystery openings"
  ON mystery_openings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mystery openings"
  ON mystery_openings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Focus sessions policies
CREATE POLICY "Users can view their own focus sessions"
  ON focus_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own focus sessions"
  ON focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions"
  ON focus_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp triggers
CREATE TRIGGER catalog_items_updated_at
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER placements_updated_at
  BEFORE UPDATE ON placements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER room_finishes_updated_at
  BEFORE UPDATE ON room_finishes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Buy item with idempotency support
CREATE OR REPLACE FUNCTION buy_item(
  p_item_id          TEXT,
  p_client_request_id UUID
) RETURNS TABLE(success BOOLEAN, inventory_id UUID, new_balance INTEGER) AS $$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_existing_purchase RECORD;
  v_owned_count INTEGER;
  v_spend_result RECORD;
  v_inventory_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for duplicate request (idempotency)
  SELECT i.* INTO v_existing_purchase
  FROM inventory i
  JOIN coin_ledger cl ON cl.id = i.ledger_id
  WHERE cl.meta->>'client_request_id' = p_client_request_id::text
    AND i.user_id = v_user_id;

  IF FOUND THEN
    -- Return existing result
    SELECT COALESCE(SUM(amount), 0) INTO v_spend_result.new_balance
    FROM coin_ledger WHERE user_id = v_user_id;
    RETURN QUERY SELECT TRUE, v_existing_purchase.id, v_spend_result.new_balance::INTEGER;
    RETURN;
  END IF;

  -- Get item details
  SELECT * INTO v_item FROM catalog_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found: %', p_item_id;
  END IF;

  -- Check if single-copy item already owned
  IF NOT v_item.allow_multiple THEN
    SELECT COUNT(*) INTO v_owned_count
    FROM inventory
    WHERE user_id = v_user_id AND item_id = p_item_id;

    IF v_owned_count > 0 THEN
      RAISE EXCEPTION 'Item already owned: %', p_item_id;
    END IF;
  END IF;

  -- Spend coins
  SELECT * INTO v_spend_result
  FROM spend_coins(
    v_user_id,
    v_item.price,
    'purchase',
    'item',
    p_item_id
  );

  -- Update ledger row with client_request_id for idempotency
  UPDATE coin_ledger
  SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('client_request_id', p_client_request_id)
  WHERE id = v_spend_result.ledger_id;

  -- Create inventory row
  INSERT INTO inventory (user_id, item_id, source, ledger_id)
  VALUES (v_user_id, p_item_id, 'purchase', v_spend_result.ledger_id)
  RETURNING id INTO v_inventory_id;

  RETURN QUERY SELECT TRUE, v_inventory_id, v_spend_result.new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Open mystery box (daily, weighted random)
CREATE OR REPLACE FUNCTION open_mystery_box(
  p_day_boundary_minutes INTEGER DEFAULT 240
)
RETURNS TABLE(success BOOLEAN, item_id TEXT, inventory_id UUID, new_balance INTEGER, reason TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_day_key DATE;
  v_existing RECORD;
  v_box_price INTEGER := 75;
  v_total_weight NUMERIC;
  v_roll NUMERIC;
  v_cumulative NUMERIC := 0;
  v_selected_item RECORD;
  v_spend_result RECORD;
  v_inventory_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate app day using the day boundary
  v_day_key := ((NOW() - (p_day_boundary_minutes || ' minutes')::INTERVAL)::DATE);

  -- Check if already opened today
  SELECT * INTO v_existing
  FROM mystery_openings
  WHERE user_id = v_user_id AND day_key = v_day_key;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::UUID, 0, 'Already opened today'::TEXT;
    RETURN;
  END IF;

  -- Build eligible pool and select item using weighted random
  -- Pool: all items priced >= box_price, excluding owned single-copy items
  WITH owned_singles AS (
    SELECT DISTINCT i.item_id
    FROM inventory i
    JOIN catalog_items c ON c.id = i.item_id
    WHERE i.user_id = v_user_id AND NOT c.allow_multiple
  ),
  eligible AS (
    SELECT c.*,
      CASE c.rarity
        WHEN 'common' THEN 70
        WHEN 'uncommon' THEN 25
        WHEN 'rare' THEN 5
      END as weight
    FROM catalog_items c
    WHERE c.price >= v_box_price
      AND c.placement != 'wearable'
      AND (c.allow_multiple OR c.id NOT IN (SELECT es.item_id FROM owned_singles es))
  )
  SELECT SUM(e.weight) INTO v_total_weight FROM eligible e;

  IF v_total_weight IS NULL OR v_total_weight = 0 THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::UUID, 0, 'No eligible items'::TEXT;
    RETURN;
  END IF;

  -- Roll weighted random and select item
  v_roll := random() * v_total_weight;

  WITH owned_singles AS (
    SELECT DISTINCT i.item_id
    FROM inventory i
    JOIN catalog_items c ON c.id = i.item_id
    WHERE i.user_id = v_user_id AND NOT c.allow_multiple
  ),
  eligible AS (
    SELECT c.*,
      CASE c.rarity
        WHEN 'common' THEN 70
        WHEN 'uncommon' THEN 25
        WHEN 'rare' THEN 5
      END as weight
    FROM catalog_items c
    WHERE c.price >= v_box_price
      AND c.placement != 'wearable'
      AND (c.allow_multiple OR c.id NOT IN (SELECT es.item_id FROM owned_singles es))
  ),
  weighted AS (
    SELECT e.*, SUM(e.weight) OVER (ORDER BY e.id) as cumulative
    FROM eligible e
  )
  SELECT * INTO v_selected_item
  FROM weighted w
  WHERE w.cumulative >= v_roll
  ORDER BY w.cumulative
  LIMIT 1;

  IF v_selected_item IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::UUID, 0, 'Selection failed'::TEXT;
    RETURN;
  END IF;

  -- Spend coins
  SELECT * INTO v_spend_result
  FROM spend_coins(v_user_id, v_box_price, 'mystery_box', 'mystery', v_day_key::TEXT);

  -- Create inventory row
  INSERT INTO inventory (user_id, item_id, source, ledger_id)
  VALUES (v_user_id, v_selected_item.id, 'mystery', v_spend_result.ledger_id)
  RETURNING id INTO v_inventory_id;

  -- Record opening
  INSERT INTO mystery_openings (user_id, day_key, inventory_id)
  VALUES (v_user_id, v_day_key, v_inventory_id);

  RETURN QUERY SELECT TRUE, v_selected_item.id, v_inventory_id, v_spend_result.new_balance, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Claim starter kit (idempotent, grants 3 items once)
CREATE OR REPLACE FUNCTION claim_starter_kit()
RETURNS TABLE(success BOOLEAN, items_granted TEXT[], already_claimed BOOLEAN) AS $$
DECLARE
  v_user_id UUID;
  v_existing INTEGER;
  v_starter_items TEXT[] := ARRAY['rug_basic', 'decor_plant_small', 'wall_poster_simple'];
  v_granted TEXT[] := '{}';
  v_item TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already claimed
  SELECT COUNT(*) INTO v_existing
  FROM inventory
  WHERE user_id = v_user_id AND source = 'starter';

  IF v_existing > 0 THEN
    RETURN QUERY SELECT TRUE, v_granted, TRUE;
    RETURN;
  END IF;

  -- Grant each starter item
  FOREACH v_item IN ARRAY v_starter_items LOOP
    INSERT INTO inventory (user_id, item_id, source)
    VALUES (v_user_id, v_item, 'starter');
    v_granted := array_append(v_granted, v_item);
  END LOOP;

  RETURN QUERY SELECT TRUE, v_granted, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pay focus chunk with time validation
CREATE OR REPLACE FUNCTION pay_focus_chunk(
  p_session_id  UUID,
  p_chunk_index INTEGER  -- 0-based for regular chunks, -1 for completion bonus
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, reason TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_session RECORD;
  v_elapsed_minutes NUMERIC;
  v_paused_minutes NUMERIC := 0;
  v_required_minutes INTEGER;
  v_chunk_value INTEGER := 3;
  v_bonus_value INTEGER := 10;
  v_payout INTEGER;
  v_already_paid BOOLEAN;
  v_new_balance INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session
  SELECT * INTO v_session
  FROM focus_sessions
  WHERE id = p_session_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'Session not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate elapsed time (in minutes)
  v_elapsed_minutes := EXTRACT(EPOCH FROM (
    COALESCE(v_session.ended_at, NOW()) - v_session.started_at
  )) / 60;

  -- Subtract paused time
  IF v_session.paused_json IS NOT NULL AND jsonb_array_length(v_session.paused_json) > 0 THEN
    SELECT COALESCE(SUM(
      EXTRACT(EPOCH FROM (
        COALESCE((p->>'resumed_at')::timestamptz, NOW()) -
        (p->>'paused_at')::timestamptz
      )) / 60
    ), 0)
    INTO v_paused_minutes
    FROM jsonb_array_elements(v_session.paused_json) p;

    v_elapsed_minutes := v_elapsed_minutes - v_paused_minutes;
  END IF;

  -- Determine required elapsed time for this chunk
  IF p_chunk_index = -1 THEN
    -- Completion bonus requires full planned duration
    v_required_minutes := v_session.planned_minutes;
    v_payout := v_bonus_value;

    -- Check if session is actually done
    IF v_session.status != 'done' THEN
      RETURN QUERY SELECT FALSE, 0, 'Session not completed'::TEXT;
      RETURN;
    END IF;
  ELSE
    -- Regular chunk: 5 minutes per chunk (0 = 5min, 1 = 10min, etc.)
    v_required_minutes := (p_chunk_index + 1) * 5;
    v_payout := v_chunk_value;
  END IF;

  -- Add 30 second tolerance
  IF v_elapsed_minutes < (v_required_minutes - 0.5) THEN
    RETURN QUERY SELECT FALSE, 0, 'Chunk not yet elapsed'::TEXT;
    RETURN;
  END IF;

  -- Check for idempotency
  SELECT EXISTS(
    SELECT 1 FROM coin_ledger
    WHERE user_id = v_user_id
      AND reason IN ('focus', 'focus_bonus')
      AND ref_type = 'focus_session'
      AND ref_id = p_session_id::TEXT
      AND meta->>'chunk_index' = p_chunk_index::TEXT
  ) INTO v_already_paid;

  IF v_already_paid THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
    FROM coin_ledger WHERE user_id = v_user_id;
    RETURN QUERY SELECT TRUE, v_new_balance, 'Already paid'::TEXT;
    RETURN;
  END IF;

  -- Pay the chunk
  INSERT INTO coin_ledger (user_id, amount, reason, ref_type, ref_id, meta)
  VALUES (
    v_user_id,
    v_payout,
    CASE WHEN p_chunk_index = -1 THEN 'focus_bonus'::ledger_reason ELSE 'focus'::ledger_reason END,
    'focus_session',
    p_session_id::TEXT,
    jsonb_build_object('chunk_index', p_chunk_index)
  );

  -- Update chunks_paid count
  IF p_chunk_index >= 0 THEN
    UPDATE focus_sessions
    SET chunks_paid = GREATEST(chunks_paid, p_chunk_index + 1)
    WHERE id = p_session_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
  FROM coin_ledger WHERE user_id = v_user_id;

  RETURN QUERY SELECT TRUE, v_new_balance, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get store data (inventory + placements + finishes) in one call
CREATE OR REPLACE FUNCTION get_store_data()
RETURNS TABLE(
  inventory_json JSONB,
  placements_json JSONB,
  finishes_json JSONB,
  mystery_opened_today BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_day_key DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate app day (4am boundary)
  v_day_key := ((NOW() - INTERVAL '4 hours')::DATE);

  RETURN QUERY
  SELECT
    (SELECT COALESCE(jsonb_agg(row_to_json(i)), '[]'::jsonb) FROM inventory i WHERE i.user_id = v_user_id),
    (SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) FROM placements p WHERE p.user_id = v_user_id),
    (SELECT COALESCE(jsonb_agg(row_to_json(rf)), '[]'::jsonb) FROM room_finishes rf WHERE rf.user_id = v_user_id),
    EXISTS(SELECT 1 FROM mystery_openings mo WHERE mo.user_id = v_user_id AND mo.day_key = v_day_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save placement (insert or update)
CREATE OR REPLACE FUNCTION save_placement(
  p_inventory_id UUID,
  p_view TEXT,
  p_region TEXT,
  p_x INTEGER,
  p_y INTEGER,
  p_flipped BOOLEAN DEFAULT FALSE,
  p_parent_placement_id UUID DEFAULT NULL,
  p_slot_index INTEGER DEFAULT NULL
) RETURNS placements AS $$
DECLARE
  v_user_id UUID;
  v_result placements;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify ownership of inventory item
  IF NOT EXISTS(SELECT 1 FROM inventory WHERE id = p_inventory_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Inventory item not owned';
  END IF;

  -- Upsert placement
  INSERT INTO placements (user_id, inventory_id, view, region, x, y, flipped, parent_placement_id, slot_index)
  VALUES (v_user_id, p_inventory_id, p_view, p_region, p_x, p_y, p_flipped, p_parent_placement_id, p_slot_index)
  ON CONFLICT (inventory_id) DO UPDATE SET
    view = EXCLUDED.view,
    region = EXCLUDED.region,
    x = EXCLUDED.x,
    y = EXCLUDED.y,
    flipped = EXCLUDED.flipped,
    parent_placement_id = EXCLUDED.parent_placement_id,
    slot_index = EXCLUDED.slot_index,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove placement (store item back to inventory)
CREATE OR REPLACE FUNCTION remove_placement(
  p_placement_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete placement (will cascade to child surface decor)
  DELETE FROM placements
  WHERE id = p_placement_id AND user_id = v_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply room finish
CREATE OR REPLACE FUNCTION apply_finish(
  p_view TEXT,
  p_wall_item_id TEXT DEFAULT NULL,
  p_floor_item_id TEXT DEFAULT NULL
) RETURNS room_finishes AS $$
DECLARE
  v_user_id UUID;
  v_result room_finishes;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify ownership of finish items
  IF p_wall_item_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_id = p_wall_item_id
  ) THEN
    RAISE EXCEPTION 'Wall finish not owned';
  END IF;

  IF p_floor_item_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_id = p_floor_item_id
  ) THEN
    RAISE EXCEPTION 'Floor finish not owned';
  END IF;

  -- Upsert finish
  INSERT INTO room_finishes (user_id, view, wall_item_id, floor_item_id)
  VALUES (v_user_id, p_view, p_wall_item_id, p_floor_item_id)
  ON CONFLICT (user_id, view) DO UPDATE SET
    wall_item_id = COALESCE(EXCLUDED.wall_item_id, room_finishes.wall_item_id),
    floor_item_id = COALESCE(EXCLUDED.floor_item_id, room_finishes.floor_item_id),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create focus session
CREATE OR REPLACE FUNCTION create_focus_session(
  p_planned_minutes INTEGER,
  p_task_id UUID DEFAULT NULL
) RETURNS focus_sessions AS $$
DECLARE
  v_user_id UUID;
  v_result focus_sessions;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO focus_sessions (user_id, task_id, planned_minutes)
  VALUES (v_user_id, p_task_id, p_planned_minutes)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update focus session (pause, resume, end)
CREATE OR REPLACE FUNCTION update_focus_session(
  p_session_id UUID,
  p_action TEXT  -- 'pause', 'resume', 'stop', 'complete'
) RETURNS focus_sessions AS $$
DECLARE
  v_user_id UUID;
  v_session focus_sessions;
  v_paused_json JSONB;
  v_last_pause JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_session
  FROM focus_sessions
  WHERE id = p_session_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  v_paused_json := v_session.paused_json;

  CASE p_action
    WHEN 'pause' THEN
      IF v_session.status != 'running' THEN
        RAISE EXCEPTION 'Session not running';
      END IF;
      v_paused_json := v_paused_json || jsonb_build_array(jsonb_build_object('paused_at', NOW()));
      UPDATE focus_sessions
      SET status = 'paused', paused_json = v_paused_json
      WHERE id = p_session_id
      RETURNING * INTO v_session;

    WHEN 'resume' THEN
      IF v_session.status != 'paused' THEN
        RAISE EXCEPTION 'Session not paused';
      END IF;
      -- Update the last pause entry with resumed_at
      v_last_pause := v_paused_json->-1;
      v_last_pause := v_last_pause || jsonb_build_object('resumed_at', NOW());
      v_paused_json := v_paused_json[0:jsonb_array_length(v_paused_json)-1] || jsonb_build_array(v_last_pause);
      UPDATE focus_sessions
      SET status = 'running', paused_json = v_paused_json
      WHERE id = p_session_id
      RETURNING * INTO v_session;

    WHEN 'stop' THEN
      UPDATE focus_sessions
      SET status = 'stopped', ended_at = NOW()
      WHERE id = p_session_id
      RETURNING * INTO v_session;

    WHEN 'complete' THEN
      UPDATE focus_sessions
      SET status = 'done', ended_at = NOW()
      WHERE id = p_session_id
      RETURNING * INTO v_session;

    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get running focus session (if any)
CREATE OR REPLACE FUNCTION get_running_focus_session()
RETURNS focus_sessions AS $$
DECLARE
  v_user_id UUID;
  v_session focus_sessions;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_session
  FROM focus_sessions
  WHERE user_id = v_user_id AND status IN ('running', 'paused')
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
