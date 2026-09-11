/**
 * Hook to check if any recently tried-on items can now be afforded.
 *
 * Used after task completion to show "You can now buy [item]" hints.
 */

import { useMemo } from 'react'
import { useBalance } from './useBalance'
import { useStore } from './useStore'
import { useSettings } from './useSettings'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

interface TryOnHistory {
  items: Record<string, string> // itemId -> ISO timestamp
}

interface AffordableItem {
  id: string
  name: string
  price: number
}

/**
 * Parse try-on history from settings, returning item IDs tried within last 7 days
 */
function getRecentTryOnIds(historyJson: unknown): string[] {
  if (!historyJson || typeof historyJson !== 'object') return []

  const history = historyJson as TryOnHistory
  if (!history.items) return []

  const now = Date.now()
  const result: string[] = []

  for (const [itemId, timestamp] of Object.entries(history.items)) {
    const date = new Date(timestamp)
    if (now - date.getTime() < SEVEN_DAYS_MS) {
      result.push(itemId)
    }
  }

  return result
}

/**
 * Check if any recently tried items just became affordable.
 *
 * @param coinsEarned The coins just earned from task completion
 * @returns The most recently tried item that can now be afforded, if any
 */
export function useAffordabilityHint(coinsEarned: number): AffordableItem | null {
  const { balance } = useBalance()
  const { catalog, isOwned } = useStore()
  const { data: settings } = useSettings()

  return useMemo(() => {
    if (!coinsEarned || coinsEarned <= 0) return null
    if (!catalog.length) return null

    // Get recently tried item IDs
    const recentTryOnIds = getRecentTryOnIds(settings?.try_on_history)
    if (!recentTryOnIds.length) return null

    // Current balance is AFTER completion, so previous balance was: balance - coinsEarned
    const previousBalance = balance - coinsEarned
    const currentBalance = balance

    // Find items that:
    // 1. Were recently tried on
    // 2. Are not already owned
    // 3. Price > previousBalance (couldn't afford before)
    // 4. Price <= currentBalance (can afford now)
    const newlyAffordable: AffordableItem[] = []

    for (const itemId of recentTryOnIds) {
      // Skip if already owned
      if (isOwned(itemId)) continue

      // Find item in catalog
      const item = catalog.find(c => c.id === itemId)
      if (!item) continue

      // Check if price crosses the threshold
      if (item.price > previousBalance && item.price <= currentBalance) {
        newlyAffordable.push({
          id: item.id,
          name: item.name,
          price: item.price,
        })
      }
    }

    // Return the first one (most impactful to show just one)
    return newlyAffordable.length > 0 ? newlyAffordable[0] : null
  }, [coinsEarned, balance, catalog, settings?.try_on_history, isOwned])
}
