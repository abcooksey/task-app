-- Phase 4: Avatar & Wardrobe
-- Run this in your Supabase SQL Editor after 003_store_decorating_focus.sql

-- =============================================================================
-- TABLES
-- =============================================================================

-- Avatar table (one per user)
CREATE TABLE avatar (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  appearance_json JSONB NOT NULL,  -- { skin, eyes, hair: { styleId, colorId }, top, bottom, shoes, accessory? }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved outfits (up to 12 per user)
CREATE TABLE outfits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(name) <= 24),
  appearance_json JSONB NOT NULL,
  sort_index      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX outfits_user_idx ON outfits(user_id);

-- Free appearance options (seeded, read-only)
CREATE TABLE free_appearance_options (
  id        TEXT PRIMARY KEY,  -- e.g., 'skin_light', 'eyes_brown'
  category  TEXT NOT NULL CHECK (category IN (
    'skin', 'eyes', 'hair_color', 'hair_style', 'starter_top', 'starter_bottom', 'starter_shoes'
  ))
);

-- =============================================================================
-- ADD WEARABLE COLUMNS TO CATALOG_ITEMS
-- =============================================================================

-- Layers JSON for composing avatar (e.g., [{ "layer": "top", "textureKey": "..." }])
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS layers_json JSONB;

-- Whether this item hides hair layers (e.g., hats)
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS hides_hair BOOLEAN NOT NULL DEFAULT FALSE;

-- Whether this item hides accessory layer (e.g., helmets)
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS hides_accessory BOOLEAN NOT NULL DEFAULT FALSE;

-- Family for grouping color variants (e.g., 'tee_basic' groups all tee colors)
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS family TEXT;

-- Animation frames (for future use)
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS frames_json JSONB;

-- Sit anchor for sittable furniture (where avatar sits)
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS sit_anchor_json JSONB;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE avatar ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_appearance_options ENABLE ROW LEVEL SECURITY;

-- Avatar policies
CREATE POLICY "Users can view their own avatar"
  ON avatar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own avatar"
  ON avatar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatar"
  ON avatar FOR UPDATE
  USING (auth.uid() = user_id);

-- Outfits policies
CREATE POLICY "Users can view their own outfits"
  ON outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own outfits"
  ON outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfits"
  ON outfits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfits"
  ON outfits FOR DELETE
  USING (auth.uid() = user_id);

-- Free appearance options: everyone can read
CREATE POLICY "Anyone can read free appearance options"
  ON free_appearance_options FOR SELECT
  USING (true);

-- Only service role can modify free options
CREATE POLICY "Service role can manage free appearance options"
  ON free_appearance_options FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger for avatar
CREATE TRIGGER avatar_updated_at
  BEFORE UPDATE ON avatar
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- SEED FREE APPEARANCE OPTIONS
-- =============================================================================

-- Skins (6)
INSERT INTO free_appearance_options (id, category) VALUES
  ('skin_light', 'skin'),
  ('skin_light_medium', 'skin'),
  ('skin_medium', 'skin'),
  ('skin_medium_dark', 'skin'),
  ('skin_dark', 'skin'),
  ('skin_deep', 'skin');

-- Eye colors (4)
INSERT INTO free_appearance_options (id, category) VALUES
  ('eyes_brown', 'eyes'),
  ('eyes_blue', 'eyes'),
  ('eyes_green', 'eyes'),
  ('eyes_hazel', 'eyes');

-- Hair colors (8)
INSERT INTO free_appearance_options (id, category) VALUES
  ('hair_black', 'hair_color'),
  ('hair_dark_brown', 'hair_color'),
  ('hair_light_brown', 'hair_color'),
  ('hair_blonde', 'hair_color'),
  ('hair_red', 'hair_color'),
  ('hair_auburn', 'hair_color'),
  ('hair_grey', 'hair_color'),
  ('hair_white', 'hair_color');

-- Hair styles (3 free)
INSERT INTO free_appearance_options (id, category) VALUES
  ('hair_short', 'hair_style'),
  ('hair_medium', 'hair_style'),
  ('hair_long', 'hair_style');

-- Starter tops (3)
INSERT INTO free_appearance_options (id, category) VALUES
  ('starter_tee_white', 'starter_top'),
  ('starter_tee_grey', 'starter_top'),
  ('starter_tee_black', 'starter_top');

-- Starter bottoms (3)
INSERT INTO free_appearance_options (id, category) VALUES
  ('starter_pants_blue', 'starter_bottom'),
  ('starter_pants_black', 'starter_bottom'),
  ('starter_pants_khaki', 'starter_bottom');

-- Starter shoes (2)
INSERT INTO free_appearance_options (id, category) VALUES
  ('starter_sneakers_white', 'starter_shoes'),
  ('starter_sneakers_black', 'starter_shoes');

-- =============================================================================
-- VALIDATION FUNCTION
-- =============================================================================

-- Validate appearance JSON against free options and inventory
CREATE OR REPLACE FUNCTION validate_appearance_json(
  p_user_id UUID,
  p_appearance_json JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_skin TEXT;
  v_eyes TEXT;
  v_hair_style TEXT;
  v_hair_color TEXT;
  v_top TEXT;
  v_bottom TEXT;
  v_shoes TEXT;
  v_accessory TEXT;
BEGIN
  -- Extract fields from appearance JSON
  v_skin := p_appearance_json->>'skin';
  v_eyes := p_appearance_json->>'eyes';
  v_hair_style := p_appearance_json->'hair'->>'styleId';
  v_hair_color := p_appearance_json->'hair'->>'colorId';
  v_top := p_appearance_json->>'top';
  v_bottom := p_appearance_json->>'bottom';
  v_shoes := p_appearance_json->>'shoes';
  v_accessory := p_appearance_json->>'accessory';

  -- Validate required fields exist
  IF v_skin IS NULL OR v_eyes IS NULL OR v_hair_style IS NULL OR
     v_hair_color IS NULL OR v_top IS NULL OR v_bottom IS NULL OR v_shoes IS NULL THEN
    RAISE EXCEPTION 'Appearance missing required fields';
  END IF;

  -- Validate skin is free
  IF NOT EXISTS(SELECT 1 FROM free_appearance_options WHERE id = v_skin AND category = 'skin') THEN
    RAISE EXCEPTION 'Invalid skin: %', v_skin;
  END IF;

  -- Validate eyes are free
  IF NOT EXISTS(SELECT 1 FROM free_appearance_options WHERE id = v_eyes AND category = 'eyes') THEN
    RAISE EXCEPTION 'Invalid eyes: %', v_eyes;
  END IF;

  -- Validate hair color is free
  IF NOT EXISTS(SELECT 1 FROM free_appearance_options WHERE id = v_hair_color AND category = 'hair_color') THEN
    RAISE EXCEPTION 'Invalid hair color: %', v_hair_color;
  END IF;

  -- Validate hair style is free OR owned
  IF NOT EXISTS(SELECT 1 FROM free_appearance_options WHERE id = v_hair_style AND category = 'hair_style') THEN
    IF NOT EXISTS(SELECT 1 FROM inventory WHERE user_id = p_user_id AND item_id = v_hair_style) THEN
      RAISE EXCEPTION 'Hair style not owned: %', v_hair_style;
    END IF;
  END IF;

  -- Validate top is starter OR owned
  IF NOT EXISTS(SELECT 1 FROM free_appearance_options WHERE id = v_top AND category = 'starter_top') THEN
    IF NOT EXISTS(SELECT 1 FROM inventory WHERE user_id = p_user_id AND item_id = v_top) THEN
      RAISE EXCEPTION 'Top not owned: %', v_top;
    END IF;
  END IF;

  -- Validate bottom is starter OR owned
  IF NOT EXISTS(SELECT 1 FROM free_appearance_options WHERE id = v_bottom AND category = 'starter_bottom') THEN
    IF NOT EXISTS(SELECT 1 FROM inventory WHERE user_id = p_user_id AND item_id = v_bottom) THEN
      RAISE EXCEPTION 'Bottom not owned: %', v_bottom;
    END IF;
  END IF;

  -- Validate shoes are starter OR owned
  IF NOT EXISTS(SELECT 1 FROM free_appearance_options WHERE id = v_shoes AND category = 'starter_shoes') THEN
    IF NOT EXISTS(SELECT 1 FROM inventory WHERE user_id = p_user_id AND item_id = v_shoes) THEN
      RAISE EXCEPTION 'Shoes not owned: %', v_shoes;
    END IF;
  END IF;

  -- Validate accessory is owned (if present)
  IF v_accessory IS NOT NULL AND v_accessory != '' THEN
    IF NOT EXISTS(SELECT 1 FROM inventory WHERE user_id = p_user_id AND item_id = v_accessory) THEN
      RAISE EXCEPTION 'Accessory not owned: %', v_accessory;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to validate appearance on insert/update
CREATE OR REPLACE FUNCTION validate_avatar_appearance_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM validate_appearance_json(NEW.user_id, NEW.appearance_json);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to avatar table
CREATE TRIGGER avatar_appearance_validation
  BEFORE INSERT OR UPDATE ON avatar
  FOR EACH ROW
  EXECUTE FUNCTION validate_avatar_appearance_trigger();

-- Apply trigger to outfits table
CREATE TRIGGER outfit_appearance_validation
  BEFORE INSERT OR UPDATE ON outfits
  FOR EACH ROW
  EXECUTE FUNCTION validate_avatar_appearance_trigger();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Save or update avatar appearance
CREATE OR REPLACE FUNCTION save_avatar(
  p_appearance_json JSONB
) RETURNS avatar AS $$
DECLARE
  v_user_id UUID;
  v_result avatar;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert avatar
  INSERT INTO avatar (user_id, appearance_json)
  VALUES (v_user_id, p_appearance_json)
  ON CONFLICT (user_id) DO UPDATE SET
    appearance_json = EXCLUDED.appearance_json,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get avatar for current user
CREATE OR REPLACE FUNCTION get_avatar()
RETURNS avatar AS $$
DECLARE
  v_user_id UUID;
  v_result avatar;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_result FROM avatar WHERE user_id = v_user_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save outfit (create new or update existing)
CREATE OR REPLACE FUNCTION save_outfit(
  p_outfit_id UUID,
  p_name TEXT,
  p_appearance_json JSONB
) RETURNS outfits AS $$
DECLARE
  v_user_id UUID;
  v_outfit_count INTEGER;
  v_next_sort_index INTEGER;
  v_result outfits;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If updating existing outfit
  IF p_outfit_id IS NOT NULL THEN
    UPDATE outfits
    SET name = p_name, appearance_json = p_appearance_json
    WHERE id = p_outfit_id AND user_id = v_user_id
    RETURNING * INTO v_result;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Outfit not found';
    END IF;

    RETURN v_result;
  END IF;

  -- Creating new outfit - check cap
  SELECT COUNT(*) INTO v_outfit_count
  FROM outfits WHERE user_id = v_user_id;

  IF v_outfit_count >= 12 THEN
    RAISE EXCEPTION 'Maximum 12 outfits reached';
  END IF;

  -- Get next sort index
  SELECT COALESCE(MAX(sort_index), -1) + 1 INTO v_next_sort_index
  FROM outfits WHERE user_id = v_user_id;

  -- Create outfit
  INSERT INTO outfits (user_id, name, appearance_json, sort_index)
  VALUES (v_user_id, p_name, p_appearance_json, v_next_sort_index)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete outfit
CREATE OR REPLACE FUNCTION delete_outfit(
  p_outfit_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM outfits
  WHERE id = p_outfit_id AND user_id = v_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all outfits for current user
CREATE OR REPLACE FUNCTION get_outfits()
RETURNS SETOF outfits AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT * FROM outfits
  WHERE user_id = v_user_id
  ORDER BY sort_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reorder outfits
CREATE OR REPLACE FUNCTION reorder_outfits(
  p_outfit_ids UUID[]
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_id UUID;
  v_index INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOREACH v_id IN ARRAY p_outfit_ids LOOP
    UPDATE outfits
    SET sort_index = v_index
    WHERE id = v_id AND user_id = v_user_id;
    v_index := v_index + 1;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize avatar with default appearance
CREATE OR REPLACE FUNCTION initialize_avatar()
RETURNS avatar AS $$
DECLARE
  v_user_id UUID;
  v_default_appearance JSONB;
  v_result avatar;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if avatar already exists
  SELECT * INTO v_result FROM avatar WHERE user_id = v_user_id;
  IF FOUND THEN
    RETURN v_result;
  END IF;

  -- Default appearance matching constants.ts
  v_default_appearance := jsonb_build_object(
    'skin', 'skin_medium',
    'eyes', 'eyes_brown',
    'hair', jsonb_build_object(
      'styleId', 'hair_short',
      'colorId', 'hair_black'
    ),
    'top', 'starter_tee_grey',
    'bottom', 'starter_pants_blue',
    'shoes', 'starter_sneakers_white'
  );

  INSERT INTO avatar (user_id, appearance_json)
  VALUES (v_user_id, v_default_appearance)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE BUY_ITEM FOR WEARABLES
-- =============================================================================

-- Drop and recreate buy_item to handle wearables as single-copy
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
  v_is_wearable BOOLEAN;
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

  -- Check if this is a wearable category
  v_is_wearable := v_item.category IN ('clothing_top', 'clothing_bottom', 'clothing_shoes', 'hair', 'accessory');

  -- Check if single-copy item already owned
  -- Wearables are ALWAYS single-copy regardless of allow_multiple flag
  IF NOT v_item.allow_multiple OR v_is_wearable THEN
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

-- =============================================================================
-- GET AVATAR DATA FUNCTION
-- =============================================================================

-- Get all avatar-related data in one call
CREATE OR REPLACE FUNCTION get_avatar_data()
RETURNS TABLE(
  avatar_json JSONB,
  outfits_json JSONB,
  free_options_json JSONB,
  owned_wearables_json JSONB
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
    -- Current avatar appearance
    (SELECT COALESCE(row_to_json(a), '{}'::json)::jsonb FROM avatar a WHERE a.user_id = v_user_id),
    -- All saved outfits
    (SELECT COALESCE(jsonb_agg(row_to_json(o) ORDER BY o.sort_index), '[]'::jsonb)
     FROM outfits o WHERE o.user_id = v_user_id),
    -- All free appearance options grouped by category
    (SELECT jsonb_object_agg(
      fao.category,
      (SELECT jsonb_agg(fao2.id) FROM free_appearance_options fao2 WHERE fao2.category = fao.category)
    )
    FROM (SELECT DISTINCT category FROM free_appearance_options) fao),
    -- Owned wearables from inventory
    (SELECT COALESCE(jsonb_agg(i.item_id), '[]'::jsonb)
     FROM inventory i
     JOIN catalog_items c ON c.id = i.item_id
     WHERE i.user_id = v_user_id
       AND c.category IN ('clothing_top', 'clothing_bottom', 'clothing_shoes', 'hair', 'accessory'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
