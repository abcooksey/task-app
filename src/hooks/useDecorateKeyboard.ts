import { useEffect, useCallback } from 'react'
import { bridge } from '@/game/bridge'

interface UseDecorateKeyboardProps {
  isDecorateMode: boolean
  isPlacing: boolean
  selectedPlacementId: string | null
  onFlip: () => void
  onCancelPlacing: () => void
  onDeselect: () => void
  onExitDecorateMode: () => void
  onNudgeGhost?: (dx: number, dy: number) => void
  onConfirmGhost?: () => void
}

/**
 * Hook to handle keyboard shortcuts in decorate mode.
 *
 * Shortcuts:
 * - Arrow keys: Nudge ghost position by one cell
 * - F: Flip selected item
 * - Enter: Confirm ghost placement
 * - Escape: Cancel placement / Deselect / Exit decorate mode
 */
export function useDecorateKeyboard({
  isDecorateMode,
  isPlacing,
  selectedPlacementId,
  onFlip,
  onCancelPlacing,
  onDeselect,
  onExitDecorateMode,
  onNudgeGhost,
  onConfirmGhost,
}: UseDecorateKeyboardProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle when in decorate mode
    if (!isDecorateMode) return

    // Don't handle if focus is on an input element
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return
    }

    switch (e.key) {
      case 'ArrowUp':
        if (isPlacing && onNudgeGhost) {
          e.preventDefault()
          onNudgeGhost(0, -1)
        }
        break

      case 'ArrowDown':
        if (isPlacing && onNudgeGhost) {
          e.preventDefault()
          onNudgeGhost(0, 1)
        }
        break

      case 'ArrowLeft':
        if (isPlacing && onNudgeGhost) {
          e.preventDefault()
          onNudgeGhost(-1, 0)
        }
        break

      case 'ArrowRight':
        if (isPlacing && onNudgeGhost) {
          e.preventDefault()
          onNudgeGhost(1, 0)
        }
        break

      case 'f':
      case 'F':
        if (selectedPlacementId) {
          e.preventDefault()
          onFlip()
        }
        break

      case 'Enter':
        if (isPlacing && onConfirmGhost) {
          e.preventDefault()
          onConfirmGhost()
        }
        break

      case 'Escape':
        e.preventDefault()
        if (isPlacing) {
          onCancelPlacing()
        } else if (selectedPlacementId) {
          onDeselect()
        } else {
          onExitDecorateMode()
        }
        break
    }
  }, [
    isDecorateMode,
    isPlacing,
    selectedPlacementId,
    onFlip,
    onCancelPlacing,
    onDeselect,
    onExitDecorateMode,
    onNudgeGhost,
    onConfirmGhost,
  ])

  useEffect(() => {
    if (!isDecorateMode) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDecorateMode, handleKeyDown])
}

/**
 * Hook to emit ghost nudge commands to Phaser.
 * Returns a function to nudge the ghost by delta cells.
 */
export function useGhostNudge() {
  return useCallback((dx: number, dy: number) => {
    bridge.emit('nudgeGhost', { dx, dy })
  }, [])
}
