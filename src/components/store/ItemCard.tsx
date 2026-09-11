import type { CatalogItem } from '@/types/database'

interface ItemCardProps {
  item: CatalogItem
  owned: boolean
  ownedCount: number
  balance: number
  onBuy: (item: CatalogItem) => void
  onViewDetails: (item: CatalogItem) => void
}

export default function ItemCard({
  item,
  owned,
  ownedCount,
  balance,
  onBuy,
  onViewDetails,
}: ItemCardProps) {
  const canAfford = balance >= item.price
  const canBuy = !owned || item.allow_multiple
  const needsMoreCoins = !canAfford && canBuy

  return (
    <button
      onClick={() => onViewDetails(item)}
      className="flex flex-col items-center p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all focus-ring text-left w-full"
    >
      {/* Item sprite placeholder */}
      <div
        className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xs font-medium mb-2 relative"
        style={{ backgroundColor: getCategoryColor(item.category) }}
      >
        <span className="text-center leading-tight">
          {item.footprint_w}×{item.footprint_h}
        </span>
        {ownedCount > 1 && (
          <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded-full">
            ×{ownedCount}
          </span>
        )}
      </div>

      {/* Item name */}
      <span className="text-sm font-medium text-gray-900 dark:text-white text-center line-clamp-2 mb-2 min-h-[2.5rem]">
        {item.name}
      </span>

      {/* Price/status */}
      {owned && !item.allow_multiple ? (
        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
          Owned
        </span>
      ) : needsMoreCoins ? (
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
          {item.price - balance} more
        </span>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onBuy(item)
          }}
          disabled={!canAfford}
          className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 px-3 py-1 rounded-full transition-colors"
        >
          {item.price}
        </button>
      )}
    </button>
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
