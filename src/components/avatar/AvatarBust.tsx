/**
 * AvatarBust - Small avatar preview for Today header.
 *
 * Shows head and shoulders only (cropped from full layers).
 * Features:
 * - Small idle animation
 * - Tap to show quick outfit picker (last 3 outfits)
 * - "More..." opens full wardrobe
 * - Cheer animation on task completion (300ms hop)
 * - Static under reduced motion
 */

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { AvatarPreview } from './AvatarPreview'
import { QuickOutfitPicker } from './QuickOutfitPicker'
import { useAvatar } from '@/hooks/useAvatar'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Reaction, Outfit } from '@/game/avatar/types'

export interface AvatarBustHandle {
  playCheer: () => void
}

interface AvatarBustProps {
  className?: string
}

export const AvatarBust = forwardRef<AvatarBustHandle, AvatarBustProps>(
  function AvatarBust({ className = '' }, ref) {
    const { appearance, outfits, saveAppearance } = useAvatar()
    const prefersReducedMotion = useReducedMotion()

    const [isAnimating, setIsAnimating] = useState(false)
    const [reaction, setReaction] = useState<Reaction | undefined>(undefined)
    const [showPicker, setShowPicker] = useState(false)

    // Expose playCheer method to parent
    const playCheer = useCallback(() => {
      if (prefersReducedMotion) return

      setReaction('cheer')
      setIsAnimating(true)

      // Clear animation after 300ms
      setTimeout(() => {
        setReaction(undefined)
        setIsAnimating(false)
      }, 300)
    }, [prefersReducedMotion])

    useImperativeHandle(ref, () => ({
      playCheer,
    }), [playCheer])

    const handleClick = useCallback(() => {
      setShowPicker(prev => !prev)
    }, [])

    const handleSelectOutfit = useCallback((outfit: Outfit) => {
      saveAppearance(outfit.appearance)
    }, [saveAppearance])

    // Don't render if no appearance
    if (!appearance) {
      return (
        <div
          className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
        />
      )
    }

    return (
      <div className={`relative ${className}`}>
        <div
          className={`
            relative overflow-hidden rounded-full
            cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500
            ${isAnimating ? 'animate-hop' : ''}
          `}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleClick()
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Quick outfit picker"
          aria-expanded={showPicker}
        >
          {/* Circular clipping mask */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-100 dark:bg-gray-700">
            {/* Avatar preview - offset to show upper body */}
            <div className="transform -translate-y-1 scale-110">
              <AvatarPreview
                appearance={appearance}
                pose="stand"
                animate={!prefersReducedMotion}
                reaction={reaction}
                size="small"
                usePlaceholderArt={true}
              />
            </div>
          </div>
        </div>

        {/* Quick outfit picker dropdown */}
        {showPicker && (
          <QuickOutfitPicker
            outfits={outfits}
            onSelectOutfit={handleSelectOutfit}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    )
  }
)

export default AvatarBust
