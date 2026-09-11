import { describe, it, expect } from 'vitest'
import {
  getISOWeek,
  getRotationWeek,
  getRotationItems,
  getCurrentRotation,
  getNextRefresh,
  formatTimeUntilRefresh,
  isSeasonalActive,
} from './rotation'
import type { CatalogItem } from '@/types/database'

// Mock catalog items for testing
function createMockItem(
  id: string,
  category: string,
  overrides: Partial<CatalogItem> = {}
): CatalogItem {
  return {
    id,
    name: id.replace(/_/g, ' '),
    blurb: 'Test item',
    category,
    placement: 'floor',
    price: 100,
    footprint_w: 1,
    footprint_h: 1,
    is_surface: false,
    allow_multiple: true,
    availability_kind: 'rotation',
    availability_pool: 'core',
    rarity: 'common',
    texture_key: id,
    ...overrides,
  } as CatalogItem
}

function createMockPool(): CatalogItem[] {
  return [
    // Furniture (need at least 1)
    createMockItem('furniture_1', 'furniture'),
    createMockItem('furniture_2', 'furniture'),
    createMockItem('furniture_3', 'furniture'),
    createMockItem('furniture_4', 'furniture'),
    // Decor (need at least 2)
    createMockItem('decor_1', 'decor'),
    createMockItem('decor_2', 'decor'),
    createMockItem('decor_3', 'decor'),
    createMockItem('decor_4', 'decor'),
    createMockItem('decor_5', 'decor'),
    // Wall decor (need at least 1)
    createMockItem('wall_1', 'wall_decor'),
    createMockItem('wall_2', 'wall_decor'),
    createMockItem('wall_3', 'wall_decor'),
    // Outdoor (need at least 1)
    createMockItem('outdoor_1', 'outdoor'),
    createMockItem('outdoor_2', 'outdoor'),
    createMockItem('outdoor_3', 'outdoor'),
    // Rugs (no minimum)
    createMockItem('rug_1', 'rug'),
    createMockItem('rug_2', 'rug'),
    // Surface decor (no minimum)
    createMockItem('surface_1', 'surface_decor'),
    createMockItem('surface_2', 'surface_decor'),
  ]
}

describe('getISOWeek', () => {
  it('returns correct week number for mid-year date', () => {
    const date = new Date('2024-06-15')
    const { week, year } = getISOWeek(date)
    expect(year).toBe(2024)
    expect(week).toBe(24)
  })

  it('handles year boundary correctly', () => {
    // Dec 31, 2024 is in week 1 of 2025
    const date = new Date('2024-12-31')
    const { week, year } = getISOWeek(date)
    expect(year).toBe(2025)
    expect(week).toBe(1)
  })

  it('handles Jan 1 correctly when it falls mid-week', () => {
    // Jan 1, 2025 is a Wednesday, week 1
    const date = new Date('2025-01-01')
    const { week, year } = getISOWeek(date)
    expect(year).toBe(2025)
    expect(week).toBe(1)
  })
})

describe('getRotationWeek', () => {
  it('returns same week before and after Monday 4am boundary', () => {
    // Sunday 11pm - should be previous week
    const sunday = new Date('2024-06-16T23:00:00')
    const sundayWeek = getRotationWeek(sunday)

    // Monday 3am - still previous week (before refresh)
    const mondayEarly = new Date('2024-06-17T03:00:00')
    const mondayEarlyWeek = getRotationWeek(mondayEarly)

    expect(sundayWeek.week).toBe(mondayEarlyWeek.week)
    expect(sundayWeek.year).toBe(mondayEarlyWeek.year)
  })

  it('changes at Monday 4am', () => {
    // Monday 3:59am - previous rotation
    const before = new Date('2024-06-17T03:59:00')
    const beforeWeek = getRotationWeek(before)

    // Monday 4:00am - new rotation
    const after = new Date('2024-06-17T04:00:00')
    const afterWeek = getRotationWeek(after)

    expect(beforeWeek.week).not.toBe(afterWeek.week)
  })
})

describe('getRotationItems', () => {
  it('returns exactly 8 items', () => {
    const pool = createMockPool()
    const items = getRotationItems(1, 2024, pool)
    expect(items).toHaveLength(8)
  })

  it('returns same items for same week on different calls', () => {
    const pool = createMockPool()
    const items1 = getRotationItems(1, 2024, pool)
    const items2 = getRotationItems(1, 2024, pool)
    expect(items1).toEqual(items2)
  })

  it('returns different items for different weeks', () => {
    const pool = createMockPool()
    const week1 = getRotationItems(1, 2024, pool)
    const week2 = getRotationItems(2, 2024, pool)
    // Should have at least some different items
    const sameItems = week1.filter(id => week2.includes(id))
    expect(sameItems.length).toBeLessThan(8)
  })

  it('guarantees minimum category counts', () => {
    const pool = createMockPool()
    const items = getRotationItems(1, 2024, pool)

    // Count categories
    const categories = new Map<string, number>()
    for (const id of items) {
      const item = pool.find(p => p.id === id)!
      categories.set(item.category, (categories.get(item.category) || 0) + 1)
    }

    expect(categories.get('furniture') || 0).toBeGreaterThanOrEqual(1)
    expect(categories.get('decor') || 0).toBeGreaterThanOrEqual(2)
    expect(categories.get('wall_decor') || 0).toBeGreaterThanOrEqual(1)
    expect(categories.get('outdoor') || 0).toBeGreaterThanOrEqual(1)
  })

  it('excludes previous week items', () => {
    const pool = createMockPool()
    const prevItems = ['furniture_1', 'decor_1', 'decor_2']
    const items = getRotationItems(2, 2024, pool, prevItems)

    for (const prevId of prevItems) {
      expect(items).not.toContain(prevId)
    }
  })

  it('all items are unique', () => {
    const pool = createMockPool()
    const items = getRotationItems(1, 2024, pool)
    const unique = new Set(items)
    expect(unique.size).toBe(items.length)
  })
})

describe('rotation coverage', () => {
  it('every rotation item appears at least once in 10 weeks', () => {
    const pool = createMockPool()
    const appeared = new Set<string>()

    // Simulate 10 weeks
    let prevItems: string[] = []
    for (let week = 1; week <= 10; week++) {
      const items = getRotationItems(week, 2024, pool, prevItems)
      items.forEach(id => appeared.add(id))
      prevItems = items
    }

    // All items should have appeared
    for (const item of pool) {
      expect(appeared.has(item.id)).toBe(true)
    }
  })
})

describe('getCurrentRotation', () => {
  it('returns rotation with week info and next refresh', () => {
    const pool = createMockPool()
    const now = new Date('2024-06-15T12:00:00')
    const result = getCurrentRotation(pool, now)

    expect(result.items).toHaveLength(8)
    expect(result.week).toBeDefined()
    expect(result.year).toBeDefined()
    expect(result.nextRefresh).toBeInstanceOf(Date)
  })
})

describe('getNextRefresh', () => {
  it('returns next Monday 4am from Wednesday', () => {
    const wed = new Date('2024-06-19T12:00:00') // Wednesday
    const next = getNextRefresh(wed)
    expect(next.getDay()).toBe(1) // Monday
    expect(next.getHours()).toBe(4)
    expect(next.getMinutes()).toBe(0)
  })

  it('returns same Monday if before 4am', () => {
    const mondayEarly = new Date('2024-06-17T03:00:00')
    const next = getNextRefresh(mondayEarly)
    expect(next.getDate()).toBe(17) // Same Monday
    expect(next.getHours()).toBe(4)
  })

  it('returns next Monday if after 4am on Monday', () => {
    const mondayLate = new Date('2024-06-17T12:00:00')
    const next = getNextRefresh(mondayLate)
    expect(next.getDate()).toBe(24) // Next Monday
  })
})

describe('formatTimeUntilRefresh', () => {
  it('formats days and hours', () => {
    const now = new Date('2024-06-15T12:00:00')
    const refresh = new Date('2024-06-17T04:00:00')
    expect(formatTimeUntilRefresh(refresh, now)).toBe('1d 16h')
  })

  it('formats hours and minutes', () => {
    const now = new Date('2024-06-17T01:30:00')
    const refresh = new Date('2024-06-17T04:00:00')
    expect(formatTimeUntilRefresh(refresh, now)).toBe('2h 30m')
  })

  it('formats minutes only', () => {
    const now = new Date('2024-06-17T03:30:00')
    const refresh = new Date('2024-06-17T04:00:00')
    expect(formatTimeUntilRefresh(refresh, now)).toBe('30m')
  })

  it('returns Refreshing... when past', () => {
    const now = new Date('2024-06-17T05:00:00')
    const refresh = new Date('2024-06-17T04:00:00')
    expect(formatTimeUntilRefresh(refresh, now)).toBe('Refreshing...')
  })
})

describe('isSeasonalActive', () => {
  it('returns true when date is in range', () => {
    // Halloween: Oct 15 - Nov 5
    const date = new Date(2024, 9, 25, 12) // Oct 25 noon local
    expect(isSeasonalActive(10, 15, 11, 5, date)).toBe(true)
  })

  it('returns false when date is before range', () => {
    const date = new Date(2024, 9, 10, 12) // Oct 10 noon local
    expect(isSeasonalActive(10, 15, 11, 5, date)).toBe(false)
  })

  it('returns false when date is after range', () => {
    const date = new Date(2024, 10, 10, 12) // Nov 10 noon local
    expect(isSeasonalActive(10, 15, 11, 5, date)).toBe(false)
  })

  it('handles year wrap (Dec to Jan)', () => {
    // Holiday: Dec 15 - Jan 10
    const dec = new Date(2024, 11, 25, 12) // Dec 25 noon local
    const jan = new Date(2025, 0, 5, 12) // Jan 5 noon local
    const feb = new Date(2025, 1, 1, 12) // Feb 1 noon local

    expect(isSeasonalActive(12, 15, 1, 10, dec)).toBe(true)
    expect(isSeasonalActive(12, 15, 1, 10, jan)).toBe(true)
    expect(isSeasonalActive(12, 15, 1, 10, feb)).toBe(false)
  })

  it('returns true on start day', () => {
    const date = new Date(2024, 9, 15, 12) // Oct 15 noon local
    expect(isSeasonalActive(10, 15, 11, 5, date)).toBe(true)
  })

  it('returns true on end day', () => {
    const date = new Date(2024, 10, 5, 12) // Nov 5 noon local
    expect(isSeasonalActive(10, 15, 11, 5, date)).toBe(true)
  })
})
