/**
 * useFocusTrap - Hook for trapping focus within a container.
 *
 * Used for modals, dialogs, and other overlay components to ensure
 * keyboard users can't tab outside the container.
 */

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Get all focusable elements within a container.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null) // Exclude hidden elements
}

/**
 * Hook to trap focus within a container element.
 *
 * @param containerRef - Ref to the container element
 * @param isActive - Whether the focus trap is active
 * @param initialFocusRef - Optional ref to the element to focus initially
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean,
  initialFocusRef?: RefObject<HTMLElement>
): void {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current

    // Store the previously focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement

    // Focus the initial element or the first focusable element
    const focusInitial = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
      } else {
        const focusableElements = getFocusableElements(container)
        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      }
    }

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(focusInitial)

    // Handle tab key to trap focus
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(container)
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        // Shift+Tab: if on first element, move to last
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: if on last element, move to first
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus to previously focused element
      if (previouslyFocusedElement.current && previouslyFocusedElement.current.isConnected) {
        previouslyFocusedElement.current.focus()
      }
    }
  }, [isActive, containerRef, initialFocusRef])
}

/**
 * Hook to auto-focus an element when a condition becomes true.
 *
 * @param ref - Ref to the element to focus
 * @param shouldFocus - Whether to focus the element
 */
export function useAutoFocus(
  ref: RefObject<HTMLElement>,
  shouldFocus: boolean
): void {
  useEffect(() => {
    if (shouldFocus && ref.current) {
      requestAnimationFrame(() => {
        ref.current?.focus()
      })
    }
  }, [shouldFocus, ref])
}
