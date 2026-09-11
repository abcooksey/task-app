# Avatar Schema

The appearance model, layer order, compositing rules, and free-vs-purchasable definitions for Phase 4.

---

## 1. Core Principle

**Appearance is data; the composer is the only thing that turns it into sprites.**

The avatar's visual representation is never stored as a pre-rendered image. Instead, an `Appearance` object describes what the avatar looks like, and a pure function (`AvatarComposer.resolve`) converts that data into an ordered list of sprite layers. This function is shared between Phaser (room rendering) and DOM (wardrobe, header, focus timer).

---

## 2. Appearance Model

```typescript
interface Appearance {
  skin: SkinId;              // Free forever
  eyes: EyeColorId;          // Free forever
  hair: {
    styleId: HairStyleId;    // Some free, some purchasable
    colorId: HairColorId;    // Free forever
  };
  top: ItemId;               // Owned or starter
  bottom: ItemId;            // Owned or starter
  shoes: ItemId;             // Owned or starter
  accessory?: ItemId;        // Optional, must be owned
}

// Type aliases for clarity
type SkinId = string;        // e.g., "skin_light", "skin_medium", "skin_dark"
type EyeColorId = string;    // e.g., "eyes_brown", "eyes_blue", "eyes_green"
type HairStyleId = string;   // e.g., "hair_short", "hair_long", "hair_curly"
type HairColorId = string;   // e.g., "hair_black", "hair_brown", "hair_blonde"
type ItemId = string;        // Catalog item ID
```

---

## 3. Layer Order (Fixed)

Layers render from bottom to top in this exact order:

| Order | Layer | Source | Notes |
|-------|-------|--------|-------|
| 1 | `hair_back` | `hair.styleId` | Back portion of hairstyles (ponytails, long hair) |
| 2 | `body` | `skin` | Base body with skin tone applied |
| 3 | `eyes` | `eyes` | Eye sprite with color applied |
| 4 | `bottom` | `bottom` (item) | Pants, skirts, shorts |
| 5 | `shoes` | `shoes` (item) | Footwear |
| 6 | `top` | `top` (item) | Shirts, jackets, dresses |
| 7 | `hair_front` | `hair.styleId` | Front portion of hair (bangs, fringe) |
| 8 | `accessory` | `accessory` (item) | Glasses, hats, scarves, earrings |

This order is **fixed and never changes**. The `AvatarComposer` is the single source of truth for layer ordering.

---

## 4. Free vs Purchasable

### Free Forever (Available from First Run)

These options are always free, never appear with a price, and can be changed instantly at any time.

| Category | Options | Count |
|----------|---------|-------|
| Skin Tones | Light, Light-Medium, Medium, Medium-Dark, Dark, Deep | 6 |
| Eye Colors | Brown, Blue, Green, Hazel | 4 |
| Hair Colors | Black, Dark Brown, Light Brown, Blonde, Red, Auburn, Grey, White | 8 |
| Hair Styles (Free) | Short Classic, Medium Wavy, Long Straight | 3 |
| Starter Top | Plain Tee (white, grey, black variants) | 3 |
| Starter Bottom | Plain Pants (blue, black, khaki variants) | 3 |
| Starter Shoes | Simple Sneakers (white, black variants) | 2 |

**Total free appearance options:** 29 base options + 8 starter clothing pieces

### Purchasable (Catalog Items)

| Category | Catalog Category | Price Range | Target Count |
|----------|-----------------|-------------|--------------|
| Hair Styles | `hair` | 50-100 | 8 |
| Tops | `clothing_top` | 60-140 | 12 |
| Bottoms | `clothing_bottom` | 60-120 | 8 |
| Shoes | `clothing_shoes` | 40-90 | 6 |
| Accessories | `accessory` | 30-120 | 8 |
| Seasonal Wearables | various | 80-160 | 3+ |

**Total launch wearables target:** ~45 items

---

## 5. Compositing Rules

### 5.1 AvatarComposer.resolve()

```typescript
interface Layer {
  layerName: string;         // e.g., "hair_back", "body", "top"
  textureKey: string;        // Manifest key for the sprite
  frameIndex: number;        // Animation frame (0 for static)
  flipped: boolean;          // Mirror horizontally
}

type Pose = 'stand' | 'sit';
type Reaction = 'cheer' | 'nod' | 'wave';

function resolve(
  appearance: Appearance,
  manifest: AssetManifest,
  pose: Pose,
  frame: number,               // Animation frame index
  reaction?: Reaction          // Optional reaction override
): Layer[]
```

### 5.2 Hide Rules

Some items may hide other layers when equipped:

```typescript
interface WearableItem {
  // ... other catalog fields
  hidesHair?: boolean;         // Hides hair_front and hair_back (e.g., hoods, full helmets)
  hidesAccessory?: boolean;    // Hides accessory layer (e.g., bulky headwear)
}
```

**Implementation:**
- If `top.hidesHair === true`: omit `hair_front` and `hair_back` layers from output
- If `top.hidesAccessory === true`: omit `accessory` layer from output
- These flags exist only on tops (hoods, coats) and accessories (full-coverage hats)

### 5.3 Fallback Rules

The composer must **never crash** and **never show a missing body part**.

| Scenario | Fallback |
|----------|----------|
| Missing texture for owned item | Render placeholder rectangle with item name |
| Unowned item in appearance | Substitute starter piece for that slot |
| Missing layer texture | Render placeholder rectangle labeled with layer name |
| Invalid item ID | Substitute starter piece |
| No accessory equipped | Simply omit accessory layer (valid state) |

### 5.4 Poses and Frames

| Pose/Reaction | Frame Count | Notes |
|---------------|-------------|-------|
| `stand` (idle) | 2-4 | Subtle breathing animation |
| `sit` | 1 | Static sitting pose |
| `cheer` | 4-6 | Brief celebration |
| `nod` | 3-4 | Acknowledgment |

**Frame lookup:**
```typescript
// Each wearable declares its texture keys per pose
interface WearableFrames {
  idle: string;      // Texture key for standing pose
  sit: string;       // Texture key for sitting pose
  cheer?: string;    // Texture key for cheer (falls back to idle)
  nod?: string;      // Texture key for nod (falls back to idle)
}
```

If a wearable lacks a frame for a specific pose, fall back to `idle`.

---

## 6. Validation

### 6.1 validateAppearance()

```typescript
interface ValidationResult {
  ok: boolean;
  problems: ValidationProblem[];
}

interface ValidationProblem {
  field: keyof Appearance | 'accessory';
  itemId: string;
  reason: 'not_owned' | 'not_free' | 'invalid_id';
}

function validateAppearance(
  appearance: Appearance,
  ownedItemIds: Set<string>,
  freeIds: FreeAppearanceOptions
): ValidationResult
```

**Validation rules:**
1. `skin` must be in `freeIds.skins`
2. `eyes` must be in `freeIds.eyeColors`
3. `hair.colorId` must be in `freeIds.hairColors`
4. `hair.styleId` must be in `freeIds.hairStyles` OR in `ownedItemIds`
5. `top` must be in `freeIds.starterTops` OR in `ownedItemIds`
6. `bottom` must be in `freeIds.starterBottoms` OR in `ownedItemIds`
7. `shoes` must be in `freeIds.starterShoes` OR in `ownedItemIds`
8. `accessory` (if present) must be in `ownedItemIds`

### 6.2 Server-Side Trigger

A PostgreSQL trigger on `avatar.appearance_json` validates against:
- `inventory` table (user's owned items)
- `free_appearance_options` table (seeded list of free IDs)

Rejects writes with invalid appearances (should never happen if client validates first).

---

## 7. Free Appearance Options (Seed Data)

```typescript
interface FreeAppearanceOptions {
  skins: string[];           // skin_light, skin_medium, etc.
  eyeColors: string[];       // eyes_brown, eyes_blue, etc.
  hairColors: string[];      // hair_black, hair_brown, etc.
  hairStyles: string[];      // hair_short, hair_medium, hair_long (free ones only)
  starterTops: string[];     // starter_tee_white, starter_tee_grey, starter_tee_black
  starterBottoms: string[];  // starter_pants_blue, starter_pants_black, starter_pants_khaki
  starterShoes: string[];    // starter_sneakers_white, starter_sneakers_black
}
```

This is stored in `free_appearance_options` table and seeded once. Client fetches it on load for validation.

---

## 8. Outfit Storage

```typescript
interface Outfit {
  id: string;
  name: string;              // User-defined, max 24 characters
  appearance: Appearance;    // Snapshot of appearance at save time
  sortIndex: number;
}
```

**Rules:**
- Maximum 12 saved outfits per user
- Saving an outfit copies current `appearance` state
- On equip, validate each item is still owned; substitute starter pieces for unowned
- Deleting an outfit never affects inventory (it's just a bookmark)
- Renaming is free and instant

---

## 9. Starter Outfit Defaults

First-run defaults (user can change during setup):

```typescript
const DEFAULT_APPEARANCE: Appearance = {
  skin: 'skin_medium',
  eyes: 'eyes_brown',
  hair: {
    styleId: 'hair_short',
    colorId: 'hair_black'
  },
  top: 'starter_tee_grey',
  bottom: 'starter_pants_blue',
  shoes: 'starter_sneakers_white',
  // No accessory by default
};
```

---

## 10. DOM Preview Rendering

For non-Phaser contexts (wardrobe, Today header, focus timer):

```typescript
function renderDOMAvatar(
  layers: Layer[],
  container: HTMLElement,
  options: {
    scale: number;           // 1 = native, 2 = 2x, etc.
    animate: boolean;        // Respect reduced-motion
  }
): void {
  // Clear container
  container.innerHTML = '';

  // Stack images in layer order
  for (const layer of layers) {
    const img = document.createElement('img');
    img.src = getAssetPath(layer.textureKey, layer.frameIndex);
    img.style.position = 'absolute';
    img.style.imageRendering = 'pixelated';
    img.style.transform = layer.flipped ? 'scaleX(-1)' : '';
    container.appendChild(img);
  }
}
```

**Accessibility:**
```typescript
function getAvatarAriaLabel(appearance: Appearance, catalog: Catalog): string {
  const parts = [
    catalog.get(appearance.hair.styleId)?.name ?? 'hair',
    catalog.get(appearance.top)?.name ?? 'top',
    catalog.get(appearance.bottom)?.name ?? 'bottom',
    catalog.get(appearance.shoes)?.name ?? 'shoes',
  ];
  if (appearance.accessory) {
    parts.push(catalog.get(appearance.accessory)?.name ?? 'accessory');
  }
  return `Wearing ${parts.join(', ')}`;
}
```

---

## 11. Catalog Schema for Wearables

Extends existing `CatalogItem` with wearable-specific fields:

```typescript
interface WearableCatalogItem extends CatalogItem {
  placement: 'wearable';

  // Which layer(s) this item occupies
  layers: LayerName[];       // e.g., ['top'] or ['top', 'hair_front'] for hood

  // Hide rules
  hidesHair?: boolean;
  hidesAccessory?: boolean;

  // Color variants (same garment, different colors)
  family?: string;           // e.g., "sweater" groups sweater_red, sweater_blue

  // Per-pose texture keys
  frames: {
    idle: string;
    sit: string;
    cheer?: string;
    nod?: string;
  };
}

type LayerName =
  | 'hair_back'
  | 'body'
  | 'eyes'
  | 'bottom'
  | 'shoes'
  | 'top'
  | 'hair_front'
  | 'accessory';
```
