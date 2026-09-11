# Phase 4 Implementation Plan: Avatar & Wardrobe

The final planned phase. Ordered slices with acceptance criteria.

---

## Overview

A pixel-art avatar representing the user, standing in their room, sitting at the desk during focus blocks, and appearing in the Today header. Users start with one plain outfit. The store sells clothing, hair, and accessories for coins; a wardrobe screen manages equipped items and saved outfits.

**Emotional job:** Identity and self-care. The avatar is "me," always fine, never has needs.

---

## Slice Order

### Slice A: AvatarComposer + validateAppearance (Foundation)

**Goal:** Pure functions for avatar layer resolution and appearance validation, fully tested.

**Tasks:**
- [ ] Create `src/game/avatar/AvatarComposer.ts`
  - [ ] `resolve(appearance, manifest, pose, frame) → Layer[]`
  - [ ] Implements exact layer order: hair_back → body → eyes → bottom → shoes → top → hair_front → accessory
  - [ ] Handles `hidesHair` and `hidesAccessory` flags
  - [ ] Falls back to placeholder for missing textures
  - [ ] Falls back to starter pieces for invalid/unowned items
- [ ] Create `src/game/avatar/validateAppearance.ts`
  - [ ] `validateAppearance(appearance, ownedItemIds, freeIds) → { ok, problems[] }`
  - [ ] Checks all fields against free options and owned items
- [ ] Create `src/game/avatar/types.ts` with all TypeScript interfaces
- [ ] Unit tests: layer ordering, hide rules, fallbacks, validation cases
- [ ] Test DST boundary handling with timestamps

**Acceptance:**
- [ ] 100% test coverage on composer and validator
- [ ] Composer never throws, always returns valid layer array
- [ ] Validator catches all invalid appearance states

---

### Slice B: DOM Preview + Placeholder Layers

**Goal:** Avatar renders in React as stacked `<img>` elements using placeholder art.

**Tasks:**
- [ ] Create `src/components/avatar/AvatarPreview.tsx`
  - [ ] Takes `appearance`, `pose`, `animate` props
  - [ ] Uses `AvatarComposer.resolve()` for layer list
  - [ ] Renders stacked `<img>` elements with `image-rendering: pixelated`
  - [ ] Supports `flipped` prop
  - [ ] Implements `aria-label` with full outfit description
- [ ] Create `src/components/avatar/PlaceholderLayer.tsx`
  - [ ] Renders colored rectangle with layer name label
  - [ ] Used when `usePlaceholderArt: true` or texture missing
- [ ] Generate placeholder textures for all layer types
- [ ] Respect `prefers-reduced-motion` (no animation when enabled)

**Acceptance:**
- [ ] Avatar renders as colored rectangle stack in placeholder mode
- [ ] Layer order visually correct (top layer covers bottom)
- [ ] Screen reader announces "Wearing [outfit description]"
- [ ] No animation when reduced motion enabled

---

### Slice C: Database Tables + Triggers + Seed Data

**Goal:** Avatar persistence layer with validation.

**Tasks:**
- [ ] Create `avatar` table (user_id, appearance_json, updated_at)
- [ ] Create `outfits` table (id, user_id, name, appearance_json, sort_index, created_at)
- [ ] Create `free_appearance_options` table and seed with free IDs
- [ ] Add wearable columns to `catalog_items`:
  - [ ] `layers_json` (JSONB)
  - [ ] `hides_hair` (BOOLEAN)
  - [ ] `hides_accessory` (BOOLEAN)
  - [ ] `family` (TEXT)
  - [ ] `frames_json` (JSONB)
  - [ ] `sit_anchor_json` (JSONB) for sittable furniture
- [ ] Create trigger on `avatar.appearance_json` that validates against inventory + free options
- [ ] Create RLS policies for avatar and outfits tables
- [ ] Update `buy_item` RPC: wearables are always single-copy regardless of `allowMultiple`

**Acceptance:**
- [ ] Avatar table accepts valid appearances
- [ ] Trigger rejects invalid appearances with clear error
- [ ] Free options seeded and queryable
- [ ] RLS prevents cross-user access

---

### Slice D: Wardrobe Screen (End-to-End on Placeholders)

**Goal:** Full wardrobe functionality working with placeholder art.

**Tasks:**
- [ ] Create `/wardrobe` route and `WardrobePage.tsx`
- [ ] Create `WardrobePreview.tsx` - large avatar preview with flip button
- [ ] Create `CategoryTabs.tsx` - Appearance · Tops · Bottoms · Shoes · Accessories · Outfits
  - [ ] Combine Hair + Skin & Eyes into "Appearance" tab
  - [ ] Show owned count per category
- [ ] Create `ItemGrid.tsx` - grid of owned items per category
  - [ ] Current item highlighted
  - [ ] "Free" badge on free items
  - [ ] Tap to equip instantly (optimistic update)
  - [ ] "Shop [category] →" link at end (subtle, only if < 3 owned)
- [ ] Create `OutfitsTab.tsx`
  - [ ] Saved outfits as cards with mini preview
  - [ ] Tap to equip all
  - [ ] Long-press/menu for rename/delete
  - [ ] "Save current look" button
  - [ ] Cap at 12 with neutral "full" message
- [ ] Create `AvatarSetup.tsx` for first-run flow
  - [ ] 3-step: Skin → Hair (style + color) → Eyes
  - [ ] Defaults pre-filled, "Done" works immediately
  - [ ] Skippable
  - [ ] Integrates into existing onboarding sequence

**Acceptance:**
- [ ] Full equip loop works: tap item → avatar updates → saves to DB
- [ ] Outfit save/load/rename/delete all work
- [ ] First-run setup completes in under 30 seconds
- [ ] All actions keyboard-accessible
- [ ] Works offline (shows current look, equip disabled with message)

---

### Slice E: Store Clothing Section + Try-On + Toast Hooks

**Goal:** Buy wearables from store with try-on preview.

**Tasks:**
- [ ] Add "Clothing" section to store, grouped by category
- [ ] Include weekly rotation and seasonal wearables
- [ ] Add rotation guarantee: "at least one wearable per week"
- [ ] Create `TryOnPreview.tsx` - avatar in store header showing tried-on items
- [ ] Implement try-on logic:
  - [ ] Tap "Try on" swaps that layer on preview (not saved)
  - [ ] "Wearing N unowned items" pill with Reset button
  - [ ] Try-on works even if "X more coins" (disabled buy)
- [ ] Update item cards:
  - [ ] "Buy — 90" (enabled)
  - [ ] "32 more coins" (disabled, try-on still works)
  - [ ] "Owned" (no action)
- [ ] Buy toast: "Denim jacket · −120" with "Wear it" action
- [ ] Completion toast hook: when task completion crosses threshold for recently tried item (last 7 days), append "You can now buy [item]"
- [ ] Store try-on history in settings JSON (not localStorage)

**Acceptance:**
- [ ] Try-on previews any wearable without writing
- [ ] Disabled cards still allow try-on
- [ ] Reset clears all try-on state
- [ ] Buy writes one ledger row + one inventory row
- [ ] Second purchase of same wearable refused server-side
- [ ] Completion toast shows affordability hint for recent try-ons

---

### Slice F: Phaser Integration (Room + Sit Anchors + Reactions)

**Goal:** Avatar appears in the house scene.

**Tasks:**
- [ ] Add bridge commands:
  - [ ] `setAvatar(appearance: Appearance | null)`
  - [ ] `setAvatarPose('stand' | 'sit', anchor: { x, y, flipped })`
  - [ ] `playAvatarReaction('cheer' | 'nod')`
  - [ ] `setAvatarVisible(boolean)`
- [ ] Add bridge events:
  - [ ] `avatarTapped()` → opens wardrobe sheet
  - [ ] `reactionDone(kind)`
- [ ] Create `AvatarSprite.ts` in Phaser
  - [ ] Composes layers using same `AvatarComposer.resolve()`
  - [ ] Idle animation (2-4 frame breathe)
  - [ ] Sit pose (static)
  - [ ] Reaction animations
- [ ] Implement avatar positioning:
  - [ ] Stands at `avatarAnchor` from `rooms.json` by default
  - [ ] Sits on furniture with `sitAnchor` if designated
  - [ ] Add "Sit here" action to furniture context menu
  - [ ] Persist preferred seat in `house_state`
- [ ] Depth sort with furniture (by bottom edge)
- [ ] Hide avatar during decorate mode
- [ ] Implement reactions:
  - [ ] `cheer` on task completion (if Today screen visible)
  - [ ] `cheer` in-room on repair or purchase
  - [ ] `nod` when focus block completes
  - [ ] No reactions under reduced motion
  - [ ] Never react to inactivity

**Acceptance:**
- [ ] Avatar stands at anchor or sits on designated furniture
- [ ] Depth-sorts correctly with furniture
- [ ] Tapping avatar opens wardrobe
- [ ] Hidden in decorate mode
- [ ] Reactions fire on correct triggers only
- [ ] No reactions under reduced motion

---

### Slice G: Today Header Bust + Focus Timer Body Double

**Goal:** Avatar appears outside the game canvas.

**Tasks:**
- [ ] Add avatar bust to Today header
  - [ ] Small idle animation (head and shoulders, cropped from layers)
  - [ ] Next to coin balance
  - [ ] Tap opens wardrobe
  - [ ] Static under reduced motion
  - [ ] `cheer` animation (300ms hop) on task completion
- [ ] Replace focus timer placeholder with avatar
  - [ ] `sit` pose at desk
  - [ ] Uses same `AvatarPreview` component
  - [ ] Respects existing toggle and default from Phase 3

**Acceptance:**
- [ ] Header bust visible and tappable
- [ ] Brief hop animation on task complete (skippable, respects reduced motion)
- [ ] Focus timer shows seated avatar at desk
- [ ] Toggle still works as before

---

### Slice H: Outfits System (Polish)

**Goal:** Complete outfit management with edge cases.

**Tasks:**
- [ ] Outfit quick-switch from Today header
  - [ ] Tap header avatar → 3-item quick picker (last 3 used)
  - [ ] "More..." opens full wardrobe
- [ ] Handle unowned items in saved outfits
  - [ ] On equip, validate and substitute starter pieces
  - [ ] Silent substitution (no error toast)
- [ ] Outfit naming UX
  - [ ] Inline rename on long-press
  - [ ] Max 24 characters
  - [ ] Default names: "Outfit 1", "Outfit 2", etc.
- [ ] Delete confirmation only if outfit has custom name

**Acceptance:**
- [ ] Quick picker shows recent outfits
- [ ] Unowned items silently fall back to starters
- [ ] Rename works inline
- [ ] Delete is reversible within session

---

### Slice I: Accessibility + Reduced Motion

**Goal:** Full accessibility compliance.

**Tasks:**
- [ ] All equip/try-on/outfit actions keyboard-operable
- [ ] Focus management in wardrobe (trap focus in modals)
- [ ] Screen reader announcements:
  - [ ] "Equipped [item name]"
  - [ ] "Saved outfit [name]"
  - [ ] "Deleted outfit [name]"
- [ ] Reduced motion:
  - [ ] No idle breathe animation
  - [ ] No reactions
  - [ ] Instant layer swaps (no transition)
  - [ ] Header bust static
- [ ] High contrast mode compatibility
- [ ] Touch target sizes (min 44x44)

**Acceptance:**
- [ ] Full keyboard navigation through wardrobe
- [ ] VoiceOver/NVDA can complete all flows
- [ ] Reduced motion eliminates all animation
- [ ] Lighthouse accessibility score maintained

---

### Slice J: Export/Import + Playwright Tests

**Goal:** Data portability and end-to-end test coverage.

**Tasks:**
- [ ] Update export to include:
  - [ ] `avatar` (appearance_json)
  - [ ] `outfits` (all saved outfits)
  - [ ] Try-on history (from settings)
- [ ] Update import:
  - [ ] Remap inventory IDs in appearance_json for both avatar and outfits
  - [ ] Validate appearances after remap
  - [ ] Skip invalid outfits with warning
- [ ] Extend round-trip test: export → wipe → import → verify avatar + outfits
- [ ] Playwright smoke tests:
  - [ ] Buy a top, equip it, reload, confirm worn in room and header
  - [ ] Save outfit, reload, confirm persisted
  - [ ] Try-on flow without buying
  - [ ] First-run setup completion

**Acceptance:**
- [ ] Export → wipe → import reproduces avatar and outfits
- [ ] ID remapping works correctly
- [ ] Playwright tests pass in CI

---

### Slice K: Avatar Atlas Build Script + Real Art

**Goal:** Import real character sprites from LPC.

**Tasks:**
- [ ] Create `scripts/build-avatar-atlas.ts`
  - [ ] Takes raw LPC layer images
  - [ ] Palette-swaps skin/eye/hair colors into variants
  - [ ] Normalizes frame sizes
  - [ ] Packs into `avatar` atlas + manifest entries
  - [ ] Deterministic and re-runnable
- [ ] Import LPC base character sprites
  - [ ] 6 skin tone variants
  - [ ] 4 eye color variants
  - [ ] 8 hair color variants
- [ ] Import/create ~45 wearable sprites
  - [ ] All must have idle and sit frames
  - [ ] Reactions (cheer, nod) can fall back to idle
- [ ] Update `CREDITS.md` with full LPC attribution
- [ ] Add `LICENSES/` folder with CC-BY-SA and GPL text
- [ ] Credits check must pass
- [ ] Verify avatar atlas ≤ 3 MB

**Acceptance:**
- [ ] Atlas builds successfully
- [ ] All wearables have required frames
- [ ] Credits check passes
- [ ] Atlas under 3 MB
- [ ] License files present

---

### Slice L: Wrap-Up (Section 10 Requirements)

**Goal:** Polish, documentation, and project completion.

**Tasks:**

#### L.1 Polish Pass
- [ ] Performance budget verification:
  - [ ] Today screen interactive < 1s warm on mid-range phone
  - [ ] `/home` scene ready < 2s warm
  - [ ] Total JS < 400 KB gzipped (excluding Phaser)
  - [ ] Phaser code-split onto game routes only
- [ ] Record measurements in `docs/PERF.md`
- [ ] Run Phase 1-3 acceptance checklists, fix any regressions
- [ ] Copy audit against design rules:
  - [ ] No streaks anywhere
  - [ ] No overdue counts
  - [ ] No shame/nagging language
  - [ ] No "missed" messaging
  - [ ] Avatar never implies needs
- [ ] Record audit in `docs/COPY-AUDIT.md`
- [ ] Onboarding pass:
  - [ ] Fresh account → non-empty Today list within 3 minutes
  - [ ] Starter pack (P1) → starter kit (P3) → avatar setup (P4) as one calm sequence

#### L.2 Documentation
- [ ] Create `docs/RETRO.md`:
  - [ ] What took longer than planned
  - [ ] Biggest bugs encountered
  - [ ] Spec sections that should be written differently
- [ ] Create `docs/TUNING.md`:
  - [ ] Every economy constant in one place
  - [ ] Notes on safe vs risky changes
- [ ] Create `docs/ADDING-CONTENT.md`:
  - [ ] Steps to add a repair
  - [ ] Steps to add a decor item
  - [ ] Steps to add a wearable
  - [ ] Steps to add a seasonal window

#### L.3 Backlog
- [ ] Create `docs/PHASE5-IDEAS.md` with one-line rationales:
  - [ ] Second room unlocked by large repair chain
  - [ ] Garden with plants that grow only when watered by completing tasks (plants wait, never die)
  - [ ] Pet that sleeps in room (no needs, same rule as avatar)
  - [ ] Offline write queueing
  - [ ] Calendar import for work tasks
  - [ ] Weekly "look back" showing only positives

**Acceptance:**
- [ ] All performance targets met and recorded
- [ ] Phase 1-3 checklists pass
- [ ] Copy audit finds zero violations
- [ ] All documentation complete
- [ ] Backlog recorded (not implemented)

---

## Final Acceptance Checklist

- [ ] Avatar renders identically in room (Phaser), wardrobe (DOM), Today header (DOM), and focus timer (DOM)
- [ ] Placeholder mode shows avatar as labeled layer stack with full loop working
- [ ] Skin, eyes, hair color, 3 hairstyles, and starter outfit are free from first run
- [ ] Layer order is exactly as specified; hide rules work; missing textures show placeholders
- [ ] Try-on previews any wearable without writing; "X more coins" cards still allow try-on
- [ ] Buying wearable writes one ledger row + one inventory row; duplicates refused
- [ ] Equip is instant and optimistic; DB trigger rejects invalid appearances
- [ ] Outfits: save, rename, equip, delete; cap 12; unowned items fall back to starters
- [ ] Avatar sits on designated furniture and stands at anchor otherwise
- [ ] Hidden in decorate mode; depth-sorts with furniture
- [ ] Reactions fire on correct triggers only; never on inactivity; absent under reduced motion
- [ ] Every wearable has all pose frames or documented fallback
- [ ] Credits check passes; license text present; avatar atlas ≤ 3 MB
- [ ] Export → wipe → import reproduces avatar, outfits, and try-on history
- [ ] Phase 1-3 acceptance checklists still pass; perf numbers recorded
- [ ] Copy audit finds zero violations
- [ ] No screen, toast, or animation implies the avatar needs anything from me

---

## Calendar Content Additions

Add to `calendar.json`:

### Wearable Rotation Guarantee
```json
{
  "rotationGuarantees": {
    "wearablePerWeek": 1
  }
}
```

### Collection Event Weeks
```json
{
  "events": [
    {
      "name": "Cozy Collection",
      "type": "clothing_collection",
      "week": 45,
      "pool": ["sweater_knit", "scarf_wool", "socks_warm", "beanie_cozy"]
    },
    {
      "name": "Spring Collection",
      "type": "clothing_collection",
      "week": 12,
      "pool": ["dress_floral", "cardigan_light", "sandals_strappy", "sunhat_wide"]
    }
  ]
}
```
