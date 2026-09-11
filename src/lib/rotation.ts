/**
 * Deterministic weekly rotation for store items.
 * Uses xmur3 + mulberry32 PRNG seeded from ISO week number.
 */

import type { CatalogItem } from '@/types/database'

// Category minimum requirements for rotation
const CATEGORY_MINIMUMS: Record<string, number> = {
  furniture: 1,
  decor: 2,
  wall_decor: 1,
  outdoor: 1,
}

const ROTATION_SIZE = 8
const REFRESH_HOUR = 4 // Monday 4am local time

/**
 * xmur3 string hash function - creates seed for PRNG
 */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

/**
 * mulberry32 PRNG - fast 32-bit generator
 */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Get ISO week number and year for a given date.
 * ISO weeks start on Monday, week 1 contains Jan 4.
 */
export function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Set to nearest Thursday (current date + 4 - current day number, making Sunday=7)
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  // Calculate week number
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { week, year: d.getUTCFullYear() }
}

/**
 * Get the date/time of next Monday 4am local.
 */
export function getNextRefresh(now: Date = new Date()): Date {
  const result = new Date(now)
  // Move to next Monday
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7
  result.setDate(result.getDate() + daysUntilMonday)
  result.setHours(REFRESH_HOUR, 0, 0, 0)

  // If we're past Monday 4am but still on Monday, we've already refreshed
  // So the result is correct (next Monday)
  // If we're before Monday 4am on Monday, result should be today
  if (now.getDay() === 1 && now.getHours() < REFRESH_HOUR) {
    result.setDate(result.getDate() - 7)
  }

  return result
}

/**
 * Get the effective rotation week for a given date.
 * Rotation changes at Monday 4am local time.
 */
export function getRotationWeek(date: Date = new Date()): { week: number; year: number } {
  const adjustedDate = new Date(date)

  // If we're before Monday 4am, use previous day for week calculation
  if (date.getDay() === 1 && date.getHours() < REFRESH_HOUR) {
    adjustedDate.setDate(adjustedDate.getDate() - 1)
  }

  return getISOWeek(adjustedDate)
}

/**
 * Create seeded PRNG from week and year.
 */
function createRng(week: number, year: number): () => number {
  const seedStr = `rotation-${year}-W${week.toString().padStart(2, '0')}`
  const seedFn = xmur3(seedStr)
  // Run hash a few times to get good seed
  const seed = seedFn() + seedFn() + seedFn() + seedFn()
  return mulberry32(seed)
}

/**
 * Fisher-Yates shuffle with seeded PRNG.
 */
function shuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Get rotation items for a specific week.
 *
 * @param week - ISO week number
 * @param year - Year
 * @param pool - All items with availability.kind === 'rotation'
 * @param previousWeekItems - Item IDs from previous week (to exclude)
 * @returns Array of 8 item IDs
 */
export function getRotationItems(
  week: number,
  year: number,
  pool: CatalogItem[],
  previousWeekItems: string[] = []
): string[] {
  const rng = createRng(week, year)

  // Filter out previous week's items
  const excludeSet = new Set(previousWeekItems)
  const available = pool.filter(item => !excludeSet.has(item.id))

  // Group by category
  const byCategory = new Map<string, CatalogItem[]>()
  for (const item of available) {
    const list = byCategory.get(item.category) || []
    list.push(item)
    byCategory.set(item.category, list)
  }

  // Shuffle each category
  for (const [cat, items] of byCategory) {
    byCategory.set(cat, shuffle(items, rng))
  }

  const selected: CatalogItem[] = []
  const selectedIds = new Set<string>()

  // First pass: fulfill minimums
  for (const [category, minimum] of Object.entries(CATEGORY_MINIMUMS)) {
    const categoryItems = byCategory.get(category) || []
    let added = 0
    for (const item of categoryItems) {
      if (added >= minimum) break
      if (!selectedIds.has(item.id)) {
        selected.push(item)
        selectedIds.add(item.id)
        added++
      }
    }
  }

  // Second pass: fill remaining slots from shuffled pool
  const allShuffled = shuffle(available, rng)
  for (const item of allShuffled) {
    if (selected.length >= ROTATION_SIZE) break
    if (!selectedIds.has(item.id)) {
      selected.push(item)
      selectedIds.add(item.id)
    }
  }

  // Final shuffle of selected items for display order
  const finalOrder = shuffle(selected, rng)

  return finalOrder.map(item => item.id)
}

/**
 * Get rotation items for the current week.
 */
export function getCurrentRotation(
  pool: CatalogItem[],
  now: Date = new Date()
): { items: string[]; week: number; year: number; nextRefresh: Date } {
  const { week, year } = getRotationWeek(now)

  // Get previous week for exclusion
  const prevDate = new Date(now)
  prevDate.setDate(prevDate.getDate() - 7)
  const prev = getRotationWeek(prevDate)
  const prevItems = getRotationItems(prev.week, prev.year, pool, [])

  const items = getRotationItems(week, year, pool, prevItems)
  const nextRefresh = getNextRefresh(now)

  return { items, week, year, nextRefresh }
}

/**
 * Format time until next refresh as human-readable string.
 */
export function formatTimeUntilRefresh(nextRefresh: Date, now: Date = new Date()): string {
  const diff = nextRefresh.getTime() - now.getTime()
  if (diff <= 0) return 'Refreshing...'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}d ${hours}h`
  }

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

/**
 * Check if a seasonal item is currently available.
 */
export function isSeasonalActive(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
  now: Date = new Date()
): boolean {
  const month = now.getMonth() + 1 // 1-indexed
  const day = now.getDate()

  // Handle wrapping around year (e.g., Dec 15 - Jan 15)
  if (startMonth > endMonth || (startMonth === endMonth && startDay > endDay)) {
    // Active if after start OR before end
    return (
      month > startMonth ||
      (month === startMonth && day >= startDay) ||
      month < endMonth ||
      (month === endMonth && day <= endDay)
    )
  }

  // Normal case: start before end in same year
  const afterStart = month > startMonth || (month === startMonth && day >= startDay)
  const beforeEnd = month < endMonth || (month === endMonth && day <= endDay)
  return afterStart && beforeEnd
}
