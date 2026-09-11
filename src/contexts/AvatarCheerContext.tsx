/**
 * AvatarCheerContext - Provides a way to trigger avatar cheer animations.
 *
 * Used by:
 * - Layout (registers the cheer function from AvatarBust)
 * - TodayPage (calls cheer on task completion)
 */

import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react'

interface AvatarCheerContextValue {
  playCheer: () => void
  registerCheer: (fn: () => void) => void
}

const AvatarCheerContext = createContext<AvatarCheerContextValue | null>(null)

export function AvatarCheerProvider({ children }: { children: ReactNode }) {
  const cheerFnRef = useRef<(() => void) | null>(null)

  const registerCheer = useCallback((fn: () => void) => {
    cheerFnRef.current = fn
  }, [])

  const playCheer = useCallback(() => {
    cheerFnRef.current?.()
  }, [])

  return (
    <AvatarCheerContext.Provider value={{ playCheer, registerCheer }}>
      {children}
    </AvatarCheerContext.Provider>
  )
}

export function useAvatarCheer() {
  const context = useContext(AvatarCheerContext)
  if (!context) {
    // Return a no-op if not in provider (e.g., in tests)
    return { playCheer: () => {}, registerCheer: () => {} }
  }
  return context
}
