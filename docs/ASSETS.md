# Asset Pipeline & Art Packs

## Overview

All game art comes from free pixel-art packs with permissive licenses. Every asset must be recorded with attribution. The build fails if any manifest entry lacks a credit line.

---

## 1. Art Requirements

| Requirement | Value |
|-------------|-------|
| Style | Pixel art, front-facing 2D (dollhouse view) |
| Base resolution | 360×640 at 16px tile grid |
| Scale | All art normalized to 16px grid (32px packs scaled 0.5× offline) |
| Total size | Under 2MB for all Phase 2 art |
| Before/After | Each repair needs clearly distinct broken/fixed states |

---

## 2. Proposed Asset Packs

### Primary: Kenney Assets (CC0)

**Kenney Tiny Town**
- URL: https://kenney.nl/assets/tiny-town
- License: CC0 (Public Domain)
- Use for: Building exteriors, fences, paths, mailbox
- Notes: 16×16 tiles, perfect scale match

**Kenney Tiny Dungeon**
- URL: https://kenney.nl/assets/tiny-dungeon
- License: CC0 (Public Domain)
- Use for: Interior walls, floors, doors, debris
- Notes: 16×16 tiles, good for "broken" states

**Kenney Particle Pack**
- URL: https://kenney.nl/assets/particle-pack
- License: CC0 (Public Domain)
- Use for: Dust puffs, sparkles, debris particles
- Notes: Animation frames for repair effects

### Secondary: OpenGameArt

**LPC Interior Tileset** by Lanea Zimmerman
- URL: https://opengameart.org/content/lpc-interior-tiles
- License: CC-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0
- Use for: Interior furniture base, windows, ceiling
- Notes: 32×32, scale 0.5× at import. Attribution required.

**Exterior 32×32 Town Tileset** by Lanea Zimmerman
- URL: https://opengameart.org/content/lpc-exterior-tiles
- License: CC-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0
- Use for: Roof tiles, porch steps
- Notes: 32×32, scale 0.5× at import. Attribution required.

### Fallback: itch.io

**Pixel Art Interior Tileset** by Gif
- URL: https://gif-superretroworld.itch.io/interior-pack
- License: Free for personal and commercial use
- Use for: Alternative interior elements if LPC doesn't fit
- Notes: Verify exact license terms before use

---

## 3. Asset Mapping by Repair

### Interior Repairs

| ID | Before Sprite | After Sprite | Source Pack |
|----|--------------|--------------|-------------|
| int_garbage | Debris pile (scattered tiles) | Clean floor | Kenney Tiny Dungeon |
| int_cobwebs | Cobweb overlay corners | Clear corners | Kenney Tiny Dungeon + custom |
| int_floor | Broken planks (holes) | Intact wood floor | LPC Interior |
| int_window | Cracked/boarded window | Clear window | LPC Interior |
| int_ceiling | Water stain + drip | Clean ceiling | LPC Interior + custom |
| int_door | Door off hinges (tilted) | Door in frame | LPC Interior |
| int_walls | Peeling/damaged wall | Painted wall | LPC Interior |
| int_light | Empty ceiling fixture | Lit fixture | LPC Interior |

### Exterior Repairs

| ID | Before Sprite | After Sprite | Source Pack |
|----|--------------|--------------|-------------|
| ext_yard | Overgrown debris | Clear grass | Kenney Tiny Town |
| ext_mailbox | Fallen mailbox | Standing mailbox | Kenney Tiny Town |
| ext_steps | Broken porch steps | Repaired steps | LPC Exterior |
| ext_fence | Broken fence sections | Complete fence | Kenney Tiny Town |
| ext_roof | Missing roof tiles | Complete roof | LPC Exterior |
| ext_paint | Peeling paint | Fresh paint | Custom recolor |
| ext_path | Dirt/grass | Stone path | Kenney Tiny Town |

---

## 4. Animation Assets

| Animation | Frames | Source |
|-----------|--------|--------|
| sweep | 4 frames dust cloud | Kenney Particle Pack |
| hammer | 3 frames + debris particles | Kenney Particle Pack |
| sparkle | 6 frames star burst | Kenney Particle Pack |
| paint | Horizontal wipe (procedural) | Generated |
| swap | Fade transition (procedural) | Generated |
| confetti | Particle system | Kenney Particle Pack |

---

## 5. Manifest Format

`public/assets/manifest.json`:

```json
{
  "textures": [
    {
      "key": "int_garbage_before",
      "path": "assets/repairs/int_garbage_before.png",
      "credit": "kenney-tiny-dungeon",
      "placeholder": {
        "width": 64,
        "height": 32,
        "color": "#4A3728",
        "label": "GARBAGE"
      }
    },
    {
      "key": "int_garbage_after",
      "path": "assets/repairs/int_garbage_after.png",
      "credit": "kenney-tiny-dungeon",
      "placeholder": {
        "width": 64,
        "height": 32,
        "color": "#8B7355",
        "label": "CLEAN"
      }
    }
  ],
  "atlases": [
    {
      "key": "animations",
      "imagePath": "assets/animations.png",
      "jsonPath": "assets/animations.json",
      "credit": "kenney-particle-pack"
    }
  ],
  "credits": {
    "kenney-tiny-town": {
      "name": "Tiny Town",
      "author": "Kenney",
      "license": "CC0",
      "url": "https://kenney.nl/assets/tiny-town"
    },
    "kenney-tiny-dungeon": {
      "name": "Tiny Dungeon",
      "author": "Kenney",
      "license": "CC0",
      "url": "https://kenney.nl/assets/tiny-dungeon"
    },
    "kenney-particle-pack": {
      "name": "Particle Pack",
      "author": "Kenney",
      "license": "CC0",
      "url": "https://kenney.nl/assets/particle-pack"
    },
    "lpc-interior": {
      "name": "LPC Interior Tiles",
      "author": "Lanea Zimmerman (Sharm)",
      "license": "CC-BY 3.0",
      "url": "https://opengameart.org/content/lpc-interior-tiles"
    },
    "lpc-exterior": {
      "name": "LPC Exterior Tiles",
      "author": "Lanea Zimmerman (Sharm)",
      "license": "CC-BY 3.0",
      "url": "https://opengameart.org/content/lpc-exterior-tiles"
    }
  }
}
```

---

## 6. Credits File

`public/assets/CREDITS.md`:

```markdown
# Asset Credits

## Kenney Assets (CC0 - Public Domain)

### Tiny Town
- Author: Kenney (kenney.nl)
- License: CC0 1.0 Universal
- URL: https://kenney.nl/assets/tiny-town
- Used for: Exterior buildings, fences, paths, mailbox

### Tiny Dungeon
- Author: Kenney (kenney.nl)
- License: CC0 1.0 Universal
- URL: https://kenney.nl/assets/tiny-dungeon
- Used for: Interior elements, debris, broken items

### Particle Pack
- Author: Kenney (kenney.nl)
- License: CC0 1.0 Universal
- URL: https://kenney.nl/assets/particle-pack
- Used for: Repair animations, dust, sparkles, confetti

## OpenGameArt (CC-BY 3.0)

### LPC Interior Tiles
- Author: Lanea Zimmerman (Sharm)
- License: CC-BY 3.0
- URL: https://opengameart.org/content/lpc-interior-tiles
- Used for: Interior walls, floors, windows, doors

### LPC Exterior Tiles
- Author: Lanea Zimmerman (Sharm)
- License: CC-BY 3.0
- URL: https://opengameart.org/content/lpc-exterior-tiles
- Used for: Roof tiles, porch steps
```

---

## 7. Build Validation Script

`scripts/validate-assets.js`:

```javascript
const manifest = require('../public/assets/manifest.json');

let errors = [];

// Check all textures have credits
for (const texture of manifest.textures) {
  if (!texture.credit) {
    errors.push(`Missing credit for texture: ${texture.key}`);
  } else if (!manifest.credits[texture.credit]) {
    errors.push(`Unknown credit key "${texture.credit}" for texture: ${texture.key}`);
  }
}

// Check all atlases have credits
for (const atlas of manifest.atlases || []) {
  if (!atlas.credit) {
    errors.push(`Missing credit for atlas: ${atlas.key}`);
  } else if (!manifest.credits[atlas.credit]) {
    errors.push(`Unknown credit key "${atlas.credit}" for atlas: ${atlas.key}`);
  }
}

if (errors.length > 0) {
  console.error('Asset validation failed:');
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('Asset validation passed');
```

Add to `package.json`:
```json
{
  "scripts": {
    "validate-assets": "node scripts/validate-assets.js",
    "build": "npm run validate-assets && tsc -b && vite build"
  }
}
```

---

## 8. Atlas Packing

For production, pack individual sprites into a texture atlas:

**Option A: Pre-commit atlas**
- Use TexturePacker or free-tex-packer GUI
- Commit the packed atlas + JSON
- Simpler CI, no build-time dependency

**Option B: Build-time packing**
```bash
npm install --save-dev free-tex-packer-core
```

Build script generates atlas from `assets/sprites/` → `assets/atlas.png` + `assets/atlas.json`

**Recommendation:** Option A (pre-commit) for Phase 2 simplicity.

---

## 9. Placeholder Rendering

When `usePlaceholderArt: true`:

```typescript
function generatePlaceholder(
  key: string,
  config: { width: number; height: number; color: string; label: string }
): void {
  const graphics = this.make.graphics({ x: 0, y: 0 });

  // Background
  graphics.fillStyle(Phaser.Display.Color.HexStringToColor(config.color).color);
  graphics.fillRect(0, 0, config.width, config.height);

  // Border
  graphics.lineStyle(2, 0x000000);
  graphics.strokeRect(0, 0, config.width, config.height);

  // Label
  const text = this.add.text(config.width / 2, config.height / 2, config.label, {
    fontSize: '8px',
    color: '#ffffff',
  }).setOrigin(0.5);

  // Generate texture
  graphics.generateTexture(key, config.width, config.height);
  graphics.destroy();
  text.destroy();
}
```

---

## 10. In-App Attribution

For CC-BY licensed assets, attribution must appear in the app:

**Settings → About screen:**
```
Art Credits

Interior & exterior tiles by Lanea Zimmerman (Sharm)
Licensed under CC-BY 3.0
https://opengameart.org/users/sharm

Additional art by Kenney (kenney.nl)
Licensed under CC0 (Public Domain)
```

---

## Phase 3: Store and Decorating Assets

### 11. Additional Asset Packs for Phase 3

#### Primary: Kenney Furniture (CC0)

**Kenney Furniture Kit**
- URL: https://kenney.nl/assets/furniture-kit
- License: CC0 (Public Domain)
- Use for: Sofas, chairs, tables, beds, shelves, cabinets
- Notes: Isometric style but individual pieces work well front-facing
- Items: ~40 furniture pieces

**Kenney House Kit**
- URL: https://kenney.nl/assets/house-kit
- License: CC0 (Public Domain)
- Use for: Wall finishes, floor finishes, doors, windows
- Notes: 16×16 tiles, includes wallpaper patterns and floor textures
- Items: ~60 tiles

#### Secondary: itch.io Packs

**Cozy Interior Pack** by Gif
- URL: https://gif-superretroworld.itch.io/cozy-interior
- License: Free for personal and commercial use (verify before use)
- Use for: Living room furniture, rugs, lamps, plants
- Notes: 32×32, scale 0.5× at import
- Items: ~30 pieces

**Modern Interiors** by LimeZu
- URL: https://limezu.itch.io/moderninteriors
- License: Free tier available, paid for full set
- Use for: Modern furniture variants, appliances, decor
- Notes: 16×16 native, excellent quality
- Items: ~100 pieces (free tier: ~40)

**Cozy Farm Asset Pack** by shubibubi
- URL: https://shubibubi.itch.io/cozy-farm
- License: Free for personal and commercial use
- Use for: Outdoor items, plants, seasonal decor
- Notes: 16×16 native, cozy aesthetic matches app
- Items: ~50 outdoor pieces

#### Surface Decor

**Tiny Items Pack** by Kenney
- URL: https://kenney.nl/assets/tiny-items
- License: CC0 (Public Domain)
- Use for: Surface decor (mugs, books, candles, small plants)
- Notes: 8×8 and 16×16 items
- Items: ~80 tiny items

**Pixel Books** by 7Soul
- URL: https://opengameart.org/content/16x16-books
- License: CC0 (Public Domain)
- Use for: Book stacks, open books for surfaces
- Notes: 16×16
- Items: ~12 book variants

#### Seasonal (Autumn/Halloween/Winter)

**Seasonal Pack** by Kenney
- URL: https://kenney.nl/assets/seasonal
- License: CC0 (Public Domain)
- Use for: Pumpkins, snow, holiday items
- Notes: Various sizes
- Items: ~30 seasonal items

**Halloween Asset Pack** by finalbossblues
- URL: https://opengameart.org/content/halloween-sprites
- License: CC0 (Public Domain)
- Use for: Spooky decor, jack-o-lanterns, ghosts
- Notes: 32×32, scale 0.5× at import
- Items: ~20 items

---

### 12. Asset Mapping by Category

#### Furniture (~25 items)

| ID | Name | Source Pack | Size (cells) | Is Surface |
|----|------|-------------|--------------|------------|
| furniture_sofa_blue | Blue Sofa | Kenney Furniture | 4×2 | No |
| furniture_sofa_cream | Cream Sofa | Kenney Furniture | 4×2 | No |
| furniture_armchair_plush | Plush Armchair | Cozy Interior | 2×2 | No |
| furniture_bed_single | Single Bed | Kenney Furniture | 2×3 | No |
| furniture_bed_double | Double Bed | Kenney Furniture | 4×3 | No |
| furniture_desk_wooden | Wooden Desk | Kenney Furniture | 3×2 | Yes (2 slots) |
| furniture_desk_modern | Modern Desk | Modern Interiors | 3×2 | Yes (2 slots) |
| furniture_table_coffee | Coffee Table | Kenney Furniture | 2×1 | Yes (2 slots) |
| furniture_table_side | Side Table | Kenney Furniture | 1×1 | Yes (1 slot) |
| furniture_bookshelf_tall | Tall Bookshelf | Kenney Furniture | 2×4 | No |
| furniture_bookshelf_short | Short Bookshelf | Kenney Furniture | 2×2 | Yes (2 slots) |
| furniture_wardrobe | Wardrobe | Kenney Furniture | 2×3 | No |
| furniture_dresser | Dresser | Kenney Furniture | 2×2 | Yes (3 slots) |
| furniture_chair_dining | Dining Chair | Kenney Furniture | 1×1 | No |
| furniture_stool | Wooden Stool | Kenney Furniture | 1×1 | No |
| furniture_plant_stand | Plant Stand | Cozy Interior | 1×1 | Yes (1 slot) |
| furniture_reading_chair | Reading Chair | Cozy Interior | 2×2 | No |
| furniture_tv_stand | TV Stand | Modern Interiors | 3×1 | Yes (1 slot) |
| furniture_cabinet | Display Cabinet | Kenney Furniture | 2×3 | No |
| furniture_tree_holiday | Holiday Tree | Seasonal Pack | 2×3 | No |

#### Decor (~15 items)

| ID | Name | Source Pack | Size (cells) |
|----|------|-------------|--------------|
| decor_plant_fern | Fern Plant | Cozy Farm | 1×2 |
| decor_plant_monstera | Monstera | Cozy Farm | 2×2 |
| decor_plant_succulent | Succulent | Cozy Farm | 1×1 |
| decor_lamp_floor | Floor Lamp | Cozy Interior | 1×2 |
| decor_lamp_floor_arc | Arc Floor Lamp | Modern Interiors | 2×3 |
| decor_vase_tall | Tall Vase | Cozy Interior | 1×2 |
| decor_pumpkin_small | Small Pumpkin | Seasonal Pack | 1×1 |
| decor_pumpkin_large | Large Pumpkin | Seasonal Pack | 1×1 |
| decor_jack_o_lantern | Jack-o-Lantern | Halloween Pack | 1×1 |
| decor_candelabra | Candelabra | Halloween Pack | 1×2 |
| decor_blanket_knit | Knit Blanket | Cozy Interior | 2×1 |
| decor_string_lights | String Lights | Seasonal Pack | 3×1 |
| decor_wreath_door | Door Wreath | Seasonal Pack | 1×1 |
| decor_hot_cocoa_station | Cocoa Station | Cozy Interior | 2×1 |

#### Rugs (~8 items)

| ID | Name | Source Pack | Size (cells) |
|----|------|-------------|--------------|
| rug_basic | Basic Rug | LPC Interior | 3×2 |
| rug_round_cream | Round Cream Rug | Cozy Interior | 2×2 |
| rug_circular_soft | Soft Circle Rug | Cozy Interior | 3×3 |
| rug_autumn_leaves | Autumn Leaves | Seasonal Pack | 3×2 |
| rug_sheepskin | Sheepskin | Cozy Interior | 2×2 |
| rug_spiderweb | Spiderweb Rug | Halloween Pack | 2×2 |
| rug_winter_pattern | Winter Pattern | Seasonal Pack | 3×2 |
| rug_modern_geo | Geometric Modern | Modern Interiors | 4×3 |

#### Wall Decor (~10 items)

| ID | Name | Source Pack | Size (cells) |
|----|------|-------------|--------------|
| wall_poster_simple | Simple Poster | LPC Interior | 1×2 |
| wall_art_abstract | Abstract Art | Modern Interiors | 2×2 |
| wall_clock_round | Round Clock | Kenney Furniture | 1×1 |
| wall_mirror_oval | Oval Mirror | Cozy Interior | 1×2 |
| wall_shelf_floating | Floating Shelf | Kenney Furniture | 2×1 |
| wall_autumn_wreath | Autumn Wreath | Seasonal Pack | 1×1 |
| wall_bat_garland | Bat Garland | Halloween Pack | 3×1 |
| wall_stockings | Holiday Stockings | Seasonal Pack | 2×1 |
| wall_photo_frame | Photo Frame | Cozy Interior | 1×1 |
| wall_tapestry | Wall Tapestry | Cozy Interior | 2×3 |

#### Surface Decor (~12 items)

| ID | Name | Source Pack | Size |
|----|------|-------------|------|
| surface_mug_coffee | Coffee Mug | Tiny Items | 1×1 |
| surface_mug_cocoa | Cocoa Mug | Tiny Items | 1×1 |
| surface_book_stack | Book Stack | Pixel Books | 1×1 |
| surface_book_open | Open Book | Pixel Books | 1×1 |
| surface_candle_small | Small Candle | Tiny Items | 1×1 |
| surface_plant_tiny | Tiny Plant | Tiny Items | 1×1 |
| surface_photo_frame | Photo Frame | Tiny Items | 1×1 |
| surface_skull_candle | Skull Candle | Halloween Pack | 1×1 |
| surface_potion_bottles | Potion Bottles | Halloween Pack | 1×1 |
| surface_snow_globe | Snow Globe | Seasonal Pack | 1×1 |
| surface_gingerbread | Gingerbread | Seasonal Pack | 1×1 |
| surface_lamp_small | Small Lamp | Tiny Items | 1×1 |

#### Outdoor (~12 items)

| ID | Name | Source Pack | Size (cells) |
|----|------|-------------|--------------|
| outdoor_bench_wooden | Wooden Bench | Kenney Tiny Town | 3×1 |
| outdoor_table_bistro | Bistro Table | Cozy Farm | 2×2 |
| outdoor_planter_large | Large Planter | Cozy Farm | 2×2 |
| outdoor_flower_bed | Flower Bed | Cozy Farm | 2×1 |
| outdoor_bird_bath | Bird Bath | Cozy Farm | 1×1 |
| outdoor_lantern_tall | Tall Lantern | Cozy Farm | 1×2 |
| outdoor_path_stones | Stone Path | Kenney Tiny Town | 1×1 |
| outdoor_hay_bale | Hay Bale | Seasonal Pack | 1×1 |
| outdoor_scarecrow | Scarecrow | Seasonal Pack | 1×2 |
| outdoor_tombstone | Tombstone | Halloween Pack | 1×1 |
| outdoor_ghost_sheet | Sheet Ghost | Halloween Pack | 1×1 |
| outdoor_snowman | Snowman | Seasonal Pack | 1×2 |
| outdoor_fire_pit | Fire Pit | Cozy Farm | 2×2 |
| outdoor_string_lights | Outdoor Lights | Seasonal Pack | 3×1 |

#### Finishes (~10 items)

| ID | Name | Source Pack | Type |
|----|------|-------------|------|
| wall_finish_cream | Cream Walls | Kenney House | wallpaper |
| wall_finish_sage | Sage Green | Kenney House | wallpaper |
| wall_finish_burnt_orange | Burnt Orange | Kenney House | wallpaper |
| wall_finish_navy | Navy Blue | Kenney House | wallpaper |
| wall_finish_white | Clean White | Kenney House | wallpaper |
| floor_finish_warm_wood | Warm Wood | Kenney House | flooring |
| floor_finish_light_wood | Light Wood | Kenney House | flooring |
| floor_finish_tile_white | White Tile | Kenney House | flooring |
| floor_finish_carpet_grey | Grey Carpet | LPC Interior | flooring |
| floor_finish_stone | Stone Floor | LPC Interior | flooring |

---

### 13. Phase 3 Size Budget

| Category | Item Count | Avg Size | Total |
|----------|------------|----------|-------|
| Furniture | 20 | 8KB | 160KB |
| Decor | 15 | 4KB | 60KB |
| Rugs | 8 | 6KB | 48KB |
| Wall Decor | 10 | 4KB | 40KB |
| Surface Decor | 12 | 2KB | 24KB |
| Outdoor | 14 | 5KB | 70KB |
| Finishes | 10 | 16KB | 160KB |
| Seasonal | 20 | 4KB | 80KB |
| Body Double | 1 | 8KB | 8KB |
| **Total** | **110** | — | **~650KB** |

Combined with Phase 2 assets (~800KB), total art budget: **~1.5MB** (well under 4MB limit).

---

### 14. Body Double Placeholder

For the focus timer's body-double feature:

**Sprite:** Character sitting at desk, simple animation (2-3 frames)
- Source: Kenney Tiny Dungeon (character sprites) or custom
- Manifest key: `bodydouble_placeholder`
- Size: ~32×32 pixels
- Will be replaced by avatar in Phase 4

---

### 15. Updated Credits (Phase 3)

Add to `public/assets/CREDITS.md`:

```markdown
## Phase 3 Additions

### Kenney Furniture Kit
- Author: Kenney (kenney.nl)
- License: CC0 1.0 Universal
- URL: https://kenney.nl/assets/furniture-kit
- Used for: Furniture items (sofas, chairs, beds, desks)

### Kenney House Kit
- Author: Kenney (kenney.nl)
- License: CC0 1.0 Universal
- URL: https://kenney.nl/assets/house-kit
- Used for: Wall and floor finishes

### Kenney Seasonal
- Author: Kenney (kenney.nl)
- License: CC0 1.0 Universal
- URL: https://kenney.nl/assets/seasonal
- Used for: Seasonal decorations (autumn, winter, holiday)

### Kenney Tiny Items
- Author: Kenney (kenney.nl)
- License: CC0 1.0 Universal
- URL: https://kenney.nl/assets/tiny-items
- Used for: Surface decor (mugs, books, candles)

### Cozy Farm Asset Pack
- Author: shubibubi
- License: Free for commercial use
- URL: https://shubibubi.itch.io/cozy-farm
- Used for: Outdoor items, plants

### Modern Interiors (Free Tier)
- Author: LimeZu
- License: Free tier - verify license for commercial use
- URL: https://limezu.itch.io/moderninteriors
- Used for: Modern furniture variants
```

---

## Phase 4: Avatar Character Assets

### 16. Character Pack Evaluation

This is the highest-risk asset decision in the project. Layered pixel-art character packs with consistent frames across many garments are rare.

#### Evaluation Criteria

| Criterion | Required | Ideal |
|-----------|----------|-------|
| Layer separation | Body, clothing, hair, accessories as separate sprites | Each slot separate |
| Pose: idle | Required (standing) | 2-4 frame animation |
| Pose: sit | Required | Static OK |
| Pose: reactions | At least 1 | 3 (cheer, nod, wave) |
| License | CC-BY-SA/GPL acceptable (personal app) | CC0 preferred |
| Scale | 16px grid compatible | 32px or 64px (will scale) |
| Garment count | ≥45 items across categories | 60+ |

#### Option A: LPC Universal (Recommended)

**Source:** [Universal LPC Spritesheet Character Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/)

**License:** CC-BY-SA 3.0 / GPL 3.0 (dual-licensed)
- Attribution required in Settings → About
- Share-alike: acceptable for personal app, would require releasing modifications under same license if distributed
- Full license text in `LICENSES/` folder

**Pros:**
- Extensive layered system: body, clothing (tops, bottoms, shoes), hair, accessories all separate
- Poses available: idle (animated), sit, walk, run, jump, climb, combat, emotes
- Large community with 100+ clothing options
- 6 skin tones, multiple hair colors (palette swappable)
- Active maintenance with modern web generator

**Cons:**
- 64x64 pixel characters (scale to 0.5× for 32px effective, matching 16px grid × 2)
- Requires front-facing frames only (discard other directions)
- Some clothing items may lack sit pose (fallback to idle)
- Attribution requirements

**Coverage Assessment:**

| Category | LPC Availability | Notes |
|----------|------------------|-------|
| Body/Skin | Excellent (6 tones) | Built into base system |
| Hair Styles | Excellent (20+) | Many free, can charge for premium |
| Tops | Excellent (30+) | Shirts, jackets, robes, dresses |
| Bottoms | Good (15+) | Pants, skirts, shorts |
| Shoes | Moderate (8+) | Boots, sandals, basic shoes |
| Accessories | Good (15+) | Glasses, hats, scarves, earrings |
| Reactions | Partial | Emotes exist but limited variety |

**Reaction Strategy:**
- `idle`: Full coverage (all items)
- `sit`: Good coverage (most items, fallback to idle for missing)
- `nod`: Use existing LPC emote frames
- `cheer`: May need custom or simplify to single frame
- `wave`: Removed per user decision

#### Option B: Kenney Modular Characters (Backup)

**Source:** [Kenney Modular Characters](https://lpc.opengameart.org/content/modular-character-pack)

**License:** CC0 (Public Domain)

**Pros:**
- No attribution required
- Consistent style with existing Kenney furniture
- Modular design with layering support

**Cons:**
- Limited poses (primarily standing)
- Fewer clothing options (~40 elements)
- May not have sit pose
- Style is more cartoon than pixel art

**Verdict:** Use as fallback for specific items if LPC lacks coverage.

#### Option C: itch.io Generators (Reference Only)

**Source:** [pixel duuuuudes maker](https://masterpose.itch.io/pixelduuuuudesmaker)

**License:** CC0 for output

**Cons:**
- Different art style
- Limited pose support
- Would look inconsistent with LPC

**Verdict:** Not recommended for primary use.

---

### 17. Recommended Approach

**Primary Source: LPC Universal**

1. Use [Universal LPC Spritesheet Character Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) to generate base sprites
2. Extract only front-facing ("down") frames for each pose
3. Scale to 0.5× for 32px effective height (fits 2-tile character on 16px grid)
4. Palette-swap skin/hair/eye colors at build time (not runtime)

**Pose Reduction (if needed):**

If a clothing item lacks a specific pose, fall back gracefully:

| Pose | Priority | Fallback |
|------|----------|----------|
| idle (stand) | Required | Never missing |
| sit | Required | Use idle frame (acceptable) |
| nod | Nice to have | Use idle frame |
| cheer | Nice to have | Use idle frame |

**Minimum viable:** idle + sit for all items. Reactions fall back to idle.

---

### 18. Avatar Asset Pipeline

#### Build Script: `scripts/build-avatar-atlas.ts`

```typescript
interface AvatarBuildConfig {
  sourceDir: string;           // Raw LPC layers
  outputDir: string;           // public/assets/avatar/
  skinPalette: string[];       // 6 skin tone hex colors
  hairPalette: string[];       // 8 hair color hex colors
  eyePalette: string[];        // 4 eye color hex colors
  targetSize: number;          // 32 (scaled from 64)
  poses: ('idle' | 'sit' | 'nod')[];
}

// Pipeline steps:
// 1. Read source layers (PNG files organized by category)
// 2. For each base layer (body, eyes):
//    - Apply palette swap for each color variant
//    - Generate variant files
// 3. For each clothing/accessory layer:
//    - Extract frames for required poses
//    - Scale to target size
//    - Generate sprite entries
// 4. Pack all into atlas with manifest
// 5. Generate CREDITS entries automatically
```

#### Directory Structure

```
kenney/lpc-character/
├── bodies/
│   ├── body_base.png          # Raw base body
│   └── body_sit.png           # Sitting pose
├── eyes/
│   └── eyes_base.png          # Base eyes (color-swappable)
├── hair/
│   ├── short_back.png
│   ├── short_front.png
│   ├── medium_back.png
│   └── ...
├── tops/
│   ├── tee_idle.png
│   ├── tee_sit.png
│   ├── sweater_idle.png
│   └── ...
├── bottoms/
│   ├── pants_idle.png
│   ├── pants_sit.png
│   └── ...
├── shoes/
│   └── ...
└── accessories/
    └── ...

public/assets/avatar/
├── atlas.png                  # Packed sprite atlas
├── atlas.json                 # Texture atlas metadata
└── manifest.json              # Avatar-specific manifest
```

#### Output Size Budget

| Component | Count | Frames | Size Each | Total |
|-----------|-------|--------|-----------|-------|
| Body variants | 6 | 6 (idle×4, sit×2) | 2KB | 72KB |
| Eye variants | 4 | 2 | 0.5KB | 4KB |
| Hair (free) | 3×8 colors | 4 | 1KB | 96KB |
| Hair (paid) | 8×8 colors | 4 | 1KB | 256KB |
| Tops | 12+3 starter | 6 | 2KB | 180KB |
| Bottoms | 8+3 starter | 6 | 1.5KB | 99KB |
| Shoes | 6+2 starter | 6 | 1KB | 48KB |
| Accessories | 8 | 4 | 1KB | 32KB |
| **Total** | — | — | — | **~787KB** |

Well under 3MB budget. Room for expansion.

---

### 19. Avatar Asset Mapping (Launch Content)

#### Free Hair Styles (3)

| ID | Name | LPC Source |
|----|------|------------|
| hair_short | Short Classic | LPC plain short |
| hair_medium | Medium Wavy | LPC shoulder length |
| hair_long | Long Straight | LPC long flowing |

#### Purchasable Hair Styles (8)

| ID | Name | Price | LPC Source |
|----|------|-------|------------|
| hair_pixie | Pixie Cut | 50 | LPC pixie |
| hair_curly | Curly | 60 | LPC curly |
| hair_ponytail | Ponytail | 55 | LPC ponytail |
| hair_braids | Braids | 75 | LPC braided |
| hair_bun | Bun | 65 | LPC bun |
| hair_mohawk | Mohawk | 80 | LPC mohawk |
| hair_shaved | Shaved Sides | 70 | LPC undercut |
| hair_wavy_long | Long Wavy | 100 | LPC long wavy |

#### Tops (12 + 3 starter variants)

| ID | Name | Price | Notes |
|----|------|-------|-------|
| top_sweater_cozy | Cozy Sweater | 90 | Knit texture |
| top_hoodie | Hoodie | 100 | hidesHair: true |
| top_jacket_denim | Denim Jacket | 120 | Layered look |
| top_blouse_floral | Floral Blouse | 80 | Pattern |
| top_tshirt_graphic | Graphic Tee | 70 | Varies |
| top_cardigan | Cardigan | 85 | Open front |
| top_tank | Tank Top | 60 | Simple |
| top_dress_casual | Casual Dress | 140 | Full body |
| top_flannel | Flannel Shirt | 95 | Plaid |
| top_crop | Crop Top | 65 | Short cut |
| top_turtleneck | Turtleneck | 80 | High neck |
| top_coat_winter | Winter Coat | 130 | Seasonal |

#### Bottoms (8 + 3 starter variants)

| ID | Name | Price | Notes |
|----|------|-------|-------|
| bottom_jeans_dark | Dark Jeans | 80 | Classic |
| bottom_shorts | Shorts | 60 | Casual |
| bottom_skirt_mini | Mini Skirt | 70 | — |
| bottom_skirt_long | Long Skirt | 85 | Flowing |
| bottom_joggers | Joggers | 75 | Comfy |
| bottom_leggings | Leggings | 65 | Athletic |
| bottom_cargo | Cargo Pants | 90 | Pockets |
| bottom_overalls | Overalls | 120 | Full piece |

#### Shoes (6 + 2 starter variants)

| ID | Name | Price | Notes |
|----|------|-------|-------|
| shoes_boots_ankle | Ankle Boots | 70 | — |
| shoes_sandals | Sandals | 40 | Summer |
| shoes_loafers | Loafers | 60 | Classic |
| shoes_boots_hiking | Hiking Boots | 90 | Outdoor |
| shoes_slippers | Slippers | 45 | Cozy |
| shoes_heels | Heels | 75 | Dressy |

#### Accessories (8)

| ID | Name | Price | Notes |
|----|------|-------|-------|
| acc_glasses_round | Round Glasses | 35 | — |
| acc_glasses_square | Square Glasses | 35 | — |
| acc_sunglasses | Sunglasses | 45 | — |
| acc_beanie | Beanie | 50 | — |
| acc_cap | Baseball Cap | 55 | — |
| acc_scarf | Scarf | 40 | — |
| acc_earrings | Earrings | 30 | Subtle |
| acc_headband | Headband | 40 | — |

#### Seasonal Wearables (3+)

| ID | Name | Price | Season |
|----|------|-------|--------|
| top_sweater_holiday | Holiday Sweater | 100 | Winter |
| acc_witch_hat | Witch Hat | 80 | Autumn |
| acc_bunny_ears | Bunny Ears | 60 | Spring |

**Total wearables:** 3 free hair + 8 paid hair + 15 tops + 11 bottoms + 8 shoes + 8 accessories + 3 seasonal = **56 items** (exceeds 45 target)

---

### 20. Phase 4 Credits

Add to `public/assets/CREDITS.md`:

```markdown
## Phase 4 Additions

### Liberated Pixel Cup Character Assets
- Authors: Various contributors to the Liberated Pixel Cup
- License: CC-BY-SA 3.0 / GPL 3.0 (dual-licensed)
- URL: https://lpc.opengameart.org/
- Generator: https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/
- Used for: Avatar body, clothing, hair, and accessories

Full license text available in LICENSES/CC-BY-SA-3.0.txt and LICENSES/GPL-3.0.txt

Individual asset contributors are credited in the generator's built-in attribution system.
```

### 21. License Files

Create `LICENSES/` directory with:
- `CC-BY-SA-3.0.txt` - Full Creative Commons Attribution-ShareAlike 3.0 text
- `GPL-3.0.txt` - Full GNU General Public License 3.0 text

Attribution also appears in Settings → About screen.
