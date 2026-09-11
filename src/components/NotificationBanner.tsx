import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

const DISMISSED_KEY = 'homestead-notification-banner-dismissed'

export default function NotificationBanner() {
  const { isSupported, permission, enabled, requestPermission } = useNotifications()
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true'
  })
  const [requesting, setRequesting] = useState(false)

  // Don't show if not supported, already enabled, denied, or dismissed
  if (!isSupported || enabled || permission === 'denied' || dismissed) {
    return null
  }

  const handleEnable = async () => {
    setRequesting(true)
    await requestPermission()
    setRequesting(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <h3 className="font-medium text-primary-900 dark:text-primary-100">
            Enable Notifications
          </h3>
          <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
            Get reminders for tasks with due times so you never miss anything important.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={requesting}
              className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {requesting ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 text-primary-600 dark:text-primary-400 text-sm hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
