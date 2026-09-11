import { z } from 'zod'

// =============================================================================
// Placement Types
// =============================================================================

export const placementTypeSchema = z.enum([
  'floor',
  'rug',
  'wall',
  'surface',
  'outdoor',
  'wall_finish',
  'floor_finish',
  'wearable',
])
export type PlacementType = z.infer<typeof placementTypeSchema>

export const categorySchema = z.enum([
  'furniture',
  'decor',
  'rug',
  'wall_decor',
  'surface_decor',
  'outdoor',
  'wall_finish',
  'floor_finish',
  'clothing_top',
  'clothing_bottom',
  'clothing_shoes',
  'hair',
  'accessory',
])
export type Category = z.infer<typeof categorySchema>

export const regionIdSchema = z.enum(['floor', 'wall', 'yard'])
export type RegionId = z.infer<typeof regionIdSchema>

// =============================================================================
// Room and Region Definitions
// =============================================================================

export interface RegionDefinition {
  id: RegionId
  name: string
  x: number
  y: number
  width: number
  height: number
  gridWidth: number
  gridHeight: number
  allowedCategories: string[]
}

export interface RoomDefinition {
  id: string
  name: string
  canvasSize: { width: number; height: number }
  regions: Partial<Record<RegionId, RegionDefinition>>
}

// =============================================================================
// Item Definitions
// =============================================================================

export interface Footprint {
  w: number
  h: number
}

export interface SlotPosition {
  x: number
  y: number
}

export interface ItemDefinition {
  id: string
  name: string
  category: Category
  placement: PlacementType
  footprint: Footprint
  isSurface?: boolean
  slots?: SlotPosition[]
}

// =============================================================================
// Placements
// =============================================================================

export interface Placement {
  id: string
  inventoryId: string
  itemId: string
  region: RegionId
  x: number
  y: number
  flipped: boolean
  parentPlacementId?: string
  slotIndex?: number
}

export interface ProposedPlacement {
  itemId: string
  region: RegionId
  x: number
  y: number
  flipped: boolean
  parentPlacementId?: string
  slotIndex?: number
}

// =============================================================================
// Validation Results
// =============================================================================

export const validationReasonSchema = z.enum([
  'out_of_region',
  'overlaps',
  'wrong_region',
  'no_free_slot',
  'slot_occupied',
  'not_placeable',
])
export type ValidationReason = z.infer<typeof validationReasonSchema>

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: ValidationReason }

// =============================================================================
// Catalog Types (for context)
// =============================================================================

export type Rarity = 'common' | 'uncommon' | 'rare'

export type Availability =
  | { kind: 'always' }
  | { kind: 'rotation'; pool: string }
  | { kind: 'seasonal'; from: string; to: string }
  | { kind: 'starter' }

export interface CatalogItem {
  id: string
  name: string
  blurb: string
  category: Category
  placement: PlacementType
  tags: string[]
  price: number
  rarity: Rarity
  footprint: Footprint
  isSurface?: boolean
  slots?: SlotPosition[]
  allowMultiple?: boolean
  textureKey: string
  flippedTextureKey?: string
  availability: Availability
}
