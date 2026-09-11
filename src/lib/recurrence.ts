/**
 * Recurrence Engine
 *
 * Two modes:
 * 1. Scheduled - Fixed calendar pattern (every Monday, every weekday, etc.)
 *    Missing an occurrence does NOT create a backlog. Only one instance visible.
 *
 * 2. Interval-since-done - Next due = last completion + N days
 *    If never completed, due today (unless last_completed_at is set).
 */

import { getAppDay, formatDateKey, parseDateKey } from './time'
import type { Recurrence, ScheduledRecurrence, IntervalRecurrence } from '@/types'
import type { Task, Completion } from '@/types/database'

// =============================================================================
// Types
// =============================================================================

export interface TaskOccurrence {
  taskId: string
  task: Task
  occurrenceKey: string  // e.g., "2024-09-15" or "2024-09-15-1"
  dueDate: string        // YYYY-MM-DD
  dueTime: string | null // HH:mm or null
  isCompleted: boolean
  occurrenceIndex: number // For times_per_day: 0, 1, 2...
}

// =============================================================================
// Scheduled Mode
// =============================================================================

/**
 * Check if a date matches a scheduled recurrence pattern
 */
export function matchesScheduledPattern(
  date: Date,
  recurrence: ScheduledRecurrence
): boolean {
  const pattern = recurrence.pattern

  switch (pattern.type) {
    case 'daily':
      return true

    case 'weekdays': {
      const day = date.getDay()
      return day >= 1 && day <= 5 // Monday = 1, Friday = 5
    }

    case 'weekly': {
      const day = date.getDay()
      return pattern.days.includes(day)
    }

    case 'monthly': {
      const dayOfMonth = date.getDate()
      return dayOfMonth === pattern.day
    }

    case 'custom_days': {
      // For custom_days, we need to calculate from task creation
      // This is calendar-based, not completion-based
      // We'll handle this specially - it's like "every N calendar days"
      return true // Will be filtered by interval check
    }

    default:
      return false
  }
}

/**
 * Get the next scheduled occurrence on or after a given date
 */
export function getNextScheduledOccurrence(
  startDate: Date,
  recurrence: ScheduledRecurrence,
  taskCreatedAt: Date
): Date {
  const date = new Date(startDate)
  date.setHours(0, 0, 0, 0)

  // For custom_days interval, calculate from creation date
  if (recurrence.pattern.type === 'custom_days') {
    const interval = recurrence.pattern.interval
    const creationDate = new Date(taskCreatedAt)
    creationDate.setHours(0, 0, 0, 0)

    const daysSinceCreation = Math.floor(
      (date.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const daysUntilNext = interval - (daysSinceCreation % interval)

    if (daysUntilNext === interval) {
      // Today is an occurrence day
      return date
    }

    date.setDate(date.getDate() + daysUntilNext)
    return date
  }

  // For other patterns, iterate forward until we find a match
  for (let i = 0; i < 366; i++) {
    if (matchesScheduledPattern(date, recurrence)) {
      return date
    }
    date.setDate(date.getDate() + 1)
  }

  // Fallback (shouldn't reach here)
  return date
}

/**
 * Check if a scheduled task is due on a specific app day
 */
export function isScheduledTaskDueOnDay(
  task: Task,
  dayKey: string,
  completions: Completion[]
): { isDue: boolean; occurrenceKeys: string[] } {
  if (!task.recurrence) {
    return { isDue: false, occurrenceKeys: [] }
  }

  const recurrence = task.recurrence as ScheduledRecurrence
  if (recurrence.mode !== 'scheduled') {
    return { isDue: false, occurrenceKeys: [] }
  }

  const date = parseDateKey(dayKey)

  // Check if this date matches the pattern
  if (recurrence.pattern.type === 'custom_days') {
    const taskCreated = new Date(task.created_at)
    const nextOccurrence = getNextScheduledOccurrence(date, recurrence, taskCreated)
    if (formatDateKey(nextOccurrence) !== dayKey) {
      return { isDue: false, occurrenceKeys: [] }
    }
  } else if (!matchesScheduledPattern(date, recurrence)) {
    return { isDue: false, occurrenceKeys: [] }
  }

  // Generate occurrence keys for times_per_day
  const occurrenceKeys: string[] = []
  for (let i = 0; i < task.times_per_day; i++) {
    const key = task.times_per_day > 1 ? `${dayKey}-${i + 1}` : dayKey
    occurrenceKeys.push(key)
  }

  // Filter out completed occurrences
  const completedKeys = new Set(
    completions
      .filter((c) => c.task_id === task.id && !c.reversed_at)
      .map((c) => c.occurrence_key)
  )

  const uncompletedKeys = occurrenceKeys.filter((key) => !completedKeys.has(key))

  return {
    isDue: uncompletedKeys.length > 0,
    occurrenceKeys: uncompletedKeys,
  }
}

// =============================================================================
// Interval Mode
// =============================================================================

/**
 * Calculate when an interval task is next due
 */
export function getIntervalNextDueDate(
  task: Task,
  completions: Completion[]
): string | null {
  if (!task.recurrence) return null

  const recurrence = task.recurrence as IntervalRecurrence
  if (recurrence.mode !== 'interval') return null

  // Find the most recent non-reversed completion
  const taskCompletions = completions
    .filter((c) => c.task_id === task.id && !c.reversed_at)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

  let lastCompletedDate: Date

  if (taskCompletions.length > 0) {
    lastCompletedDate = new Date(taskCompletions[0].completed_at)
  } else if (task.last_completed_at) {
    // Use the manually set "last completed" date
    lastCompletedDate = new Date(task.last_completed_at)
  } else {
    // Never completed and no last_completed_at set - due today
    return getAppDay()
  }

  // Calculate next due date
  const nextDue = new Date(lastCompletedDate)
  nextDue.setDate(nextDue.getDate() + recurrence.days)

  return formatDateKey(nextDue)
}

/**
 * Check if an interval task is due on a specific app day
 */
export function isIntervalTaskDueOnDay(
  task: Task,
  dayKey: string,
  completions: Completion[]
): { isDue: boolean; occurrenceKeys: string[] } {
  if (!task.recurrence) {
    return { isDue: false, occurrenceKeys: [] }
  }

  const recurrence = task.recurrence as IntervalRecurrence
  if (recurrence.mode !== 'interval') {
    return { isDue: false, occurrenceKeys: [] }
  }

  const nextDueDate = getIntervalNextDueDate(task, completions)
  if (!nextDueDate) {
    return { isDue: false, occurrenceKeys: [] }
  }

  // Interval tasks are due on or after their next due date
  const dueDate = parseDateKey(nextDueDate)
  const checkDate = parseDateKey(dayKey)

  if (checkDate < dueDate) {
    return { isDue: false, occurrenceKeys: [] }
  }

  // Generate occurrence keys for times_per_day
  const occurrenceKeys: string[] = []
  for (let i = 0; i < task.times_per_day; i++) {
    const key = task.times_per_day > 1 ? `${dayKey}-${i + 1}` : dayKey
    occurrenceKeys.push(key)
  }

  // For interval tasks, check if already completed today
  const completedKeys = new Set(
    completions
      .filter((c) => c.task_id === task.id && !c.reversed_at)
      .map((c) => c.occurrence_key)
  )

  const uncompletedKeys = occurrenceKeys.filter((key) => !completedKeys.has(key))

  return {
    isDue: uncompletedKeys.length > 0,
    occurrenceKeys: uncompletedKeys,
  }
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Check if a recurring task is due on a specific app day
 */
export function isRecurringTaskDueOnDay(
  task: Task,
  dayKey: string,
  completions: Completion[]
): { isDue: boolean; occurrenceKeys: string[] } {
  if (!task.recurrence || task.is_paused) {
    return { isDue: false, occurrenceKeys: [] }
  }

  const recurrence = task.recurrence as Recurrence

  if (recurrence.mode === 'scheduled') {
    return isScheduledTaskDueOnDay(task, dayKey, completions)
  } else if (recurrence.mode === 'interval') {
    return isIntervalTaskDueOnDay(task, dayKey, completions)
  }

  return { isDue: false, occurrenceKeys: [] }
}

/**
 * Get all task occurrences due on a specific app day
 * This is the main function used by the Today view
 */
export function getTasksDueOnDay(
  tasks: Task[],
  completions: Completion[],
  dayKey: string
): TaskOccurrence[] {
  const occurrences: TaskOccurrence[] = []

  for (const task of tasks) {
    if (task.deleted_at) continue

    // Non-recurring tasks
    if (!task.recurrence) {
      // Check if task is due today or is pinned
      const isDueToday = task.due_date === dayKey
      const isPinned = task.pinned
      const hasNoDueDate = !task.due_date

      // Check if already completed
      const isCompleted = completions.some(
        (c) => c.task_id === task.id && c.occurrence_key === dayKey && !c.reversed_at
      )

      if ((isDueToday || isPinned || (hasNoDueDate && isPinned)) && !isCompleted) {
        occurrences.push({
          taskId: task.id,
          task,
          occurrenceKey: dayKey,
          dueDate: dayKey,
          dueTime: task.due_time,
          isCompleted: false,
          occurrenceIndex: 0,
        })
      }

      continue
    }

    // Recurring tasks
    const { isDue, occurrenceKeys } = isRecurringTaskDueOnDay(task, dayKey, completions)

    if (isDue) {
      const recurrence = task.recurrence as Recurrence

      for (let i = 0; i < occurrenceKeys.length; i++) {
        occurrences.push({
          taskId: task.id,
          task,
          occurrenceKey: occurrenceKeys[i],
          dueDate: dayKey,
          dueTime: recurrence.time ?? task.due_time,
          isCompleted: false,
          occurrenceIndex: i,
        })
      }
    }
  }

  return occurrences
}

/**
 * Get carried over tasks (one-off tasks past their due date)
 * Note: Recurring tasks don't carry over - missed occurrences vanish
 */
export function getCarriedOverTasks(
  tasks: Task[],
  completions: Completion[],
  todayKey: string
): TaskOccurrence[] {
  const occurrences: TaskOccurrence[] = []
  const today = parseDateKey(todayKey)

  for (const task of tasks) {
    if (task.deleted_at) continue
    if (task.recurrence) continue // Recurring tasks don't carry over

    if (!task.due_date) continue

    const dueDate = parseDateKey(task.due_date)
    if (dueDate >= today) continue // Not past due

    // Check if already completed
    const isCompleted = completions.some(
      (c) => c.task_id === task.id && !c.reversed_at
    )

    if (!isCompleted) {
      occurrences.push({
        taskId: task.id,
        task,
        occurrenceKey: task.due_date, // Original due date as key
        dueDate: task.due_date,
        dueTime: task.due_time,
        isCompleted: false,
        occurrenceIndex: 0,
      })
    }
  }

  return occurrences
}

/**
 * Sort occurrences for display: pinned first, then by time, then by size (tiny first)
 */
export function sortOccurrences(occurrences: TaskOccurrence[]): TaskOccurrence[] {
  const sizeOrder = { tiny: 0, small: 1, medium: 2, large: 3 }

  return [...occurrences].sort((a, b) => {
    // Pinned tasks first
    if (a.task.pinned && !b.task.pinned) return -1
    if (!a.task.pinned && b.task.pinned) return 1

    // Then by time (tasks with time before tasks without)
    const aTime = a.dueTime ?? '99:99'
    const bTime = b.dueTime ?? '99:99'
    if (aTime !== bTime) return aTime.localeCompare(bTime)

    // Then by size (tiny first for quick wins)
    const aSize = sizeOrder[a.task.size] ?? 1
    const bSize = sizeOrder[b.task.size] ?? 1
    return aSize - bSize
  })
}

/**
 * Generate an occurrence key for completing a task
 */
export function generateOccurrenceKey(
  task: Task,
  dayKey: string,
  occurrenceIndex: number = 0
): string {
  if (task.times_per_day > 1) {
    return `${dayKey}-${occurrenceIndex + 1}`
  }
  return dayKey
}

/**
 * Describe a recurrence pattern in human-readable form
 */
export function describeRecurrence(recurrence: Recurrence): string {
  if (recurrence.mode === 'interval') {
    const days = recurrence.days
    if (days === 1) return 'Every day (after completion)'
    if (days === 7) return 'Every week (after completion)'
    return `Every ${days} days (after completion)`
  }

  const pattern = recurrence.pattern
  const timeStr = recurrence.time ? ` at ${recurrence.time}` : ''

  switch (pattern.type) {
    case 'daily':
      return `Every day${timeStr}`
    case 'weekdays':
      return `Every weekday${timeStr}`
    case 'weekly': {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const days = pattern.days.map((d) => dayNames[d]).join(', ')
      return `Every ${days}${timeStr}`
    }
    case 'monthly':
      return `Monthly on the ${ordinal(pattern.day)}${timeStr}`
    case 'custom_days':
      if (pattern.interval === 7) return `Every week${timeStr}`
      if (pattern.interval === 14) return `Every 2 weeks${timeStr}`
      return `Every ${pattern.interval} days${timeStr}`
    default:
      return 'Recurring'
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
