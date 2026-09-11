import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Phaser from 'phaser'
import { bridge } from './bridge'
import { HouseScene } from './scenes/HouseScene'
import { useHouseState } from '@/hooks/useHouseState'
import { usePerformRepair } from '@/hooks/usePerformRepair'
import { useBalance } from '@/hooks/useBalance'
import { useReducedMotion } from '@/hooks/useSettings'
import { useAvatar } from '@/hooks/useAvatar'
import { deriveHouseState } from '@/lib/houseState'
import RepairSheet from '@/components/RepairSheet'
import UndoToast from '@/components/UndoToast'
import ErrorToast from '@/components/ErrorToast'

/**
 * React wrapper for the Phaser game.
 *
 * Responsibilities:
 * - Mount/destroy Phaser instance on component lifecycle
 * - Push state changes to Phaser via bridge
 * - Render React HUD/overlays on top of canvas
 * - Handle repair sheet and undo toast
 */
export default function HouseGame() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null)
  const [showDecoratingTeaser, setShowDecoratingTeaser] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasShownTeaserRef = useRef(false)

  // Get house state from database
  const {
    state: houseState,
    lastView,
    isLoading: stateLoading,
    updatePrefs,
  } = useHouseState()

  // Get balance for repair affordability
  const { balance } = useBalance()

  // Get reduced motion preference
  const reducedMotion = useReducedMotion()

  // Get avatar appearance (Phase 4)
  const { appearance } = useAvatar()

  // Repair mutation with undo
  const {
    performRepair,
    undoRepair,
    isRepairing,
    isUndoing,
    canUndo,
    undoTimeRemaining,
    undoRepairId,
  } = usePerformRepair()

  // Local view state (initialized from lastView preference)
  const [currentView, setCurrentView] = useState<'interior' | 'exterior'>(lastView)

  // Sync view with saved preference when it loads
  useEffect(() => {
    if (!stateLoading && lastView) {
      setCurrentView(lastView)
    }
  }, [lastView, stateLoading])

  // Use real state or fall back to empty state while loading
  const effectiveState = houseState ?? deriveHouseState([], false)

  // Check for interior completion to show decorating teaser
  useEffect(() => {
    if (effectiveState.decoratingUnlocked && !hasShownTeaserRef.current) {
      hasShownTeaserRef.current = true
      // Delay teaser to show after celebration
      const timer = setTimeout(() => {
        setShowDecoratingTeaser(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [effectiveState.decoratingUnlocked])

  // Mount Phaser game
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 360,
      height: 640,
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      backgroundColor: '#1a1a2e',
      scene: [HouseScene],
    }

    gameRef.current = new Phaser.Game(config)

    // Listen for ready event
    const unsubReady = bridge.on('ready', () => {
      setIsReady(true)
    })

    // Listen for hotspot taps
    const unsubHotspotTapped = bridge.on('hotspotTapped', ({ repairId }) => {
      setSelectedRepairId(repairId)
      bridge.emit('setSelected', { repairId })
    })

    // Listen for avatar taps (Phase 4)
    const unsubAvatarTapped = bridge.on('avatarTapped', () => {
      navigate('/wardrobe')
    })

    return () => {
      unsubReady()
      unsubHotspotTapped()
      unsubAvatarTapped()
      bridge.clear()
      gameRef.current?.destroy(true)
      gameRef.current = null
      setIsReady(false)
    }
  }, [navigate])

  // Push state to Phaser when ready or state changes
  useEffect(() => {
    if (isReady && effectiveState) {
      bridge.emit('setHouseState', { state: effectiveState })
    }
  }, [isReady, effectiveState])

  // Push view changes to Phaser
  useEffect(() => {
    if (isReady) {
      bridge.emit('setView', { view: currentView })
    }
  }, [currentView, isReady])

  // Push reduced motion setting to Phaser
  useEffect(() => {
    if (isReady) {
      bridge.emit('setReducedMotion', { enabled: reducedMotion })
    }
  }, [isReady, reducedMotion])

  // Push avatar appearance to Phaser (Phase 4)
  useEffect(() => {
    if (isReady) {
      bridge.emit('setAvatar', { appearance: appearance ?? null })
    }
  }, [isReady, appearance])

  // Handle view toggle
  const handleViewToggle = useCallback((view: 'interior' | 'exterior') => {
    setCurrentView(view)
    // Persist the view preference
    updatePrefs({ lastView: view })
  }, [updatePrefs])

  // Handle sheet close
  const handleSheetClose = useCallback(() => {
    setSelectedRepairId(null)
    bridge.emit('setSelected', { repairId: null })
  }, [])

  // Handle repair
  const handleRepair = useCallback(async (repairId: string) => {
    try {
      // Close sheet immediately for optimistic feel
      handleSheetClose()

      // Perform the repair first
      await performRepair(repairId)

      // Only play animation after successful repair
      bridge.emit('playRepair', { repairId })
    } catch (error) {
      // Show error to user
      const message = error instanceof Error ? error.message : 'Repair failed'
      setErrorMessage(message)
    }
  }, [handleSheetClose, performRepair])

  // Dismiss error
  const handleDismissError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  // Dismiss decorating teaser
  const handleDismissTeaser = useCallback(() => {
    setShowDecoratingTeaser(false)
  }, [])

  const progress = currentView === 'interior'
    ? effectiveState.progress.interior
    : effectiveState.progress.exterior

  const isLoading = stateLoading || !isReady

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gray-900">
      {/* Phaser canvas container */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
      />

      {/* React HUD overlay */}
      <div className="absolute inset-x-0 top-0 p-4 pointer-events-none">
        <div className="flex items-center justify-between max-w-md mx-auto pointer-events-auto">
          {/* View toggle */}
          <div className="flex bg-gray-800/80 rounded-lg p-1 backdrop-blur-sm">
            <button
              onClick={() => handleViewToggle('interior')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentView === 'interior'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Inside
            </button>
            <button
              onClick={() => handleViewToggle('exterior')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentView === 'exterior'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Outside
            </button>
          </div>

          {/* Progress ring */}
          <div className="flex items-center gap-2 bg-gray-800/80 rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <ProgressRing
              progress={progress.done}
              total={progress.total}
              size={24}
            />
            <span className="text-sm text-gray-300">
              {progress.done}/{progress.total}
            </span>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-gray-400 animate-pulse">Loading house...</div>
        </div>
      )}

      {/* First-repair guidance hint */}
      {!isLoading && !effectiveState.firstRepairDone && (
        <FirstRepairHint currentView={currentView} />
      )}

      {/* Repair sheet */}
      <RepairSheet
        repairId={selectedRepairId}
        houseState={effectiveState}
        balance={balance}
        onClose={handleSheetClose}
        onRepair={handleRepair}
        isRepairing={isRepairing}
      />

      {/* Undo toast */}
      <UndoToast
        repairId={canUndo ? undoRepairId : null}
        onUndo={undoRepair}
        timeRemaining={undoTimeRemaining}
        isUndoing={isUndoing}
      />

      {/* Error toast */}
      <ErrorToast
        message={errorMessage}
        onDismiss={handleDismissError}
      />

      {/* Decorating teaser */}
      {showDecoratingTeaser && (
        <DecoratingTeaser onDismiss={handleDismissTeaser} />
      )}
    </div>
  )
}

/**
 * Decorating teaser shown after interior completion
 */
function DecoratingTeaser({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onDismiss}
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm animate-slide-up">
        <div className="text-center">
          <div className="text-4xl mb-3">🎨</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Interior Complete!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Decorating mode is coming next. Soon you&apos;ll be able to add furniture and personal touches!
          </p>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Simple progress ring component
 */
function ProgressRing({
  progress,
  total,
  size = 24,
}: {
  progress: number
  total: number
  size?: number
}) {
  const percentage = total > 0 ? progress / total : 0
  const circumference = 2 * Math.PI * (size / 2 - 2)
  const strokeDashoffset = circumference * (1 - percentage)

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 2}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-gray-600"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 2}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="text-primary-500 transition-all duration-300"
      />
    </svg>
  )
}

/**
 * First-repair guidance hint for new users
 */
function FirstRepairHint({ currentView }: { currentView: 'interior' | 'exterior' }) {
  const hintText = currentView === 'interior'
    ? 'Tap a green hotspot to start your first repair!'
    : 'Tap a green hotspot to start fixing up the yard!'

  return (
    <div className="absolute bottom-32 left-4 right-4 flex justify-center pointer-events-none">
      <div className="bg-primary-600/90 text-white rounded-lg px-4 py-2 shadow-lg backdrop-blur-sm animate-bounce-subtle">
        <p className="text-sm font-medium text-center">{hintText}</p>
      </div>
    </div>
  )
}
