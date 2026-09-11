/**
 * WearableCard - Item card specifically for wearable items.
 *
 * Features:
 * - "Try on" button that works even when can't afford
 * - Shows "Buy — 90", "32 more coins", or "Owned"
 * - Highlights when currently being tried on
 */

import type { CatalogItem } from '@/types/database'

interface WearableCardProps {
  item: CatalogItem
  owned: boolean
  balance: number
  isTryingOn: boolean
  onTryOn: (item: CatalogItem) => void
  onBuy: (item: CatalogItem) => void
  onViewDetails: (item: CatalogItem) => void
}

export default function WearableCard({
  item,
  owned,
  balance,
  isTryingOn,
  onTryOn,
  onBuy,
  onViewDetails,
}: WearableCardProps) {
  const canAfford = balance >= item.price
  const coinsNeeded = item.price - balance

  return (
    <div
      className={`
        relative flex flex-col items-center p-3 rounded-xl bg-white dark:bg-gray-800
        shadow-sm border-2 transition-all
        ${isTryingOn
          ? 'border-primary-400 dark:border-primary-500 ring-2 ring-primary-400/30'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Trying on badge */}
      {isTryingOn && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-primary-500 text-white text-[10px] font-medium">
          Trying on
        </span>
      )}

      {/* Item preview - tap to view details */}
      <button
        onClick={() => onViewDetails(item)}
        className="w-full flex flex-col items-center focus-ring rounded-lg"
      >
        {/* Item sprite placeholder */}
        <div
          className="w-14 h-14 rounded-lg flex items-center justify-center mb-2"
          style={{ backgroundColor: getCategoryColor(item.category) }}
        >
          <span className="text-2xl">{getCategoryEmoji(item.category)}</span>
        </div>

        {/* Item name */}
        <span className="text-sm font-medium text-gray-900 dark:text-white text-center line-clamp-2 mb-2 min-h-[2.5rem]">
          {item.name}
        </span>
      </button>

      {/* Action buttons */}
      <div className="w-full space-y-2">
        {owned ? (
          <span className="block text-center text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1.5 rounded-full">
            Owned
          </span>
        ) : (
          <>
            {/* Try on button - always enabled */}
            <button
              onClick={() => onTryOn(item)}
              disabled={isTryingOn}
              className={`
                w-full text-xs font-medium px-3 py-1.5 rounded-full transition-colors
                ${isTryingOn
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {isTryingOn ? 'Wearing' : 'Try on'}
            </button>

            {/* Buy button */}
            {canAfford ? (
              <button
                onClick={() => onBuy(item)}
                className="w-full text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-full transition-colors flex items-center justify-center gap-1"
              >
                <span>Buy</span>
                <span className="opacity-80">—</span>
                <span className="flex items-center gap-0.5">
                  <CoinIcon />
                  {item.price}
                </span>
              </button>
            ) : (
              <span className="block text-center text-xs font-medium text-amber-600 dark:text-amber-400 py-1.5">
                <span className="flex items-center justify-center gap-1">
                  <CoinIcon />
                  {coinsNeeded} more
                </span>
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CoinIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.3" />
      <circle cx="10" cy="10" r="6" fill="currentColor" />
    </svg>
  )
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'clothing_top': return '#8b5cf6'
    case 'clothing_bottom': return '#3b82f6'
    case 'clothing_shoes': return '#78716c'
    case 'accessory': return '#ec4899'
    case 'hair': return '#f59e0b'
    default: return '#6b7280'
  }
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'clothing_top': return '👕'
    case 'clothing_bottom': return '👖'
    case 'clothing_shoes': return '👟'
    case 'accessory': return '🎀'
    case 'hair': return '💇'
    default: return '✨'
  }
}
