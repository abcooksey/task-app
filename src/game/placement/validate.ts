import type {
  RoomDefinition,
  ItemDefinition,
  Placement,
  ProposedPlacement,
  ValidationResult,
  RegionId,
  PlacementType,
  Footprint,
} from './types'

/**
 * Item definition lookup function type.
 * The validator needs to look up item definitions for existing placements.
 */
export type ItemLookup = (itemId: string) => ItemDefinition | undefined

/**
 * Validate a proposed placement against existing placements and room constraints.
 *
 * @param roomDef - The room definition with regions
 * @param itemDef - The item being placed
 * @param existingPlacements - Current placements in the room
 * @param proposed - The proposed new placement
 * @param getItem - Function to look up item definitions by ID
 * @param excludePlacementId - Optional placement ID to exclude (for move operations)
 * @returns ValidationResult indicating if placement is valid
 */
export function validate(
  roomDef: RoomDefinition,
  itemDef: ItemDefinition,
  existingPlacements: Placement[],
  proposed: ProposedPlacement,
  getItem: ItemLookup,
  excludePlacementId?: string
): ValidationResult {
  // 1. Wearable items cannot be placed
  if (itemDef.placement === 'wearable') {
    return { ok: false, reason: 'not_placeable' }
  }

  // 2. Finishes don't use grid validation
  if (itemDef.placement === 'wall_finish' || itemDef.placement === 'floor_finish') {
    return { ok: true }
  }

  // 3. Surface decor has special validation (check before region validation)
  // This ensures we get the right error message when parent is missing
  if (itemDef.placement === 'surface') {
    return validateSurfacePlacement(
      existingPlacements,
      proposed,
      getItem,
      excludePlacementId
    )
  }

  // 4. Determine expected region from placement type
  const expectedRegion = getExpectedRegion(itemDef.placement, proposed, existingPlacements)
  if (expectedRegion === null) {
    return { ok: false, reason: 'wrong_region' }
  }

  // 5. Check if proposed region matches expected
  if (proposed.region !== expectedRegion) {
    return { ok: false, reason: 'wrong_region' }
  }

  // 6. Get region definition
  const region = roomDef.regions[proposed.region]
  if (!region) {
    return { ok: false, reason: 'wrong_region' }
  }

  // 7. Check bounds - item must fit entirely within region
  if (!isWithinBounds(proposed.x, proposed.y, itemDef.footprint, region.gridWidth, region.gridHeight)) {
    return { ok: false, reason: 'out_of_region' }
  }

  // 8. Check overlaps with existing placements
  const overlapResult = checkOverlaps(
    itemDef,
    proposed,
    existingPlacements,
    getItem,
    excludePlacementId
  )
  if (!overlapResult.ok) {
    return overlapResult
  }

  return { ok: true }
}

/**
 * Determine the expected region for a placement type.
 */
function getExpectedRegion(
  placementType: PlacementType,
  proposed: ProposedPlacement,
  existingPlacements: Placement[]
): RegionId | null {
  switch (placementType) {
    case 'floor':
    case 'rug':
      return 'floor'
    case 'wall':
      return 'wall'
    case 'outdoor':
      return 'yard'
    case 'surface':
      // Surface decor inherits region from parent
      if (!proposed.parentPlacementId) {
        return null
      }
      const parent = existingPlacements.find(p => p.id === proposed.parentPlacementId)
      return parent?.region ?? null
    default:
      return null
  }
}

/**
 * Check if placement is within region bounds (using grid cells).
 */
function isWithinBounds(
  x: number,
  y: number,
  footprint: Footprint,
  regionWidth: number,
  regionHeight: number
): boolean {
  if (x < 0 || y < 0) {
    return false
  }
  if (x + footprint.w > regionWidth) {
    return false
  }
  if (y + footprint.h > regionHeight) {
    return false
  }
  return true
}

/**
 * Validate surface decor placement on a parent item's slot.
 */
function validateSurfacePlacement(
  existingPlacements: Placement[],
  proposed: ProposedPlacement,
  getItem: ItemLookup,
  excludePlacementId?: string
): ValidationResult {
  // Must have a parent
  if (!proposed.parentPlacementId) {
    return { ok: false, reason: 'no_free_slot' }
  }

  // Find parent placement
  const parent = existingPlacements.find(p => p.id === proposed.parentPlacementId)
  if (!parent) {
    return { ok: false, reason: 'no_free_slot' }
  }

  // Get parent item definition
  const parentItemDef = getItem(parent.itemId)
  if (!parentItemDef) {
    return { ok: false, reason: 'no_free_slot' }
  }

  // Parent must be a surface item
  if (!parentItemDef.isSurface) {
    return { ok: false, reason: 'no_free_slot' }
  }

  // Parent must have slots
  if (!parentItemDef.slots || parentItemDef.slots.length === 0) {
    return { ok: false, reason: 'no_free_slot' }
  }

  // Must specify a valid slot index
  if (proposed.slotIndex === undefined || proposed.slotIndex < 0) {
    return { ok: false, reason: 'no_free_slot' }
  }

  // Slot index must be within range
  if (proposed.slotIndex >= parentItemDef.slots.length) {
    return { ok: false, reason: 'no_free_slot' }
  }

  // Check if slot is already occupied
  const slotOccupied = existingPlacements.some(
    p =>
      p.id !== excludePlacementId &&
      p.parentPlacementId === proposed.parentPlacementId &&
      p.slotIndex === proposed.slotIndex
  )

  if (slotOccupied) {
    return { ok: false, reason: 'slot_occupied' }
  }

  return { ok: true }
}

/**
 * Check if two rectangles overlap.
 */
function rectanglesOverlap(
  x1: number,
  y1: number,
  footprint1: Footprint,
  x2: number,
  y2: number,
  footprint2: Footprint
): boolean {
  // No overlap if one is completely to the left/right/above/below the other
  if (x1 + footprint1.w <= x2) return false
  if (x2 + footprint2.w <= x1) return false
  if (y1 + footprint1.h <= y2) return false
  if (y2 + footprint2.h <= y1) return false
  return true
}

/**
 * Determine if two placement types can overlap.
 */
function canOverlap(placingType: PlacementType, existingType: PlacementType): boolean {
  // Rugs can overlap anything on the floor
  if (placingType === 'rug') {
    return true
  }

  // Floor items can be placed on top of rugs
  if (placingType === 'floor' && existingType === 'rug') {
    return true
  }

  // Decor items can also be placed on rugs
  if (placingType === 'floor' && existingType === 'floor') {
    // Floor items block each other (furniture/decor)
    return false
  }

  // Everything else blocks
  return false
}

/**
 * Check for overlaps with existing placements.
 */
function checkOverlaps(
  itemDef: ItemDefinition,
  proposed: ProposedPlacement,
  existingPlacements: Placement[],
  getItem: ItemLookup,
  excludePlacementId?: string
): ValidationResult {
  // Filter to placements in the same region (excluding self for moves)
  const relevantPlacements = existingPlacements.filter(
    p => p.region === proposed.region && p.id !== excludePlacementId
  )

  for (const existing of relevantPlacements) {
    const existingItemDef = getItem(existing.itemId)
    if (!existingItemDef) {
      continue
    }

    // Skip surface decor - they don't occupy grid space
    if (existingItemDef.placement === 'surface') {
      continue
    }

    // Check if overlap is allowed between these types
    if (canOverlap(itemDef.placement, existingItemDef.placement)) {
      continue
    }

    // Check actual geometric overlap
    if (
      rectanglesOverlap(
        proposed.x,
        proposed.y,
        itemDef.footprint,
        existing.x,
        existing.y,
        existingItemDef.footprint
      )
    ) {
      return { ok: false, reason: 'overlaps' }
    }
  }

  return { ok: true }
}

/**
 * Get a human-readable message for a validation reason.
 */
export function getValidationMessage(reason: string): string {
  const messages: Record<string, string> = {
    out_of_region: "This item doesn't fit in the selected area",
    overlaps: 'This space is already occupied',
    wrong_region: "This item can't be placed here",
    no_free_slot: 'No surface space available',
    slot_occupied: 'This spot is already taken',
    not_placeable: 'This item cannot be placed',
  }
  return messages[reason] ?? 'Invalid placement'
}
