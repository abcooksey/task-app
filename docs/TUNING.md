# Economy Tuning Guide

All economy constants are defined in `src/config/economy.ts`. This document explains each value and how to tune them.

---

## Task Payouts

### Base Payouts by Size

```typescript
export const BASE_PAYOUTS = {
  tiny: 5,     // Quick tasks (< 2 min)
  small: 10,   // Simple tasks (2-10 min)
  medium: 25,  // Standard tasks (10-30 min)
  large: 60,   // Big tasks (30+ min)
}
```

**Tuning Notes:**
- Tiny/small ratio should encourage breaking down tasks
- Medium is the "default" - most tasks land here
- Large should feel rewarding but not so high that users artificially inflate sizes

### First-of-Day Bonus

```typescript
export const FIRST_OF_DAY_BONUS = 5
```

A flat bonus for the first task completed each day. Encourages daily engagement without punishing missed days.

---

## Variable Bonuses

### Random Bonus Rolls

```typescript
export const VARIABLE_BONUS = {
  standardChance: 0.15,      // 15% chance
  standardMultiplier: 0.5,   // +50% coins
  jackpotChance: 0.03,       // 3% chance
  jackpotMultiplier: 2.0,    // +200% coins (3x total)
}
```

**How it works:**
1. Roll a random number 0-1
2. If < 3%, jackpot (3x payout)
3. Else if < 18% (3% + 15%), standard bonus (1.5x payout)
4. Else, no bonus

**Tuning Notes:**
- Jackpot keeps things exciting without being expected
- Standard bonus happens often enough to notice
- Combined ~18% chance of any bonus

### Dread Bonus

```typescript
export const DREAD_BONUS = {
  perDeferMultiplier: 0.25,  // +25% per defer
  maxMultiplier: 3.0,        // Cap at 3x
}
```

**Formula:** `multiplier = 1 + (0.25 × defer_count)`

| Defers | Multiplier |
|--------|------------|
| 0 | 1.0x |
| 1 | 1.25x |
| 2 | 1.5x |
| 3 | 1.75x |
| 4 | 2.0x |
| 8+ | 3.0x (capped) |

**Tuning Notes:**
- Only applies to non-recurring tasks
- Rewards finally tackling procrastinated tasks
- Cap prevents exploitation (can't defer forever for infinite coins)

---

## Uncomplete Cooldown

```typescript
export const UNCOMPLETE_COOLDOWN_MS = 60 * 1000 // 60 seconds
```

After uncompleting a task, it cannot be re-completed for 60 seconds. Prevents accidental "coin farming" by rapidly completing/uncompleting.

---

## Milestones

```typescript
export const MILESTONES = [
  100, 500, 1000, 2500, 5000,
  10000, 25000, 50000, 100000
]
```

Lifetime coin thresholds that trigger celebrations. Spacing increases logarithmically to maintain sense of progress.

---

## Store Prices

### Price Ranges by Category

```typescript
export const STORE_PRICES = {
  surface_decor: { min: 20, max: 45 },
  wall: { min: 40, max: 90 },
  rug: { min: 60, max: 120 },
  furniture_small: { min: 80, max: 150 },
  furniture_large: { min: 200, max: 350 },
  wall_finish: { min: 120, max: 220 },
  floor_finish: { min: 120, max: 220 },
  outdoor: { min: 50, max: 200 },
  mystery_box: 75,
}
```

**Tuning Notes:**
- Surface decor is impulse-buy territory
- Large furniture requires saving (multiple days of tasks)
- Mystery box priced to be accessible but not spammable

### Earning Rate vs Spending

| Activity | Coins/Day (estimate) |
|----------|---------------------|
| 5 medium tasks | ~125 coins |
| 10 small tasks | ~100 coins |
| 2 focus sessions (25 min) | ~40 coins |
| First-of-day bonus | 5 coins |
| **Typical daily total** | **150-200 coins** |

| Purchase | Days to Save |
|----------|-------------|
| Surface decor (30 avg) | < 1 day |
| Small furniture (115 avg) | ~1 day |
| Large furniture (275 avg) | 1.5-2 days |
| Room finish (170 avg) | ~1 day |

---

## Focus Timer

```typescript
export const FOCUS_TIMER = {
  coinsPerChunk: 3,         // Per 5-minute block
  minutesPerChunk: 5,
  completionBonus: 10,      // For finishing planned duration
  presets: [10, 25, 50],    // Quick-select durations
  minDuration: 5,
  maxDuration: 90,
}
```

### Payout Examples

| Duration | Chunks | Chunk Coins | Completion | Total |
|----------|--------|-------------|------------|-------|
| 10 min | 2 | 6 | 10 | 16 |
| 25 min | 5 | 15 | 10 | 25 |
| 50 min | 10 | 30 | 10 | 40 |

**Tuning Notes:**
- Shorter sessions are slightly more efficient per-minute
- Completion bonus rewards commitment
- 25-min Pomodoro gives 25 coins (easy to remember)

---

## Balance Philosophy

### Goals
1. **Daily progress feels meaningful** - A typical day should afford at least one item
2. **No rush** - Missing a day doesn't create pressure to catch up
3. **Bigger rewards feel earned** - Large furniture takes planning
4. **Bonuses add excitement** - Random jackpots keep it fun

### Anti-Patterns to Avoid
- ❌ Prices so high they feel unattainable
- ❌ Prices so low nothing feels special
- ❌ Daily bonuses that create obligation
- ❌ Diminishing returns on productivity

---

## Modifying Values

1. Edit `src/config/economy.ts`
2. Run tests: `npm test` (economy tests verify math)
3. Consider downstream effects:
   - Higher task payouts → faster store purchases
   - Lower prices → less "saving" behavior
   - Higher jackpot chance → more coin inflation

### Testing Changes

```bash
# Run economy-specific tests
npm test -- economy

# Check average earnings
# Add temporary logging in useTaskCompletion
```
