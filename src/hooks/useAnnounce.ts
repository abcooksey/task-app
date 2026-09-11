/**
 * useAnnounce - Hook for screen reader announcements.
 *
 * Creates a live region and announces messages to assistive technology.
 * Uses aria-live="polite" by default, with "assertive" for urgent messages.
 */

import { useCallback, useEffect, useRef } from 'react'

type Politeness = 'polite' | 'assertive'

// Singleton live region element
let liveRegion: HTMLDivElement | null = null

function getLiveRegion(): HTMLDivElement {
  if (liveRegion) return liveRegion

  liveRegion = document.createElement('div')
  liveRegion.setAttribute('aria-live', 'polite')
  liveRegion.setAttribute('aria-atomic', 'true')
  liveRegion.setAttribute('role', 'status')
  liveRegion.className = 'sr-only'

  // Visually hidden but accessible
  Object.assign(liveRegion.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  })

  document.body.appendChild(liveRegion)
  return liveRegion
}

/**
 * Announce a message to screen readers.
 *
 * @param message - The message to announce
 * @param politeness - "polite" (waits for user pause) or "assertive" (interrupts)
 */
export function announce(message: string, politeness: Politeness = 'polite'): void {
  const region = getLiveRegion()

  // Set politeness level
  region.setAttribute('aria-live', politeness)

  // Clear and set message (the change triggers announcement)
  region.textContent = ''

  // Use requestAnimationFrame to ensure the DOM updates
  requestAnimationFrame(() => {
    region.textContent = message
  })
}

/**
 * Hook for making screen reader announcements.
 *
 * Returns a function that announces messages.
 */
export function useAnnounce() {
  return useCallback((message: string, politeness: Politeness = 'polite') => {
    announce(message, politeness)
  }, [])
}

/**
 * Hook for announcing when a value changes.
 *
 * @param value - The value to watch
 * @param getMessage - Function to generate the announcement message
 * @param skip - Whether to skip the first announcement (default: true)
 */
export function useAnnounceOnChange<T>(
  value: T,
  getMessage: (value: T) => string,
  skip = true
): void {
  const isFirstRender = useRef(true)
  const prevValue = useRef(value)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      if (skip) return
    }

    if (value !== prevValue.current) {
      announce(getMessage(value))
      prevValue.current = value
    }
  }, [value, getMessage, skip])
}
