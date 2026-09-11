import { Link } from 'react-router-dom'
import { useFocusTimer, formatRemaining } from '@/hooks/useFocusTimer'
import { useAvatar } from '@/hooks/useAvatar'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { AvatarPreview } from '@/components/avatar'

export default function FocusCard() {
  const {
    session,
    isLoading,
    elapsedSeconds,
    plannedSeconds,
    earnedCoins,
    progress,
    isPaused,
    hasSession,
  } = useFocusTimer()
  const { appearance } = useAvatar()
  const prefersReducedMotion = useReducedMotion()

  if (isLoading) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    )
  }

  // Active session
  if (hasSession && session) {
    const remaining = formatRemaining(elapsedSeconds, plannedSeconds)

    return (
      <Link
        to="/focus"
        className="block bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center gap-4">
          {/* Avatar sitting at desk */}
          <div className="relative w-14 h-14 flex-shrink-0 bg-white/10 rounded-lg overflow-hidden">
            {appearance ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <AvatarPreview
                  appearance={appearance}
                  pose="sit"
                  animate={!prefersReducedMotion && !isPaused}
                  size="small"
                  usePlaceholderArt={true}
                />
              </div>
            ) : (
              // Fallback progress ring if no avatar
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 94.2} 94.2`}
                  />
                </svg>
              </div>
            )}
            {/* Pause indicator overlay */}
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white">
              {isPaused ? 'Focus paused' : 'Focusing...'}
            </h3>
            <p className="text-sm text-white/80">
              {remaining} remaining · {earnedCoins} coins earned
            </p>
          </div>

          {/* Arrow */}
          <svg className="w-5 h-5 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    )
  }

  // No active session - show start prompt
  return (
    <Link
      to="/focus"
      className="block bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white">
            Start a focus session
          </h3>
          <p className="text-sm text-white/80">
            Earn coins while you work
          </p>
        </div>

        {/* Arrow */}
        <svg className="w-5 h-5 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
