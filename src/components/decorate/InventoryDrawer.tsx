import { useState, useMemo } from 'react'
import type { InventoryItem, CatalogItem } from '@/types/database'

type Category = 'all' | 'furniture' | 'decor' | 'rug' | 'wall_decor' | 'surface_decor' | 'outdoor' | 'wall_finish' | 'floor_finish'

interface InventoryDrawerProps {
  inventory: InventoryItem[]
  catalog: Map<string, CatalogItem>
  placedInventoryIds: Set<string>
  onSelectItem: (inventoryItem: InventoryItem, catalogItem: CatalogItem) => void
  onClose: () => void
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  furniture: 'Furniture',
  decor: 'Decor',
  rug: 'Rugs',
  wall_decor: 'Wall',
  surface_decor: 'Surface',
  outdoor: 'Outdoor',
  wall_finish: 'Wallpaper',
  floor_finish: 'Flooring',
}

export default function InventoryDrawer({
  inventory,
  catalog,
  placedInventoryIds,
  onSelectItem,
  onClose,
}: InventoryDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')

  // Get available items (not currently placed)
  const availableItems = useMemo(() => {
    return inventory.filter(inv => !placedInventoryIds.has(inv.id))
  }, [inventory, placedInventoryIds])

  // Get categories that have items
  const availableCategories = useMemo(() => {
    const cats = new Set<Category>(['all'])
    availableItems.forEach(inv => {
      const item = catalog.get(inv.item_id)
      if (item) {
        cats.add(item.category as Category)
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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl animate-slide-up max-h-[60vh] flex flex-col"
      role="dialog"
      aria-label="Inventory drawer"
      aria-modal="true"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2 flex-shrink-0" aria-hidden="true">
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
        <h2 id="inventory-title" className="text-lg font-semibold text-gray-900 dark:text-white">
          Inventory
        </h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-ring rounded"
          aria-label="Close inventory"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Category chips */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          role="tablist"
          aria-label="Filter by category"
        >
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => {
            if (!availableCategories.has(cat) && cat !== 'all') return null
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                role="tab"
                aria-selected={selectedCategory === cat}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors focus-ring ${
                  selectedCategory === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Items grid */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-6"
        role="tabpanel"
        aria-labelledby="inventory-title"
      >
        {groupedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400" role="status">
            No items available
          </div>
        ) : (
          <div
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
            role="listbox"
            aria-label={`${groupedItems.length} items available`}
          >
            {groupedItems.map(({ item, inventoryItems }) => {
              const count = inventoryItems.length
              const label = `${item.name}, ${item.footprint_w} by ${item.footprint_h} cells${count > 1 ? `, ${count} available` : ''}`

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(inventoryItems[0], item)}
                  className="flex flex-col items-center p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus-ring"
                  role="option"
                  aria-label={label}
                >
                  {/* Placeholder sprite */}
                  <div
                    className="w-12 h-12 rounded flex items-center justify-center text-white text-xs font-medium mb-2"
                    style={{ backgroundColor: getCategoryColor(item.category) }}
                    aria-hidden="true"
                  >
                    {item.footprint_w}×{item.footprint_h}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 text-center line-clamp-2">
                    {item.name}
                  </span>
                  {count > 1 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1" aria-hidden="true">
                      ×{count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'furniture': return '#8b5cf6' // Purple
    case 'decor': return '#22c55e'     // Green
    case 'rug': return '#f59e0b'       // Amber
    case 'wall_decor': return '#3b82f6' // Blue
    case 'surface_decor': return '#ec4899' // Pink
    case 'outdoor': return '#14b8a6'   // Teal
    case 'wall_finish': return '#6366f1' // Indigo
    case 'floor_finish': return '#78716c' // Stone
    default: return '#6b7280'          // Gray
  }
}
