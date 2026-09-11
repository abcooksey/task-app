import { describe, it, expect } from 'vitest'
import {
  deriveHouseState,
  getRepairById,
  getRepairsByView,
  getCheapestAvailableRepair,
  getStarterRepairs,
  isRepairAffordable,
  getRepairCoinGap,
  getRepairStatus,
  getGuidedAvailableRepairs,
  repairs,
} from './houseState'

describe('repairs.json content', () => {
  it('has 15 total repairs', () => {
    expect(repairs.repairs).toHaveLength(15)
  })

  it('has 8 interior repairs', () => {
    const interior = repairs.repairs.filter(r => r.view === 'interior')
    expect(interior).toHaveLength(8)
  })

  it('has 7 exterior repairs', () => {
    const exterior = repairs.repairs.filter(r => r.view === 'exterior')
    expect(exterior).toHaveLength(7)
  })

  it('interior repairs total 1020 coins', () => {
    const total = repairs.repairs
      .filter(r => r.view === 'interior')
      .reduce((sum, r) => sum + r.cost, 0)
    expect(total).toBe(1020)
  })

  it('exterior repairs total 980 coins', () => {
    const total = repairs.repairs
      .filter(r => r.view === 'exterior')
      .reduce((sum, r) => sum + r.cost, 0)
    expect(total).toBe(980)
  })

  it('has 4 starter repairs with no dependencies', () => {
    const starters = repairs.repairs.filter(r => r.requires.length === 0)
    expect(starters).toHaveLength(4)
    expect(starters.map(r => r.id).sort()).toEqual([
      'ext_mailbox',
      'ext_yard',
      'int_cobwebs',
      'int_garbage',
    ])
  })

  it('all dependencies reference valid repair IDs', () => {
    const allIds = new Set(repairs.repairs.map(r => r.id))
    for (const repair of repairs.repairs) {
      for (const dep of repair.requires) {
        expect(allIds.has(dep)).toBe(true)
      }
    }
  })
})

describe('deriveHouseState', () => {
  it('returns all starters as available when no completions', () => {
    const state = deriveHouseState([], false)

    expect(state.completedRepairIds.size).toBe(0)
    expect(state.availableRepairIds.size).toBe(4)
    expect(state.availableRepairIds.has('int_garbage')).toBe(true)
    expect(state.availableRepairIds.has('int_cobwebs')).toBe(true)
    expect(state.availableRepairIds.has('ext_yard')).toBe(true)
    expect(state.availableRepairIds.has('ext_mailbox')).toBe(true)
    expect(state.lockedRepairIds.size).toBe(11) // 15 - 4 starters
  })

  it('unlocks dependent repairs when dependencies are met', () => {
    // Complete int_garbage → should unlock int_floor
    const state = deriveHouseState(['int_garbage'], true)

    expect(state.completedRepairIds.has('int_garbage')).toBe(true)
    expect(state.availableRepairIds.has('int_floor')).toBe(true)
    expect(state.availableRepairIds.has('int_garbage')).toBe(false) // completed, not available
  })

  it('keeps repairs locked when only partial dependencies met', () => {
    // int_walls requires both int_window AND int_ceiling
    // Complete only int_cobwebs (which unlocks window and ceiling)
    const state = deriveHouseState(['int_cobwebs'], true)

    // int_window and int_ceiling should be available
    expect(state.availableRepairIds.has('int_window')).toBe(true)
    expect(state.availableRepairIds.has('int_ceiling')).toBe(true)

    // int_walls should still be locked (needs both completed)
    expect(state.lockedRepairIds.has('int_walls')).toBe(true)
  })

  it('unlocks int_walls when both dependencies are met', () => {
    const state = deriveHouseState(['int_cobwebs', 'int_window', 'int_ceiling'], true)

    expect(state.availableRepairIds.has('int_walls')).toBe(true)
    expect(state.lockedRepairIds.has('int_walls')).toBe(false)
  })

  it('tracks interior progress correctly', () => {
    const state = deriveHouseState(['int_garbage', 'int_cobwebs', 'int_floor'], true)

    expect(state.progress.interior.done).toBe(3)
    expect(state.progress.interior.total).toBe(8)
  })

  it('tracks exterior progress correctly', () => {
    const state = deriveHouseState(['ext_yard', 'ext_mailbox'], true)

    expect(state.progress.exterior.done).toBe(2)
    expect(state.progress.exterior.total).toBe(7)
  })

  it('unlocks decorating when all interior repairs done', () => {
    const allInterior = [
      'int_garbage',
      'int_cobwebs',
      'int_floor',
      'int_window',
      'int_ceiling',
      'int_door',
      'int_walls',
      'int_light',
    ]
    const state = deriveHouseState(allInterior, true)

    expect(state.decoratingUnlocked).toBe(true)
    expect(state.progress.interior.done).toBe(8)
  })

  it('does not unlock decorating with partial interior completion', () => {
    const state = deriveHouseState(['int_garbage', 'int_cobwebs'], true)

    expect(state.decoratingUnlocked).toBe(false)
  })

  it('preserves firstRepairDone flag', () => {
    const stateNotDone = deriveHouseState([], false)
    const stateDone = deriveHouseState([], true)

    expect(stateNotDone.firstRepairDone).toBe(false)
    expect(stateDone.firstRepairDone).toBe(true)
  })
})

describe('getRepairById', () => {
  it('returns repair when found', () => {
    const repair = getRepairById('int_garbage')
    expect(repair).toBeDefined()
    expect(repair?.name).toBe('Sweep up the garbage')
    expect(repair?.cost).toBe(60)
  })

  it('returns undefined for unknown ID', () => {
    const repair = getRepairById('unknown_repair')
    expect(repair).toBeUndefined()
  })
})

describe('getRepairsByView', () => {
  it('returns interior repairs sorted by order', () => {
    const repairs = getRepairsByView('interior')
    expect(repairs).toHaveLength(8)
    expect(repairs[0].id).toBe('int_garbage')
    expect(repairs[repairs.length - 1].id).toBe('int_light')
  })

  it('returns exterior repairs sorted by order', () => {
    const repairs = getRepairsByView('exterior')
    expect(repairs).toHaveLength(7)
    expect(repairs[0].id).toBe('ext_yard')
    expect(repairs[repairs.length - 1].id).toBe('ext_path')
  })
})

describe('getCheapestAvailableRepair', () => {
  it('returns cheapest available repair', () => {
    const state = deriveHouseState([], false)
    const cheapest = getCheapestAvailableRepair(state)

    // ext_mailbox is 40 coins, cheapest of the starters
    expect(cheapest?.id).toBe('ext_mailbox')
    expect(cheapest?.cost).toBe(40)
  })

  it('returns null when no repairs available', () => {
    // Complete all repairs
    const allRepairs = repairs.repairs.map(r => r.id)
    const state = deriveHouseState(allRepairs, true)
    const cheapest = getCheapestAvailableRepair(state)

    expect(cheapest).toBeNull()
  })
})

describe('getStarterRepairs', () => {
  it('returns repairs with no dependencies', () => {
    const starters = getStarterRepairs()
    expect(starters).toHaveLength(4)
    expect(starters.every(r => r.requires.length === 0)).toBe(true)
  })
})

describe('isRepairAffordable', () => {
  it('returns true when balance >= cost', () => {
    expect(isRepairAffordable('int_garbage', 60)).toBe(true)
    expect(isRepairAffordable('int_garbage', 100)).toBe(true)
  })

  it('returns false when balance < cost', () => {
    expect(isRepairAffordable('int_garbage', 59)).toBe(false)
  })

  it('returns false for unknown repair', () => {
    expect(isRepairAffordable('unknown', 1000)).toBe(false)
  })
})

describe('getRepairCoinGap', () => {
  it('returns 0 when affordable', () => {
    expect(getRepairCoinGap('int_garbage', 60)).toBe(0)
    expect(getRepairCoinGap('int_garbage', 100)).toBe(0)
  })

  it('returns gap when not affordable', () => {
    expect(getRepairCoinGap('int_garbage', 50)).toBe(10)
    expect(getRepairCoinGap('int_garbage', 0)).toBe(60)
  })

  it('returns 0 for unknown repair', () => {
    expect(getRepairCoinGap('unknown', 0)).toBe(0)
  })
})

describe('getRepairStatus', () => {
  it('returns completed for completed repairs', () => {
    const state = deriveHouseState(['int_garbage'], true)
    expect(getRepairStatus('int_garbage', state)).toBe('completed')
  })

  it('returns available for available repairs', () => {
    const state = deriveHouseState([], false)
    expect(getRepairStatus('int_garbage', state)).toBe('available')
  })

  it('returns locked for locked repairs', () => {
    const state = deriveHouseState([], false)
    expect(getRepairStatus('int_floor', state)).toBe('locked')
  })
})

describe('getGuidedAvailableRepairs', () => {
  it('returns only starters when first repair not done', () => {
    const state = deriveHouseState([], false)
    const guided = getGuidedAvailableRepairs(state)

    expect(guided.size).toBe(4)
    expect(guided.has('int_garbage')).toBe(true)
    expect(guided.has('int_cobwebs')).toBe(true)
    expect(guided.has('ext_yard')).toBe(true)
    expect(guided.has('ext_mailbox')).toBe(true)
  })

  it('returns all available repairs after first repair done', () => {
    // Complete int_garbage, which unlocks int_floor
    const state = deriveHouseState(['int_garbage'], true)
    const guided = getGuidedAvailableRepairs(state)

    // Should include int_floor (unlocked) and other starters
    expect(guided.has('int_floor')).toBe(true)
    expect(guided.has('int_cobwebs')).toBe(true)
    expect(guided.has('ext_yard')).toBe(true)
    expect(guided.has('ext_mailbox')).toBe(true)
  })
})
