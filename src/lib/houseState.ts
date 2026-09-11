/**
 * House state derivation logic
 *
 * Pure functions for computing house state from repairs.json content
 * and completed repair IDs from the database.
 */

import repairsData from '@/game/content/repairs.json'

// Types for repairs.json content
export interface Repair {
  id: string
  view: 'interior' | 'exterior'
  name: string
  blurb: string
  cost: number
  requires: string[]
  order: number
  animationType: 'sweep' | 'hammer' | 'sparkle' | 'paint' | 'swap'
}

export interface RepairsContent {
  version: number
  repairs: Repair[]
}

// Derived house state
export interface HouseState {
  completedRepairIds: Set<string>
  availableRepairIds: Set<string>
  lockedRepairIds: Set<string>
  decoratingUnlocked: boolean
  progress: {
    interior: { done: number; total: number }
    exterior: { done: number; total: number }
  }
  firstRepairDone: boolean
}

// Load typed repairs content
export const repairs: RepairsContent = repairsData as RepairsContent

// Get repairs by view
export function getRepairsByView(view: 'interior' | 'exterior'): Repair[] {
  return repairs.repairs
    .filter(r => r.view === view)
    .sort((a, b) => a.order - b.order)
}

// Get a single repair by ID
export function getRepairById(id: string): Repair | undefined {
  return repairs.repairs.find(r => r.id === id)
}

// Get the cheapest available repair
export function getCheapestAvailableRepair(state: HouseState): Repair | null {
  const availableRepairs = repairs.repairs.filter(r =>
    state.availableRepairIds.has(r.id)
  )
  if (availableRepairs.length === 0) return null
  return availableRepairs.reduce((min, r) => r.cost < min.cost ? r : min)
}

// Get all starter repairs (no dependencies)
export function getStarterRepairs(): Repair[] {
  return repairs.repairs.filter(r => r.requires.length === 0)
}

/**
 * Derive the full house state from completed repair IDs.
 *
 * This is a pure function that computes:
 * - Which repairs are completed (from DB)
 * - Which repairs are available (dependencies satisfied, not completed)
 * - Which repairs are locked (dependencies not satisfied)
 * - Progress counts for each view
 * - Whether decorating is unlocked (all interior repairs done)
 */
export function deriveHouseState(
  completedIds: string[],
  firstRepairDone: boolean
): HouseState {
  const completedSet = new Set(completedIds)
  const availableSet = new Set<string>()
  const lockedSet = new Set<string>()

  // Categorize each repair
  for (const repair of repairs.repairs) {
    if (completedSet.has(repair.id)) {
      // Already completed - skip
      continue
    }

    // Check if all dependencies are satisfied
    const depsComplete = repair.requires.every(depId => completedSet.has(depId))

    if (depsComplete) {
      availableSet.add(repair.id)
    } else {
      lockedSet.add(repair.id)
    }
  }

  // Count progress by view
  const interiorRepairs = repairs.repairs.filter(r => r.view === 'interior')
  const exteriorRepairs = repairs.repairs.filter(r => r.view === 'exterior')

  const interiorDone = interiorRepairs.filter(r => completedSet.has(r.id)).length
  const exteriorDone = exteriorRepairs.filter(r => completedSet.has(r.id)).length

  // Decorating unlocks when all interior repairs are done
  const decoratingUnlocked = interiorDone === interiorRepairs.length

  return {
    completedRepairIds: completedSet,
    availableRepairIds: availableSet,
    lockedRepairIds: lockedSet,
    decoratingUnlocked,
    progress: {
      interior: { done: interiorDone, total: interiorRepairs.length },
      exterior: { done: exteriorDone, total: exteriorRepairs.length },
    },
    firstRepairDone,
  }
}

/**
 * Check if a repair is affordable given current balance.
 */
export function isRepairAffordable(repairId: string, balance: number): boolean {
  const repair = getRepairById(repairId)
  if (!repair) return false
  return balance >= repair.cost
}

/**
 * Get the coin gap (how many more coins needed) for a repair.
 * Returns 0 if affordable.
 */
export function getRepairCoinGap(repairId: string, balance: number): number {
  const repair = getRepairById(repairId)
  if (!repair) return 0
  return Math.max(0, repair.cost - balance)
}

/**
 * Get status of a repair for display.
 */
export type RepairStatus = 'completed' | 'available' | 'locked'

export function getRepairStatus(repairId: string, state: HouseState): RepairStatus {
  if (state.completedRepairIds.has(repairId)) return 'completed'
  if (state.availableRepairIds.has(repairId)) return 'available'
  return 'locked'
}

/**
 * For first-repair guidance mode:
 * Return only the starter repairs until first repair is done.
 */
export function getGuidedAvailableRepairs(state: HouseState): Set<string> {
  if (state.firstRepairDone) {
    return state.availableRepairIds
  }

  // Only show starter repairs (int_garbage, int_cobwebs, ext_yard, ext_mailbox)
  const starters = getStarterRepairs()
  const guidedSet = new Set<string>()
  for (const repair of starters) {
    if (state.availableRepairIds.has(repair.id)) {
      guidedSet.add(repair.id)
    }
  }
  return guidedSet
}
