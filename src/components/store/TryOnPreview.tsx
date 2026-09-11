/**
 * TryOnPreview - Avatar preview in store header showing tried-on items.
 *
 * Features:
 * - Shows avatar with current try-on items
 * - "Wearing N unowned items" pill
 * - Reset button to clear all try-ons
 */

import { AvatarPreview } from '@/components/avatar'
import type { Appearance } from '@/game/avatar/types'

interface TryOnPreviewProps {
  appearance: Appearance | null
  tryOnCount: number
  onReset: () => void
}

export default function TryOnPreview({ appearance, tryOnCount, onReset }: TryOnPreviewProps) {
  if (!appearance) return null

  return (
    <div className="relative bg-gradient-to-b from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <AvatarPreview
            appearance={appearance}
            size="large"
            animate={true}
            usePlaceholderArt={true}
          />
        </div>

        {/* Try-on info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Try Before You Buy
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Tap "Try on" to preview items on your avatar
          </p>

          {tryOnCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Wearing {tryOnCount} unowned {tryOnCount === 1 ? 'item' : 'items'}
              </span>
              <button
                onClick={onReset}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
