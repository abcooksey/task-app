# Phase 3 Implementation Plan

Store, Decorating, and Focus Timer

---

## Overview

Phase 3 transforms the repaired house into a living space. Users spend coins to buy furniture and decor, place items on a grid, and earn coins through focused work sessions. The emotional job: **sustained novelty** through weekly rotation and a content calendar.

**Core rules:**
- Owning is permanent, moving is free, nothing can be damaged, lost, or expire
- Catalog JSON is the source of truth; the DB is a seeded copy
- All placements use region-relative coordinates (Option B)
- Weekly rotation is deterministic from ISO week + seeded PRNG (local Monday 4am refresh)

---

## Slices

### Slice 1: Catalog Schema + Seed Script + Drift Check

**Goal:** Establish the catalog data model and ensure JSON ↔ DB consistency.

**Tasks:**
- [ ] Create `docs/CATALOG-SCHEMA.md` with item schema and placement decision table
- [ ] Create `src/game/content/catalog.json` with ~70 launch items (names, prices, footprints, slots, availability)
- [ ] Create `src/game/content/rooms.json` with floor/wall/yard region definitions and `avatarAnchor`
- [ ] Add `catalog_items` table schema to migration
- [ ] Write `scripts/seed-catalog.ts` that upserts catalog.json → catalog_items
- [ ] Write `scripts/check-catalog-drift.ts` that fails if JSON and DB differ
- [ ] Add drift check to CI (runs on every PR)
- [ ] Add Phase 3 price constants to `src/config/economy.ts`

**Tests:**
- [ ] Seed script is idempotent (run twice, same result)
- [ ] Drift check catches added/removed/changed items
- [ ] All 70 items have valid schema (Zod validation)

---

### Slice 2: Placement Validator ✓

**Goal:** Pure function that determines if a placement is valid.

**Tasks:**
- [x] Create `src/game/placement/validate.ts` with `validate(roomDef, itemDef, placements, proposed, excludeId?) → { ok, reason? }`
- [x] Implement all placement types: floor, rug, wall, surface, outdoor, wall_finish, floor_finish
- [x] Implement overlap detection with region bounds checking
- [x] Handle rug special case (can overlap floor items and other rugs)
- [x] Handle surface slots (validate slot exists, is free, parent is placed)
- [x] Return reason codes: `out_of_region`, `overlaps`, `wrong_region`, `no_free_slot`, `slot_occupied`, `not_placeable`

**Tests (exhaustive matrix):**
- [x] Each placement type × in-region / out-of-region
- [x] Each placement type × overlap with same type / other types
- [x] Rug overlapping floor item (allowed)
- [x] Rug overlapping rug (allowed)
- [x] Floor item overlapping rug (allowed)
- [x] Floor item overlapping floor item (blocked)
- [x] Surface decor on valid slot (allowed)
- [x] Surface decor on occupied slot (blocked)
- [x] Surface decor on non-surface item (blocked)
- [x] Wall item on floor region (wrong_region)
- [x] Floor item on wall region (wrong_region)
- [x] Outdoor item on interior (wrong_region)
- [x] Item extending outside region bounds (out_of_region)
- [x] Move excludes self from overlap check (excludeId)
- [x] Wearable items rejected (not_placeable)

---

### Slice 3: Tables + RPCs + Tests ✓

**Goal:** Database schema and atomic operations for inventory, placements, mystery box, focus sessions.

**Tasks:**
- [x] Create migration with tables: `catalog_items`, `inventory`, `placements`, `room_finishes`, `mystery_openings`, `focus_sessions`
- [x] Add RLS policies for all tables
- [x] Add ledger_reason values: `'purchase'`, `'mystery_box'`, `'focus'`, `'focus_bonus'`
- [x] Create RPC `buy_item(item_id, client_request_id)` with idempotency
- [x] Create RPC `open_mystery_box()` with day_key check and weighted random
- [x] Create RPC `claim_starter_kit()` (idempotent)
- [x] Create RPC `pay_focus_chunk(session_id, chunk_index)` with elapsed validation
- [x] Add DB trigger for one-placement-per-inventory-id constraint (UNIQUE constraint)
- [x] Add DB trigger for region bounds backstop (CHECK constraints)

**Tests:** (to be run after migration is applied to Supabase)
- [ ] buy_item deducts correct amount, creates inventory row
- [ ] buy_item with same client_request_id doesn't double-buy
- [ ] buy_item for owned single-copy item fails
- [ ] buy_item with insufficient balance fails (balance can't go negative)
- [ ] open_mystery_box works first time per day
- [ ] open_mystery_box fails second time same day
- [ ] mystery_box pool excludes owned single-copy items
- [ ] mystery_box pool never contains items priced below box price
- [ ] mystery_box weighted random respects rarity (statistical test)
- [ ] claim_starter_kit grants exactly 3 items once
- [ ] pay_focus_chunk validates elapsed time from started_at
- [ ] pay_focus_chunk is idempotent per (session_id, chunk_index)
- [ ] focus bonus pays on chunk_index = -1

---

### Slice 4: Bridge + Placeholder Decorate Mode ✓

**Goal:** End-to-end decorating loop with labeled rectangles.

**Tasks:**
- [x] Extend bridge with React → Phaser commands:
  - `setPlacements(placements)`
  - `setFinishes({ wall?, floor? })`
  - `enterDecorateMode(view)` / `exitDecorateMode()`
  - `beginGhost(itemDef)` / `endGhost()`
  - `setGhostValidity(valid)`
  - `selectPlacement(placementId | null)`
- [x] Extend bridge with Phaser → React events:
  - `ghostMoved({ x, y })` (throttled per cell)
  - `ghostDropped({ x, y })`
  - `placementTapped(placementId)`
  - `placementDragged(placementId, { x, y })` / `placementDropped(placementId, { x, y })`
  - `emptyTapped()`
- [x] Update `rooms.json` with floor/wall/yard regions and avatarAnchor
- [x] Update SceneComposer with layers: `floor_base`, `rug`, `furniture` (depth-sorted), `wall_base`, `wall_decor`, `character` (unused), `front`
- [x] Implement grid overlay rendering (subtle dotted cells)
- [x] Implement ghost sprite following pointer with cell snapping
- [x] Implement ghost tint (green valid, red invalid with reason label)
- [x] Implement placed item rendering with depth sort (y + h, then placement.id)
- [x] Implement drag-to-move for placed items
- [x] Create inventory drawer component with category chips
- [x] Create action pill for selected items (Move, Flip, Store)
- [x] Wire up placement validator on ghostMoved
- [x] Implement optimistic placement save with rollback on failure

**Tests:** (to be run with integration tests)
- [ ] Place item → shows in scene
- [ ] Move item → new position saved
- [ ] Flip item → flipped state saved
- [ ] Store item → removed from scene, back in inventory
- [ ] Store surface parent → surface decor also stored, toast confirms
- [ ] Reload → placements restored exactly
- [ ] Depth sort matches bottom-edge rule
- [ ] Invalid drop → ghost returns to drawer, no error dialog

---

### Slice 5: Store Screen + Rotation + Mystery Box ✓

**Goal:** Full store UI with deterministic rotation and mystery box.

**Tasks:**
- [x] Create `/store` route
- [x] Add Store tab to navigation (accessible via bottom nav)
- [x] Implement store sections:
  - "New this week" (8 rotation items, shows "refreshes Monday" countdown)
  - "Mystery box" (one card, price, daily state)
  - "Always available" (grouped by category with filter chips)
  - "Seasonal" (only when active)
- [x] Create item card: sprite/placeholder, name, price, Buy/Owned/"N more coins" states
- [x] Create item detail sheet with blurb, footprint display ("2×1 floor")
- [x] Implement buy flow: single tap, detail sheet with Place It action
- [x] Create `src/lib/rotation.ts` with `rotation(isoWeek, year, pool) → itemIds[]`
- [x] Use xmur3 + mulberry32 PRNG seeded from week+year
- [x] Enforce rotation guarantees: 1 furniture, 2 decor, 1 wall, 1 outdoor minimum
- [x] Exclude previous week's items from current week's pool
- [x] Implement mystery box reveal animation (2s)
- [x] Show "come back tomorrow" after opening
- [x] Create `src/game/content/calendar.json` for seasonal windows (already existed)

**Tests:**
- [x] rotation() returns same items on any device for same week
- [x] rotation() changes exactly at Monday 4am local
- [x] rotation() guarantees minimum category counts
- [x] every rotation item appears at least once in 10-week window
- [x] seasonal items only appear in their date range
- [ ] mystery box refuse second open same day (server-side) - tested via RPC
- [ ] "Place it" action enters decorate mode with ghost - integration test

---

### Slice 6: Starter Kit + Today/Toast Hooks ✓

**Goal:** First-run experience and Today screen integration.

**Tasks:**
- [x] Implement starter kit claim on first store entry (auto-claims via `claim_starter_kit` RPC)
- [x] Grant 3 items: basic rug, plant, poster with `source: 'starter'` (handled by RPC)
- [x] Show one-line explanation toast ("Welcome! You received 3 starter items.")
- [x] Add "Store refreshed · N new items" card to Today screen
- [x] Only show store refresh when decorating unlocked (all interior repairs done)
- [x] Show repair nudge with cheapest available repair when repairs remain
- [x] Never show both repair nudge and store nudge (mutual exclusion logic)

**Tests:** (integration tests)
- [ ] Starter kit granted exactly once
- [ ] Room not empty on first decorate session
- [x] Today card shows store refresh only when repairs complete (logic verified)
- [x] Today card shows repair nudge when repairs remain (logic verified)

---

### Slice 7: Focus Timer ✓

**Goal:** Timestamp-based focus timer with chunk payouts.

**Tasks:**
- [x] Create `/focus` route
- [x] Add Focus entry to Today screen
- [ ] Add "Start a focus block" to task detail and Next-up mode (links session to task)
- [x] Implement timer UI: big number, progress ring, Start/Pause/Stop
- [x] Implement presets: 10 / 25 (default) / 50 minutes
- [x] Implement free-form input: 5–90 minutes
- [x] Persist session in `focus_sessions` with `status: 'running'`
- [x] Compute elapsed from `started_at` + `paused_json`, not setInterval
- [x] Implement chunk payout: 3 coins per 5 minutes, paid as they complete
- [x] Implement completion bonus: +10 coins when planned duration reached
- [x] Show "X coins earned" on early stop, no negative messaging
- [x] Implement body double toggle (placeholder sprite, off by default, remembered)
- [x] Implement completion chime (respects SFX setting)
- [x] Show toast with coins + "Mark task done" if task linked
- [x] Implement Web Notification at planned end (if permission granted)
- [x] Handle stale sessions: "We noticed you had a session running" prompt on app open

**Tests:**
- [x] Timer survives tab sleep (timestamp-based)
- [x] Timer survives app restart (session persisted)
- [x] Stopping at minute 17 keeps 9 coins (3 chunks × 3)
- [x] Completing 25 minutes pays 15 + 10 = 25 coins
- [ ] Server rejects chunks that haven't elapsed (clock manipulation) - tested via RPC
- [ ] pay_focus_chunk idempotent per chunk - tested via RPC
- [x] Body double setting persists
- [ ] Linked task completion awards both focus coins and task coins - requires task integration

---

### Slice 8: Accessibility ✓

**Goal:** Full keyboard and reduced motion support.

**Tasks:**
- [x] Create inventory list alternative in drawer (keyboard-navigable)
- [x] Item selection → region picker → cell picker (arrow keys or button grid)
- [x] Show validator reason text in cell picker
- [x] Create placed items list with Move/Flip/Store buttons
- [x] Keyboard shortcuts for desktop:
  - Arrow keys: nudge ghost one cell
  - F: flip
  - Enter: confirm placement
  - Escape: cancel
- [x] Reduced motion: no settle animation, no ghost tint transition, instant reveal
- [ ] Test full buy → place → move → flip → store flow keyboard-only (manual testing)

**Tests:**
- [ ] Keyboard-only user can complete full flow (manual testing)
- [x] Screen reader announces item names and states (ARIA labels added)
- [x] Reduced motion disables all animations (CSS + JS timing adjustments)

---

### Slice 9: Export/Import + Playwright ✓

**Goal:** Full data round-trip and E2E smoke test.

**Tasks:**
- [x] Update export to include: inventory, placements, room_finishes, mystery_openings, focus_sessions, house_repairs, house_state
- [x] Implement inventory ID remapping on import (placements reference correct items)
- [x] Update import version to 2 (supports v1 imports for backwards compatibility)
- [x] Set up Playwright with chromium
- [x] Create smoke tests for:
  - Navigation
  - Store page
  - Focus timer flow (start/stop)
  - Settings/export page
- [x] Create decorate mode E2E tests (placeholder for canvas interactions)
- [x] Add focus timer E2E test

**Tests:**
- [ ] Export → wipe → import reproduces inventory exactly (requires Supabase integration test)
- [ ] Export → wipe → import reproduces placements exactly (requires Supabase integration test)
- [ ] Export → wipe → import reproduces finishes exactly (requires Supabase integration test)
- [ ] Export → wipe → import reproduces mystery history exactly (requires Supabase integration test)
- [ ] Export → wipe → import reproduces focus history exactly (requires Supabase integration test)
- [x] Playwright setup complete (run with `npm run test:e2e`)

---

### Slice 10: Real Art + Calendar Content

**Goal:** Replace placeholders with real sprites.

**Tasks:**
- [ ] Source asset packs for furniture, decor, rugs, wall items, finishes, outdoor
- [ ] Map each catalog item to specific sprite
- [ ] Update manifest.json with all new textures
- [ ] Create texture atlases (pre-commit)
- [ ] Verify total art under 4MB
- [ ] Add credits to manifest and CREDITS.md
- [ ] Populate calendar.json with 8 weeks (Sept–Dec 2026):
  - Autumn set (Sept)
  - Harvest/Halloween (Oct)
  - Winter cozy (Nov)
  - Holiday lights (Dec)
  - 2 themed event weeks
- [ ] Run asset validation script
- [ ] Visual QA pass on all items

**Tests:**
- [ ] Asset validation passes
- [ ] Credits check passes
- [ ] All catalog items render correctly
- [ ] Seasonal items appear in correct date ranges

---

## Acceptance Checklist

From the Phase 3 prompt:

- [ ] Store loads all sections from `catalog.json`; adding an item requires editing the JSON, the manifest, and running the seed — nothing else
- [ ] Rotation is identical on two devices for the same week and changes exactly at Monday 4am local; determinism and coverage tests pass
- [ ] Mystery box opens once per day; a second attempt is refused server-side; the pool never contains an item priced below the box
- [ ] Buying writes one negative ledger row and one inventory row; retries with the same `client_request_id` don't double-buy; balance can't go negative
- [ ] Starter kit grants exactly once; the room is non-empty on the first decorate session
- [ ] Placement validator passes an exhaustive test matrix
- [ ] Buy → place → move → flip → store → reload reproduces exactly what's in the DB every step; depth sorting matches bottom-edge rule
- [ ] Storing a surface parent also stores its decor and says so
- [ ] Finishes apply instantly and are free to switch between owned options
- [ ] Keyboard-only user can buy, place, move, flip, and store every item type
- [ ] Focus timer accrues correctly through tab sleep and app restart; early stop keeps chunk coins with no negative copy; server rejects chunks that haven't elapsed
- [ ] Today card shows the Monday "Store refreshed" state only when no repairs remain; never shows two nudges
- [ ] Every asset credited; the credits check from Phase 2 still passes; total new art under 4 MB, atlased
- [ ] Export → wipe → import reproduces inventory, placements, finishes, mystery history, and focus history exactly
- [ ] Nothing in the app can sell, damage, expire, or lose an item, and no copy anywhere implies a purchase was a mistake

---

## Phase 4 Prep (Slice 4 includes)

- [ ] SceneComposer has `character` layer between `furniture` and `front`
- [ ] `catalog_items.category` enum includes: `clothing_top`, `clothing_bottom`, `clothing_shoes`, `hair`, `accessory`
- [ ] `placement: 'wearable'` is valid in schema, rejected by validator with `not_placeable`
- [ ] `rooms.json` has `avatarAnchor: { x, y }` per view
- [ ] Focus timer body-double sprite loaded via manifest key `bodydouble_placeholder`
