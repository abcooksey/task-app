# Adding Content Guide

How to add new items, wearables, and seasonal content to Homestead.

---

## Quick Reference

| Content Type | Files to Modify | Scripts to Run |
|--------------|-----------------|----------------|
| Furniture/Decor | `catalog.json`, `copy-kenney-assets.ts` | `npm run assets` |
| Wearables | `catalog.json`, `build-avatar-atlas.ts` | `npm run build-avatar` |
| Seasonal Events | `calendar.json` | None |
| Mystery Box Pool | `catalog.json` (rarity field) | None |

---

## 1. Adding Furniture/Decor Items

### Step 1: Add to Catalog

Edit `src/game/content/catalog.json`:

```json
{
  "id": "furniture_lamp_new",
  "name": "Cozy Lamp",
  "blurb": "A warm glow for late nights.",
  "category": "decor",
  "placement": "floor",
  "price": 85,
  "footprint": { "w": 1, "h": 1 },
  "isSurface": false,
  "allowMultiple": true,
  "availability": { "kind": "rotation", "pool": "cozy" },
  "rarity": "common",
  "textureKey": "furniture_lamp_new",
  "tags": ["lighting", "cozy"]
}
```

### Step 2: Add Asset Mapping

Edit `scripts/copy-kenney-assets.ts`:

```typescript
const ASSET_MAPPINGS: AssetMapping[] = [
  // ... existing mappings ...
  {
    src: 'furniture-kit/lampRoundFloor_SE.png',
    dest: 'furniture_lamp_new.png',
  },
]
```

### Step 3: Run Asset Pipeline

```bash
npm run assets
# This runs:
# 1. copy-kenney-assets.ts - Copy sprites
# 2. generate-manifest.ts - Update manifest.json
# 3. check-credits.ts - Verify attribution
```

### Step 4: Validate

```bash
npm run validate-catalog
```

---

## 2. Category Reference

### Placement Types

| Type | Where it Goes | Example |
|------|---------------|---------|
| `floor` | Floor region, depth-sorted | Sofa, table, plant |
| `rug` | Floor region, under furniture | Area rug, doormat |
| `wall` | Wall region | Poster, clock, mirror |
| `surface` | On top of furniture with `isSurface: true` | Mug, book, candle |
| `outdoor` | Yard region (exterior view) | Bench, flower bed |
| `wall_finish` | Room-wide wall treatment | Wallpaper |
| `floor_finish` | Room-wide floor treatment | Wood flooring |

### Availability Types

```typescript
// Always in store
{ "kind": "always" }

// In weekly rotation (shuffled from pool)
{ "kind": "rotation", "pool": "core" }
// Pools: "core", "cozy", "plants", "modern", "vintage", "outdoor"

// Only during date range (MM-DD format)
{ "kind": "seasonal", "from": "10-01", "to": "10-31" }
```

### Rarity (for Mystery Box)

| Rarity | Weight | Chance |
|--------|--------|--------|
| `common` | 70 | ~70% |
| `uncommon` | 25 | ~25% |
| `rare` | 5 | ~5% |

---

## 3. Adding Wearables

### Step 1: Add to Catalog

```json
{
  "id": "top_sweater_cozy",
  "name": "Cozy Sweater",
  "blurb": "Perfect for chilly days.",
  "category": "clothing_top",
  "placement": "wearable",
  "price": 120,
  "footprint": { "w": 1, "h": 1 },
  "availability": { "kind": "rotation", "pool": "cozy" },
  "rarity": "uncommon",
  "textureKey": "top_sweater_cozy",
  "tags": ["winter", "cozy"]
}
```

### Step 2: Update Avatar Constants

Edit `src/game/avatar/constants.ts`:

```typescript
export const PURCHASABLE_TOPS = [
  // ... existing ...
  'top_sweater_cozy',
]
```

### Step 3: Generate Sprites

If using LPC sprites, add to `scripts/build-avatar-atlas.ts`:

```typescript
// Add new clothing sprite generation
const CLOTHING_TOPS = [
  // ... existing ...
  { id: 'top_sweater_cozy', color: '#8B4513' },
]
```

Then run:

```bash
npm run build-avatar
```

---

## 4. Seasonal Content

### Calendar Structure

Edit `src/game/content/calendar.json`:

```json
{
  "seasons": [
    {
      "id": "halloween_2024",
      "name": "Spooky Season",
      "from": "10-01",
      "to": "10-31",
      "items": [
        "decor_pumpkin_small",
        "decor_jack_o_lantern",
        "outdoor_scarecrow"
      ]
    }
  ]
}
```

### Adding a New Season

1. Add season object to `calendar.json`
2. Ensure all items exist in `catalog.json` with matching `availability.kind: "seasonal"`
3. Items automatically appear in store during the date range

---

## 5. Adding Mystery Box Items

Mystery box pulls from items based on rarity weighting.

### Criteria
- Must be in `catalog.json` with `rarity` field
- Must be purchasable (not free starter items)
- Should not be currently in weekly rotation

### Rarity Guidelines

| Rarity | Good For |
|--------|----------|
| `common` | Basic furniture, simple decor |
| `uncommon` | Themed items, nicer furniture |
| `rare` | Statement pieces, unique items |

---

## 6. Asset Sources

### Kenney Assets (Recommended)

All Kenney assets are CC0 (public domain).

Available packs in `assets/kenney/`:
- `furniture-kit/` - Indoor furniture
- `holiday-kit/` - Seasonal decorations
- `graveyard-kit/` - Halloween items
- `mini-forest/` - Trees, plants
- `fantasy-town-kit/` - Decorative items

### Adding New Pack

1. Download from [kenney.nl](https://kenney.nl)
2. Extract to `assets/kenney/{pack-name}/`
3. Add mappings to `copy-kenney-assets.ts`
4. Update `CREDITS.md`

---

## 7. Validation Checklist

Before merging new content:

- [ ] `npm run validate-catalog` passes
- [ ] `npm run check-credits` passes
- [ ] Item appears in dev build
- [ ] Price is within category range (see `docs/TUNING.md`)
- [ ] Sprite loads without errors
- [ ] If seasonal, dates are correct
- [ ] If wearable, avatar renders correctly

---

## 8. Common Issues

### "Item not found in manifest"

Run `npm run assets` to regenerate manifest.

### "Sprite not loading"

1. Check `textureKey` matches filename (without extension)
2. Check file exists in `public/assets/`
3. Check manifest.json includes the asset

### "Item not appearing in rotation"

1. Verify `availability.kind` is `"rotation"`
2. Check pool name matches a valid pool
3. Item may be excluded if it was in previous week

### "Catalog drift error"

Run `npm run seed-catalog` to sync database with JSON.
