/**
 * Coin Economy Configuration
 * All payout values and multipliers are defined here for easy tuning.
 */

// Base payouts by task size
export const BASE_PAYOUTS = {
  tiny: 5,
  small: 10,
  medium: 25,
  large: 60,
} as const

export type TaskSize = keyof typeof BASE_PAYOUTS

// Variable bonus configuration
export const VARIABLE_BONUS = {
  // 15% chance of +50% bonus
  standardChance: 0.15,
  standardMultiplier: 0.5,
  // 3% chance of +200% jackpot (checked first)
  jackpotChance: 0.03,
  jackpotMultiplier: 2.0,
} as const

// Dread bonus: multiplier = 1 + (0.25 * defer_count), capped at 3x
export const DREAD_BONUS = {
  perDeferMultiplier: 0.25,
  maxMultiplier: 3.0,
} as const

// First completion of the day bonus
export const FIRST_OF_DAY_BONUS = 5

// Cooldown after uncomplete before task can pay again (ms)
export const UNCOMPLETE_COOLDOWN_MS = 60 * 1000 // 60 seconds

// Milestone thresholds for celebrations
export const MILESTONES = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000] as const

/**
 * Calculate base payout for a task
 */
export function getBasePayout(size: TaskSize): number {
  return BASE_PAYOUTS[size]
}

/**
 * Calculate dread bonus multiplier based on defer count
 * Only applies to non-recurring tasks
 */
export function getDreadMultiplier(deferCount: number): number {
  const multiplier = 1 + DREAD_BONUS.perDeferMultiplier * deferCount
  return Math.min(multiplier, DREAD_BONUS.maxMultiplier)
}

/**
 * Roll for variable bonus using seeded random
 * Returns: { type: 'none' | 'standard' | 'jackpot', multiplier: number }
 */
export function rollVariableBonus(random: () => number): {
  type: 'none' | 'standard' | 'jackpot'
  multiplier: number
} {
  const roll = random()

  // Check jackpot first (3% chance)
  if (roll < VARIABLE_BONUS.jackpotChance) {
    return { type: 'jackpot', multiplier: VARIABLE_BONUS.jackpotMultiplier }
  }

  // Check standard bonus (15% chance)
  if (roll < VARIABLE_BONUS.jackpotChance + VARIABLE_BONUS.standardChance) {
    return { type: 'standard', multiplier: VARIABLE_BONUS.standardMultiplier }
  }

  return { type: 'none', multiplier: 0 }
}

/**
 * Calculate subtask payout
 * Each subtask pays parent_base / subtask_count (rounded up)
 * Last subtask pays any remainder
 */
export function getSubtaskPayout(
  parentSize: TaskSize,
  subtaskCount: number,
  subtaskIndex: number
): number {
  const parentBase = BASE_PAYOUTS[parentSize]
  const perSubtask = Math.ceil(parentBase / subtaskCount)

  // Last subtask gets remainder to ensure total equals parent
  if (subtaskIndex === subtaskCount - 1) {
    const previousPayouts = perSubtask * (subtaskCount - 1)
    return parentBase - previousPayouts
  }

  return perSubtask
}

/**
 * Check if a total crosses a milestone threshold
 */
export function checkMilestone(previousTotal: number, newTotal: number): number | null {
  for (const milestone of MILESTONES) {
    if (previousTotal < milestone && newTotal >= milestone) {
      return milestone
    }
  }
  return null
}

// =============================================================================
// Phase 3: Store Prices
// =============================================================================

export const STORE_PRICES = {
  // Surface decor (smallest)
  surface_decor: { min: 20, max: 45 },

  // Wall decor
  wall: { min: 40, max: 90 },

  // Rugs
  rug: { min: 60, max: 120 },

  // Small furniture (footprint <= 4 cells)
  furniture_small: { min: 80, max: 150 },

  // Large furniture (footprint > 4 cells)
  furniture_large: { min: 200, max: 350 },

  // Finishes
  wall_finish: { min: 120, max: 220 },
  floor_finish: { min: 120, max: 220 },

  // Outdoor
  outdoor: { min: 50, max: 200 },

  // Mystery box
  mystery_box: 75,
} as const

// =============================================================================
// Phase 3: Focus Timer
// =============================================================================

export const FOCUS_TIMER = {
  // Coins per 5-minute chunk
  coinsPerChunk: 3,
  // Minutes per chunk
  minutesPerChunk: 5,
  // Bonus for completing planned duration
  completionBonus: 10,
  // Duration presets in minutes
  presets: [10, 25, 50] as const,
  // Min/max custom duration
  minDuration: 5,
  maxDuration: 90,
} as const
