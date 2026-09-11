import { useState, useEffect } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { CatalogItem } from '@/types/database'

interface MysteryBoxProps {
  price: number
  balance: number
  canOpenToday: boolean
  onOpen: () => Promise<CatalogItem | null>
  onViewItem: (item: CatalogItem) => void
}

type RevealState = 'idle' | 'opening' | 'revealed'

export default function MysteryBox({
  price,
  balance,
  canOpenToday,
  onOpen,
  onViewItem,
}: MysteryBoxProps) {
  const [state, setState] = useState<RevealState>('idle')
  const [revealedItem, setRevealedItem] = useState<CatalogItem | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const canAfford = balance >= price
  const canOpen = canOpenToday && canAfford

  const handleOpen = async () => {
    if (!canOpen) return

    setState('opening')

    try {
      const item = await onOpen()
      if (item) {
        setRevealedItem(item)
        // Skip or reduce animation delay when reduced motion is preferred
        const delay = prefersReducedMotion ? 100 : 2000
        await new Promise(resolve => setTimeout(resolve, delay))
        setState('revealed')
      } else {
        setState('idle')
      }
    } catch {
      setState('idle')
    }
  }

  const handleViewItem = () => {
    if (revealedItem) {
      onViewItem(revealedItem)
      // Reset after viewing
      setState('idle')
      setRevealedItem(null)
    }
  }

  // Reset state when canOpenToday changes (new day)
  useEffect(() => {
    if (canOpenToday && state === 'idle') {
      setRevealedItem(null)
    }
  }, [canOpenToday, state])

  return (
    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">Mystery Box</h3>
        <span className="text-white/80 text-sm font-medium">{price} coins</span>
      </div>

      {state === 'idle' && (
        <>
          {canOpenToday ? (
            <div className="flex flex-col items-center">
              {/* Mystery box icon */}
              <div className="w-24 h-24 mb-4 relative">
                <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-yellow-900">?</span>
                </div>
              </div>

              <p className="text-white/80 text-sm text-center mb-4">
                Open once per day for a random item!
              </p>

              {canAfford ? (
                <button
                  onClick={handleOpen}
                  className="w-full py-3 px-4 rounded-xl font-bold text-purple-600 bg-white hover:bg-gray-100 transition-colors focus-ring"
                >
                  Open for {price} coins
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-xl font-semibold text-white/80 bg-white/20 text-center">
                  Need {price - balance} more coins
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Opened box icon */}
              <div className="w-24 h-24 mb-4 relative opacity-60">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                  </svg>
                </div>
              </div>

              <p className="text-white/90 text-center font-medium mb-2">
                Come back tomorrow!
              </p>
              <p className="text-white/60 text-sm text-center">
                You've already opened today's box
              </p>
            </div>
          )}
        </>
      )}

      {state === 'opening' && (
        <div className="flex flex-col items-center py-4">
          {/* Animated opening */}
          <div className="w-24 h-24 mb-4 relative">
            <div className="absolute inset-0 bg-white rounded-xl animate-ping opacity-20" />
            <div className="absolute inset-0 bg-white/30 rounded-xl animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-16 h-16 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>

            {/* Sparkles */}
            <div className="absolute -top-2 -left-2 w-4 h-4 text-yellow-300 animate-spin">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
              </svg>
            </div>
            <div className="absolute -top-1 -right-3 w-3 h-3 text-yellow-200 animate-ping">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
              </svg>
            </div>
            <div className="absolute -bottom-1 right-0 w-3 h-3 text-pink-200 animate-bounce">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
              </svg>
            </div>
          </div>

          <p className="text-white font-semibold animate-pulse">
            Opening...
          </p>
        </div>
      )}

      {state === 'revealed' && revealedItem && (
        <div className="flex flex-col items-center py-2">
          {/* Revealed item */}
          <div className="w-20 h-20 mb-3 rounded-xl flex items-center justify-center text-white text-sm font-medium bg-white/30 ring-4 ring-yellow-400 ring-offset-2 ring-offset-purple-500">
            {revealedItem.footprint_w}×{revealedItem.footprint_h}
          </div>

          <h4 className="text-white font-bold text-lg mb-1 text-center">
            {revealedItem.name}
          </h4>
          <p className="text-white/70 text-sm mb-4">
            Worth {revealedItem.price} coins!
          </p>

          <button
            onClick={handleViewItem}
            className="w-full py-3 px-4 rounded-xl font-bold text-purple-600 bg-white hover:bg-gray-100 transition-colors focus-ring"
          >
            View Item
          </button>
        </div>
      )}
    </div>
  )
}
