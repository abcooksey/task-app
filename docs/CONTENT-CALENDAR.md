# Content Calendar

Weekly rotation and seasonal drops for Phase 3 launch (September–December 2026).

---

## 1. Overview

The store refreshes every Monday at 4am local time with 8 new rotation items. Seasonal windows add themed items during specific date ranges. This calendar covers the first 8 weeks after Phase 3 launch.

---

## 2. Rotation Pools

Items are grouped into pools for balanced rotation:

| Pool | Description | Item Count |
|------|-------------|------------|
| `core` | Essential furniture and decor | ~25 items |
| `cozy` | Warm, comfortable items (blankets, cushions, warm lighting) | ~12 items |
| `plants` | Indoor and outdoor greenery | ~10 items |
| `modern` | Clean, minimal design | ~8 items |
| `vintage` | Retro and antique style | ~8 items |
| `outdoor` | Yard and garden items | ~10 items |

Each week's rotation draws from multiple pools to ensure variety.

---

## 3. Seasonal Windows

Stored in `src/game/content/calendar.json`:

```json
{
  "seasonal": [
    {
      "id": "autumn_2026",
      "name": "Autumn Collection",
      "from": "09-01",
      "to": "10-15",
      "items": [
        "rug_autumn_leaves",
        "decor_pumpkin_small",
        "decor_pumpkin_large",
        "wall_autumn_wreath",
        "outdoor_hay_bale",
        "outdoor_scarecrow",
        "floor_finish_warm_wood",
        "wall_finish_burnt_orange"
      ]
    },
    {
      "id": "halloween_2026",
      "name": "Spooky Season",
      "from": "10-15",
      "to": "11-01",
      "items": [
        "decor_jack_o_lantern",
        "decor_candelabra",
        "wall_bat_garland",
        "outdoor_tombstone",
        "outdoor_ghost_sheet",
        "rug_spiderweb",
        "surface_skull_candle",
        "surface_potion_bottles"
      ]
    },
    {
      "id": "cozy_november_2026",
      "name": "Cozy Season",
      "from": "11-01",
      "to": "11-30",
      "items": [
        "furniture_armchair_plush",
        "decor_blanket_knit",
        "decor_hot_cocoa_station",
        "rug_sheepskin",
        "wall_finish_cream",
        "surface_mug_cocoa",
        "surface_book_stack",
        "outdoor_fire_pit"
      ]
    },
    {
      "id": "winter_holidays_2026",
      "name": "Winter Holidays",
      "from": "12-01",
      "to": "12-31",
      "items": [
        "furniture_tree_holiday",
        "decor_string_lights",
        "decor_wreath_door",
        "wall_stockings",
        "outdoor_snowman",
        "outdoor_lights_path",
        "rug_winter_pattern",
        "surface_snow_globe",
        "surface_gingerbread"
      ]
    }
  ]
}
```

---

## 4. Event Weeks

Two special weeks where the normal rotation is replaced with a themed pool:

### Week 3 (Sept 21–27): "Cozy Reading Nook"
All 8 rotation items are reading/relaxation themed:
- `furniture_bookshelf_tall`
- `furniture_reading_chair`
- `decor_floor_lamp_arc`
- `rug_circular_soft`
- `surface_book_open`
- `surface_coffee_mug`
- `wall_art_abstract`
- `decor_plant_monstera`

### Week 7 (Oct 19–25): "Outdoor Living"
All 8 rotation items are outdoor/garden themed:
- `outdoor_bench_wooden`
- `outdoor_table_bistro`
- `outdoor_planter_large`
- `outdoor_string_lights`
- `outdoor_bird_bath`
- `outdoor_lantern_tall`
- `outdoor_path_stones`
- `outdoor_flower_bed`

---

## 5. Weekly Schedule

| Week | Dates | Theme | Guaranteed Items | Seasonal Active |
|------|-------|-------|------------------|-----------------|
| 1 | Sept 7–13 | Launch Week | 2 furniture, 2 decor, 1 wall, 1 rug, 1 outdoor, 1 surface | Autumn |
| 2 | Sept 14–20 | Greenery Focus | 1 furniture, 2 decor (plants), 1 wall, 1 rug, 2 outdoor, 1 surface | Autumn |
| 3 | Sept 21–27 | **Event: Cozy Reading** | (See Event Week above) | Autumn |
| 4 | Sept 28–Oct 4 | Modern Mix | 2 furniture, 2 decor, 1 wall, 1 rug, 1 outdoor, 1 surface | Autumn |
| 5 | Oct 5–11 | Vintage Vibes | 1 furniture, 3 decor, 1 wall, 1 rug, 1 outdoor, 1 surface | Autumn |
| 6 | Oct 12–18 | Cozy Transition | 1 furniture, 2 decor, 1 wall, 1 rug, 2 outdoor, 1 surface | Autumn → Halloween |
| 7 | Oct 19–25 | **Event: Outdoor Living** | (See Event Week above) | Halloween |
| 8 | Oct 26–Nov 1 | Spooky Finale | 2 furniture, 2 decor, 1 wall, 1 rug, 1 outdoor, 1 surface | Halloween |

---

## 6. Rotation Item Coverage

Every rotation item must appear at least once in any 10-week window. The deterministic rotation algorithm ensures this through its exclusion of previous week's items.

**Test requirement:**
```typescript
function testRotationCoverage(catalog: CatalogItem[]): void {
  const rotationItems = catalog.filter(i => i.availability.kind === 'rotation');
  const appearances = new Map<string, number>();

  // Simulate 10 weeks
  let previousWeek: string[] = [];
  for (let week = 1; week <= 10; week++) {
    const thisWeek = rotation(week, 2026, catalog, config, previousWeek);
    for (const itemId of thisWeek) {
      appearances.set(itemId, (appearances.get(itemId) || 0) + 1);
    }
    previousWeek = thisWeek;
  }

  // Every rotation item should appear at least once
  for (const item of rotationItems) {
    expect(appearances.get(item.id)).toBeGreaterThanOrEqual(1);
  }
}
```

---

## 7. Mystery Box Pool by Season

The mystery box pool changes slightly with seasons to include seasonal items:

| Season | Pool Additions |
|--------|----------------|
| Autumn (Sept 1 – Oct 15) | +3 autumn items (pumpkins, wreath, hay bale) |
| Halloween (Oct 15 – Nov 1) | +4 spooky items (jack-o-lantern, bat garland, ghost, tombstone) |
| Cozy (Nov 1 – Nov 30) | +3 cozy items (blanket, cocoa station, fire pit) |
| Winter (Dec 1 – Dec 31) | +4 holiday items (string lights, wreath, snowman, snow globe) |

Seasonal items in the mystery box are always `rarity: 'uncommon'` or higher, making them slightly special finds.

---

## 8. Store Section Order During Seasons

When a seasonal window is active, the store shows:

1. **Seasonal** (the current collection) — appears first, highlighted
2. **New this week** (8 rotation items)
3. **Mystery box**
4. **Always available**

When no seasonal window is active (rare gaps), section order is:

1. **New this week**
2. **Mystery box**
3. **Always available**

---

## 9. Today Screen Integration

The "Next up" card on Today shows one of these states:

| Condition | Card Content |
|-----------|--------------|
| Repairs remain | Repair nudge (existing Phase 2 behavior) |
| All repairs done, Monday | "Store refreshed · 8 new items" + thumbnail |
| All repairs done, not Monday | "Store · X new items this week" (smaller, less prominent) |
| Seasonal just started | "New: [Season Name] · X items" + thumbnail |

**Priority order:** Seasonal announcement > Monday refresh > Weekly reminder

**Never show:** Two nudges at once, or any nudge when repairs remain.

---

## 10. Content Refresh Cadence

| Refresh Type | Frequency | Mechanism |
|--------------|-----------|-----------|
| Weekly rotation | Every Monday 4am | Deterministic from ISO week |
| Seasonal window | Date-based | Inclusive range check |
| Mystery box | Daily 4am | Server-side `mystery_openings` table |
| Event weeks | Manual | Configured in calendar.json |

---

## 11. Future Content (Post-Launch)

After the initial 8 weeks, content additions follow this pattern:

- **Monthly:** 4–6 new rotation items added to pools
- **Quarterly:** New seasonal window (Spring, Summer, etc.)
- **Bi-annually:** New event week themes

All additions require only:
1. Add items to `catalog.json`
2. Add sprites to manifest
3. Run seed script
4. Update `calendar.json` for seasonal/event windows
