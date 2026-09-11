import type { CatalogItem } from '@/types/database'

interface PlacementActionsProps {
  itemName: string
  catalogItem: CatalogItem | null
  onMove: () => void
  onFlip: () => void
  onStore: () => void
  onClose: () => void
}

export default function PlacementActions({
  itemName,
  catalogItem,
  onMove,
  onFlip,
  onStore,
  onClose,
}: PlacementActionsProps) {
  const canFlip = catalogItem?.flipped_texture != null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
      role="toolbar"
      aria-label={`Actions for ${itemName}`}
    >
      <div className="bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 px-2 py-1.5 flex items-center gap-1">
        {/* Item name */}
        <span className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate" aria-hidden="true">
          {itemName}
        </span>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />

        {/* Move button */}
        <button
          onClick={onMove}
          className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors focus-ring"
          aria-label={`Move ${itemName}`}
          title="Move"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>

        {/* Flip button */}
        <button
          onClick={onFlip}
          disabled={!canFlip}
          className={`p-2 rounded-full transition-colors focus-ring ${
            canFlip
              ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }`}
          aria-label={canFlip ? `Flip ${itemName}` : `${itemName} cannot be flipped`}
          aria-disabled={!canFlip}
          title={canFlip ? 'Flip' : 'Cannot flip'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>

        {/* Store button */}
        <button
          onClick={onStore}
          className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors focus-ring"
          aria-label={`Store ${itemName} back to inventory`}
          title="Store"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus-ring"
          aria-label={`Deselect ${itemName}`}
          title="Deselect"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
