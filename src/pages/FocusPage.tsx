import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useFocusTimer, formatTime, formatRemaining } from '@/hooks/useFocusTimer'
import { useHouseState } from '@/hooks/useHouseState'
import Toast from '@/components/Toast'

const PRESETS = [10, 25, 50]
const MIN_MINUTES = 5
const MAX_MINUTES = 90

export default function FocusPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const taskId = searchParams.get('taskId')

  const { sfxEnabled } = useHouseState()
  const {
    session,
    isLoading,
    elapsedSeconds,
    plannedSeconds,
    completedChunks,
    earnedCoins,
    progress,
    isComplete,
    isStopped,
    isRunning,
    isPaused,
    hasSession,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    clearSession,
    isStarting,
    isUpdating,
  } = useFocusTimer()

  const [selectedMinutes, setSelectedMinutes] = useState(25)
  const [customMinutes, setCustomMinutes] = useState('')
  const [showBodyDouble, setShowBodyDouble] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; action?: { label: string; onClick: () => void } } | null>(null)

  // Load body double preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('focusBodyDouble')
    if (saved === 'true') setShowBodyDouble(true)
  }, [])

  // Save body double preference
  const toggleBodyDouble = useCallback(() => {
    setShowBodyDouble(prev => {
      localStorage.setItem('focusBodyDouble', String(!prev))
      return !prev
    })
  }, [])

  // Handle completion
  useEffect(() => {
    if (isComplete && session) {
      // Play completion sound if SFX enabled
      if (sfxEnabled) {
        // Would play chime here
      }

      // Show toast
      const coinsText = `You earned ${earnedCoins} coins!`
      if (session.task_id) {
        setToastMessage({
          text: coinsText,
          action: {
            label: 'Mark task done',
            onClick: () => {
              // Navigate to task completion - would need integration
              clearSession()
            },
          },
        })
      } else {
        setToastMessage({ text: coinsText })
      }

      // Send notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification('Focus session complete!', {
          body: coinsText,
          icon: '/icon-192.png',
        })
      }
    }
  }, [isComplete, session, earnedCoins, sfxEnabled, clearSession])

  // Handle early stop
  useEffect(() => {
    if (isStopped && earnedCoins > 0) {
      setToastMessage({ text: `Session ended. You earned ${earnedCoins} coins.` })
    }
  }, [isStopped, earnedCoins])

  const handleStart = async () => {
    const minutes = customMinutes ? parseInt(customMinutes) : selectedMinutes
    if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) return

    try {
      await startSession(minutes, taskId ?? undefined)
    } catch (err) {
      console.error('Failed to start session:', err)
    }
  }

  const handleCustomChange = (value: string) => {
    const num = parseInt(value)
    if (value === '' || (num >= 1 && num <= MAX_MINUTES)) {
      setCustomMinutes(value)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Active session view
  if (hasSession || isComplete || isStopped) {
    const remaining = formatRemaining(elapsedSeconds, plannedSeconds)
    const elapsed = formatTime(elapsedSeconds)

    return (
      <div className="flex flex-col items-center py-8">
        {/* Progress ring */}
        <div className="relative w-64 h-64 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${progress * 283} 283`}
              className={isComplete ? 'text-green-500' : 'text-primary-600'}
            />
          </svg>

          {/* Timer display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums">
              {isComplete ? elapsed : remaining}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isComplete ? 'Complete!' : isPaused ? 'Paused' : 'remaining'}
            </span>
          </div>
        </div>

        {/* Coins earned */}
        <div className="flex items-center gap-2 mb-8 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-full">
          <span className="text-xl">🪙</span>
          <span className="font-semibold">{earnedCoins} earned</span>
          {completedChunks > 0 && (
            <span className="text-sm opacity-75">({completedChunks} chunks)</span>
          )}
        </div>

        {/* Controls */}
        {!isComplete && !isStopped && (
          <div className="flex gap-4">
            {isRunning ? (
              <button
                onClick={pauseSession}
                disabled={isUpdating}
                className="px-6 py-3 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus-ring"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={resumeSession}
                disabled={isUpdating}
                className="px-6 py-3 rounded-xl font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors focus-ring"
              >
                Resume
              </button>
            )}

            <button
              onClick={stopSession}
              disabled={isUpdating}
              className="px-6 py-3 rounded-xl font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors focus-ring"
            >
              Stop
            </button>
          </div>
        )}

        {/* Completed/Stopped actions */}
        {(isComplete || isStopped) && (
          <div className="flex gap-4">
            <button
              onClick={() => {
                clearSession()
                setToastMessage(null)
              }}
              className="px-6 py-3 rounded-xl font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors focus-ring"
            >
              New Session
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus-ring"
            >
              Back to Tasks
            </button>
          </div>
        )}

        {/* Body double */}
        <div className="mt-8">
          <button
            onClick={toggleBodyDouble}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showBodyDouble
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <span className="text-xl">👤</span>
            <span className="text-sm font-medium">Body double</span>
          </button>

          {showBodyDouble && (
            <div className="mt-4 flex justify-center">
              <div className="w-16 h-16 bg-primary-200 dark:bg-primary-800 rounded-full flex items-center justify-center">
                <span className="text-2xl">🧑‍💻</span>
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {toastMessage && (
          <Toast
            message={toastMessage.text}
            type="success"
            onClose={() => setToastMessage(null)}
            action={toastMessage.action}
            duration={toastMessage.action ? 10000 : 5000}
          />
        )}
      </div>
    )
  }

  // Start session view
  return (
    <div className="space-y-8 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Focus Timer
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Earn 3 coins for every 5 minutes. Complete the full session for a +10 bonus!
        </p>
      </div>

      {/* Linked task indicator */}
      {taskId && (
        <div className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-4 py-3 rounded-xl text-center">
          <span className="text-sm">Session will be linked to your task</span>
        </div>
      )}

      {/* Presets */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Quick start
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map(minutes => (
            <button
              key={minutes}
              onClick={() => {
                setSelectedMinutes(minutes)
                setCustomMinutes('')
              }}
              className={`py-4 rounded-xl font-semibold transition-colors focus-ring ${
                selectedMinutes === minutes && !customMinutes
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </div>

      {/* Custom duration */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Custom duration
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            value={customMinutes}
            onChange={e => handleCustomChange(e.target.value)}
            placeholder="Enter minutes"
            className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-gray-500 dark:text-gray-400">min</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {MIN_MINUTES}–{MAX_MINUTES} minutes
        </p>
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={isStarting}
        className="w-full py-4 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 transition-colors focus-ring text-lg"
      >
        {isStarting ? 'Starting...' : `Start ${customMinutes || selectedMinutes} minute session`}
      </button>

      {/* Estimated earnings */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <span>Potential earnings: </span>
        <span className="font-semibold text-amber-600 dark:text-amber-400">
          {Math.floor((customMinutes ? parseInt(customMinutes) : selectedMinutes) / 5) * 3 + 10} coins
        </span>
        <span> (if completed)</span>
      </div>
    </div>
  )
}
