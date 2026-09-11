/**
 * Try-on state management for store wearables.
 *
 * Features:
 * - Track items being tried on (not saved to DB)
 * - Reset all try-on state
 * - Persist recent try-ons to settings for affordability hints
 */

import { useState, useCallback, useMemo } from 'react'
import { useAvatar } from './useAvatar'
import { useSettings, useUpdateSettings } from './useSettings'
import type { Appearance } from '@/game/avatar/types'
import type { CatalogItem } from '@/types/database'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

interface TryOnHistory {
  items: Record<string, string> // itemId -> ISO timestamp
}

interface TryOnState {
  /** Items currently being tried on (layered on top of current appearance) */
  tryOnItems: Map<string, string> // category -> itemId
}

/**
 * Parse try-on history from settings, cleaning up old entries
 */
function parseTryOnHistory(historyJson: unknown): Map<string, Date> {
  const result = new Map<string, Date>()
  if (!historyJson || typeof historyJson !== 'object') return result

  const history = historyJson as TryOnHistory
  if (!history.items) return result

  const now = Date.now()
  for (const [itemId, timestamp] of Object.entries(history.items)) {
    const date = new Date(timestamp)
    // Only include items tried on within the last 7 days
    if (now - date.getTime() < SEVEN_DAYS_MS) {
      result.set(itemId, date)
    }
  }

  return result
}

/**
 * Serialize try-on history for storage
 */
function serializeTryOnHistory(history: Map<string, Date>): { items: Record<string, string> } {
  const items: Record<string, string> = {}
  const now = Date.now()

  for (const [itemId, date] of history) {
    // Only include items tried on within the last 7 days
    if (now - date.getTime() < SEVEN_DAYS_MS) {
      items[itemId] = date.toISOString()
    }
  }

  return { items }
}

export function useTryOn() {
  const { appearance, saveAppearance } = useAvatar()
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()

  const [tryOnState, setTryOnState] = useState<TryOnState>({
    tryOnItems: new Map(),
  })

  // Load recent try-ons from settings
  const recentTryOns = useMemo(() => {
    return parseTryOnHistory(settings?.try_on_history)
  }, [settings?.try_on_history])

  // Get the preview appearance (current + try-ons applied)
  const previewAppearance = useMemo((): Appearance | null => {
    if (!appearance) return null

    let preview = { ...appearance }

    // Apply each try-on item
    for (const [category, itemId] of tryOnState.tryOnItems) {
      switch (category) {
        case 'clothing_top':
          preview = { ...preview, top: itemId }
          break
        case 'clothing_bottom':
          preview = { ...preview, bottom: itemId }
          break
        case 'clothing_shoes':
          preview = { ...preview, shoes: itemId }
          break
        case 'accessory':
          preview = { ...preview, accessory: itemId }
          break
        case 'hair':
          preview = { ...preview, hair: { ...preview.hair, styleId: itemId } }
          break
      }
    }

    return preview
  }, [appearance, tryOnState.tryOnItems])

  // Try on an item
  const tryOn = useCallback((item: CatalogItem) => {
    setTryOnState(prev => {
      const newTryOnItems = new Map(prev.tryOnItems)

      // Set the try-on for this category
      newTryOnItems.set(item.category, item.id)

      return {
        tryOnItems: newTryOnItems,
      }
    })

    // Persist to settings (add to history)
    const newHistory = new Map(recentTryOns)
    newHistory.set(item.id, new Date())

    updateSettings.mutate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try_on_history: serializeTryOnHistory(newHistory) as any,
    })
  }, [recentTryOns, updateSettings])

  // Remove try-on for a specific category
  const removeTryOn = useCallback((category: string) => {
    setTryOnState(prev => {
      const newTryOnItems = new Map(prev.tryOnItems)
      newTryOnItems.delete(category)
      return { tryOnItems: newTryOnItems }
    })
  }, [])

  // Reset all try-ons
  const resetTryOn = useCallback(() => {
    setTryOnState({
      tryOnItems: new Map(),
    })
  }, [])

  // Check if an item is currently being tried on
  const isTryingOn = useCallback((itemId: string): boolean => {
    for (const id of tryOnState.tryOnItems.values()) {
      if (id === itemId) return true
    }
    return false
  }, [tryOnState.tryOnItems])

  // Get count of unowned items being tried on
  const unownedTryOnCount = useMemo(() => {
    return tryOnState.tryOnItems.size
  }, [tryOnState.tryOnItems])

  // Equip current try-on look (save to DB)
  const equipTryOn = useCallback(async () => {
    if (!previewAppearance) return

    await saveAppearance(previewAppearance)
    resetTryOn()
  }, [previewAppearance, saveAppearance, resetTryOn])

  // Check if an item was recently tried on (for affordability hints)
  const wasRecentlyTriedOn = useCallback((itemId: string): boolean => {
    return recentTryOns.has(itemId)
  }, [recentTryOns])

  // Get list of try-on item IDs
  const tryOnItemIds = useMemo(() => {
    return Array.from(tryOnState.tryOnItems.values())
  }, [tryOnState.tryOnItems])

  // Get list of recently tried items (for affordability check)
  const getRecentlyTriedItems = useCallback((): string[] => {
    return Array.from(recentTryOns.keys())
  }, [recentTryOns])

  return {
    // State
    previewAppearance,
    tryOnItemIds,
    unownedTryOnCount,
    hasTryOns: tryOnState.tryOnItems.size > 0,

    // Actions
    tryOn,
    removeTryOn,
    resetTryOn,
    equipTryOn,

    // Queries
    isTryingOn,
    wasRecentlyTriedOn,
    getRecentlyTriedItems,
  }
}
