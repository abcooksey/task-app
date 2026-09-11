import { useNavigate } from 'react-router-dom'
import { useFocusTimer, formatTime } from '@/hooks/useFocusTimer'

interface StaleSessionModalProps {
  onDismiss: () => void
}

export default function StaleSessionModal({ onDismiss }: StaleSessionModalProps) {
  const navigate = useNavigate()
  const { session, elapsedSeconds, earnedCoins, stopSession, isUpdating } = useFocusTimer()

  if (!session) return null

  const handleResume = () => {
    navigate('/focus')
    onDismiss()
  }

  const handleStop = async () => {
    await stopSession()
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Session in progress
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You have a focus session that was running. Would you like to continue?
          </p>
        </div>

        {/* Session info */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Duration</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {session.planned_minutes} minutes
            </span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-500 dark:text-gray-400">Elapsed</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-500 dark:text-gray-400">Coins earned</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {earnedCoins}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleStop}
            disabled={isUpdating}
            className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus-ring"
          >
            {isUpdating ? 'Stopping...' : 'Stop & collect'}
          </button>
          <button
            onClick={handleResume}
            className="flex-1 py-3 px-4 rounded-xl font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors focus-ring"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
