import { useEffect, useRef } from 'react'
import { getRepairById, getRepairStatus, getRepairCoinGap, type RepairStatus } from '@/lib/houseState'
import type { HouseState } from '@/game/bridge'

interface RepairSheetProps {
  repairId: string | null
  houseState: HouseState | null
  balance: number
  onClose: () => void
  onRepair: (repairId: string) => void
  isRepairing: boolean
}

export default function RepairSheet({
  repairId,
  houseState,
  balance,
  onClose,
  onRepair,
  isRepairing,
}: RepairSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus close button when sheet opens
  useEffect(() => {
    if (repairId && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [repairId])

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (repairId) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [repairId, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (repairId) {
      // Delay to prevent immediate close from the tap that opened it
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [repairId, onClose])

  if (!repairId) return null

  const repair = getRepairById(repairId)
  if (!repair) return null

  const status: RepairStatus = houseState
    ? getRepairStatus(repairId, houseState)
    : 'locked'

  const coinGap = getRepairCoinGap(repairId, balance)
  const isAffordable = coinGap === 0

  // Determine button state and text
  let buttonText = ''
  let buttonDisabled = true
  let buttonClass = ''

  if (status === 'completed') {
    buttonText = 'Already Fixed'
    buttonClass = 'bg-gray-600 text-gray-400 cursor-not-allowed'
  } else if (status === 'locked') {
    buttonText = 'Locked'
    buttonClass = 'bg-gray-600 text-gray-400 cursor-not-allowed'
  } else if (!isAffordable) {
    buttonText = `Need ${coinGap} more coins`
    buttonClass = 'bg-gray-600 text-gray-300 cursor-not-allowed'
  } else {
    buttonText = `Fix for ${repair.cost} coins`
    buttonDisabled = false
    buttonClass = 'bg-primary-600 hover:bg-primary-700 text-white'
  }

  if (isRepairing) {
    buttonText = 'Fixing...'
    buttonDisabled = true
    buttonClass = 'bg-primary-600 text-white opacity-75'
  }

  const handleRepair = () => {
    if (!buttonDisabled && !isRepairing) {
      onRepair(repairId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-labelledby="repair-title"
        aria-describedby="repair-description"
        className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl animate-slide-up"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2
                id="repair-title"
                className="text-xl font-semibold text-gray-900 dark:text-white"
              >
                {repair.name}
              </h2>
              <p
                id="repair-description"
                className="mt-1 text-gray-600 dark:text-gray-400"
              >
                {repair.blurb}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-ring rounded"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cost display */}
          <div className="flex items-center gap-2 mb-6 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">🪙</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {repair.cost}
            </span>
            <span className="text-gray-500 dark:text-gray-400">coins</span>
            {status === 'available' && !isAffordable && (
              <span className="ml-auto text-sm text-amber-600 dark:text-amber-400">
                You have {balance}
              </span>
            )}
          </div>

          {/* Status indicator for locked repairs */}
          {status === 'locked' && repair.requires.length > 0 && (
            <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Requires:</span>{' '}
              {repair.requires.map(reqId => {
                const reqRepair = getRepairById(reqId)
                return reqRepair?.name ?? reqId
              }).join(', ')}
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleRepair}
            disabled={buttonDisabled || isRepairing}
            className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-colors focus-ring ${buttonClass}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}
