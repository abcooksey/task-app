/**
 * ItemGrid - Grid of selectable items for a category.
 *
 * Features:
 * - Shows owned items
 * - Current item highlighted
 * - "Free" badge on free items
 * - Tap to equip instantly
 * - Keyboard navigation with arrow keys
 * - "Shop [category]" link at end if < 3 owned
 */

import { useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnnounce } from '@/hooks/useAnnounce'
import type { WardrobeCategory } from './CategoryTabs'

interface ItemGridProps {
  items: ItemGridItem[]
  selectedId: string | undefined
  onSelect: (itemId: string) => void
  category: WardrobeCategory
  isLoading?: boolean
}

export interface ItemGridItem {
  id: string
  name: string
  isFree: boolean
  textureKey?: string
}

const CATEGORY_SHOP_LABELS: Record<WardrobeCategory, string> = {
  appearance: 'hair styles',
  tops: 'tops',
  bottoms: 'bottoms',
  shoes: 'shoes',
  accessories: 'accessories',
  outfits: '',
}

export function ItemGrid({ items, selectedId, onSelect, category, isLoading }: ItemGridProps) {
  const navigate = useNavigate()
  const announce = useAnnounce()
  const gridRef = useRef<HTMLDivElement>(null)

  // Handle item selection with announcement
  const handleSelect = useCallback((item: ItemGridItem) => {
    onSelect(item.id)
    announce(`Equipped ${formatItemName(item.name || item.id)}`)
  }, [onSelect, announce])

  // Handle keyboard navigation within the grid
  const handleKeyDown = useCallback((event: React.KeyboardEvent, currentIndex: number) => {
    const gridElement = gridRef.current
    if (!gridElement) return

    const buttons = Array.from(gridElement.querySelectorAll<HTMLButtonElement>('button'))
    const itemCount = buttons.length

    // Calculate columns based on grid layout
    const gridStyle = window.getComputedStyle(gridElement)
    const columns = gridStyle.gridTemplateColumns.split(' ').length

    let nextIndex: number | null = null

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = currentIndex + 1 < itemCount ? currentIndex + 1 : 0
        break
      case 'ArrowLeft':
        nextIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : itemCount - 1
        break
      case 'ArrowDown':
        nextIndex = currentIndex + columns < itemCount ? currentIndex + columns : currentIndex % columns
        break
      case 'ArrowUp':
        nextIndex = currentIndex - columns >= 0 ? currentIndex - columns : itemCount - columns + (currentIndex % columns)
        if (nextIndex >= itemCount) nextIndex = itemCount - 1
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = itemCount - 1
        break
      default:
        return
    }

    if (nextIndex !== null && nextIndex >= 0 && nextIndex < itemCount) {
      event.preventDefault()
      buttons[nextIndex].focus()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="mb-2">No items in this category yet</p>
        {category !== 'outfits' && (
          <button
            onClick={() => navigate('/store')}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Browse the store
          </button>
        )}
      </div>
    )
  }

  const showShopLink = items.length < 3 && category !== 'outfits' && category !== 'appearance'

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
      role="listbox"
      aria-label={`${CATEGORY_SHOP_LABELS[category] || category} items`}
    >
      {items.map((item, index) => {
        const isSelected = item.id === selectedId

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            role="option"
            aria-selected={isSelected}
            className={`
              relative aspect-square rounded-xl border-2 transition-all touch-target
              flex flex-col items-center justify-center p-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
              ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500/50'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
              }
            `}
            aria-label={`${formatItemName(item.name || item.id)}${isSelected ? ', currently wearing' : ''}`}
          >
            {/* Placeholder for item preview */}
            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-1">
              <span className="text-2xl">
                {getItemEmoji(item.id)}
              </span>
            </div>

            {/* Item name */}
            <span className="text-xs text-gray-600 dark:text-gray-400 text-center line-clamp-1">
              {formatItemName(item.name || item.id)}
            </span>

            {/* Free badge */}
            {item.isFree && (
              <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium">
                Free
              </span>
            )}

            {/* Selected checkmark */}
            {isSelected && (
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </button>
        )
      })}

      {/* Shop link card */}
      {showShopLink && (
        <button
          onClick={() => navigate('/store')}
          className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600
                     hover:border-primary-400 dark:hover:border-primary-500 transition-colors
                     flex flex-col items-center justify-center p-2 text-gray-500 dark:text-gray-400"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span className="text-xs text-center">
            Shop {CATEGORY_SHOP_LABELS[category]}
          </span>
        </button>
      )}
    </div>
  )
}

// Helper to format item name for display
function formatItemName(id: string): string {
  return id
    .replace(/^(starter_|hair_|eyes_|skin_)/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// Helper to get placeholder emoji for item
function getItemEmoji(id: string): string {
  if (id.includes('skin')) return '🧑'
  if (id.includes('eyes')) return '👁️'
  if (id.includes('hair')) return '💇'
  if (id.includes('tee') || id.includes('top') || id.includes('shirt')) return '👕'
  if (id.includes('pants') || id.includes('bottom') || id.includes('shorts')) return '👖'
  if (id.includes('sneakers') || id.includes('shoes') || id.includes('boots')) return '👟'
  if (id.includes('glasses') || id.includes('hat') || id.includes('acc')) return '🎀'
  return '✨'
}
