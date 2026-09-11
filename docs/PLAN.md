# Implementation Plan

## Phase 1: Tasks + Coins

### Slice 1: Project Setup
- [x] Initialize Vite + React + TypeScript project
- [x] Configure Tailwind CSS
- [x] Configure ESLint
- [x] Set up Vitest for testing
- [x] Configure vite-plugin-pwa with basic manifest
- [x] Create folder structure per CLAUDE.md
- [x] Set up Supabase project and local dev
- [x] Configure environment variables
- [x] Create basic routing (Today, All Tasks, Settings)

### Slice 2: Database Schema
- [x] Create Supabase migrations for all tables
- [x] Set up Row Level Security policies
- [x] Create Zod schemas mirroring DB types
- [x] Set up Supabase client with TypeScript types
- [ ] Write seed script for demo data (dev-only flag)

### Slice 3: Auth
- [x] Implement magic-link email auth flow
- [x] Create auth context and hooks
- [x] Persist session across reloads
- [x] Protected route wrapper
- [x] Sign out functionality

### Slice 4: Core Task CRUD
- [ ] Create task (minimal: title only)
- [ ] Read tasks with TanStack Query
- [ ] Update task (all fields)
- [ ] Soft delete task
- [ ] Restore deleted task
- [ ] Optimistic updates for all mutations
- [ ] Task list component (basic)
- [ ] Task detail view (inline expand)

### Slice 5: Recurrence Engine
- [ ] Implement recurrence type definitions
- [ ] Build scheduled mode occurrence generator
- [ ] Build interval-since-done occurrence generator
- [ ] Handle times_per_day logic (separate items per occurrence)
- [ ] Implement getTasksDueInWindow() function
- [ ] Handle 4am day boundary
- [ ] Handle DST edge cases
- [ ] Write comprehensive unit tests
- [ ] Test with fake clock for boundary conditions

### Slice 6: Natural Language Parser
- [ ] Integrate chrono-node for date parsing
- [ ] Build recurrence pattern parser
- [ ] Parse context tags (#work, #personal)
- [ ] Parse size indicators (!tiny through !!!!)
- [ ] Build preview chip generation
- [ ] Write parser unit tests for all patterns
- [ ] Handle edge cases and ambiguity

### Slice 7: Quick Capture
- [x] Floating "+" button (mobile)
- [x] Persistent input + keyboard shortcut (desktop)
- [ ] Live preview chips as user types
- [ ] Tap chip to remove/correct
- [ ] Submit creates task with parsed values
- [x] Input clears and stays focused
- [ ] Toast with undo on creation
- [x] Rapid-fire entry support

### Slice 8: Coin Economy
- [x] Create economy config file with payout values
- [x] Implement base payout calculation
- [x] Implement variable bonus (seeded RNG, testable)
- [x] Implement dread bonus calculation
- [x] Implement first-of-day bonus
- [x] Implement subtask payout calculation
- [ ] Ledger write on completion
- [ ] Ledger reversal on uncomplete
- [ ] 60-second cooldown logic
- [x] Balance computation function
- [x] Today's coins computation
- [ ] Write unit tests for all payout scenarios
- [ ] Write sanity check tests (decent day, rough day)

### Slice 9: Task Completion Flow
- [ ] Complete button with large hit target
- [ ] Completion animation (respect reduced-motion)
- [ ] "+N coins" floating animation
- [ ] Bonus callout in animation ("Jackpot!" / "Dread bonus!")
- [ ] Uncomplete action
- [ ] Optimistic update with rollback
- [ ] Update defer_count on carryover

### Slice 10: Today View
- [ ] Query tasks due today (using recurrence engine)
- [ ] Section: Carried over (neutral label)
- [ ] Section: Scheduled for today
- [ ] Section: Pinned tasks
- [x] Context toggle (All / Work / Personal)
- [ ] Order: pinned → time → size (tiny first)
- [ ] Drag to reorder (persist in day_state)
- [ ] Empty "done for today" state
- [x] Show coins earned today in header

### Slice 11: Today View Modes
- [ ] Low energy toggle (tiny + small only)
- [ ] Persist low energy in day_state
- [ ] "Reset my day" action
- [ ] Reset moves non-recurring to Someday
- [ ] Reset is undoable
- [ ] Next-up mode (single task view)
- [ ] Next-up: Done / Skip / Break it down
- [ ] Skip moves to next (no failure recorded)

### Slice 12: Progress Display
- [x] Total balance in header
- [x] Today's coins in header
- [ ] 7-day momentum calculation
- [ ] Sparkline component
- [ ] Heatmap component (12 weeks)
- [ ] Heatmap colored by coins/day
- [ ] No zeros, no streaks anywhere
- [ ] Milestone detection and celebration
- [ ] Handle 4am boundary in all calculations

### Slice 13: Subtasks
- [ ] Add subtasks to task
- [ ] Reorder subtasks (drag)
- [ ] Complete individual subtask
- [ ] Subtask pays fractional coins
- [ ] Completing all subtasks completes parent
- [ ] Completing parent completes remaining subtasks
- [ ] Uncomplete subtask (with reversal)

### Slice 14: All Tasks View
- [ ] Group: Today
- [ ] Group: Upcoming (has due date in future)
- [ ] Group: Someday (no due date, not recurring)
- [ ] Group: Recurring (all recurring tasks)
- [ ] Collapsible groups
- [ ] Search by title
- [ ] Filter by context
- [ ] Deleted tasks (separate view or filter)

### Slice 15: Task Detail & Editing
- [ ] Inline edit title
- [ ] Edit context
- [ ] Edit size (four-dot picker)
- [ ] Edit due date/time
- [ ] Recurrence editor UI
- [ ] Show scheduled vs interval mode clearly
- [ ] One-sentence explanation of each mode
- [ ] Edit notes
- [ ] Defer actions (tomorrow / next week / someday)
- [ ] Delete / restore actions
- [ ] Pause / resume recurring task

### Slice 16: Starter Pack & Templates
- [ ] Starter pack data (common daily tasks)
- [ ] First-run detection
- [ ] Dismissible starter pack modal
- [ ] Selectable items before import
- [ ] Import selected items
- [ ] Save task as template
- [ ] Template picker (re-add in two taps)
- [ ] Templates in All Tasks view

### Slice 17: AI Task Breakdown
- [ ] Create Supabase Edge Function
- [ ] Anthropic API integration
- [ ] Prompt engineering (3-7 steps, <10 words, first trivially small)
- [ ] "Break it down" button on task detail
- [ ] "Break it down" button in Next-up mode
- [ ] Show proposed subtasks with checkboxes
- [ ] Confirm to save selected subtasks
- [ ] Graceful error handling
- [ ] Model ID in config

### Slice 18: Settings
- [ ] Day boundary time selector
- [ ] Context customization (name, color)
- [ ] Reduced motion toggle
- [ ] Sync with prefers-reduced-motion
- [ ] Export data as JSON
- [ ] Import data from JSON
- [ ] Validate import with Zod
- [ ] Verify ledger integrity on import
- [x] Sign out

### Slice 19: Notifications (Optional)
- [ ] Request notification permission
- [ ] Service worker push handling
- [ ] Schedule reminders for tasks with time
- [ ] Optional "N minutes before" reminder
- [ ] Quiet hours per context
- [ ] Notification toggle in settings
- [ ] Works without permission granted

### Slice 20: Offline Support
- [x] Service worker caching strategy
- [ ] Cache Today view data
- [ ] Show last-known state when offline
- [ ] Calm offline indicator
- [ ] Clear indicator that writes need network
- [ ] Refetch on reconnect

### Slice 21: PWA & Polish
- [x] App manifest (icons, colors, name)
- [ ] Install prompt handling
- [x] Responsive design (375px - 1440px)
- [ ] Light/dark mode
- [x] Respect prefers-reduced-motion everywhere
- [ ] Lighthouse PWA audit (pass)
- [ ] Lighthouse accessibility audit (pass)
- [ ] Final visual polish

### Slice 22: Testing & Documentation
- [ ] Recurrence engine unit tests complete
- [ ] Coin economy unit tests complete
- [ ] Parser unit tests complete
- [ ] Integration tests for critical flows
- [x] Create docs/DEPLOY.md
- [x] Update docs/DECISIONS.md with all choices made
- [ ] Final review against acceptance checklist

---

## Phase 2: The House (Outline)
- Phaser 4 integration
- Exterior and interior scenes
- repairs.json data structure
- Repair progression system
- Repair animations
- Ledger integration for repair costs

## Phase 3: Store & Decorating (Outline)
- catalog.json data structure
- Store UI with rotating inventory
- Purchase flow
- Placement grid system
- "Surfaces" for small decor
- Inventory management
- Focus timer (25-min sessions)

## Phase 4: Avatar (Outline)
- Paper-doll layering system
- Clothing as catalog category
- Avatar customization UI
- Avatar display in room and header

---

## Clarifications Resolved

1. **Multiple times per day:** Show as separate items in Today, each earning coins separately
2. **Interval recurrence first occurrence:** Allow setting "last done" date so task isn't immediately due
3. **Reset my day + recurring:** Today's occurrence vanishes silently (no carryover)
4. **Dread bonus on recurring:** No - only applies to non-recurring tasks
5. **Pinned tasks:** Persistent property until unpinned ("always show in Today")
6. **Context default timing:** Use Toronto time (EST), not 4am-adjusted app time
7. **Template storage:** Using `is_template` flag on tasks table
