import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'info' | 'error'
  duration?: number
  onClose: () => void
  action?: {
    label: string
    onClick: () => void
  }
}

export default function Toast({
  message,
  type = 'info',
  duration = 4000,
  onClose,
  action,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for exit animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: 'bg-green-600',
    info: 'bg-gray-800',
    error: 'bg-red-600',
  }[type]

  const icon = {
    success: '✓',
    info: 'ℹ',
    error: '!',
  }[type]

  return (
    <div
      className={`fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className={`${bgColor} text-white rounded-lg shadow-lg pointer-events-auto max-w-sm w-full px-4 py-3 flex items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm">{message}</span>
        </div>

        {action && (
          <button
            onClick={() => {
              action.onClick()
              onClose()
            }}
            className="px-3 py-1 text-sm font-medium bg-white/20 hover:bg-white/30 rounded transition-colors flex-shrink-0"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
