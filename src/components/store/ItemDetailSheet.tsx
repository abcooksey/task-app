import type { CatalogItem } from '@/types/database'

interface ItemDetailSheetProps {
  item: CatalogItem
  owned: boolean
  ownedCount: number
  balance: number
  onBuy: () => void
  onPlace: () => void
  onClose: () => void
  buying?: boolean
}

const PLACEMENT_LABELS: Record<string, string> = {
  floor: 'Floor',
  rug: 'Floor (Rug)',
  wall: 'Wall',
  surface: 'Surface',
  outdoor: 'Yard',
  wall_finish: 'Wallpaper',
  floor_finish: 'Flooring',
}

const CATEGORY_LABELS: Record<string, string> = {
  furniture: 'Furniture',
  decor: 'Decor',
  rug: 'Rug',
  wall: 'Wall Art',
  wall_decor: 'Wall Art',
  surface_decor: 'Surface Item',
  outdoor: 'Outdoor',
  wall_finish: 'Wallpaper',
  floor_finish: 'Flooring',
}

export default function ItemDetailSheet({
  item,
  owned,
  ownedCount,
  balance,
  onBuy,
  onPlace,
  onClose,
  buying = false,
}: ItemDetailSheetProps) {
  const canAfford = balance >= item.price
  const canBuy = (!owned || item.allow_multiple) && canAfford
  const needsMoreCoins = !canAfford && (!owned || item.allow_multiple)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl animate-slide-up max-h-[80vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Header with sprite */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-24 h-24 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
              <img
                src={getSpritePath(item.category, item.texture_key)}
                alt={item.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                {item.name}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.footprint_w}×{item.footprint_h} {PLACEMENT_LABELS[item.placement] || item.placement}
                </span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 -mr-2 -mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-ring rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          {item.blurb && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              {item.blurb}
            </p>
          )}

          {/* Item details */}
          <div className="space-y-2 mb-6">
            {item.is_surface && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Has surface slots for small items</span>
              </div>
            )}
            {item.flipped_texture && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Can be flipped</span>
              </div>
            )}
            {item.allow_multiple && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                </svg>
                <span>Can own multiple</span>
              </div>
            )}
            {ownedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  {ownedCount === 1 ? 'You own this item' : `You own ${ownedCount}`}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {owned && (
              <button
                onClick={onPlace}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors focus-ring"
              >
                Place It
              </button>
            )}

            {canBuy && (
              <button
                onClick={onBuy}
                disabled={buying}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 transition-colors focus-ring flex items-center justify-center gap-2"
              >
                {buying ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Buying...</span>
                  </>
                ) : (
                  <>
                    <span>Buy</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                      {item.price}
                    </span>
                  </>
                )}
              </button>
            )}

            {needsMoreCoins && (
              <div className="flex-1 py-3 px-4 rounded-xl font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 text-center">
                Need {item.price - balance} more coins
              </div>
            )}

            {owned && !item.allow_multiple && !needsMoreCoins && (
              <div className="flex-1 py-3 px-4 rounded-xl font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 text-center">
                Already owned
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getSpritePath(category: string, textureKey: string): string {
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
