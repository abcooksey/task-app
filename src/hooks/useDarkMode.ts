import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'homestead-theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && getSystemPreference())

  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyTheme('system')

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme)
    setThemeState(newTheme)
  }

  const isDark = theme === 'dark' || (theme === 'system' && getSystemPreference())

  return { theme, setTheme, isDark }
}

// Apply theme immediately on load to prevent flash
if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme())
}
