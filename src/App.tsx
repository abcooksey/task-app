import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import TodayPage from '@/pages/TodayPage'
import AllTasksPage from '@/pages/AllTasksPage'
import HomePage from '@/pages/HomePage'
import StorePage from '@/pages/StorePage'
import FocusPage from '@/pages/FocusPage'
import StatsPage from '@/pages/StatsPage'
import SettingsPage from '@/pages/SettingsPage'
import WardrobePage from '@/pages/WardrobePage'
import AuthPage from '@/pages/AuthPage'
import Layout from '@/components/Layout'
import ErrorBoundary from '@/components/ErrorBoundary'
import { PageLoadingSkeleton } from '@/components/Skeleton'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import { useOnboarding } from '@/hooks/useOnboarding'
import { AvatarCheerProvider } from '@/contexts/AvatarCheerContext'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { showOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading || onboardingLoading) {
    return <PageLoadingSkeleton />
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <ErrorBoundary>
      <AvatarCheerProvider>
        {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}
        <Layout>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/tasks" element={<AllTasksPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/wardrobe" element={<WardrobePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AvatarCheerProvider>
    </ErrorBoundary>
  )
}

export default App
