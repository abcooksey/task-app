import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { InventoryItem, CatalogItem, Placement } from '@/types/database'
import type { RegionId } from '@/game/placement/types'

interface PlacedItemsListProps {
  placements: Placement[]
  inventory: InventoryItem[]
  catalog: Map<string, CatalogItem>
  selectedPlacementId: string | null
  onSelect: (placementId: string) => void
  onMove: (placementId: string) => void
  onFlip: (placementId: string) => void
  onStore: (placementId: string) => void
  onClose: () => void
}

const REGION_NAMES: Record<RegionId, string> = {
  floor: 'Floor',
  wall: 'Wall',
  yard: 'Yard',
}

/**
 * Keyboard-navigable list of placed items with action buttons.
 * Allows keyboard-only users to manage all placed decorations.
 */
export default function PlacedItemsList({
  placements,
  inventory,
  catalog,
  selectedPlacementId,
  onSelect,
  onMove,
  onFlip,
  onStore,
  onClose,
}: PlacedItemsListProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Build list of placed items with their details
  const placedItems = useMemo(() => {
    return placements.map(placement => {
      const invItem = inventory.find(i => i.id === placement.inventory_id)
      const catItem = invItem ? catalog.get(invItem.item_id) : null

      return {
        placement,
        inventoryItem: invItem,
        catalogItem: catItem,
        name: catItem?.name ?? 'Unknown item',
        region: placement.region as RegionId,
        position: `(${placement.x}, ${placement.y})`,
        canFlip: catItem?.flipped_texture != null,
        isFlipped: placement.flipped,
      }
    }).filter(item => item.catalogItem) // Only show items we have catalog data for
  }, [placements, inventory, catalog])

  // Focus the current item when focusedIndex changes
  useEffect(() => {
    const ref = itemRefs.current.get(focusedIndex)
    ref?.focus()
  }, [focusedIndex])

  // Update focused index when selection changes externally
  useEffect(() => {
    if (selectedPlacementId) {
      const index = placedItems.findIndex(item => item.placement.id === selectedPlacementId)
      if (index >= 0) {
        setFocusedIndex(index)
      }
    }
  }, [selectedPlacementId, placedItems])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const item = placedItems[focusedIndex]

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, placedItems.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(placedItems.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (item) {
          onSelect(item.placement.id)
        }
        break
      case 'm':
      case 'M':
        e.preventDefault()
        if (item) {
          onMove(item.placement.id)
        }
        break
      case 'f':
      case 'F':
        e.preventDefault()
        if (item?.canFlip) {
          onFlip(item.placement.id)
        }
        break
      case 's':
      case 'S':
        e.preventDefault()
        if (item) {
          onStore(item.placement.id)
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [focusedIndex, placedItems, onSelect, onMove, onFlip, onStore, onClose])

  if (placedItems.length === 0) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl p-6"
        role="dialog"
        aria-label="Placed items"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Placed Items
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-ring rounded"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-center py-8 text-gray-500 dark:text-gray-400">
          No items placed yet. Select an item from your inventory to place it.
        </p>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col"
      role="dialog"
      aria-label="Placed items"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Placed Items ({placedItems.length})
        </h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-ring rounded"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Items list */}
      <div
        className="flex-1 overflow-y-auto"
        role="listbox"
        aria-label="Placed items list"
        onKeyDown={handleKeyDown}
      >
        {placedItems.map((item, index) => {
          const isSelected = item.placement.id === selectedPlacementId
          const isFocused = index === focusedIndex

          return (
            <div
              key={item.placement.id}
              ref={(el) => {
                if (el) itemRefs.current.set(index, el)
                else itemRefs.current.delete(index)
              }}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 transition-colors focus:outline-none ${
                isFocused
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : isSelected
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
              role="option"
              aria-selected={isSelected}
              tabIndex={isFocused ? 0 : -1}
              onFocus={() => setFocusedIndex(index)}
              onClick={() => onSelect(item.placement.id)}
            >
              {/* Item info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {item.name}
                  {item.isFlipped && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(flipped)</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {REGION_NAMES[item.region]} at {item.position}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMove(item.placement.id)
                  }}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus-ring"
                  aria-label={`Move ${item.name}`}
                  title="Move (M)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.canFlip) onFlip(item.placement.id)
                  }}
                  disabled={!item.canFlip}
                  className={`p-2 rounded-lg transition-colors focus-ring ${
                    item.canFlip
                      ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  aria-label={item.canFlip ? `Flip ${item.name}` : `${item.name} cannot be flipped`}
                  title={item.canFlip ? 'Flip (F)' : 'Cannot flip'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStore(item.placement.id)
                  }}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors focus-ring"
                  aria-label={`Store ${item.name}`}
                  title="Store (S)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Keyboard hints */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> Navigate
        <span className="mx-2">·</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">M</kbd> Move
        <span className="mx-2">·</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">F</kbd> Flip
        <span className="mx-2">·</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">S</kbd> Store
        <span className="mx-2">·</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> Close
      </div>
    </div>
  )
}
