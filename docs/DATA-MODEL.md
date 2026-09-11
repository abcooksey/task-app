# Data Model

## Overview

Single-user app with Row Level Security (RLS) keyed to `user_id` for future-proofing. All tables enforce RLS policies.

---

## Tables

### users
Managed by Supabase Auth. Extended with `user_profiles` if needed.

### tasks
```sql
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  title           TEXT NOT NULL,
  context         TEXT NOT NULL DEFAULT 'personal' CHECK (context IN ('work', 'personal')),
  size            TEXT NOT NULL DEFAULT 'small' CHECK (size IN ('tiny', 'small', 'medium', 'large')),
  notes           TEXT,
  due_date        DATE,
  due_time        TIME,
  recurrence      JSONB,           -- See recurrence grammar below
  times_per_day   INTEGER DEFAULT 1 CHECK (times_per_day >= 1),
  is_paused       BOOLEAN DEFAULT FALSE,
  defer_count     INTEGER DEFAULT 0,
  pinned_date     DATE,            -- Pin to specific day's Today view
  sort_index      INTEGER,         -- Manual ordering
  is_template     BOOLEAN DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,     -- Soft delete
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX tasks_user_id_idx ON tasks(user_id);
CREATE INDEX tasks_due_date_idx ON tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX tasks_deleted_at_idx ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
```

### subtasks
```sql
CREATE TABLE subtasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  sort_index      INTEGER NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX subtasks_task_id_idx ON subtasks(task_id);
```

### completions
Records each task completion. For recurring tasks, `occurrence_key` identifies which occurrence.

```sql
CREATE TABLE completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  occurrence_key  TEXT,            -- e.g., "2024-09-15" for daily, "2024-W37" for weekly
  completed_at    TIMESTAMPTZ DEFAULT NOW(),
  reversed_at     TIMESTAMPTZ      -- Set when uncompleted (soft reversal)
);

CREATE INDEX completions_task_id_idx ON completions(task_id);
CREATE INDEX completions_user_completed_idx ON completions(user_id, completed_at);
CREATE INDEX completions_occurrence_idx ON completions(task_id, occurrence_key);
```

### coin_ledger
**Append-only.** Balance is always `SUM(amount)`. Never delete rows.

```sql
CREATE TYPE ledger_reason AS ENUM (
  'task_completion',
  'variable_bonus',
  'jackpot_bonus',
  'dread_bonus',
  'first_of_day_bonus',
  'subtask_completion',
  'reversal',
  'repair',       -- Phase 2
  'purchase'      -- Phase 3
);

CREATE TABLE coin_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  amount          INTEGER NOT NULL,  -- Positive or negative
  reason          ledger_reason NOT NULL,
  ref_type        TEXT,              -- 'task', 'subtask', 'repair', 'item'
  ref_id          UUID,              -- ID of referenced entity
  meta            JSONB,             -- Additional context (e.g., { "defer_count": 3 })
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX coin_ledger_user_id_idx ON coin_ledger(user_id);
CREATE INDEX coin_ledger_created_at_idx ON coin_ledger(user_id, created_at);
CREATE INDEX coin_ledger_ref_idx ON coin_ledger(ref_type, ref_id);
```

### day_state
Per-day user state (low energy mode, custom ordering).

```sql
CREATE TABLE day_state (
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  day_key         DATE NOT NULL,     -- The "app day" (4am-4am window start date)
  low_energy      BOOLEAN DEFAULT FALSE,
  custom_order    JSONB,             -- Array of task IDs in display order
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, day_key)
);
```

### settings
User preferences. Single row per user.

```sql
CREATE TABLE settings (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id),
  day_boundary_minutes  INTEGER DEFAULT 240,  -- 4am = 240 minutes from midnight
  quiet_hours           JSONB,                -- See schema below
  contexts              JSONB,                -- Custom names/colors
  reduced_motion        BOOLEAN DEFAULT FALSE,
  last_used_context     TEXT DEFAULT 'personal',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Recurrence Grammar

The `recurrence` JSONB field stores the recurrence rule:

```typescript
type RecurrenceRule =
  | ScheduledRecurrence
  | IntervalRecurrence;

interface ScheduledRecurrence {
  mode: 'scheduled';
  pattern: ScheduledPattern;
  time?: string;  // HH:mm format, e.g., "09:00"
}

interface IntervalRecurrence {
  mode: 'interval';
  days: number;   // Interval in days
  time?: string;  // HH:mm format
}

type ScheduledPattern =
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] }           // 0=Sunday, 1=Monday, etc.
  | { type: 'monthly'; day: number }             // Day of month (1-31)
  | { type: 'weekdays' }                         // Mon-Fri
  | { type: 'custom_days'; interval: number }    // Every N days (calendar-based)
```

### Examples

**"Every day"**
```json
{ "mode": "scheduled", "pattern": { "type": "daily" } }
```

**"Every weekday at 9am"**
```json
{ "mode": "scheduled", "pattern": { "type": "weekdays" }, "time": "09:00" }
```

**"Every Monday and Thursday"**
```json
{ "mode": "scheduled", "pattern": { "type": "weekly", "days": [1, 4] } }
```

**"Every 3 days" (interval-since-done)**
```json
{ "mode": "interval", "days": 3 }
```

**"Monthly on the 1st"**
```json
{ "mode": "scheduled", "pattern": { "type": "monthly", "day": 1 } }
```

**"Every 2 weeks" (calendar-based)**
```json
{ "mode": "scheduled", "pattern": { "type": "custom_days", "interval": 14 } }
```

---

## Recurrence Semantics

### Scheduled Mode
- Occurrences exist on fixed calendar dates regardless of completion
- **Critical:** Missing an occurrence does NOT create a backlog
- At any time, show only the current or next occurrence
- `occurrence_key` format: `YYYY-MM-DD` or `YYYY-MM-DD-N` for multiple per day

**Algorithm for "what's due in window [start, end]":**
1. Generate all calendar dates matching the pattern in the window
2. For each date, check if completed (lookup by `occurrence_key`)
3. Return only uncompleted occurrences, but never more than one past occurrence

### Interval Mode
- Next occurrence = last completion date + interval days
- If never completed, due today
- `occurrence_key` format: computed from completion date

**Algorithm for "is this task due today":**
1. Find most recent non-reversed completion
2. If none exists, due today
3. If exists, compute `completion_date + interval_days`
4. Compare to today's "app day" (accounting for 4am boundary)

---

## Day Boundary Handling

The "app day" runs from 4:00 AM to 3:59:59 AM the next calendar day.

```typescript
function getAppDay(timestamp: Date, boundaryMinutes: number = 240): string {
  const localTime = new Date(timestamp.toLocaleString('en-US', { timeZone: userTimeZone }));
  const minutesSinceMidnight = localTime.getHours() * 60 + localTime.getMinutes();

  if (minutesSinceMidnight < boundaryMinutes) {
    // Before 4am, still "yesterday" in app terms
    localTime.setDate(localTime.getDate() - 1);
  }

  return localTime.toISOString().split('T')[0]; // YYYY-MM-DD
}
```

---

## Settings Schemas

### quiet_hours
```json
{
  "work": {
    "enabled": true,
    "start": "18:00",
    "end": "09:00",
    "weekends": true
  },
  "personal": {
    "enabled": false
  }
}
```

### contexts
```json
{
  "work": {
    "name": "Work",
    "color": "#3B82F6",
    "icon": "briefcase"
  },
  "personal": {
    "name": "Personal",
    "color": "#10B981",
    "icon": "home"
  }
}
```

---

## Ledger Semantics

### On Task Completion

1. Calculate base payout from task size
2. Roll for variable bonus (15% chance +50%, 3% chance +200%)
3. Calculate dread bonus: `base * min(1 + 0.25 * defer_count, 3)`
4. Check if first completion of the app day (+5)
5. Write ledger rows:
   - `task_completion`: base amount
   - `variable_bonus` or `jackpot_bonus`: if applicable
   - `dread_bonus`: if defer_count > 0
   - `first_of_day_bonus`: if applicable

### On Uncomplete

1. Find all ledger rows for this completion (by `ref_id`)
2. Write reversing rows with `reason: 'reversal'` and negative amounts
3. Set `reversed_at` on the completion record
4. Start 60-second cooldown before task can pay again

### Balance Computation

```sql
SELECT COALESCE(SUM(amount), 0) as balance
FROM coin_ledger
WHERE user_id = $1;
```

### Today's Coins

```sql
SELECT COALESCE(SUM(amount), 0) as today_coins
FROM coin_ledger
WHERE user_id = $1
  AND created_at >= $app_day_start
  AND created_at < $app_day_end;
```

---

## Row Level Security

All tables enforce RLS with policies like:

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own tasks"
  ON tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Export/Import Format

JSON structure for full data export:

```json
{
  "version": 1,
  "exported_at": "2024-09-15T10:30:00Z",
  "tasks": [...],
  "subtasks": [...],
  "completions": [...],
  "coin_ledger": [...],
  "day_state": [...],
  "settings": {...}
}
```

Import must:
1. Validate schema with Zod
2. Clear existing data (with confirmation)
3. Insert all records preserving IDs
4. Verify ledger balance matches expected

---

## Phase 2: House Tables

### house_repairs
Records completed repairs. One row per user per repair.

```sql
CREATE TABLE house_repairs (
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  repair_id       TEXT NOT NULL,                    -- e.g., "int_floor", "ext_roof"
  completed_at    TIMESTAMPTZ DEFAULT NOW(),
  ledger_id       UUID REFERENCES coin_ledger(id),  -- The spend transaction
  PRIMARY KEY (user_id, repair_id)
);

CREATE INDEX house_repairs_user_idx ON house_repairs(user_id);
```

### house_state
User preferences for the house view.

```sql
CREATE TABLE house_state (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id),
  last_view       TEXT DEFAULT 'interior' CHECK (last_view IN ('interior', 'exterior')),
  sfx_enabled     BOOLEAN DEFAULT FALSE,
  first_repair_done BOOLEAN DEFAULT FALSE,          -- For first-repair guidance
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Updated ledger_reason enum

```sql
-- Add new reason types for Phase 2+
ALTER TYPE ledger_reason ADD VALUE 'repair';
ALTER TYPE ledger_reason ADD VALUE 'repair_refund';  -- For undo
ALTER TYPE ledger_reason ADD VALUE 'purchase';       -- Reserved for Phase 3
ALTER TYPE ledger_reason ADD VALUE 'refund';         -- Reserved for Phase 3
```

---

## Atomic Spend Function

The `spend_coins` function ensures balance can never go negative and handles concurrent requests safely.

```sql
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
```

---

## Perform Repair Function

Idempotent repair function — safe to call multiple times.

```sql
CREATE OR REPLACE FUNCTION perform_repair(
  p_user_id    UUID,
  p_repair_id  TEXT,
  p_cost       INTEGER
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, already_done BOOLEAN) AS $$
DECLARE
  v_existing RECORD;
  v_spend_result RECORD;
BEGIN
  -- Check if already completed (idempotent)
  SELECT * INTO v_existing
  FROM house_repairs
  WHERE user_id = p_user_id AND repair_id = p_repair_id;

  IF FOUND THEN
    -- Already done, return success without charging
    SELECT COALESCE(SUM(amount), 0) INTO v_spend_result.new_balance
    FROM coin_ledger WHERE user_id = p_user_id;

    RETURN QUERY SELECT TRUE, v_spend_result.new_balance::INTEGER, TRUE;
    RETURN;
  END IF;

  -- Spend the coins
  SELECT * INTO v_spend_result
  FROM spend_coins(p_user_id, p_cost, 'repair', 'repair', p_repair_id);

  -- Record the repair
  INSERT INTO house_repairs (user_id, repair_id, ledger_id)
  VALUES (p_user_id, p_repair_id, v_spend_result.ledger_id);

  -- Mark first repair done (for guidance)
  UPDATE house_state
  SET first_repair_done = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT TRUE, v_spend_result.new_balance, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Undo Repair Function

Only works within 5-second window.

```sql
CREATE OR REPLACE FUNCTION undo_repair(
  p_user_id    UUID,
  p_repair_id  TEXT,
  p_max_age_seconds INTEGER DEFAULT 5
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, reason TEXT) AS $$
DECLARE
  v_repair RECORD;
  v_ledger_row RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Find the repair
  SELECT * INTO v_repair
  FROM house_repairs
  WHERE user_id = p_user_id AND repair_id = p_repair_id;

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

  -- Write refund row (positive amount)
  INSERT INTO coin_ledger (user_id, amount, reason, ref_type, ref_id)
  VALUES (p_user_id, ABS(v_ledger_row.amount), 'repair_refund', 'repair', p_repair_id);

  -- Delete the repair record
  DELETE FROM house_repairs
  WHERE user_id = p_user_id AND repair_id = p_repair_id;

  -- Get new balance
  SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
  FROM coin_ledger WHERE user_id = p_user_id;

  RETURN QUERY SELECT TRUE, v_new_balance, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Derived House State

Computed client-side from `repairs.json` content + completed repair IDs:

```typescript
interface HouseState {
  completedRepairIds: Set<string>;
  availableRepairIds: Set<string>;   // Dependencies satisfied, not completed
  lockedRepairIds: Set<string>;      // Dependencies not satisfied
  decoratingUnlocked: boolean;       // All int_* repairs done
  progress: {
    interior: { done: number; total: number };
    exterior: { done: number; total: number };
  };
  firstRepairDone: boolean;          // For guidance mode
}

function deriveHouseState(
  repairsContent: Repair[],
  completedIds: string[],
  firstRepairDone: boolean
): HouseState {
  // Pure function, easily testable
}
```

---

## Export/Import Update

JSON structure now includes house data:

```json
{
  "version": 2,
  "exported_at": "2024-09-15T10:30:00Z",
  "tasks": [...],
  "subtasks": [...],
  "completions": [...],
  "coin_ledger": [...],
  "day_state": [...],
  "settings": {...},
  "house_repairs": [...],
  "house_state": {...}
}
```

---

## Phase 3: Store, Decorating, and Focus Timer

### Updated ledger_reason enum

```sql
-- Add new reason types for Phase 3
ALTER TYPE ledger_reason ADD VALUE 'purchase';
ALTER TYPE ledger_reason ADD VALUE 'mystery_box';
ALTER TYPE ledger_reason ADD VALUE 'focus';
ALTER TYPE ledger_reason ADD VALUE 'focus_bonus';
```

### catalog_items

Source of truth for item definitions. Seeded from `catalog.json`.

```sql
CREATE TABLE catalog_items (
  id              TEXT PRIMARY KEY,               -- e.g., "sofa_blue", "rug_round_cream"
  name            TEXT NOT NULL,
  blurb           TEXT,
  category        TEXT NOT NULL CHECK (category IN (
    'furniture', 'decor', 'rug', 'wall', 'surface_decor', 'outdoor',
    'wall_finish', 'floor_finish',
    'clothing_top', 'clothing_bottom', 'clothing_shoes', 'hair', 'accessory'  -- Reserved for Phase 4
  )),
  price           INTEGER NOT NULL CHECK (price > 0),
  placement       TEXT NOT NULL CHECK (placement IN (
    'floor', 'rug', 'wall', 'surface', 'outdoor', 'wall_finish', 'floor_finish', 'wearable'
  )),
  footprint_w     INTEGER NOT NULL DEFAULT 1 CHECK (footprint_w > 0),
  footprint_h     INTEGER NOT NULL DEFAULT 1 CHECK (footprint_h > 0),
  is_surface      BOOLEAN NOT NULL DEFAULT FALSE,
  slots_json      JSONB,                          -- [{ "x": 0, "y": 0 }, ...] for surface items
  allow_multiple  BOOLEAN NOT NULL DEFAULT FALSE,
  availability    JSONB NOT NULL,                 -- { "kind": "always" } | { "kind": "rotation", "pool": "..." } | { "kind": "seasonal", "from": "MM-DD", "to": "MM-DD" }
  rarity          TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare')),
  texture_key     TEXT NOT NULL,
  flipped_texture TEXT,
  tags            TEXT[] DEFAULT '{}',
  version         INTEGER NOT NULL DEFAULT 1,     -- For drift detection
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### inventory

User-owned items. One row per owned instance.

```sql
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
```

### placements

Placed items in the room. Uses region-relative coordinates.

```sql
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
  slot_index            INTEGER,                  -- Which slot on the parent
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inventory_id)                           -- One placement per inventory item
);

CREATE INDEX placements_user_idx ON placements(user_id);
CREATE INDEX placements_view_idx ON placements(user_id, view);
CREATE INDEX placements_parent_idx ON placements(parent_placement_id);
```

### room_finishes

Applied wall/floor finishes per view.

```sql
CREATE TABLE room_finishes (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view            TEXT NOT NULL CHECK (view IN ('interior', 'exterior')),
  wall_item_id    TEXT REFERENCES catalog_items(id),   -- Currently applied wallpaper
  floor_item_id   TEXT REFERENCES catalog_items(id),   -- Currently applied flooring
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, view)
);
```

### mystery_openings

Tracks daily mystery box usage.

```sql
CREATE TABLE mystery_openings (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key         DATE NOT NULL,                  -- The "app day" (4am boundary)
  inventory_id    UUID NOT NULL REFERENCES inventory(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day_key)
);
```

### focus_sessions

Focus timer sessions with pause tracking.

```sql
CREATE TABLE focus_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  planned_minutes INTEGER NOT NULL CHECK (planned_minutes BETWEEN 5 AND 90),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_json     JSONB DEFAULT '[]',             -- [{ "paused_at": "...", "resumed_at": "..." }, ...]
  ended_at        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'stopped')),
  chunks_paid     INTEGER NOT NULL DEFAULT 0,     -- Number of 5-min chunks already paid
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX focus_sessions_user_idx ON focus_sessions(user_id);
CREATE INDEX focus_sessions_running_idx ON focus_sessions(user_id, status) WHERE status = 'running';
```

---

## Phase 3 Functions

### buy_item

Atomic purchase with idempotency key.

```sql
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
```

### open_mystery_box

Daily mystery box with weighted random selection.

```sql
CREATE OR REPLACE FUNCTION open_mystery_box()
RETURNS TABLE(success BOOLEAN, item_id TEXT, inventory_id UUID, new_balance INTEGER, reason TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_day_key DATE;
  v_existing RECORD;
  v_box_price INTEGER := 75;  -- Constant from economy.ts
  v_eligible_items RECORD[];
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

  -- Calculate app day (4am boundary)
  v_day_key := (NOW() AT TIME ZONE 'America/Toronto' - INTERVAL '4 hours')::DATE;

  -- Check if already opened today
  SELECT * INTO v_existing
  FROM mystery_openings
  WHERE user_id = v_user_id AND day_key = v_day_key;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::UUID, 0, 'Already opened today'::TEXT;
    RETURN;
  END IF;

  -- Build eligible pool:
  -- - All items priced >= box_price
  -- - Exclude owned single-copy items
  -- - Include all duplicate-allowed items
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
      AND (c.allow_multiple OR c.id NOT IN (SELECT item_id FROM owned_singles))
  )
  SELECT array_agg(e) INTO v_eligible_items FROM eligible e;

  IF array_length(v_eligible_items, 1) IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::UUID, 0, 'No eligible items'::TEXT;
    RETURN;
  END IF;

  -- Calculate total weight
  SELECT SUM((e).weight) INTO v_total_weight FROM unnest(v_eligible_items) e;

  -- Roll weighted random
  v_roll := random() * v_total_weight;

  FOR i IN 1..array_length(v_eligible_items, 1) LOOP
    v_cumulative := v_cumulative + (v_eligible_items[i]).weight;
    IF v_roll <= v_cumulative THEN
      v_selected_item := v_eligible_items[i];
      EXIT;
    END IF;
  END LOOP;

  -- Spend coins
  SELECT * INTO v_spend_result
  FROM spend_coins(v_user_id, v_box_price, 'mystery_box', 'mystery', v_day_key::TEXT);

  -- Create inventory row
  INSERT INTO inventory (user_id, item_id, source, ledger_id)
  VALUES (v_user_id, (v_selected_item).id, 'mystery', v_spend_result.ledger_id)
  RETURNING id INTO v_inventory_id;

  -- Record opening
  INSERT INTO mystery_openings (user_id, day_key, inventory_id)
  VALUES (v_user_id, v_day_key, v_inventory_id);

  RETURN QUERY SELECT TRUE, (v_selected_item).id, v_inventory_id, v_spend_result.new_balance, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### claim_starter_kit

Grants three starter items once.

```sql
CREATE OR REPLACE FUNCTION claim_starter_kit()
RETURNS TABLE(success BOOLEAN, items_granted TEXT[], already_claimed BOOLEAN) AS $$
DECLARE
  v_user_id UUID;
  v_existing INTEGER;
  v_starter_items TEXT[] := ARRAY['rug_basic', 'plant_small', 'poster_simple'];
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
```

### pay_focus_chunk

Pays for completed focus chunks with time validation.

```sql
CREATE OR REPLACE FUNCTION pay_focus_chunk(
  p_session_id  UUID,
  p_chunk_index INTEGER  -- 0-based for regular chunks, -1 for completion bonus
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, reason TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_session RECORD;
  v_elapsed_minutes NUMERIC;
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

  -- Calculate elapsed time accounting for pauses
  v_elapsed_minutes := EXTRACT(EPOCH FROM (
    COALESCE(v_session.ended_at, NOW()) - v_session.started_at
  )) / 60;

  -- Subtract paused time
  IF v_session.paused_json IS NOT NULL THEN
    SELECT v_elapsed_minutes - COALESCE(SUM(
      EXTRACT(EPOCH FROM (
        COALESCE((p->>'resumed_at')::timestamptz, NOW()) -
        (p->>'paused_at')::timestamptz
      )) / 60
    ), 0)
    INTO v_elapsed_minutes
    FROM jsonb_array_elements(v_session.paused_json) p;
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
    CASE WHEN p_chunk_index = -1 THEN 'focus_bonus' ELSE 'focus' END,
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
```

---

## Phase 3 Export/Import Update

JSON structure now includes store and focus data:

```json
{
  "version": 3,
  "exported_at": "2026-09-15T10:30:00Z",
  "tasks": [...],
  "subtasks": [...],
  "completions": [...],
  "coin_ledger": [...],
  "day_state": [...],
  "settings": {...},
  "house_repairs": [...],
  "house_state": {...},
  "inventory": [...],
  "placements": [...],
  "room_finishes": [...],
  "mystery_openings": [...],
  "focus_sessions": [...]
}
```

**Import notes:**
- Inventory IDs must be remapped consistently so placements still reference correct items
- Generate new UUIDs for inventory rows, update placement.inventory_id references
- Mystery openings reference inventory IDs — remap those too

---

## Phase 4: Avatar and Wardrobe

### avatar

Stores the user's current avatar appearance.

```sql
CREATE TABLE avatar (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  appearance_json   JSONB NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE avatar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own avatar"
  ON avatar FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**appearance_json schema:**
```json
{
  "skin": "skin_medium",
  "eyes": "eyes_brown",
  "hair": {
    "styleId": "hair_short",
    "colorId": "hair_black"
  },
  "top": "starter_tee_grey",
  "bottom": "starter_pants_blue",
  "shoes": "starter_sneakers_white",
  "accessory": null
}
```

### outfits

Saved outfit presets. Maximum 12 per user.

```sql
CREATE TABLE outfits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (length(name) <= 24),
  appearance_json   JSONB NOT NULL,
  sort_index        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX outfits_user_idx ON outfits(user_id);

-- RLS
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own outfits"
  ON outfits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### free_appearance_options

Seed table for free appearance options (validation reference).

```sql
CREATE TABLE free_appearance_options (
  category          TEXT NOT NULL CHECK (category IN (
    'skin', 'eyes', 'hair_color', 'hair_style',
    'starter_top', 'starter_bottom', 'starter_shoes'
  )),
  option_id         TEXT NOT NULL,
  PRIMARY KEY (category, option_id)
);

-- Seed data
INSERT INTO free_appearance_options (category, option_id) VALUES
  -- Skin tones (6)
  ('skin', 'skin_light'),
  ('skin', 'skin_light_medium'),
  ('skin', 'skin_medium'),
  ('skin', 'skin_medium_dark'),
  ('skin', 'skin_dark'),
  ('skin', 'skin_deep'),

  -- Eye colors (4)
  ('eyes', 'eyes_brown'),
  ('eyes', 'eyes_blue'),
  ('eyes', 'eyes_green'),
  ('eyes', 'eyes_hazel'),

  -- Hair colors (8)
  ('hair_color', 'hair_black'),
  ('hair_color', 'hair_dark_brown'),
  ('hair_color', 'hair_light_brown'),
  ('hair_color', 'hair_blonde'),
  ('hair_color', 'hair_red'),
  ('hair_color', 'hair_auburn'),
  ('hair_color', 'hair_grey'),
  ('hair_color', 'hair_white'),

  -- Free hair styles (3)
  ('hair_style', 'hair_short'),
  ('hair_style', 'hair_medium'),
  ('hair_style', 'hair_long'),

  -- Starter tops (3 color variants)
  ('starter_top', 'starter_tee_white'),
  ('starter_top', 'starter_tee_grey'),
  ('starter_top', 'starter_tee_black'),

  -- Starter bottoms (3 color variants)
  ('starter_bottom', 'starter_pants_blue'),
  ('starter_bottom', 'starter_pants_black'),
  ('starter_bottom', 'starter_pants_khaki'),

  -- Starter shoes (2 color variants)
  ('starter_shoes', 'starter_sneakers_white'),
  ('starter_shoes', 'starter_sneakers_black');
```

### catalog_items updates

Add wearable-specific columns:

```sql
ALTER TABLE catalog_items ADD COLUMN layers_json JSONB;
ALTER TABLE catalog_items ADD COLUMN hides_hair BOOLEAN DEFAULT FALSE;
ALTER TABLE catalog_items ADD COLUMN hides_accessory BOOLEAN DEFAULT FALSE;
ALTER TABLE catalog_items ADD COLUMN family TEXT;
ALTER TABLE catalog_items ADD COLUMN frames_json JSONB;
ALTER TABLE catalog_items ADD COLUMN sit_anchor_json JSONB;

-- layers_json example: ["top"] or ["top", "hair_front"] for hooded items
-- frames_json example: { "idle": "sweater_idle", "sit": "sweater_sit" }
-- sit_anchor_json example: { "x": 1, "y": 1 } for sittable furniture
```

### house_state updates

Add preferred seat tracking:

```sql
ALTER TABLE house_state ADD COLUMN preferred_seat_placement_id UUID REFERENCES placements(id) ON DELETE SET NULL;
```

---

## Phase 4 Validation Trigger

Validates appearance_json before insert/update on avatar table.

```sql
CREATE OR REPLACE FUNCTION validate_appearance()
RETURNS TRIGGER AS $$
DECLARE
  v_appearance JSONB;
  v_item_id TEXT;
  v_owned_count INTEGER;
  v_is_free BOOLEAN;
BEGIN
  v_appearance := NEW.appearance_json;

  -- Validate skin
  SELECT EXISTS(
    SELECT 1 FROM free_appearance_options
    WHERE category = 'skin' AND option_id = v_appearance->>'skin'
  ) INTO v_is_free;
  IF NOT v_is_free THEN
    RAISE EXCEPTION 'Invalid skin: %', v_appearance->>'skin';
  END IF;

  -- Validate eyes
  SELECT EXISTS(
    SELECT 1 FROM free_appearance_options
    WHERE category = 'eyes' AND option_id = v_appearance->>'eyes'
  ) INTO v_is_free;
  IF NOT v_is_free THEN
    RAISE EXCEPTION 'Invalid eyes: %', v_appearance->>'eyes';
  END IF;

  -- Validate hair color
  SELECT EXISTS(
    SELECT 1 FROM free_appearance_options
    WHERE category = 'hair_color' AND option_id = v_appearance->'hair'->>'colorId'
  ) INTO v_is_free;
  IF NOT v_is_free THEN
    RAISE EXCEPTION 'Invalid hair color: %', v_appearance->'hair'->>'colorId';
  END IF;

  -- Validate hair style (free or owned)
  v_item_id := v_appearance->'hair'->>'styleId';
  SELECT EXISTS(
    SELECT 1 FROM free_appearance_options
    WHERE category = 'hair_style' AND option_id = v_item_id
  ) INTO v_is_free;
  IF NOT v_is_free THEN
    SELECT COUNT(*) INTO v_owned_count
    FROM inventory WHERE user_id = NEW.user_id AND item_id = v_item_id;
    IF v_owned_count = 0 THEN
      RAISE EXCEPTION 'Hair style not owned: %', v_item_id;
    END IF;
  END IF;

  -- Validate top (starter or owned)
  v_item_id := v_appearance->>'top';
  SELECT EXISTS(
    SELECT 1 FROM free_appearance_options
    WHERE category = 'starter_top' AND option_id = v_item_id
  ) INTO v_is_free;
  IF NOT v_is_free THEN
    SELECT COUNT(*) INTO v_owned_count
    FROM inventory WHERE user_id = NEW.user_id AND item_id = v_item_id;
    IF v_owned_count = 0 THEN
      RAISE EXCEPTION 'Top not owned: %', v_item_id;
    END IF;
  END IF;

  -- Validate bottom (starter or owned)
  v_item_id := v_appearance->>'bottom';
  SELECT EXISTS(
    SELECT 1 FROM free_appearance_options
    WHERE category = 'starter_bottom' AND option_id = v_item_id
  ) INTO v_is_free;
  IF NOT v_is_free THEN
    SELECT COUNT(*) INTO v_owned_count
    FROM inventory WHERE user_id = NEW.user_id AND item_id = v_item_id;
    IF v_owned_count = 0 THEN
      RAISE EXCEPTION 'Bottom not owned: %', v_item_id;
    END IF;
  END IF;

  -- Validate shoes (starter or owned)
  v_item_id := v_appearance->>'shoes';
  SELECT EXISTS(
    SELECT 1 FROM free_appearance_options
    WHERE category = 'starter_shoes' AND option_id = v_item_id
  ) INTO v_is_free;
  IF NOT v_is_free THEN
    SELECT COUNT(*) INTO v_owned_count
    FROM inventory WHERE user_id = NEW.user_id AND item_id = v_item_id;
    IF v_owned_count = 0 THEN
      RAISE EXCEPTION 'Shoes not owned: %', v_item_id;
    END IF;
  END IF;

  -- Validate accessory (optional, must be owned if present)
  v_item_id := v_appearance->>'accessory';
  IF v_item_id IS NOT NULL AND v_item_id != 'null' THEN
    SELECT COUNT(*) INTO v_owned_count
    FROM inventory WHERE user_id = NEW.user_id AND item_id = v_item_id;
    IF v_owned_count = 0 THEN
      RAISE EXCEPTION 'Accessory not owned: %', v_item_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER avatar_appearance_validation
  BEFORE INSERT OR UPDATE ON avatar
  FOR EACH ROW
  EXECUTE FUNCTION validate_appearance();
```

---

## Phase 4 buy_item Update

Add wearable single-copy enforcement:

```sql
-- In buy_item function, add before the spend_coins call:

-- Check if wearable (always single-copy regardless of allow_multiple)
IF v_item.placement = 'wearable' THEN
  SELECT COUNT(*) INTO v_owned_count
  FROM inventory
  WHERE user_id = v_user_id AND item_id = p_item_id;

  IF v_owned_count > 0 THEN
    RAISE EXCEPTION 'Wearable already owned: %', p_item_id;
  END IF;
END IF;
```

---

## Phase 4 Export/Import Update

JSON structure now includes avatar data:

```json
{
  "version": 4,
  "exported_at": "2026-09-15T10:30:00Z",
  "tasks": [...],
  "subtasks": [...],
  "completions": [...],
  "coin_ledger": [...],
  "day_state": [...],
  "settings": {...},
  "house_repairs": [...],
  "house_state": {...},
  "inventory": [...],
  "placements": [...],
  "room_finishes": [...],
  "mystery_openings": [...],
  "focus_sessions": [...],
  "avatar": {...},
  "outfits": [...]
}
```

**Import notes for Phase 4:**
- Inventory ID remapping must also update item references in:
  - `avatar.appearance_json` (top, bottom, shoes, accessory, hair.styleId if owned)
  - `outfits[].appearance_json` (same fields)
- Try-on history is stored in `settings.tryon_history` (array of item IDs) — remap those too
- If an outfit references an item that doesn't exist after remap, substitute with starter piece
