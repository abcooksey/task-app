/**
 * AvatarPreview - Renders the avatar as stacked DOM elements.
 *
 * Used in:
 * - Wardrobe screen (large preview)
 * - Today header (small bust)
 * - Focus timer (sitting at desk)
 *
 * Key features:
 * - Uses AvatarComposer.resolve() for layer list
 * - Renders stacked <img> elements with image-rendering: pixelated
 * - Supports placeholder mode (colored rectangles)
 * - Respects prefers-reduced-motion
 * - Accessible aria-label with outfit description
 */

import { useMemo } from 'react'
import { resolve, getOutfitDescription } from '@/game/avatar/AvatarComposer'
import type { Appearance, Pose, Reaction, Layer, CatalogItemForComposer } from '@/game/avatar/types'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { PlaceholderLayer } from './PlaceholderLayer'
import manifestData from '@/game/content/manifest.json'
import catalogData from '@/game/content/catalog.json'

// =============================================================================
// Types
// =============================================================================

interface ManifestAsset {
  type: 'image'
  path: string
  width: number
  height: number
}

export interface AvatarPreviewProps {
  /** The appearance to render */
  appearance: Appearance

  /** Current pose */
  pose?: Pose

  /** Whether to animate (idle breathe) */
  animate?: boolean

  /** Optional reaction animation */
  reaction?: Reaction

  /** Whether to flip horizontally */
  flipped?: boolean

  /** Size preset */
  size?: 'small' | 'medium' | 'large'

  /** Force placeholder art mode */
  usePlaceholderArt?: boolean

  /** Additional CSS classes */
  className?: string

  /** Click handler (e.g., to open wardrobe) */
  onClick?: () => void
}

// =============================================================================
// Size Presets
// =============================================================================

const SIZE_PRESETS = {
  small: { width: 32, height: 32 },
  medium: { width: 64, height: 64 },
  large: { width: 128, height: 128 },
} as const

// =============================================================================
// Catalog and Manifest Helpers
// =============================================================================

const manifest = manifestData.assets as Record<string, ManifestAsset>
const catalogItems = (catalogData.items as CatalogItemForComposer[]).reduce(
  (acc, item) => {
    acc[item.id] = item
    return acc
  },
  {} as Record<string, CatalogItemForComposer>
)

function getCatalogItem(id: string): CatalogItemForComposer | undefined {
  return catalogItems[id]
}

function textureExists(textureKey: string): boolean {
  return textureKey in manifest
}

function getTexturePath(textureKey: string): string | undefined {
  return manifest[textureKey]?.path
}

// =============================================================================
// Component
// =============================================================================

export function AvatarPreview({
  appearance,
  pose = 'stand',
  animate = true,
  reaction,
  flipped = false,
  size = 'medium',
  usePlaceholderArt = false,
  className = '',
  onClick,
}: AvatarPreviewProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animate && !prefersReducedMotion && !reaction

  // Resolve layers
  const layers = useMemo(() => {
    return resolve({
      appearance,
      getCatalogItem,
      textureExists,
      pose,
      frame: 0, // Frame will be handled by animation
      reaction,
      flipped,
      usePlaceholderArt,
    })
  }, [appearance, pose, reaction, flipped, usePlaceholderArt])

  // Get dimensions
  const { width, height } = SIZE_PRESETS[size]

  // Get accessible description
  const ariaLabel = useMemo(() => {
    return getOutfitDescription(appearance, getCatalogItem)
  }, [appearance])

  // Interactive props
  const interactiveProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        },
        className: `cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded ${className}`,
      }
    : { className }

  return (
    <div
      {...interactiveProps}
      aria-label={ariaLabel}
      style={{
        position: 'relative',
        width,
        height: height + (usePlaceholderArt ? 32 : 0), // Extra height for placeholder offsets
      }}
    >
      {/* Breathing animation wrapper */}
      <div
        className={shouldAnimate ? 'animate-breathe' : ''}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        {layers.map((layer, index) => (
          <AvatarLayer
            key={layer.layerName}
            layer={layer}
            width={width}
            height={height}
            zIndex={index}
            usePlaceholderArt={usePlaceholderArt || !!layer.isPlaceholder}
          />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Individual Layer Component
// =============================================================================

interface AvatarLayerProps {
  layer: Layer
  width: number
  height: number
  zIndex: number
  usePlaceholderArt: boolean
}

function AvatarLayer({ layer, width, height, zIndex, usePlaceholderArt }: AvatarLayerProps) {
  // Render placeholder for missing textures or placeholder mode
  if (usePlaceholderArt || layer.isPlaceholder) {
    return (
      <PlaceholderLayer
        layerName={layer.layerName}
        width={width}
        height={height}
        zIndex={zIndex}
        flipped={layer.flipped}
        showLabel={true}
      />
    )
  }

  // Get texture path from manifest
  const texturePath = getTexturePath(layer.textureKey)

  if (!texturePath) {
    // Fallback to placeholder if texture not found
    return (
      <PlaceholderLayer
        layerName={layer.layerName}
        width={width}
        height={height}
        zIndex={zIndex}
        flipped={layer.flipped}
        showLabel={true}
      />
    )
  }

  return (
    <img
      src={texturePath}
      alt="" // Decorative - description is on parent
      aria-hidden="true"
      className="absolute top-0 left-0"
      style={{
        width,
        height,
        zIndex,
        imageRendering: 'pixelated',
        transform: layer.flipped ? 'scaleX(-1)' : undefined,
        // Ensure crisp pixel art scaling
        WebkitFontSmoothing: 'none',
      }}
      draggable={false}
    />
  )
}

// =============================================================================
// Export for testing
// =============================================================================

export { getCatalogItem, textureExists, getTexturePath }
