import { describe, it, expect } from 'vitest'
import { validate, type ItemLookup } from './validate'
import type {
  RoomDefinition,
  ItemDefinition,
  Placement,
  Category,
  PlacementType,
} from './types'

// =============================================================================
// Test Fixtures
// =============================================================================

const testRoom: RoomDefinition = {
  id: 'test',
  name: 'Test Room',
  canvasSize: { width: 320, height: 320 },
  regions: {
    floor: {
      id: 'floor',
      name: 'Floor',
      x: 0,
      y: 0,
      width: 160,
      height: 160,
      gridWidth: 10,
      gridHeight: 10,
      allowedCategories: ['furniture', 'decor', 'rug'],
    },
    wall: {
      id: 'wall',
      name: 'Wall',
      x: 0,
      y: 0,
      width: 160,
      height: 80,
      gridWidth: 10,
      gridHeight: 5,
      allowedCategories: ['wall_decor'],
    },
    yard: {
      id: 'yard',
      name: 'Yard',
      x: 0,
      y: 0,
      width: 160,
      height: 32,
      gridWidth: 10,
      gridHeight: 2,
      allowedCategories: ['outdoor'],
    },
  },
}

function makeItem(
  id: string,
  placement: PlacementType,
  category: Category,
  footprint = { w: 2, h: 2 },
  extra: Partial<ItemDefinition> = {}
): ItemDefinition {
  return {
    id,
    name: id,
    category,
    placement,
    footprint,
    ...extra,
  }
}

function makePlacement(
  id: string,
  itemId: string,
  region: 'floor' | 'wall' | 'yard',
  x: number,
  y: number,
  extra: Partial<Placement> = {}
): Placement {
  return {
    id,
    inventoryId: `inv_${id}`,
    itemId,
    region,
    x,
    y,
    flipped: false,
    ...extra,
  }
}

// Item definitions for tests
const items: Record<string, ItemDefinition> = {
  sofa: makeItem('sofa', 'floor', 'furniture', { w: 3, h: 2 }),
  chair: makeItem('chair', 'floor', 'furniture', { w: 2, h: 2 }),
  plant: makeItem('plant', 'floor', 'decor', { w: 1, h: 1 }),
  lamp: makeItem('lamp', 'floor', 'decor', { w: 1, h: 2 }),
  rug_small: makeItem('rug_small', 'rug', 'rug', { w: 3, h: 3 }),
  rug_large: makeItem('rug_large', 'rug', 'rug', { w: 5, h: 4 }),
  poster: makeItem('poster', 'wall', 'wall_decor', { w: 2, h: 3 }),
  mirror: makeItem('mirror', 'wall', 'wall_decor', { w: 1, h: 2 }),
  bench: makeItem('bench', 'outdoor', 'outdoor', { w: 3, h: 1 }),
  planter: makeItem('planter', 'outdoor', 'outdoor', { w: 2, h: 1 }),
  mug: makeItem('mug', 'surface', 'surface_decor', { w: 1, h: 1 }),
  book: makeItem('book', 'surface', 'surface_decor', { w: 1, h: 1 }),
  table: makeItem('table', 'floor', 'furniture', { w: 2, h: 2 }, {
    isSurface: true,
    slots: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  }),
  desk: makeItem('desk', 'floor', 'furniture', { w: 3, h: 2 }, {
    isSurface: true,
    slots: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
  }),
  wall_finish_blue: makeItem('wall_finish_blue', 'wall_finish', 'wall_finish'),
  floor_finish_wood: makeItem('floor_finish_wood', 'floor_finish', 'floor_finish'),
  hat: makeItem('hat', 'wearable', 'accessory'),
  huge_sofa: makeItem('huge_sofa', 'floor', 'furniture', { w: 12, h: 12 }),
}

const getItem: ItemLookup = (id: string) => items[id]

// =============================================================================
// Tests: Placement Type × In-Region / Out-of-Region
// =============================================================================

describe('Placement Validator', () => {
  describe('Floor items', () => {
    it('allows floor item in floor region within bounds', () => {
      const result = validate(
        testRoom,
        items.chair,
        [],
        { itemId: 'chair', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('allows floor item at edge of floor region', () => {
      const result = validate(
        testRoom,
        items.chair,
        [],
        { itemId: 'chair', region: 'floor', x: 8, y: 8, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('rejects floor item extending outside floor region (right)', () => {
      const result = validate(
        testRoom,
        items.chair,
        [],
        { itemId: 'chair', region: 'floor', x: 9, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'out_of_region' })
    })

    it('rejects floor item extending outside floor region (bottom)', () => {
      const result = validate(
        testRoom,
        items.chair,
        [],
        { itemId: 'chair', region: 'floor', x: 0, y: 9, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'out_of_region' })
    })

    it('rejects floor item with negative coordinates', () => {
      const result = validate(
        testRoom,
        items.chair,
        [],
        { itemId: 'chair', region: 'floor', x: -1, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'out_of_region' })
    })
  })

  describe('Rug items', () => {
    it('allows rug in floor region within bounds', () => {
      const result = validate(
        testRoom,
        items.rug_small,
        [],
        { itemId: 'rug_small', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('rejects rug extending outside floor region', () => {
      const result = validate(
        testRoom,
        items.rug_small,
        [],
        { itemId: 'rug_small', region: 'floor', x: 8, y: 8, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'out_of_region' })
    })
  })

  describe('Wall items', () => {
    it('allows wall item in wall region within bounds', () => {
      const result = validate(
        testRoom,
        items.poster,
        [],
        { itemId: 'poster', region: 'wall', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('rejects wall item extending outside wall region', () => {
      const result = validate(
        testRoom,
        items.poster,
        [],
        { itemId: 'poster', region: 'wall', x: 9, y: 3, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'out_of_region' })
    })
  })

  describe('Outdoor items', () => {
    it('allows outdoor item in yard region within bounds', () => {
      const result = validate(
        testRoom,
        items.bench,
        [],
        { itemId: 'bench', region: 'yard', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('rejects outdoor item extending outside yard region', () => {
      const result = validate(
        testRoom,
        items.bench,
        [],
        { itemId: 'bench', region: 'yard', x: 8, y: 1, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'out_of_region' })
    })
  })

  // =============================================================================
  // Tests: Wrong Region
  // =============================================================================

  describe('Wrong region validation', () => {
    it('rejects wall item on floor region', () => {
      const result = validate(
        testRoom,
        items.poster,
        [],
        { itemId: 'poster', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'wrong_region' })
    })

    it('rejects floor item on wall region', () => {
      const result = validate(
        testRoom,
        items.chair,
        [],
        { itemId: 'chair', region: 'wall', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'wrong_region' })
    })

    it('rejects outdoor item on floor region (interior)', () => {
      const result = validate(
        testRoom,
        items.bench,
        [],
        { itemId: 'bench', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'wrong_region' })
    })

    it('rejects floor item on yard region', () => {
      const result = validate(
        testRoom,
        items.chair,
        [],
        { itemId: 'chair', region: 'yard', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'wrong_region' })
    })

    it('rejects rug on wall region', () => {
      const result = validate(
        testRoom,
        items.rug_small,
        [],
        { itemId: 'rug_small', region: 'wall', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'wrong_region' })
    })

    it('rejects wall item on yard region', () => {
      const result = validate(
        testRoom,
        items.poster,
        [],
        { itemId: 'poster', region: 'yard', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'wrong_region' })
    })
  })

  // =============================================================================
  // Tests: Overlap Rules
  // =============================================================================

  describe('Overlap validation', () => {
    it('blocks floor item overlapping another floor item', () => {
      const existingPlacements: Placement[] = [
        makePlacement('p1', 'sofa', 'floor', 0, 0),
      ]
      const result = validate(
        testRoom,
        items.chair,
        existingPlacements,
        { itemId: 'chair', region: 'floor', x: 1, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'overlaps' })
    })

    it('allows floor items that do not overlap', () => {
      const existingPlacements: Placement[] = [
        makePlacement('p1', 'sofa', 'floor', 0, 0),
      ]
      const result = validate(
        testRoom,
        items.chair,
        existingPlacements,
        { itemId: 'chair', region: 'floor', x: 5, y: 5, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('allows floor items touching but not overlapping', () => {
      const existingPlacements: Placement[] = [
        makePlacement('p1', 'sofa', 'floor', 0, 0), // 3x2 at (0,0) ends at (3,2)
      ]
      const result = validate(
        testRoom,
        items.chair,
        existingPlacements,
        { itemId: 'chair', region: 'floor', x: 3, y: 0, flipped: false }, // 2x2 at (3,0)
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('allows rug overlapping floor item (rug goes under)', () => {
      const existingPlacements: Placement[] = [
        makePlacement('p1', 'sofa', 'floor', 2, 2),
      ]
      const result = validate(
        testRoom,
        items.rug_small,
        existingPlacements,
        { itemId: 'rug_small', region: 'floor', x: 1, y: 1, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('allows rug overlapping another rug', () => {
      const existingPlacements: Placement[] = [
        makePlacement('p1', 'rug_large', 'floor', 0, 0),
      ]
      const result = validate(
        testRoom,
        items.rug_small,
        existingPlacements,
        { itemId: 'rug_small', region: 'floor', x: 1, y: 1, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('allows floor item overlapping rug (item goes on top)', () => {
      const existingPlacements: Placement[] = [
        makePlacement('p1', 'rug_large', 'floor', 0, 0),
      ]
      const result = validate(
        testRoom,
        items.chair,
        existingPlacements,
        { itemId: 'chair', region: 'floor', x: 1, y: 1, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('blocks wall item overlapping another wall item', () => {
      const existingPlacements: Placement[] = [
        makePlacement('p1', 'poster', 'wall', 0, 0),
      ]
      const result = validate(
        testRoom,
        items.mirror,
        existingPlacements,
        { itemId: 'mirror', region: 'wall', x: 1, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'overlaps' })
    })

    it('allows wall items that do not overlap', () => {
      const existingPlacements: Placement[] = [
        makePlacement('p1', 'poster', 'wall', 0, 0),
      ]
      const result = validate(
        testRoom,
        items.mirror,
        existingPlacements,
        { itemId: 'mirror', region: 'wall', x: 5, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('blocks outdoor item overlapping another outdoor item', () => {
      const existingPlacements: Placement[] = [
        makePlacement('p1', 'bench', 'yard', 0, 0),
      ]
      const result = validate(
        testRoom,
        items.planter,
        existingPlacements,
        { itemId: 'planter', region: 'yard', x: 1, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'overlaps' })
    })
  })

  // =============================================================================
  // Tests: Surface Decor
  // =============================================================================

  describe('Surface decor validation', () => {
    it('allows surface decor on valid slot', () => {
      const existingPlacements: Placement[] = [
        makePlacement('table1', 'table', 'floor', 2, 2),
      ]
      const result = validate(
        testRoom,
        items.mug,
        existingPlacements,
        {
          itemId: 'mug',
          region: 'floor',
          x: 0,
          y: 0,
          flipped: false,
          parentPlacementId: 'table1',
          slotIndex: 0,
        },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('allows surface decor on second slot', () => {
      const existingPlacements: Placement[] = [
        makePlacement('table1', 'table', 'floor', 2, 2),
      ]
      const result = validate(
        testRoom,
        items.book,
        existingPlacements,
        {
          itemId: 'book',
          region: 'floor',
          x: 0,
          y: 0,
          flipped: false,
          parentPlacementId: 'table1',
          slotIndex: 1,
        },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('blocks surface decor on occupied slot', () => {
      const existingPlacements: Placement[] = [
        makePlacement('table1', 'table', 'floor', 2, 2),
        makePlacement('mug1', 'mug', 'floor', 0, 0, {
          parentPlacementId: 'table1',
          slotIndex: 0,
        }),
      ]
      const result = validate(
        testRoom,
        items.book,
        existingPlacements,
        {
          itemId: 'book',
          region: 'floor',
          x: 0,
          y: 0,
          flipped: false,
          parentPlacementId: 'table1',
          slotIndex: 0,
        },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'slot_occupied' })
    })

    it('blocks surface decor on non-surface item', () => {
      const existingPlacements: Placement[] = [
        makePlacement('chair1', 'chair', 'floor', 2, 2),
      ]
      const result = validate(
        testRoom,
        items.mug,
        existingPlacements,
        {
          itemId: 'mug',
          region: 'floor',
          x: 0,
          y: 0,
          flipped: false,
          parentPlacementId: 'chair1',
          slotIndex: 0,
        },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'no_free_slot' })
    })

    it('blocks surface decor with invalid slot index', () => {
      const existingPlacements: Placement[] = [
        makePlacement('table1', 'table', 'floor', 2, 2), // table has 2 slots
      ]
      const result = validate(
        testRoom,
        items.mug,
        existingPlacements,
        {
          itemId: 'mug',
          region: 'floor',
          x: 0,
          y: 0,
          flipped: false,
          parentPlacementId: 'table1',
          slotIndex: 5, // Invalid - table only has slots 0 and 1
        },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'no_free_slot' })
    })

    it('blocks surface decor without parent', () => {
      const result = validate(
        testRoom,
        items.mug,
        [],
        {
          itemId: 'mug',
          region: 'floor',
          x: 0,
          y: 0,
          flipped: false,
          // No parentPlacementId
        },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'no_free_slot' })
    })

    it('blocks surface decor with non-existent parent', () => {
      const result = validate(
        testRoom,
        items.mug,
        [],
        {
          itemId: 'mug',
          region: 'floor',
          x: 0,
          y: 0,
          flipped: false,
          parentPlacementId: 'nonexistent',
          slotIndex: 0,
        },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'no_free_slot' })
    })
  })

  // =============================================================================
  // Tests: Move Operation (excludeId)
  // =============================================================================

  describe('Move operation (excludeId)', () => {
    it('allows moving item to different position without self-conflict', () => {
      const existingPlacements: Placement[] = [
        makePlacement('chair1', 'chair', 'floor', 0, 0),
      ]
      const result = validate(
        testRoom,
        items.chair,
        existingPlacements,
        { itemId: 'chair', region: 'floor', x: 3, y: 3, flipped: false },
        getItem,
        'chair1' // Exclude self
      )
      expect(result).toEqual({ ok: true })
    })

    it('allows moving item slightly - overlaps old position', () => {
      const existingPlacements: Placement[] = [
        makePlacement('chair1', 'chair', 'floor', 0, 0), // 2x2
      ]
      const result = validate(
        testRoom,
        items.chair,
        existingPlacements,
        { itemId: 'chair', region: 'floor', x: 1, y: 1, flipped: false },
        getItem,
        'chair1' // Exclude self
      )
      expect(result).toEqual({ ok: true })
    })

    it('still blocks if move overlaps a different item', () => {
      const existingPlacements: Placement[] = [
        makePlacement('chair1', 'chair', 'floor', 0, 0),
        makePlacement('sofa1', 'sofa', 'floor', 4, 4),
      ]
      const result = validate(
        testRoom,
        items.chair,
        existingPlacements,
        { itemId: 'chair', region: 'floor', x: 3, y: 4, flipped: false },
        getItem,
        'chair1' // Exclude self
      )
      expect(result).toEqual({ ok: false, reason: 'overlaps' })
    })

    it('allows moving surface decor to different slot, excluding self', () => {
      const existingPlacements: Placement[] = [
        makePlacement('desk1', 'desk', 'floor', 2, 2),
        makePlacement('mug1', 'mug', 'floor', 0, 0, {
          parentPlacementId: 'desk1',
          slotIndex: 0,
        }),
      ]
      const result = validate(
        testRoom,
        items.mug,
        existingPlacements,
        {
          itemId: 'mug',
          region: 'floor',
          x: 0,
          y: 0,
          flipped: false,
          parentPlacementId: 'desk1',
          slotIndex: 1, // Move to different slot
        },
        getItem,
        'mug1' // Exclude self
      )
      expect(result).toEqual({ ok: true })
    })

    it('blocks moving surface decor to occupied slot (different item)', () => {
      const existingPlacements: Placement[] = [
        makePlacement('desk1', 'desk', 'floor', 2, 2),
        makePlacement('mug1', 'mug', 'floor', 0, 0, {
          parentPlacementId: 'desk1',
          slotIndex: 0,
        }),
        makePlacement('book1', 'book', 'floor', 0, 0, {
          parentPlacementId: 'desk1',
          slotIndex: 1,
        }),
      ]
      const result = validate(
        testRoom,
        items.mug,
        existingPlacements,
        {
          itemId: 'mug',
          region: 'floor',
          x: 0,
          y: 0,
          flipped: false,
          parentPlacementId: 'desk1',
          slotIndex: 1, // Already occupied by book1
        },
        getItem,
        'mug1' // Exclude self
      )
      expect(result).toEqual({ ok: false, reason: 'slot_occupied' })
    })
  })

  // =============================================================================
  // Tests: Finishes
  // =============================================================================

  describe('Finish items', () => {
    it('allows wall finish (no grid validation)', () => {
      const result = validate(
        testRoom,
        items.wall_finish_blue,
        [],
        { itemId: 'wall_finish_blue', region: 'wall', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('allows floor finish (no grid validation)', () => {
      const result = validate(
        testRoom,
        items.floor_finish_wood,
        [],
        { itemId: 'floor_finish_wood', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('allows finish even with arbitrary coordinates', () => {
      const result = validate(
        testRoom,
        items.wall_finish_blue,
        [],
        { itemId: 'wall_finish_blue', region: 'floor', x: 999, y: 999, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })
  })

  // =============================================================================
  // Tests: Wearable Items
  // =============================================================================

  describe('Wearable items', () => {
    it('rejects wearable items with not_placeable', () => {
      const result = validate(
        testRoom,
        items.hat,
        [],
        { itemId: 'hat', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'not_placeable' })
    })

    it('rejects wearable even on wall region', () => {
      const result = validate(
        testRoom,
        items.hat,
        [],
        { itemId: 'hat', region: 'wall', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'not_placeable' })
    })
  })

  // =============================================================================
  // Tests: Edge Cases
  // =============================================================================

  describe('Edge cases', () => {
    it('handles item exactly filling region', () => {
      const bigRoom: RoomDefinition = {
        ...testRoom,
        regions: {
          ...testRoom.regions,
          floor: {
            id: 'floor',
            name: 'Floor',
            x: 0,
            y: 0,
            width: 32,
            height: 32,
            gridWidth: 2,
            gridHeight: 2,
            allowedCategories: ['furniture'],
          },
        },
      }
      const result = validate(
        bigRoom,
        items.chair, // 2x2
        [],
        { itemId: 'chair', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('rejects item larger than region', () => {
      const result = validate(
        testRoom,
        items.huge_sofa, // 12x12, region is 10x10
        [],
        { itemId: 'huge_sofa', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: false, reason: 'out_of_region' })
    })

    it('handles empty existing placements', () => {
      const result = validate(
        testRoom,
        items.chair,
        [],
        { itemId: 'chair', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('handles 1x1 items', () => {
      const result = validate(
        testRoom,
        items.plant,
        [],
        { itemId: 'plant', region: 'floor', x: 9, y: 9, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })

    it('surface decor does not block floor items', () => {
      const existingPlacements: Placement[] = [
        makePlacement('table1', 'table', 'floor', 2, 2),
        makePlacement('mug1', 'mug', 'floor', 0, 0, {
          parentPlacementId: 'table1',
          slotIndex: 0,
        }),
      ]
      // Try placing chair where the mug's x,y coords are
      // This should work because surface decor doesn't take grid space
      const result = validate(
        testRoom,
        items.chair,
        existingPlacements,
        { itemId: 'chair', region: 'floor', x: 0, y: 0, flipped: false },
        getItem
      )
      expect(result).toEqual({ ok: true })
    })
  })
})
