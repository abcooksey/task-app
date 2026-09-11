/**
 * PlaceholderLayer - Renders a colored rectangle with layer name label.
 *
 * Used when:
 * - usePlaceholderArt mode is enabled
 * - A texture is missing
 *
 * Each layer type has a distinct color for easy visual debugging.
 */

import type { LayerName } from '@/game/avatar/types'

// =============================================================================
// Layer Colors
// =============================================================================

/**
 * Distinct colors for each layer type.
 * Colors chosen to be easily distinguishable in a stack.
 */
const LAYER_COLORS: Record<LayerName, { bg: string; text: string; label: string }> = {
  hair_back: {
    bg: 'bg-amber-700',
    text: 'text-amber-100',
    label: 'Hair (Back)',
  },
  body: {
    bg: 'bg-orange-300',
    text: 'text-orange-900',
    label: 'Body',
  },
  eyes: {
    bg: 'bg-sky-400',
    text: 'text-sky-900',
    label: 'Eyes',
  },
  bottom: {
    bg: 'bg-indigo-500',
    text: 'text-indigo-100',
    label: 'Bottom',
  },
  shoes: {
    bg: 'bg-stone-600',
    text: 'text-stone-100',
    label: 'Shoes',
  },
  top: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-100',
    label: 'Top',
  },
  hair_front: {
    bg: 'bg-amber-500',
    text: 'text-amber-900',
    label: 'Hair (Front)',
  },
  accessory: {
    bg: 'bg-pink-400',
    text: 'text-pink-900',
    label: 'Accessory',
  },
}

// =============================================================================
// Component
// =============================================================================

export interface PlaceholderLayerProps {
  /** Which layer this represents */
  layerName: LayerName

  /** Width in pixels */
  width?: number

  /** Height in pixels */
  height?: number

  /** Whether to show the label */
  showLabel?: boolean

  /** Z-index for stacking */
  zIndex?: number

  /** Whether the layer is flipped horizontally */
  flipped?: boolean
}

export function PlaceholderLayer({
  layerName,
  width = 64,
  height = 64,
  showLabel = true,
  zIndex = 0,
  flipped = false,
}: PlaceholderLayerProps) {
  const colors = LAYER_COLORS[layerName] ?? {
    bg: 'bg-gray-400',
    text: 'text-gray-900',
    label: layerName,
  }

  return (
    <div
      className={`absolute ${colors.bg} flex items-center justify-center`}
      style={{
        width,
        height,
        zIndex,
        transform: flipped ? 'scaleX(-1)' : undefined,
        // Offset layers slightly for visibility in stack
        top: getLayerOffset(layerName),
        left: 0,
      }}
      aria-hidden="true"
    >
      {showLabel && (
        <span
          className={`${colors.text} text-[8px] font-bold text-center px-1 leading-tight`}
          style={{
            // Un-flip text if layer is flipped
            transform: flipped ? 'scaleX(-1)' : undefined,
          }}
        >
          {colors.label}
        </span>
      )}
    </div>
  )
}

/**
 * Get vertical offset for a layer in placeholder mode.
 * This helps visualize the layer stack by offsetting each layer slightly.
 */
function getLayerOffset(layerName: LayerName): number {
  const offsets: Record<LayerName, number> = {
    hair_back: 0,
    body: 4,
    eyes: 8,
    bottom: 12,
    shoes: 16,
    top: 20,
    hair_front: 24,
    accessory: 28,
  }
  return offsets[layerName] ?? 0
}

/**
 * Export layer colors for use in other components (e.g., wardrobe UI).
 */
export { LAYER_COLORS }
