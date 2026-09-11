# Catalog Schema

Item definitions, placement rules, and rotation algorithm for Phase 3.

---

## 1. Item Schema

Each item in `src/game/content/catalog.json`:

```typescript
interface CatalogItem {
  // Identity
  id: string;                    // Unique key, e.g., "sofa_blue", "rug_round_cream"
  name: string;                  // Display name
  blurb: string;                 // Short description for detail sheet

  // Classification
  category: Category;
  placement: PlacementType;
  tags: string[];                // For filtering, e.g., ["cozy", "modern", "plants"]

  // Economy
  price: number;                 // In coins
  rarity: 'common' | 'uncommon' | 'rare';  // Mystery box weighting

  // Dimensions (in 16px grid cells)
  footprint: {
    w: number;                   // Width in cells
    h: number;                   // Height in cells
  };

  // Surface behavior (furniture only)
  isSurface?: boolean;           // Can hold surface_decor
  slots?: { x: number; y: number }[];  // Slot positions relative to item origin

  // Ownership rules
  allowMultiple?: boolean;       // Can own more than one (default: false for furniture, true for decor/rugs)

  // Rendering
  textureKey: string;            // Manifest key for sprite
  flippedTextureKey?: string;    // Separate sprite for flipped state (optional)

  // Availability
  availability: Availability;
}

type Category =
  | 'furniture'       // Tables, chairs, beds, sofas, shelves
  | 'decor'           // Standalone decorative items (lamps, plants, vases)
  | 'rug'             // Floor coverings
  | 'wall'            // Wall-mounted items (posters, clocks, mirrors)
  | 'surface_decor'   // Small items that go on surfaces (mugs, books, candles)
  | 'outdoor'         // Yard items (benches, flower beds, lanterns)
  | 'wall_finish'     // Wallpaper patterns
  | 'floor_finish'    // Flooring patterns
  // Reserved for Phase 4:
  | 'clothing_top' | 'clothing_bottom' | 'clothing_shoes' | 'hair' | 'accessory';

type PlacementType =
  | 'floor'           // Placed on floor region
  | 'rug'             // Placed on floor, can overlap furniture
  | 'wall'            // Placed on wall region
  | 'surface'         // Placed in a slot on a surface item
  | 'outdoor'         // Placed in yard region
  | 'wall_finish'     // Applied room-wide
  | 'floor_finish'    // Applied room-wide
  | 'wearable';       // Reserved for Phase 4, rejected by placement validator

type Availability =
  | { kind: 'always' }
  | { kind: 'rotation'; pool: string }  // e.g., "core", "cozy", "plants", "outdoor"
  | { kind: 'seasonal'; from: string; to: string };  // "MM-DD" format
```

---

## 2. Placement Rules (Decision Table)

| placement | region | may overlap | draws on layer | depth sort | notes |
|-----------|--------|-------------|----------------|------------|-------|
| `floor` | floor cells | nothing except `rug` | `furniture` | by bottom edge (y + h), then placement.id | footprint must be fully inside floor region |
| `rug` | floor cells | floor items and other rugs | `rug` | by bottom edge | rugs never block anything; always drawn under furniture |
| `wall` | wall cells | nothing | `wall_decor` | by y position | footprint must be fully inside wall region |
| `surface` | slot on a placed `floor` item with `isSurface: true` | — | `surface_decor` | — | one item per slot; moves with parent; stored if parent is stored |
| `outdoor` | yard cells | nothing | `furniture` | by bottom edge | exterior view only; same depth rules as floor |
| `wall_finish` | room-wide | — | `wall_base` | — | not placed on grid; applied to whole wall |
| `floor_finish` | room-wide | — | `floor_base` | — | not placed on grid; applied to whole floor |
| `wearable` | — | — | — | — | rejected by validator with reason `not_placeable` |

### Overlap Rules Matrix

| Item being placed ↓ / Existing item → | floor | rug | wall | surface | outdoor |
|---------------------------------------|-------|-----|------|---------|---------|
| floor | BLOCKED | OK | n/a | n/a | n/a |
| rug | OK | OK | n/a | n/a | n/a |
| wall | n/a | n/a | BLOCKED | n/a | n/a |
| surface | n/a | n/a | n/a | BLOCKED (slot) | n/a |
| outdoor | n/a | n/a | n/a | n/a | BLOCKED |

### Region Constraints

| placement | interior: floor | interior: wall | exterior: yard |
|-----------|-----------------|----------------|----------------|
| floor | valid | wrong_region | wrong_region |
| rug | valid | wrong_region | wrong_region |
| wall | wrong_region | valid | wrong_region |
| surface | slot on floor item | — | — |
| outdoor | wrong_region | wrong_region | valid |

---

## 3. Placement Validator

Pure function in `src/game/placement/validate.ts`:

```typescript
interface RoomDefinition {
  view: 'interior' | 'exterior';
  regions: {
    floor?: { x: number; y: number; w: number; h: number };
    wall?: { x: number; y: number; w: number; h: number };
    yard?: { x: number; y: number; w: number; h: number };
  };
}

interface ItemDefinition {
  id: string;
  placement: PlacementType;
  footprint: { w: number; h: number };
  isSurface?: boolean;
  slots?: { x: number; y: number }[];
}

interface Placement {
  id: string;
  inventoryId: string;
  itemId: string;
  region: 'floor' | 'wall' | 'yard';
  x: number;
  y: number;
  flipped: boolean;
  parentPlacementId?: string;
  slotIndex?: number;
}

interface ProposedPlacement {
  itemId: string;
  region: 'floor' | 'wall' | 'yard';
  x: number;
  y: number;
  flipped: boolean;
  parentPlacementId?: string;  // For surface decor
  slotIndex?: number;
}

type ValidationResult =
  | { ok: true }
  | { ok: false; reason: ValidationReason };

type ValidationReason =
  | 'out_of_region'    // Footprint extends beyond region bounds
  | 'overlaps'         // Overlaps with incompatible item
  | 'wrong_region'     // Item type doesn't belong in this region
  | 'no_free_slot'     // Surface decor but parent has no free slots
  | 'slot_occupied'    // Specific slot already has an item
  | 'not_placeable';   // Wearable items can't be placed

function validate(
  roomDef: RoomDefinition,
  itemDef: ItemDefinition,
  existingPlacements: Placement[],
  proposed: ProposedPlacement,
  excludePlacementId?: string  // For move operations (don't conflict with self)
): ValidationResult;
```

### Algorithm

```
1. If itemDef.placement === 'wearable':
   return { ok: false, reason: 'not_placeable' }

2. If itemDef.placement is 'wall_finish' or 'floor_finish':
   return { ok: true }  // Finishes don't use grid validation

3. Determine expected region from itemDef.placement:
   - floor, rug → 'floor'
   - wall → 'wall'
   - outdoor → 'yard'
   - surface → parent's region

4. If proposed.region !== expected:
   return { ok: false, reason: 'wrong_region' }

5. Get region bounds from roomDef.regions[proposed.region]
   If region doesn't exist:
   return { ok: false, reason: 'wrong_region' }

6. For surface decor (itemDef.placement === 'surface'):
   a. Find parent placement by proposed.parentPlacementId
   b. Get parent item definition
   c. If !parentItemDef.isSurface:
      return { ok: false, reason: 'no_free_slot' }
   d. If proposed.slotIndex >= parentItemDef.slots.length:
      return { ok: false, reason: 'no_free_slot' }
   e. Check if slot is occupied by another surface item:
      For each placement where parentPlacementId === proposed.parentPlacementId
        AND slotIndex === proposed.slotIndex
        AND id !== excludePlacementId:
        return { ok: false, reason: 'slot_occupied' }
   f. return { ok: true }

7. Check bounds:
   if proposed.x < 0 or proposed.y < 0
      or proposed.x + itemDef.footprint.w > region.w
      or proposed.y + itemDef.footprint.h > region.h:
   return { ok: false, reason: 'out_of_region' }

8. Check overlaps:
   For each existing placement in proposed.region:
     If existing.id === excludePlacementId: continue

     Get existingItemDef

     // Check if overlap allowed
     if canOverlap(itemDef.placement, existingItemDef.placement): continue

     // Check actual geometric overlap
     if rectanglesOverlap(
       proposed.x, proposed.y, itemDef.footprint,
       existing.x, existing.y, existingItemDef.footprint
     ):
       return { ok: false, reason: 'overlaps' }

9. return { ok: true }

function canOverlap(placingType, existingType):
  // Rugs can overlap anything on the floor
  if placingType === 'rug': return true
  // Floor items can be on top of rugs
  if placingType === 'floor' and existingType === 'rug': return true
  // Everything else blocks
  return false
```

---

## 4. Depth Sorting

Items on the `furniture` layer (floor and outdoor placements) are sorted by:

1. **Primary:** Bottom edge position = `placement.y + itemDef.footprint.h`
2. **Secondary:** `placement.id` (for stable ordering when bottom edges are equal)

Lower values draw first (further back). This creates correct visual occlusion without isometric math.

```typescript
function depthSort(placements: Placement[], itemDefs: Map<string, ItemDefinition>): Placement[] {
  return [...placements].sort((a, b) => {
    const aBottom = a.y + itemDefs.get(a.itemId)!.footprint.h;
    const bBottom = b.y + itemDefs.get(b.itemId)!.footprint.h;

    if (aBottom !== bBottom) {
      return aBottom - bBottom;
    }

    return a.id.localeCompare(b.id);
  });
}
```

---

## 5. Weekly Rotation Algorithm

### Overview

Each week, 8 items from rotation pools appear in "New this week." The selection is deterministic from the ISO week number, ensuring all devices show the same items.

### Algorithm

```typescript
import { xmur3, mulberry32 } from './prng';

interface RotationConfig {
  pools: Record<string, string[]>;  // pool name → item IDs
  guarantees: {
    minFurniture: number;   // At least 1
    minDecor: number;       // At least 2
    minWall: number;        // At least 1
    minOutdoor: number;     // At least 1
  };
  itemsPerWeek: number;     // 8
}

function rotation(
  isoWeek: number,
  year: number,
  catalog: CatalogItem[],
  config: RotationConfig,
  previousWeekItems: string[]  // Items from last week (excluded)
): string[] {
  // 1. Seed PRNG from week + year
  const seed = xmur3(`rotation-${year}-W${isoWeek}`);
  const random = mulberry32(seed());

  // 2. Get all rotation items not in previous week
  const eligible = catalog.filter(item =>
    item.availability.kind === 'rotation' &&
    !previousWeekItems.includes(item.id)
  );

  // 3. Group by category for guarantees
  const byCategory = {
    furniture: eligible.filter(i => i.category === 'furniture'),
    decor: eligible.filter(i => i.category === 'decor'),
    wall: eligible.filter(i => i.category === 'wall'),
    outdoor: eligible.filter(i => i.category === 'outdoor'),
    other: eligible.filter(i => !['furniture', 'decor', 'wall', 'outdoor'].includes(i.category)),
  };

  // 4. Shuffle each category
  for (const category of Object.keys(byCategory)) {
    shuffle(byCategory[category], random);
  }

  // 5. Pick guaranteed minimums
  const selected: string[] = [];

  selected.push(...byCategory.furniture.slice(0, config.guarantees.minFurniture).map(i => i.id));
  selected.push(...byCategory.decor.slice(0, config.guarantees.minDecor).map(i => i.id));
  selected.push(...byCategory.wall.slice(0, config.guarantees.minWall).map(i => i.id));
  selected.push(...byCategory.outdoor.slice(0, config.guarantees.minOutdoor).map(i => i.id));

  // 6. Fill remaining slots from all eligible (excluding already selected)
  const remaining = eligible.filter(i => !selected.includes(i.id));
  shuffle(remaining, random);

  while (selected.length < config.itemsPerWeek && remaining.length > 0) {
    selected.push(remaining.shift()!.id);
  }

  // 7. Shuffle final selection for display order
  shuffle(selected, random);

  return selected;
}

function shuffle<T>(array: T[], random: () => number): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
```

### PRNG Functions

```typescript
// xmur3 hash function for seeding
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

// mulberry32 PRNG
function mulberry32(seed: number): () => number {
  return function() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### Refresh Timing

The rotation refreshes at **Monday 4:00 AM local time** (same day boundary as tasks).

```typescript
function getCurrentRotationWeek(): { year: number; week: number } {
  const now = new Date();
  // Subtract 4 hours to align with app day boundary
  const adjusted = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  // Get ISO week number
  const jan1 = new Date(adjusted.getFullYear(), 0, 1);
  const days = Math.floor((adjusted.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);

  return { year: adjusted.getFullYear(), week };
}
```

---

## 6. Price Bands

Constants in `src/config/economy.ts`:

```typescript
export const STORE_PRICES = {
  // Surface decor (smallest)
  surface_decor: { min: 20, max: 45 },

  // Wall decor
  wall: { min: 40, max: 90 },

  // Rugs
  rug: { min: 60, max: 120 },

  // Small furniture
  furniture_small: { min: 80, max: 150 },

  // Large furniture
  furniture_large: { min: 200, max: 350 },

  // Finishes
  wall_finish: { min: 120, max: 220 },
  floor_finish: { min: 120, max: 220 },

  // Outdoor
  outdoor: { min: 50, max: 200 },

  // Mystery box
  mystery_box: 75,
} as const;
```

### Pacing Validation (test)

```typescript
// A decent week (~1000 coins) should afford:
// - One large furniture (200-350)
// - 3-4 small things (80-200 total)
// This check runs as a test against the catalog

function validatePacing(catalog: CatalogItem[]): void {
  const alwaysItems = catalog.filter(i => i.availability.kind === 'always');

  // Nothing in always set exceeds a decent week
  const decentWeek = 1000;
  const maxAlwaysPrice = Math.max(...alwaysItems.map(i => i.price));
  expect(maxAlwaysPrice).toBeLessThanOrEqual(decentWeek);

  // A rough week (200 coins) can still buy something visible
  const roughWeek = 200;
  const cheapestVisible = Math.min(
    ...catalog
      .filter(i => i.category !== 'surface_decor')
      .map(i => i.price)
  );
  expect(cheapestVisible).toBeLessThanOrEqual(roughWeek);

  // Mystery box price is always <= cheapest item in its pool
  const mysteryPool = catalog.filter(i => i.price >= STORE_PRICES.mystery_box);
  expect(mysteryPool.length).toBeGreaterThan(0);
}
```

---

## 7. Ownership Rules

| Category | Default allowMultiple | Notes |
|----------|----------------------|-------|
| furniture | false | Unless item.allowMultiple = true |
| decor | true | Can own multiple plants, lamps, etc. |
| rug | true | Can own multiple rugs |
| wall | true | Can own multiple posters |
| surface_decor | true | Can own multiple mugs, books |
| outdoor | true | Can own multiple flower beds |
| wall_finish | false | Own one of each pattern |
| floor_finish | false | Own one of each pattern |

Single-copy items show "Owned" button in store after purchase. Duplicate-allowed items always show "Buy" button.
