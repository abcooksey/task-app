# Homestead - ADHD Task App with Game Economy

## What This Is
A task manager for ADHD where completions earn coins. Phase 1 is tasks + coins. Phase 2+ adds a cozy house-fixing game (Stardew/Animal Crossing vibes).

## Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **State:** TanStack Query (optimistic updates)
- **Validation:** Zod at all boundaries
- **Backend:** Supabase (Postgres + Auth + RLS)
- **Date parsing:** chrono-node
- **PWA:** vite-plugin-pwa
- **Deploy:** Vercel

## Commands
```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run tests
npm run test:watch # Run tests in watch mode
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

## Folder Layout
```
src/
├── components/      # React components
│   ├── ui/          # Reusable UI primitives
│   ├── tasks/       # Task-related components
│   ├── capture/     # Quick capture input
│   └── progress/    # Heatmap, balance, momentum
├── hooks/           # Custom React hooks
├── lib/             # Utilities and helpers
│   ├── supabase.ts  # Supabase client
│   ├── recurrence.ts # Recurrence engine
│   ├── parser.ts    # Natural language parser
│   └── houseState.ts # House state derivation
├── config/
│   └── economy.ts   # Coin payouts, multipliers
├── types/           # TypeScript types & Zod schemas
├── pages/           # Route components
├── game/            # Phaser game (Phase 2)
│   ├── bridge.ts    # React ↔ Phaser event bus
│   ├── HouseGame.tsx # React wrapper component
│   ├── scenes/      # Phaser scenes
│   │   └── HouseScene.ts
│   ├── avatar/      # Avatar system (Phase 4)
│   │   ├── AvatarComposer.ts   # Layer resolution (pure function)
│   │   ├── validateAppearance.ts # Ownership validation
│   │   └── types.ts            # Appearance interfaces
│   ├── content/     # Game data (JSON)
│   │   ├── repairs.json
│   │   ├── rooms.json
│   │   ├── catalog.json
│   │   └── manifest.json
│   └── utils/       # Game utilities
│       └── SceneComposer.ts
└── test/            # Test utilities and mocks

public/
└── assets/          # Game art assets
    ├── manifest.json
    └── CREDITS.md   # Required attributions
```

## Design Rules (Non-Negotiable)

### No Punishment, Ever
- No streaks displayed anywhere
- No losing coins
- No HP or penalties
- No "you missed X days" messaging
- No red overdue badges
- Progress is permanent, only moves forward

### Rewards on Completion, Silence on Misses
- Missed tasks roll forward quietly
- Never show a pile of failures
- Carried-over tasks get a neutral label, no count, no age

### Finite Screens
- Today view must be completable
- No infinite scroll
- Clear "done for today" state when list is empty

### Fast Capture
- Under 5 seconds to enter a task
- Single screen, one text input
- All fields optional except title
- Progressive disclosure for extras

### Undo Everything
- Complete, uncomplete, delete, restore - all one tap
- All reversible, no confirmation dialogs for reversible actions

### Low Visual Noise
- Calm palette, generous spacing
- Strong hierarchy, minimal motion
- Respect `prefers-reduced-motion`
- One clear primary action per screen

### Never Nag
- Notifications are neutral reminders, not guilt
- The app must never become a chore itself

## Game Rules (Phase 2+)

### React Owns State, Phaser Only Renders
- React + Supabase own all state (balance, repairs, settings)
- Phaser only renders and handles canvas input
- Phaser never calls Supabase or stores state
- All HUD/panels/sheets are React DOM, not Phaser text

### The House Never Degrades
- Repairs are permanent — nothing can undo progress
- No maintenance, decay, or "lose progress" mechanics
- Nothing can ever show a repair as undone

### Running the Game Locally
```bash
npm run dev          # Start with hot reload
# Navigate to /home to see the house
```

### Placeholder Mode
Set `usePlaceholderArt: true` to render all sprites as labeled rectangles. Ship every slice with placeholders first; real art is the final slice.

## Store & Decorating Rules (Phase 3)

### Ownership is Permanent
- Nothing you buy can ever be sold, damaged, lost, or expire
- Moving items is free, storing items is free
- No refunds, no trading — removes "did I waste coins?" anxiety

### Catalog is Source of Truth
- `src/game/content/catalog.json` defines all items
- `catalog_items` table is a seeded copy (run `npm run seed-catalog`)
- Build fails if JSON and DB drift — run `npm run check-catalog-drift`
- RPCs read prices/rules from DB, never trust client

### Placement Rules (Quick Reference)
| Type | Region | Can Overlap | Notes |
|------|--------|-------------|-------|
| floor | floor cells | only rugs | depth-sorted by y+h |
| rug | floor cells | floor items, rugs | always draws under furniture |
| wall | wall cells | nothing | interior wall region |
| surface | slot on surface | — | one item per slot |
| outdoor | yard cells | nothing | exterior only |
| finishes | room-wide | — | applied, not placed |

### Weekly Rotation
- Deterministic from ISO week (same on all devices), refreshes Monday 4am local
- 8 items per week with category guarantees
- At least one wearable per week (Phase 4)

## Avatar Rules (Phase 4)

### The Avatar Has No Needs
- No mood, hunger, energy, or happiness meters
- No decay of any kind
- Never looks sad, tired, or disappointed
- Never reacts to inactivity or absence
- The avatar is me, and it is always fine

### Appearance is Data
- The avatar is never stored as a pre-rendered image
- An `Appearance` object describes what the avatar looks like
- `AvatarComposer.resolve()` is the only function that turns appearance into sprites
- This pure function is shared by Phaser (room) and DOM (wardrobe, header, focus timer)

### Layer Order (Fixed, Bottom to Top)
1. `hair_back` — Back portion of hairstyles
2. `body` — Base body with skin tone
3. `eyes` — Eye sprite with color
4. `bottom` — Pants, skirts, shorts
5. `shoes` — Footwear
6. `top` — Shirts, jackets, dresses
7. `hair_front` — Front portion of hair (bangs)
8. `accessory` — Glasses, hats, scarves

### Free vs Purchasable
- **Free forever (identity is not for sale):**
  - 6 skin tones, 4 eye colors, 8 hair colors
  - 3 basic hairstyles
  - Starter outfit (3 top colors, 3 bottom colors, 2 shoe colors)
- **Purchasable (self-expression is the reward):**
  - Additional hairstyles, tops, bottoms, shoes, accessories

### Try-On is Free
- Any store wearable can be previewed on the avatar before buying
- Try-on doesn't write anything to the database
- Even "X more coins" disabled cards allow try-on

### Wearables are Single-Copy
- Unlike furniture, wearables are always single-copy
- Cannot own duplicates regardless of `allowMultiple` setting
- "Owned" button shown after purchase

### Outfits are Bookmarks
- Save up to 12 named outfits
- Deleting an outfit never affects inventory
- Unowned items in saved outfits fall back to starter pieces on equip

### Reactions (Never on Inactivity)
- `cheer`: On task completion (if Today screen visible), repair, purchase
- `nod`: When focus block completes
- No reaction on app open, no reaction to absence
- All reactions disabled under reduced motion

---

## Key Implementation Details

### Day Boundary
- Day rolls at **4:00 AM local time**, not midnight
- "Today" = 4am → 3:59am next day

### Recurrence Modes
- **Scheduled:** Fixed calendar pattern. Missed occurrences vanish; only one instance visible.
- **Interval-since-done:** Next due = last completion + interval.

### Coin Ledger
- **Append-only.** Never delete rows, never store balance as mutable field.
- Balance = `SUM(amount)` computed from ledger
- Uncomplete = write negative reversal row

### Coin Payouts
| Size   | Base |
|--------|------|
| tiny   | 5    |
| small  | 10   |
| medium | 25   |
| large  | 60   |

Modifiers (additive):
- Variable bonus: 15% chance +50%, 3% chance +200% jackpot
- Dread bonus: `1 + 0.25 * defer_count`, max 3×
- First-of-day: +5 coins

### Contexts
- `work` | `personal`
- Default based on last used or time (weekday 9-5 = work)
- Visually distinct with color + icon

## Testing Requirements
- Recurrence engine: thorough unit tests including DST and 4am boundary
- Coin economy: unit tests for all payout scenarios
- Ledger consistency: complete/uncomplete/re-complete cycles
- Parser: all supported natural language patterns

## Docs
- `docs/PRD.md` - Product spec | `docs/DATA-MODEL.md` - Database schema
- `docs/PHASE2-PLAN.md`, `docs/PHASE3-PLAN.md`, `docs/PHASE4-PLAN.md` - Implementation slices
- `docs/CATALOG-SCHEMA.md` - Item schema and placement rules
- `docs/AVATAR-SCHEMA.md` - Avatar layer order, compositing rules, free-vs-purchasable
- `docs/CONTENT-CALENDAR.md` - Rotation and seasonal schedule
- `docs/GAME-ARCHITECTURE.md` - Phaser/React integration
- `docs/ASSETS.md` - Asset pipeline | `docs/DECISIONS.md` - Decisions log
