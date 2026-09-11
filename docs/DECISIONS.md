# Architectural Decisions Log

Decisions made during implementation that weren't specified in the PRD.

---

## Decision 001: Template Storage

**Date:** 2024-09-15
**Context:** Templates could be a separate table or a flag on tasks
**Decision:** Using `is_template` flag on tasks table
**Rationale:** Simpler schema, templates share all task fields, avoids duplication
**Trade-offs:** Templates mixed with regular tasks in queries (mitigated by index)

---

## Decision 002: Occurrence Key Format

**Date:** 2024-09-15
**Context:** Need unique key for each occurrence of recurring tasks
**Decision:** Format: `YYYY-MM-DD` for daily, `YYYY-MM-DD-N` for multiple per day (e.g., `2024-09-15-1`, `2024-09-15-2`)
**Rationale:** Human-readable, sortable, timezone-independent at storage layer

---

## Decision 003: Multiple Times Per Day Display

**Date:** 2024-09-15
**Context:** How to display tasks with times_per_day > 1 (e.g., "brush teeth 2x/day")
**Decision:** Show as separate items in Today view, each earning coins separately
**Rationale:** Clearer mental model, each completion feels like a win
**Implementation:** Generate N occurrence keys per day: `YYYY-MM-DD-1`, `YYYY-MM-DD-2`, etc.

---

## Decision 004: Interval Recurrence Initial State

**Date:** 2024-09-15
**Context:** When creating an interval-based task, is it immediately due or can user set "last done"?
**Decision:** Allow setting "last done" date on creation so task isn't immediately due
**Rationale:** User may have just done the task (e.g., "I showered yesterday, remind me in 2 days")
**Implementation:** Add optional `last_completed_at` field used when no completions exist yet

---

## Decision 005: Reset My Day + Recurring Tasks

**Date:** 2024-09-15
**Context:** What happens to uncompleted recurring tasks when user hits "Reset my day"?
**Decision:** Today's occurrence vanishes silently; it does NOT carry over to tomorrow
**Rationale:** Carrying over would create guilt/backlog, contradicting core design principles
**Implementation:** Reset marks the day's occurrences as "skipped" (no completion row, no carryover logic)

---

## Decision 006: Dread Bonus on Recurring Tasks

**Date:** 2024-09-15
**Context:** Does defer_count accumulate for recurring tasks when occurrences are missed?
**Decision:** No. Dread bonus only applies to one-off tasks that are explicitly deferred or carried over.
**Rationale:** Accumulating dread on recurring tasks would incentivize skipping, which is the opposite of the goal
**Implementation:** `defer_count` only increments for non-recurring tasks

---

## Decision 007: Pinned Tasks Behavior

**Date:** 2024-09-15
**Context:** Is pinning a daily action or persistent property?
**Decision:** Persistent property - "always show in Today" until unpinned
**Rationale:** Reduces daily friction, good for tasks with no date that should always be visible
**Implementation:** Use existing `pinned_date` field as a boolean-like flag (NULL = not pinned, any date = pinned)

---

## Decision 008: Context Default Timezone

**Date:** 2024-09-15
**Context:** "Weekday 9-5 = work" - which timezone?
**Decision:** Use Toronto time (Eastern Time) specifically, not the 4am-adjusted app time
**Rationale:** Work hours are actual clock hours, not app-day adjusted
**Implementation:** Hardcode `America/Toronto` timezone for context default logic; may make configurable later

---

*Add new decisions above this line*
