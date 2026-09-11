/**
 * QuickOutfitPicker - Compact outfit switcher shown on header avatar tap.
 *
 * Features:
 * - Shows first 3 saved outfits
 * - "More..." link to full wardrobe
 * - Positioned as dropdown from header
 */

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvatarPreview } from './AvatarPreview'
import { correctAppearance } from '@/game/avatar/validateAppearance'
import { useAvatar } from '@/hooks/useAvatar'
import type { Outfit } from '@/game/avatar/types'

interface QuickOutfitPickerProps {
  outfits: Outfit[]
  onSelectOutfit: (outfit: Outfit) => void
  onClose: () => void
}

export function QuickOutfitPicker({
  outfits,
  onSelectOutfit,
  onClose,
}: QuickOutfitPickerProps) {
  const navigate = useNavigate()
  const pickerRef = useRef<HTMLDivElement>(null)
  const { ownedWearables } = useAvatar()

  // Create owned set for validation
  const ownedSet = new Set(ownedWearables)

  // Show first 3 outfits (sorted by sortIndex)
  const displayOutfits = [...outfits]
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .slice(0, 3)

  // Handle outfit selection with validation
  const handleSelectOutfit = (outfit: Outfit) => {
    // Correct any unowned items silently
    const correctedAppearance = correctAppearance(outfit.appearance, ownedSet)
    onSelectOutfit({ ...outfit, appearance: correctedAppearance })
  }

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleMoreClick = () => {
    onClose()
    navigate('/wardrobe?tab=outfits')
  }

  if (outfits.length === 0) {
    // No outfits saved, just go to wardrobe
    return (
      <div
        ref={pickerRef}
        className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px] z-50"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          No saved outfits yet
        </p>
        <button
          onClick={handleMoreClick}
          className="w-full py-2 px-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Open Wardrobe
        </button>
      </div>
    )
  }

  return (
    <div
      ref={pickerRef}
      className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50"
    >
      {/* Outfit buttons */}
      <div className="flex gap-2">
        {displayOutfits.map(outfit => (
          <button
            key={outfit.id}
            onClick={() => {
              handleSelectOutfit(outfit)
              onClose()
            }}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-target"
            aria-label={`Wear ${outfit.name}`}
          >
            <div className="w-12 h-12 mb-1">
              <AvatarPreview
                appearance={outfit.appearance}
                size="small"
                animate={false}
                usePlaceholderArt={true}
              />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[56px]">
              {outfit.name}
            </span>
          </button>
        ))}
      </div>

      {/* More link */}
      <button
        onClick={handleMoreClick}
        className="w-full mt-2 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border-t border-gray-200 dark:border-gray-700"
      >
        More...
      </button>
    </div>
  )
}
