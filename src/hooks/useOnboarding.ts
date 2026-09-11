import { useState, useEffect } from 'react'

const STORAGE_KEY = 'homestead-onboarding-completed'

export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    // Check localStorage on mount
    const completed = localStorage.getItem(STORAGE_KEY)
    setHasCompletedOnboarding(completed === 'true')
  }, [])

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setHasCompletedOnboarding(true)
  }

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY)
    setHasCompletedOnboarding(false)
  }

  return {
    // null means we're still loading, false means not completed, true means completed
    hasCompletedOnboarding,
    isLoading: hasCompletedOnboarding === null,
    showOnboarding: hasCompletedOnboarding === false,
    completeOnboarding,
    resetOnboarding,
  }
}
