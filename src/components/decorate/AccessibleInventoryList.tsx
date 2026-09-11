import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { InventoryItem, CatalogItem } from '@/types/database'

type Category = 'all' | 'furniture' | 'decor' | 'rug' | 'wall_decor' | 'surface_decor' | 'outdoor' | 'wall_finish' | 'floor_finish'

interface AccessibleInventoryListProps {
  inventory: InventoryItem[]
  catalog: Map<string, CatalogItem>
  placedInventoryIds: Set<string>
  onSelectItem: (inventoryItem: InventoryItem, catalogItem: CatalogItem) => void
  onClose: () => void
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All items',
  furniture: 'Furniture',
  decor: 'Decorations',
  rug: 'Rugs',
  wall_decor: 'Wall decorations',
  surface_decor: 'Surface decorations',
  outdoor: 'Outdoor items',
  wall_finish: 'Wallpaper',
  floor_finish: 'Flooring',
}

const PLACEMENT_DESCRIPTIONS: Record<string, string> = {
  floor: 'Floor item',
  rug: 'Rug',
  wall: 'Wall item',
  surface: 'Surface decoration',
  outdoor: 'Outdoor item',
  wall_finish: 'Wall finish',
  floor_finish: 'Floor finish',
}

/**
 * Keyboard-navigable list view of inventory items.
 * Designed for screen readers and keyboard-only users.
 */
export default function AccessibleInventoryList({
  inventory,
  catalog,
  placedInventoryIds,
  onSelectItem,
  onClose,
}: AccessibleInventoryListProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  // Get available items (not currently placed)
  const availableItems = useMemo(() => {
    return inventory.filter(inv => !placedInventoryIds.has(inv.id))
  }, [inventory, placedInventoryIds])

  // Get categories that have items
  const availableCategories = useMemo(() => {
    const cats: Category[] = ['all']
    const found = new Set<Category>()

    availableItems.forEach(inv => {
      const item = catalog.get(inv.item_id)
      if (item && !found.has(item.category as Category)) {
        found.add(item.category as Category)
        cats.push(item.category as Category)
      }
    })

    return cats
  }, [availableItems, catalog])

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return availableItems
    }
    return availableItems.filter(inv => {
      const item = catalog.get(inv.item_id)
      return item?.category === selectedCategory
    })
  }, [availableItems, catalog, selectedCategory])

  // Group by item_id for display
  const groupedItems = useMemo(() => {
    const groups = new Map<string, { item: CatalogItem; inventoryItems: InventoryItem[] }>()

    filteredItems.forEach(inv => {
      const item = catalog.get(inv.item_id)
      if (!item) return

      const existing = groups.get(inv.item_id)
      if (existing) {
        existing.inventoryItems.push(inv)
      } else {
        groups.set(inv.item_id, { item, inventoryItems: [inv] })
      }
    })

    return Array.from(groups.values())
  }, [filteredItems, catalog])

  // Reset focus when category changes
  useEffect(() => {
    setFocusedIndex(0)
  }, [selectedCategory])

  // Focus the current item when focusedIndex changes
  useEffect(() => {
    const ref = itemRefs.current.get(focusedIndex)
    ref?.focus()
  }, [focusedIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, groupedItems.length - 1))
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
        setFocusedIndex(groupedItems.length - 1)
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [groupedItems.length, onClose])

  const handleItemSelect = useCallback((inventoryItem: InventoryItem, catalogItem: CatalogItem) => {
    onSelectItem(inventoryItem, catalogItem)
  }, [onSelectItem])

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col"
      role="dialog"
      aria-label="Inventory"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Inventory
        </h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-ring rounded"
          aria-label="Close inventory"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Category filter */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <label htmlFor="category-select" className="sr-only">Filter by category</label>
        <select
          id="category-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as Category)}
          className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus-ring"
        >
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* Item count */}
      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 flex-shrink-0" aria-live="polite">
        {groupedItems.length} {groupedItems.length === 1 ? 'item' : 'items'} available
      </div>

      {/* Items list */}
      <ul
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 pb-6"
        role="listbox"
        aria-label="Available items"
        onKeyDown={handleKeyDown}
      >
        {groupedItems.length === 0 ? (
          <li className="text-center py-8 text-gray-500 dark:text-gray-400">
            No items available in this category
          </li>
        ) : (
          groupedItems.map(({ item, inventoryItems }, index) => {
            const footprint = `${item.footprint_w} by ${item.footprint_h}`
            const placementType = PLACEMENT_DESCRIPTIONS[item.placement] || item.placement
            const count = inventoryItems.length
            const description = `${item.name}. ${placementType}, ${footprint} cells${count > 1 ? `, ${count} available` : ''}`

            return (
              <li key={item.id} role="option" aria-selected={index === focusedIndex}>
                <button
                  ref={(el) => {
                    if (el) itemRefs.current.set(index, el)
                    else itemRefs.current.delete(index)
                  }}
                  onClick={() => handleItemSelect(inventoryItems[0], item)}
                  onFocus={() => setFocusedIndex(index)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors focus-ring ${
                    index === focusedIndex
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  aria-label={description}
                >
                  {/* Category indicator */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: getCategoryColor(item.category) }}
                    aria-hidden="true"
                  >
                    {item.footprint_w}×{item.footprint_h}
                  </div>

                  {/* Item info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {placementType} · {item.footprint_w}×{item.footprint_h}
                    </div>
                  </div>

                  {/* Count badge */}
                  {count > 1 && (
                    <span className="flex-shrink-0 px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300">
                      ×{count}
                    </span>
                  )}

                  {/* Select indicator */}
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            )
          })
        )}
      </ul>

      {/* Keyboard hints */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
        <span className="sr-only">Keyboard shortcuts:</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> Navigate
        <span className="mx-2">·</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> Select
        <span className="mx-2">·</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> Close
      </div>
    </div>
  )
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'furniture': return '#8b5cf6'
    case 'decor': return '#22c55e'
    case 'rug': return '#f59e0b'
    case 'wall_decor': return '#3b82f6'
    case 'surface_decor': return '#ec4899'
    case 'outdoor': return '#14b8a6'
    case 'wall_finish': return '#6366f1'
    case 'floor_finish': return '#78716c'
    default: return '#6b7280'
  }
}
