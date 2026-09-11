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
      {/* Item sprite */}
      <div className="w-20 h-20 rounded-lg flex items-center justify-center mb-2 relative bg-gray-50 dark:bg-gray-700/50">
        <img
          src={getSpritePath(item.category, item.texture_key)}
          alt={item.name}
          className="max-w-full max-h-full object-contain"
          loading="lazy"
        />
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

function getSpritePath(category: string, textureKey: string): string {
  // Map category to sprite folder
  const folderMap: Record<string, string> = {
    furniture: 'furniture',
    decor: 'decor',
    rug: 'rug',
    wall: 'wall',
    surface_decor: 'surface_decor',
    outdoor: 'outdoor',
    wall_finish: 'wall_finish',
    floor_finish: 'floor_finish',
  }
  const folder = folderMap[category] || category
  return `/assets/sprites/${folder}/${textureKey}.png`
}
