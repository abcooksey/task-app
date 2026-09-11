# Phase 2 Implementation Plan: The House (Repair Loop)

## Overview

Coins earned from tasks can now be spent to repair a wrecked house. Two views (exterior + interior), each with tappable hotspots. Repairs are permanent — the house never degrades.

**Core emotional job:** Make finishing a task feel connected to something you want to see change. Anticipation ("42 more coins and I can fix the window") is the mechanic, not the animation.

---

## Key Decisions (from review)

| Topic | Decision |
|-------|----------|
| Engine | Phaser 3 (stable) |
| Toast framing | "Floorboards patched · 150 invested" (positive) |
| Nudge card | Always visible on Today page |
| Accidental taps | 5-second "Undo" button on completion toast |
| Sound default | Muted (sensory considerations) |
| First repair | Guided — highlight only 1-2 hotspots until first repair done |
| Pacing estimates | Not shown to user (house is ongoing/indefinite) |

---

## Slices (Ordered)

### Slice 1: Bridge + Empty Scene + View Toggle
**Goal:** Phaser 3 mounted in React, destroys cleanly on unmount, view switching works.

- [ ] Install Phaser 3 (`phaser@^3.80`)
- [ ] Create `src/game/bridge.ts` — typed event bus (no external lib)
- [ ] Create `src/game/HouseGame.tsx` — React wrapper that mounts/destroys Phaser
- [ ] Create `src/game/scenes/HouseScene.ts` — empty scene with letterbox scaling
- [ ] Add `/home` route with view toggle (Inside/Outside) in React
- [ ] Verify: navigate Today ↔ Home 20 times, no memory leaks (DevTools)
- [ ] Scene renders solid color, switches on toggle, 360×640 base, FIT mode

**Deliverable:** Empty canvas that switches views, no game content yet.

---

### Slice 2: State Derivation + Database + RPCs
**Goal:** House state stored in DB, atomic spend function, tested.

- [ ] Create `house_repairs` table (user_id, repair_id, completed_at, ledger_id)
- [ ] Create `house_state` table (user_id, last_view, sfx_enabled)
- [ ] Add `'refund'` to `ledger_reason` enum (reserved for Phase 3)
- [ ] Create `spend_coins(p_amount, p_reason, p_ref_type, p_ref_id)` Postgres function
- [ ] Create `perform_repair(p_repair_id)` RPC — atomic, idempotent (double-tap safe)
- [ ] Create `undo_repair(p_repair_id, p_within_seconds)` RPC — only works within 5s window
- [ ] Create `src/game/content/repairs.json` with all 15 repairs
- [ ] Create `src/lib/houseState.ts` — `deriveHouseState(repairsContent, completedIds)` pure function
- [ ] Create `src/hooks/useHouseState.ts` and `usePerformRepair.ts`
- [ ] Write tests: spend_coins insufficient funds, perform_repair idempotency, undo window
- [ ] Write tests: deriveHouseState returns correct available/locked/completed sets

**Deliverable:** All data logic working, no UI yet.

---

### Slice 3: Placeholder Hotspots + Sheet + Spend Loop
**Goal:** Full repair loop working with rectangles, no art.

- [ ] Create `src/game/content/manifest.json` — placeholder entries for all textures
- [ ] Create `SceneComposer` class — renders ordered `{ textureKey, x, y, layer }` list
- [ ] Implement placeholder mode — sprites render as labeled colored rectangles
- [ ] Render hotspots on canvas (pulsing for available, static for locked)
- [ ] Tap hotspot → React bottom sheet opens
- [ ] Sheet shows: name, blurb, cost, button state (affordable/gap/locked)
- [ ] First-repair guidance: only highlight int_garbage and int_cobwebs until first repair done
- [ ] Affordable tap → optimistic close → RPC → success → update state
- [ ] Show 5-second "Undo" toast after repair
- [ ] Undo tap → call undo_repair RPC → revert state
- [ ] Balance updates in header, shows "150 invested" toast
- [ ] Test: repair loop end-to-end with placeholder art

**Deliverable:** Fully playable repair loop, ugly rectangles.

---

### Slice 4: Animations + Celebration
**Goal:** Satisfying repair animations, view completion celebration.

- [ ] Implement animation types: sweep, hammer, sparkle, paint, swap
- [ ] Each animation 1.5–2.5s with `before` → anim → `after` reveal
- [ ] `playRepair(id)` command triggers animation, fires `repairAnimationDone` when complete
- [ ] Reduced motion: instant sprite swap with 200ms fade
- [ ] View completion (all int_* or all ext_*): confetti burst, 2s, skippable
- [ ] Progress ring in HUD shows repairs done / total for current view
- [ ] Interior complete → show decorating teaser once ("Decorating is coming next")
- [ ] Store button in HUD (locked, non-interactive)

**Deliverable:** Repairs feel good, completions celebrated.

---

### Slice 5: Today Page Integration
**Goal:** Task completions feel connected to house progress.

- [ ] "Next up" nudge card under Today header
  - Shows cheapest currently-available repair
  - Thumbnail (before sprite or placeholder), name, coin gap
  - "45 more coins" or "Ready to fix!"
  - Tap → navigate to /home with that hotspot selected
  - Hidden when all repairs complete
- [ ] Task completion toast appends "· You can now fix the window" when threshold crossed
- [ ] Done-for-today empty state adds "Visit the house" CTA
- [ ] Nudge card updates live as tasks complete

**Deliverable:** Anticipation loop complete.

---

### Slice 6: Accessibility + Reduced Motion
**Goal:** Fully keyboard-operable, screen-reader friendly.

- [ ] "All repairs" expandable list below canvas (React)
- [ ] List shows: name, cost, status (available/locked/completed), Repair button
- [ ] Selecting row highlights hotspot on canvas
- [ ] Full keyboard navigation (Tab, Enter, Escape)
- [ ] Reduced motion: pulsing hotspots become static outlines
- [ ] All interactive elements have proper ARIA labels
- [ ] Test with VoiceOver/NVDA

**Deliverable:** Accessible to all users.

---

### Slice 7: Export/Import + Smoke Test
**Goal:** Data round-trips, automated verification.

- [ ] Update export to include `house_repairs` and `house_state`
- [ ] Update import to restore house data
- [ ] Write test: export → wipe → import → house state matches
- [ ] Add Playwright smoke test: load /home, tap hotspot, confirm ledger row created
- [ ] Verify offline state: Repair button shows "Needs a connection" when offline
- [ ] Memory leak check: 20 navigations, no growth

**Deliverable:** Data integrity verified, CI coverage.

---

### Slice 8: Real Art via Manifest
**Goal:** Replace placeholders with pixel art, credits complete.

- [ ] Source assets from Kenney/OpenGameArt/itch.io (CC0/CC-BY only)
- [ ] Create/pack texture atlas with free-tex-packer or pre-commit atlas
- [ ] Update `manifest.json` with real texture paths
- [ ] Create `public/assets/CREDITS.md` with all attributions
- [ ] Add credits to Settings → About screen (for CC-BY requirements)
- [ ] Build script: fail if manifest entry has no credit line
- [ ] Set `usePlaceholderArt: false`
- [ ] Visual QA: all 15 repairs look correct, before/after clearly distinguishable
- [ ] Total art under 2MB, preload shows progress bar

**Deliverable:** Ship-ready visuals.

---

## Acceptance Checklist

- [ ] `/home` loads with correct house state on first paint (no flash), phone + desktop
- [ ] All 15 repairs exist; adding 16th requires only `repairs.json` + manifest edit
- [ ] Placeholder mode renders labeled rectangles, full loop playable without art
- [ ] Every hotspot ≥44px tap target; sheet shows correct state
- [ ] Repair writes exactly one ledger row + one house_repairs row; double-tap charges once
- [ ] 5-second undo works; undo after 5s fails gracefully
- [ ] Balance can never go negative (DB-level test)
- [ ] Reload after repair shows it fixed; export → wipe → import reproduces exactly
- [ ] Animations 1.5–2.5s, skippable, instant under reduced motion
- [ ] First repair guided (only 1-2 hotspots until first done)
- [ ] Interior completion → celebration once → teaser once
- [ ] Today nudge shows cheapest available, updates live, hidden when done
- [ ] Completion toast appends "You can now fix..." on threshold cross
- [ ] "All repairs" list fully keyboard-operable
- [ ] Every asset in CREDITS.md; build fails on missing credit
- [ ] Game destroyed on unmount; 20 navigations = no memory leak
- [ ] Nothing ever shows repair undone, coin lost, or house degraded

---

## Content: Repairs

### Interior (total: 1,020 coins)

| Order | ID | Name | Cost | Requires |
|-------|-----|------|------|----------|
| 1 | int_garbage | Sweep up the garbage | 60 | — |
| 2 | int_cobwebs | Clear the cobwebs | 60 | — |
| 3 | int_floor | Patch the floorboards | 150 | int_garbage |
| 4 | int_window | Replace the broken window | 150 | int_cobwebs |
| 5 | int_ceiling | Fix the ceiling leak | 150 | int_cobwebs |
| 6 | int_door | Rehang the door | 120 | int_floor |
| 7 | int_walls | Patch and paint the walls | 250 | int_window, int_ceiling |
| 8 | int_light | Wire up a ceiling light | 80 | int_ceiling |

### Exterior (total: 980 coins)

| Order | ID | Name | Cost | Requires |
|-------|-----|------|------|----------|
| 1 | ext_yard | Clear the yard debris | 80 | — |
| 2 | ext_mailbox | Stand the mailbox back up | 40 | — |
| 3 | ext_steps | Repair the porch steps | 120 | ext_yard |
| 4 | ext_fence | Mend the fence | 150 | ext_yard |
| 5 | ext_roof | Replace the missing tiles | 200 | ext_steps |
| 6 | ext_paint | Paint the outside | 250 | ext_roof, ext_fence |
| 7 | ext_path | Lay a stone path | 140 | ext_fence |

**Dependency design:** At any moment, 2-4 affordable-or-nearly-affordable choices. Never a single forced path.

---

## Phase 3 Preparation (built now, not activated)

- [ ] `rooms.json` defines room geometry: floor, backWall, gridCell, layers order
- [ ] SceneComposer handles layered rendering (repairs + future furniture)
- [ ] `coin_ledger.reason` includes `'purchase'` and `'refund'` (reserved)
- [ ] Hotspot/sheet pattern generic enough for Phase 3 placed items
