import { useEffect } from 'react'

interface ErrorToastProps {
  message: string | null
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 4000

export default function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  // Auto-dismiss after timeout
  useEffect(() => {
    if (!message) return

    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="fixed top-20 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div
        role="alert"
        className="bg-red-600 text-white rounded-lg px-4 py-3 shadow-lg pointer-events-auto max-w-sm w-full animate-slide-down"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-red-200">!</span>
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-red-500 rounded transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
