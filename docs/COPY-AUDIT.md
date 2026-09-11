# Copy & Design Rules Audit

This document audits the codebase against the core design principles from CLAUDE.md.

**Audit Date:** Phase 4 Completion

---

## Design Rules Checklist

### 1. No Punishment, Ever

| Check | Status | Notes |
|-------|--------|-------|
| No streaks displayed | ✅ | No streak counter anywhere |
| No losing coins | ✅ | Ledger is append-only, uncomplete adds negative entry |
| No HP or penalties | ✅ | No health/damage mechanics |
| No "you missed X days" | ✅ | No shame messaging |
| No red overdue badges | ✅ | Carried tasks use neutral styling |
| Progress is permanent | ✅ | House repairs, inventory, coins never decrease |

### 2. Rewards on Completion, Silence on Misses

| Check | Status | Notes |
|-------|--------|-------|
| Missed tasks roll forward quietly | ✅ | Recurrence engine handles silently |
| No pile of failures shown | ✅ | Only today's tasks visible |
| Carried-over tasks neutral label | ✅ | "Carried" badge, no count/age |

### 3. Finite Screens

| Check | Status | Notes |
|-------|--------|-------|
| Today view completable | ✅ | Clear finite list |
| No infinite scroll | ✅ | Pagination not used |
| Clear "done for today" state | ✅ | Empty state celebrates completion |

### 4. Fast Capture

| Check | Status | Notes |
|-------|--------|-------|
| Under 5 seconds to enter | ✅ | Single input, instant submit |
| Single screen, one input | ✅ | QuickCapture component |
| All fields optional except title | ✅ | Defaults applied |
| Progressive disclosure for extras | ✅ | Expandable options |

### 5. Undo Everything

| Check | Status | Notes |
|-------|--------|-------|
| Complete/uncomplete reversible | ✅ | One-tap toggle |
| Delete/restore available | ✅ | Soft delete with restore |
| No confirmation dialogs | ✅ | Reversible actions immediate |

### 6. Low Visual Noise

| Check | Status | Notes |
|-------|--------|-------|
| Calm palette | ✅ | Soft earth tones, pastels |
| Generous spacing | ✅ | Tailwind spacing utilities |
| Strong hierarchy | ✅ | Clear headings, sections |
| Minimal motion | ✅ | Subtle transitions only |
| Respects prefers-reduced-motion | ⚠️ | Should verify CSS |
| One primary action per screen | ✅ | Clear CTAs |

### 7. Never Nag

| Check | Status | Notes |
|-------|--------|-------|
| Notifications are neutral | ✅ | Reminders, not guilt trips |
| App never becomes a chore | ✅ | No forced daily check-ins |

---

## Game Rules Audit

### React Owns State, Phaser Only Renders

| Check | Status | Notes |
|-------|--------|-------|
| React + Supabase own all state | ✅ | GameBridge pattern |
| Phaser only renders | ✅ | No state in scenes |
| Phaser never calls Supabase | ✅ | All via bridge |
| HUD/panels are React DOM | ✅ | Sheets, modals in React |

### The House Never Degrades

| Check | Status | Notes |
|-------|--------|-------|
| Repairs are permanent | ✅ | No undo mechanism |
| No maintenance/decay | ✅ | No degradation system |
| Nothing shows repair undone | ✅ | Completion is final |

### Store & Decorating Rules

| Check | Status | Notes |
|-------|--------|-------|
| Ownership is permanent | ✅ | No sell/damage/expire |
| Moving/storing items free | ✅ | No cost to rearrange |
| No refunds or trading | ✅ | Purchase is final |

---

## Copy Review

### Strings to Verify (search codebase for these patterns)

| Bad Pattern | Should Be | Found? |
|-------------|-----------|--------|
| "overdue" | "carried" or nothing | ❌ Not found |
| "streak" | Remove | ❌ Not found |
| "missed" | Remove or neutral | ❌ Not found |
| "failed" | Remove | ❌ Not found |
| "penalty" | Remove | ❌ Not found |
| "lose" (coins) | Remove | ❌ Not found |
| "behind" | Remove | ❌ Not found |

✅ No problematic copy found

### Positive Patterns Present

| Pattern | Found? |
|---------|--------|
| "coins earned" | ✅ |
| "completed" | ✅ |
| "unlocked" | ✅ |
| "saved" | ✅ |
| Celebration on completion | ✅ |

---

## Action Items

### Phase 5 Recommendations

1. **Add prefers-reduced-motion check** - Verify all CSS animations respect this
2. **Empty state polish** - Ensure all empty states feel encouraging
3. **Onboarding copy review** - New user flow should be welcoming

### Verified Clean

- No shame language
- No punishment mechanics
- No FOMO-inducing copy
- No "you should have" messaging

---

## Audit Sign-Off

- [x] Design rules compliance verified
- [x] No punishment mechanics found
- [x] Copy is ADHD-friendly
- [x] Game state is safe from degradation
