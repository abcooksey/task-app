/**
 * WardrobePreview - Large avatar preview for wardrobe screen.
 *
 * Features:
 * - Large size avatar display
 * - Flip button to mirror the avatar
 * - Clickable to open detail/edit
 */

import { useState } from 'react'
import { AvatarPreview } from '@/components/avatar'
import type { Appearance } from '@/game/avatar/types'

interface WardrobePreviewProps {
  appearance: Appearance
  className?: string
}

export function WardrobePreview({ appearance, className = '' }: WardrobePreviewProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Avatar container with background */}
      <div className="relative bg-gradient-to-b from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 w-full max-w-xs">
        <div className="flex justify-center">
          <AvatarPreview
            appearance={appearance}
            size="large"
            animate={true}
            flipped={flipped}
            usePlaceholderArt={true}
          />
        </div>

        {/* Flip button */}
        <button
          onClick={() => setFlipped(!flipped)}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 transition-colors touch-target"
          aria-label={flipped ? 'Flip avatar to face right' : 'Flip avatar to face left'}
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
