import { useState, useCallback, useEffect, useMemo } from 'react'
import { bridge, type PlacementData, type ItemDefForGhost } from '@/game/bridge'
import { validate, type ItemLookup } from '@/game/placement'
import type { RoomDefinition, ItemDefinition, Placement, ProposedPlacement, RegionId } from '@/game/placement/types'
import type { InventoryItem, CatalogItem, Placement as DBPlacement } from '@/types/database'
import roomsData from '@/game/content/rooms.json'

interface UseDecorateModeProps {
  inventory: InventoryItem[]
  placements: DBPlacement[]
  catalog: Map<string, CatalogItem>
  onSavePlacement: (inventoryId: string, region: RegionId, x: number, y: number, flipped: boolean) => Promise<void>
  onRemovePlacement: (placementId: string) => Promise<void>
  onFlipPlacement: (placementId: string, flipped: boolean) => Promise<void>
}

interface UseDecorateModeReturn {
  isDecorateMode: boolean
  enterDecorateMode: (view: 'interior' | 'exterior') => void
  exitDecorateMode: () => void
  selectedPlacementId: string | null
  selectPlacement: (id: string | null) => void
  isPlacing: boolean
  startPlacing: (inventoryItem: InventoryItem, catalogItem: CatalogItem) => void
  cancelPlacing: () => void
  placementValid: boolean
  placementReason: string
  placedInventoryIds: Set<string>
  handleMove: () => void
  handleFlip: () => void
  handleStore: () => void
}

export function useDecorateMode({
  inventory,
  placements,
  catalog,
  onSavePlacement,
  onRemovePlacement,
  onFlipPlacement,
}: UseDecorateModeProps): UseDecorateModeReturn {
  const [isDecorateMode, setIsDecorateMode] = useState(false)
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [placingItem, setPlacingItem] = useState<{ inventoryItem: InventoryItem; catalogItem: CatalogItem } | null>(null)
  const [placementValid, setPlacementValid] = useState(true)
  const [placementReason, setPlacementReason] = useState('')

  // Convert catalog to ItemLookup
  const getItem: ItemLookup = useCallback((itemId: string): ItemDefinition | undefined => {
    const cat = catalog.get(itemId)
    if (!cat) return undefined
    return {
      id: cat.id,
      name: cat.name,
      category: cat.category,
      placement: cat.placement,
      footprint: { w: cat.footprint_w, h: cat.footprint_h },
      isSurface: cat.is_surface,
      slots: cat.slots_json as { x: number; y: number }[] | undefined,
    }
  }, [catalog])

  // Convert room data to RoomDefinition
  const roomDef: RoomDefinition = useMemo(() => {
    const room = roomsData.rooms.main
    return {
      id: room.id,
      name: room.name,
      canvasSize: room.canvasSize,
      regions: {
        floor: room.regions.floor ? {
          id: 'floor' as const,
          name: room.regions.floor.name,
          x: room.regions.floor.x,
          y: room.regions.floor.y,
          width: room.regions.floor.width,
          height: room.regions.floor.height,
          gridWidth: room.regions.floor.gridWidth,
          gridHeight: room.regions.floor.gridHeight,
          allowedCategories: room.regions.floor.allowedCategories,
        } : undefined,
        wall: room.regions.wall ? {
          id: 'wall' as const,
          name: room.regions.wall.name,
          x: room.regions.wall.x,
          y: room.regions.wall.y,
          width: room.regions.wall.width,
          height: room.regions.wall.height,
          gridWidth: room.regions.wall.gridWidth,
          gridHeight: room.regions.wall.gridHeight,
          allowedCategories: room.regions.wall.allowedCategories,
        } : undefined,
        yard: room.regions.yard ? {
          id: 'yard' as const,
          name: room.regions.yard.name,
          x: room.regions.yard.x,
          y: room.regions.yard.y,
          width: room.regions.yard.width,
          height: room.regions.yard.height,
          gridWidth: room.regions.yard.gridWidth,
          gridHeight: room.regions.yard.gridHeight,
          allowedCategories: room.regions.yard.allowedCategories,
        } : undefined,
      },
    }
  }, [])

  // Convert DB placements to validation format
  const validationPlacements: Placement[] = useMemo(() => {
    return placements.map(p => ({
      id: p.id,
      inventoryId: p.inventory_id,
      itemId: inventory.find(i => i.id === p.inventory_id)?.item_id ?? '',
      region: p.region as RegionId,
      x: p.x,
      y: p.y,
      flipped: p.flipped,
      parentPlacementId: p.parent_placement_id ?? undefined,
      slotIndex: p.slot_index ?? undefined,
    }))
  }, [placements, inventory])

  // Get placed inventory IDs
  const placedInventoryIds = useMemo(() => {
    return new Set(placements.map(p => p.inventory_id))
  }, [placements])

  // Enter decorate mode
  const enterDecorateMode = useCallback((view: 'interior' | 'exterior') => {
    setIsDecorateMode(true)

    // Convert placements to bridge format
    const bridgePlacements: PlacementData[] = placements.map(p => ({
      id: p.id,
      inventoryId: p.inventory_id,
      itemId: inventory.find(i => i.id === p.inventory_id)?.item_id ?? '',
      region: p.region as 'floor' | 'wall' | 'yard',
      x: p.x,
      y: p.y,
      flipped: p.flipped,
      parentPlacementId: p.parent_placement_id ?? undefined,
      slotIndex: p.slot_index ?? undefined,
    }))

    bridge.emit('setPlacements', { placements: bridgePlacements })
    bridge.emit('enterDecorateMode', { view })
  }, [placements, inventory])

  // Exit decorate mode
  const exitDecorateMode = useCallback(() => {
    setIsDecorateMode(false)
    setSelectedPlacementId(null)
    setIsPlacing(false)
    setPlacingItem(null)
    bridge.emit('exitDecorateMode', {})
  }, [])

  // Select placement
  const selectPlacement = useCallback((id: string | null) => {
    setSelectedPlacementId(id)
    bridge.emit('selectPlacement', { placementId: id })
  }, [])

  // Start placing an item
  const startPlacing = useCallback((inventoryItem: InventoryItem, catalogItem: CatalogItem) => {
    setIsPlacing(true)
    setPlacingItem({ inventoryItem, catalogItem })
    setSelectedPlacementId(null)

    const itemDef: ItemDefForGhost = {
      id: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      placement: catalogItem.placement,
      footprint: { w: catalogItem.footprint_w, h: catalogItem.footprint_h },
      isSurface: catalogItem.is_surface,
      slots: catalogItem.slots_json as { x: number; y: number }[] | undefined,
    }

    bridge.emit('beginGhost', { itemDef })
  }, [])

  // Cancel placing
  const cancelPlacing = useCallback(() => {
    setIsPlacing(false)
    setPlacingItem(null)
    bridge.emit('endGhost', {})
  }, [])

  // Handle ghost moved - validate placement
  useEffect(() => {
    const unsubscribe = bridge.on('ghostMoved', ({ x, y, region }) => {
      if (!placingItem) return

      const itemDef = getItem(placingItem.catalogItem.id)
      if (!itemDef) return

      const proposed: ProposedPlacement = {
        itemId: placingItem.catalogItem.id,
        region,
        x,
        y,
        flipped: false,
      }

      const result = validate(roomDef, itemDef, validationPlacements, proposed, getItem)

      setPlacementValid(result.ok)
      setPlacementReason(result.ok ? '' : result.reason)

      bridge.emit('setGhostValidity', { valid: result.ok, reason: result.ok ? undefined : result.reason })
    })

    return unsubscribe
  }, [placingItem, roomDef, validationPlacements, getItem])

  // Handle ghost dropped - save placement
  useEffect(() => {
    const unsubscribe = bridge.on('ghostDropped', async ({ x, y, region }) => {
      if (!placingItem || !placementValid) {
        cancelPlacing()
        return
      }

      try {
        await onSavePlacement(placingItem.inventoryItem.id, region, x, y, false)
        cancelPlacing()
      } catch (error) {
        console.error('Failed to save placement:', error)
        // Keep placing mode active so user can try again
      }
    })

    return unsubscribe
  }, [placingItem, placementValid, onSavePlacement, cancelPlacing])

  // Handle placement tapped
  useEffect(() => {
    const unsubscribe = bridge.on('placementTapped', ({ placementId }) => {
      selectPlacement(placementId)
    })

    return unsubscribe
  }, [selectPlacement])

  // Handle empty tapped
  useEffect(() => {
    const unsubscribe = bridge.on('emptyTapped', () => {
      selectPlacement(null)
    })

    return unsubscribe
  }, [selectPlacement])

  // Handle placement dropped after drag
  useEffect(() => {
    const unsubscribe = bridge.on('placementDropped', async ({ placementId, x, y }) => {
      const placement = placements.find(p => p.id === placementId)
      if (!placement) return

      const invItem = inventory.find(i => i.id === placement.inventory_id)
      if (!invItem) return

      const itemDef = getItem(invItem.item_id)
      if (!itemDef) return

      // Validate the new position
      const proposed: ProposedPlacement = {
        itemId: invItem.item_id,
        region: placement.region as RegionId,
        x,
        y,
        flipped: placement.flipped,
      }

      const result = validate(roomDef, itemDef, validationPlacements, proposed, getItem, placementId)

      if (result.ok) {
        try {
          await onSavePlacement(placement.inventory_id, placement.region as RegionId, x, y, placement.flipped)
        } catch (error) {
          console.error('Failed to update placement:', error)
          // Re-render placements to reset position
          const bridgePlacements: PlacementData[] = placements.map(p => ({
            id: p.id,
            inventoryId: p.inventory_id,
            itemId: inventory.find(i => i.id === p.inventory_id)?.item_id ?? '',
            region: p.region as 'floor' | 'wall' | 'yard',
            x: p.x,
            y: p.y,
            flipped: p.flipped,
            parentPlacementId: p.parent_placement_id ?? undefined,
            slotIndex: p.slot_index ?? undefined,
          }))
          bridge.emit('setPlacements', { placements: bridgePlacements })
        }
      } else {
        // Invalid drop - reset position
        const bridgePlacements: PlacementData[] = placements.map(p => ({
          id: p.id,
          inventoryId: p.inventory_id,
          itemId: inventory.find(i => i.id === p.inventory_id)?.item_id ?? '',
          region: p.region as 'floor' | 'wall' | 'yard',
          x: p.x,
          y: p.y,
          flipped: p.flipped,
          parentPlacementId: p.parent_placement_id ?? undefined,
          slotIndex: p.slot_index ?? undefined,
        }))
        bridge.emit('setPlacements', { placements: bridgePlacements })
      }
    })

    return unsubscribe
  }, [placements, inventory, roomDef, validationPlacements, getItem, onSavePlacement])

  // Handle move action - start moving selected item
  const handleMove = useCallback(() => {
    if (!selectedPlacementId) return

    const placement = placements.find(p => p.id === selectedPlacementId)
    if (!placement) return

    const invItem = inventory.find(i => i.id === placement.inventory_id)
    if (!invItem) return

    const catItem = catalog.get(invItem.item_id)
    if (!catItem) return

    // Start ghost placement for moving
    setIsPlacing(true)
    setPlacingItem({ inventoryItem: invItem, catalogItem: catItem })
    setSelectedPlacementId(null)

    // Remove from placements temporarily (will be re-added on drop)
    onRemovePlacement(placement.id)

    const itemDef: ItemDefForGhost = {
      id: catItem.id,
      name: catItem.name,
      category: catItem.category,
      placement: catItem.placement,
      footprint: { w: catItem.footprint_w, h: catItem.footprint_h },
      isSurface: catItem.is_surface,
      slots: catItem.slots_json as { x: number; y: number }[] | undefined,
    }

    bridge.emit('beginGhost', { itemDef })
  }, [selectedPlacementId, placements, inventory, catalog, onRemovePlacement])

  // Handle flip action
  const handleFlip = useCallback(async () => {
    if (!selectedPlacementId) return

    const placement = placements.find(p => p.id === selectedPlacementId)
    if (!placement) return

    try {
      await onFlipPlacement(placement.id, !placement.flipped)
    } catch (error) {
      console.error('Failed to flip placement:', error)
    }
  }, [selectedPlacementId, placements, onFlipPlacement])

  // Handle store action
  const handleStore = useCallback(async () => {
    if (!selectedPlacementId) return

    try {
      await onRemovePlacement(selectedPlacementId)
      setSelectedPlacementId(null)
    } catch (error) {
      console.error('Failed to store item:', error)
    }
  }, [selectedPlacementId, onRemovePlacement])

  return {
    isDecorateMode,
    enterDecorateMode,
    exitDecorateMode,
    selectedPlacementId,
    selectPlacement,
    isPlacing,
    startPlacing,
    cancelPlacing,
    placementValid,
    placementReason,
    placedInventoryIds,
    handleMove,
    handleFlip,
    handleStore,
  }
}
