# Homestead - Product Requirements Document

## 1. Overview

### Purpose
A task manager designed for ADHD that turns completions into coins for a cozy game economy. Built to solve two problems: forgetting what needs to be done, and struggling to start even when remembering.

### Why Existing Apps Fail
- Slow and fiddly to enter tasks
- Every missed day becomes a wall of red
- Get boring within three weeks

### Solution
Phase 1: Task manager + coin economy
Phase 2+: Spend coins in a house-fixing/decorating game (Stardew Valley, Animal Crossing, Homescapes inspiration)

---

## 2. Design Principles

These come from ADHD research and personal experience. They are non-negotiable.

| Principle | Implementation |
|-----------|----------------|
| No punishment, ever | No streaks, no losing coins, no HP, no "missed days" messages, no red badges |
| Rewards on completion, silence on misses | Missed tasks roll forward quietly. Never show failure piles |
| Finite screens | Today view is completable. No infinite scroll. Clear "done" state |
| Capture faster than forgetting | <5 seconds, one screen, one input, everything else optional |
| Undo everything | One-tap reversible actions, no confirmation dialogs |
| Low visual noise | Calm palette, generous spacing, respect reduced-motion |
| Never nag | Neutral reminders only, app never becomes a chore |

---

## 3. Technical Decisions

| Aspect | Choice |
|--------|--------|
| Platform | Progressive Web App (phone home screen + desktop browser) |
| Frontend | React + TypeScript + Vite, Tailwind, TanStack Query, Zod |
| Backend | Supabase (Postgres + Auth + RLS) |
| Offline | Read-tolerant (cached Today view), writes require network in Phase 1 |
| PWA | vite-plugin-pwa, works 375px-1440px |
| Deployment | Vercel |
| Currency | "coins" (never "money" or "dollars") |
| Day boundary | 4:00 AM local time |
| Game rendering (Phase 2) | Phaser 4 with pixel-art assets |

---

## 4. Phase 1 Scope: Tasks + Coins

### 4.1 Task Model

**Required fields:**
- `title` (only required field)
- `context`: work | personal (default based on last used or time of day)

**Optional fields:**
- `size`: tiny | small | medium | large (default: small)
- `due`: date and/or time (soft - past dates show as "carried over", no red)
- `recurrence`: scheduled or interval-since-done
- `notes`: free text
- `subtasks`: ordered checklist
- Soft delete with restore

**Internal fields:**
- `defer_count`: incremented when task is carried over or explicitly deferred

### 4.2 Quick Capture

The most important UI in the app.

**Requirements:**
- Always visible: floating "+" on mobile, `n` shortcut + persistent input on desktop
- Single text input, Enter submits with defaults
- Natural language parsing with live preview chips:
  - Dates: "tomorrow", "friday", "sep 14", "at 5pm", "tonight", "next week"
  - Recurrence: "every day", "daily", "every weekday", "every monday and thursday", "every 3 days", "weekly", "monthly"
  - Context: "#work", "#personal", or trailing "work"/"personal"
  - Size: "!tiny", "!small", "!medium", "!large" (or "!" through "!!!!")
- Input clears after submit, stays focused for rapid entry
- Small toast with undo on completion

**Starter Pack:**
- First-run dismissible import of common daily basics
- Pre-configured recurrence and size
- User can deselect before importing

**Templates:**
- Save any task as template
- Re-add in two taps

### 4.3 Recurrence Engine

Two distinct modes (make difference obvious in UI):

**1. Scheduled**
- Fixed calendar pattern regardless of completion
- "Every Monday", "every weekday", "1st of the month"
- Missing an occurrence does NOT create backlog
- Only one instance ever visible (current or next)

**2. Interval-since-done**
- Next occurrence computed from last completion
- "Every 3 days" = 3 days after last done, not every third calendar day
- Correct for: shower, laundry, water plants, clean litter box
- If never done, due today

**Also support:**
- Multiple times per day (e.g., brush teeth 2x): show "1/2" progress
- Specific time of day for ordering and reminders
- Pause/resume without deleting
- Editing schedule only affects future occurrences

**Implementation:**
- Generate occurrences lazily (compute for date window from rule + history)
- Store completions as rows: `task_id`, `completed_at`, `occurrence_key`
- Handle DST and 4am boundary in tests

### 4.4 Today View (Home Screen)

**Content:**
- Carried-over tasks (neutral label, no count, no age)
- Tasks due today
- Recurring tasks due today
- Pinned one-off tasks with no date

**Ordering:**
- Pinned/anytime first
- Then by time of day
- Then by size (tiny first for quick wins)
- Drag to reorder, persists for the day

**Features:**
- Context toggle: All / Work / Personal
- One-tap complete: large hit target, brief animation, "+12" floating up
- Tap title to expand details inline

**Modes:**
- **Next-up mode:** Hides list, shows one task full-screen. Done / Skip / Break it down. Skip moves to next, nothing recorded as failure.
- **Low energy toggle:** Shows only tiny + small + must-do tasks. Persists per day.
- **Reset my day:** Moves unfinished non-recurring to Someday in one tap. Recurring await next occurrence. Undoable.

**Empty state:**
- "You're done for today"
- Coins earned today
- Subtle CTA to plan tomorrow

### 4.5 Coin Economy

**Ledger (HARD REQUIREMENT):**
- Append-only table
- Every movement is a row: `id, user_id, amount (signed), reason (enum), ref_type, ref_id, created_at`
- Balance = `SUM(amount)`, never stored as mutable field
- Phase 2 purchases write to same table

**Payout table:**
| Size   | Base Coins |
|--------|------------|
| tiny   | 5          |
| small  | 10         |
| medium | 25         |
| large  | 60         |

**Modifiers (additive, shown in toast):**
- Variable bonus: 15% chance +50%, 3% chance +200% jackpot (distinct animation)
- Dread tax bonus: `1 + 0.25 * defer_count`, capped at 3×
- First-of-day: +5 coins
- Subtasks: each pays `parent base / subtask count` (rounded up), last pays remainder

**Uncomplete:**
- Writes reversing ledger row (negative, reason: reversal)
- Bonus rows reversed too
- Never delete ledger rows
- 60-second cooldown before re-payout

**Sanity check targets (write as test):**
- Decent day (8 tiny/small, 2 medium): ~130-180 coins
- Rough day (3 tiny): ~15-25 coins
- First room repair (Phase 2): ~400 coins

### 4.6 Progress Without Streaks

- **Heatmap:** GitHub-style, last 12 weeks, colored by coins/day. Empty cells just empty, no zeros labeled. NO streaks.
- **Balance:** Total + today's coins in header always
- **7-day momentum:** Single number + tiny sparkline. Only trend metric.
- **Milestones:** Cumulative coin milestones (100, 500, 1000, 2500, 5000...) with one-time celebration. Never resets.

### 4.7 Task Breakdown (AI)

- "Break it down" button on task detail and Next-up mode
- Anthropic Messages API via Supabase Edge Function (key never in client)
- Prompt: 3-7 concrete, physically-doable steps, each <10 words, first step trivially small. JSON only.
- Result: proposed subtasks with checkboxes, confirm which to keep
- Nothing saved until confirmed
- Graceful failure: "Couldn't reach the helper - try again"

### 4.8 Reminders (Minimal)

- Web Push via service worker for tasks with specific time
- One reminder at time, optional second N minutes before
- Neutral tone: task title only
- Per-context quiet hours
- Everything optional, app works without notification permission

### 4.9 Other Screens

**All Tasks:**
- Grouped: Today / Upcoming / Someday / Recurring
- Searchable, filter by context
- Finite lists with collapsible groups

**Task Detail:**
- Inline editing
- Recurrence editor (two modes explained in one sentence each)
- Subtasks, notes
- Defer: push to tomorrow / next week / someday
- Delete/restore

**Settings:**
- Contexts (rename, recolor)
- Day boundary time
- Quiet hours
- Notification toggles
- Reduced motion
- Export/import JSON (must round-trip perfectly including ledger)
- Sign out

**Auth:**
- Supabase magic-link email
- Persist session
- Never log out unexpectedly

### 4.10 Non-Goals for Phase 1

- The game, store, avatar
- Shared/team features
- Calendar integration
- Tags beyond two contexts
- Priorities separate from size
- Time tracking
- Focus timer (Phase 3)
- Themes beyond light/dark

---

## 5. Future Phases (Architecture Awareness Only)

**Phase 2 - The House (Repair Loop)**
- Phaser 4 scene at `/home`
- Exterior + interior views, starts wrecked
- `repairs.json`: ordered repair stages with coin cost, sprites, animation
- Repairs are permanent, house never degrades

**Phase 3 - Store and Decorating**
- `catalog.json` of items
- Rotating weekly subset + daily mystery box
- 2D grid placement with "surfaces" concept
- Focus timer (25-min sessions pay coins)

**Phase 4 - Avatar**
- Paper-doll layering
- Clothing as catalog category
- Appears in room and Today header

---

## 6. Acceptance Checklist

- [ ] Install on phone, open to Today in <2 seconds warm cache, last-known list visible offline
- [ ] "walk the dog every day at 5pm #personal" creates correct recurring task with preview chips
- [ ] "shower every 2 days" is interval-since-done; "standup every weekday at 9am !tiny #work" is scheduled
- [ ] Missing scheduled recurring task for a week shows exactly one instance, not seven
- [ ] Complete/uncomplete/re-complete leaves ledger consistent and balance correct
- [ ] Task carried over 3 times pays visible 1.75× dread bonus
- [ ] Reset my day, low energy mode, Next-up mode all work and are reversible
- [ ] Heatmap, balance, today's coins, 7-day momentum correct across 4am boundary
- [ ] Export → wipe → import reproduces identical state including balance
- [ ] No screen shows streak, overdue count, or red badge
- [ ] Break-it-down returns editable proposed subtasks, saves nothing until confirmed
- [ ] Lighthouse PWA and accessibility checks pass, prefers-reduced-motion respected
