import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useBalance } from '@/hooks/useBalance'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { useAvatarCheer } from '@/contexts/AvatarCheerContext'
import { AvatarBust, type AvatarBustHandle } from '@/components/avatar'
import StaleSessionModal from '@/components/StaleSessionModal'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { balance, todayCoins, isLoading } = useBalance()
  const { session, isLoading: focusLoading } = useFocusTimer()
  const [showStaleModal, setShowStaleModal] = useState(false)
  const [hasCheckedStale, setHasCheckedStale] = useState(false)

  // Avatar cheer integration
  const avatarRef = useRef<AvatarBustHandle>(null)
  const { registerCheer } = useAvatarCheer()

  // Register the cheer function so other components can trigger it
  useEffect(() => {
    registerCheer(() => avatarRef.current?.playCheer())
  }, [registerCheer])

  // Check for stale session on mount (only once)
  useEffect(() => {
    if (focusLoading || hasCheckedStale) return

    // Check if there's an active session and we're not on the focus page
    if (session && (session.status === 'running' || session.status === 'paused')) {
      // Check if session started more than 1 minute ago (to avoid showing for just-started sessions)
      const startedAt = new Date(session.started_at).getTime()
      const ageMs = Date.now() - startedAt
      if (ageMs > 60000 && location.pathname !== '/focus') {
        setShowStaleModal(true)
      }
    }

    setHasCheckedStale(true)
  }, [session, focusLoading, hasCheckedStale, location.pathname])

  const navItems = [
    { path: '/', label: 'Today', icon: '☀️' },
    { path: '/home', label: 'Home', icon: '🏠' },
    { path: '/store', label: 'Store', icon: '🛍️' },
    { path: '/tasks', label: 'Tasks', icon: '📋' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Homestead
          </h1>

          {/* Avatar and coin display */}
          <div className="flex items-center gap-3 text-sm">
            {/* Avatar bust */}
            <AvatarBust ref={avatarRef} className="w-10 h-10" />

            {/* Coin display */}
            {!isLoading && (
              <>
                <div className="flex items-center gap-1 text-coin" title="Total coins">
                  <span className="text-lg">🪙</span>
                  <span className="font-medium">{balance.toLocaleString()}</span>
                </div>
                {todayCoins > 0 && (
                  <div className="text-gray-500 dark:text-gray-400" title="Earned today">
                    +{todayCoins}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {children}
        </div>
      </main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe-bottom"
        aria-label="Main navigation"
      >
        <div className="max-w-2xl mx-auto flex justify-around py-2">
          {navItems.map(({ path, label, icon }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center px-4 py-2 touch-target focus-ring rounded-lg ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="text-xl" aria-hidden="true">{icon}</span>
                <span className="text-xs mt-1">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Stale session modal */}
      {showStaleModal && (
        <StaleSessionModal onDismiss={() => setShowStaleModal(false)} />
      )}
    </div>
  )
}
