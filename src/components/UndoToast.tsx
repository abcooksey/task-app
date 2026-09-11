import { useEffect, useState } from 'react'
import { getRepairById } from '@/lib/houseState'

interface UndoToastProps {
  repairId: string | null
  onUndo: () => void
  timeRemaining: number
  isUndoing: boolean
}

const UNDO_WINDOW_MS = 5000

export default function UndoToast({
  repairId,
  onUndo,
  timeRemaining,
  isUndoing,
}: UndoToastProps) {
  const [progress, setProgress] = useState(100)

  // Update progress bar
  useEffect(() => {
    if (!repairId) {
      setProgress(100)
      return
    }

    const updateProgress = () => {
      const remaining = Math.max(0, timeRemaining)
      setProgress((remaining / UNDO_WINDOW_MS) * 100)
    }

    updateProgress()
    const interval = setInterval(updateProgress, 50)
    return () => clearInterval(interval)
  }, [repairId, timeRemaining])

  if (!repairId) return null

  const repair = getRepairById(repairId)
  if (!repair) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 flex justify-center pointer-events-none">
      <div className="bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden pointer-events-auto max-w-sm w-full">
        {/* Progress bar */}
        <div className="h-1 bg-gray-700">
          <div
            className="h-full bg-primary-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span className="text-sm">
              {repair.name} · <span className="text-primary-400">{repair.cost} invested</span>
            </span>
          </div>
          <button
            onClick={onUndo}
            disabled={isUndoing}
            className="px-3 py-1 text-sm font-medium bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
          >
            {isUndoing ? 'Undoing...' : 'Undo'}
          </button>
        </div>
      </div>
    </div>
  )
}
