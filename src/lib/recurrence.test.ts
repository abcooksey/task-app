import { describe, it, expect } from 'vitest'
import {
  matchesScheduledPattern,
  isScheduledTaskDueOnDay,
  getIntervalNextDueDate,
  getCarriedOverTasks,
  sortOccurrences,
  describeRecurrence,
} from './recurrence'
import type { Task, Completion } from '@/types/database'
import type { ScheduledRecurrence, IntervalRecurrence } from '@/types'

// Helper to create a mock task
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Test Task',
    context: 'personal',
    size: 'small',
    notes: null,
    due_date: null,
    due_time: null,
    recurrence: null,
    times_per_day: 1,
    is_paused: false,
    defer_count: 0,
    pinned: false,
    last_completed_at: null,
    sort_index: null,
    is_template: false,
    deleted_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// Helper to create a mock completion
function createCompletion(overrides: Partial<Completion> = {}): Completion {
  return {
    id: 'completion-1',
    task_id: 'task-1',
    user_id: 'user-1',
    occurrence_key: null,
    completed_at: new Date().toISOString(),
    reversed_at: null,
    ...overrides,
  }
}

// Helper to create a date at noon local time (avoids timezone issues)
function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

describe('matchesScheduledPattern', () => {
  it('daily pattern matches any day', () => {
    const recurrence: ScheduledRecurrence = {
      mode: 'scheduled',
      pattern: { type: 'daily' },
    }

    expect(matchesScheduledPattern(makeDate(2024, 9, 15), recurrence)).toBe(true) // Sunday
    expect(matchesScheduledPattern(makeDate(2024, 9, 16), recurrence)).toBe(true) // Monday
    expect(matchesScheduledPattern(makeDate(2024, 9, 20), recurrence)).toBe(true) // Friday
  })

  it('weekdays pattern matches Mon-Fri only', () => {
    const recurrence: ScheduledRecurrence = {
      mode: 'scheduled',
      pattern: { type: 'weekdays' },
    }

    expect(matchesScheduledPattern(makeDate(2024, 9, 15), recurrence)).toBe(false) // Sunday
    expect(matchesScheduledPattern(makeDate(2024, 9, 16), recurrence)).toBe(true)  // Monday
    expect(matchesScheduledPattern(makeDate(2024, 9, 17), recurrence)).toBe(true)  // Tuesday
    expect(matchesScheduledPattern(makeDate(2024, 9, 20), recurrence)).toBe(true)  // Friday
    expect(matchesScheduledPattern(makeDate(2024, 9, 21), recurrence)).toBe(false) // Saturday
  })

  it('weekly pattern matches specific days', () => {
    const recurrence: ScheduledRecurrence = {
      mode: 'scheduled',
      pattern: { type: 'weekly', days: [1, 4] }, // Monday and Thursday
    }

    expect(matchesScheduledPattern(makeDate(2024, 9, 15), recurrence)).toBe(false) // Sunday
    expect(matchesScheduledPattern(makeDate(2024, 9, 16), recurrence)).toBe(true)  // Monday
    expect(matchesScheduledPattern(makeDate(2024, 9, 17), recurrence)).toBe(false) // Tuesday
    expect(matchesScheduledPattern(makeDate(2024, 9, 19), recurrence)).toBe(true)  // Thursday
  })

  it('monthly pattern matches day of month', () => {
    const recurrence: ScheduledRecurrence = {
      mode: 'scheduled',
      pattern: { type: 'monthly', day: 15 },
    }

    expect(matchesScheduledPattern(makeDate(2024, 9, 14), recurrence)).toBe(false)
    expect(matchesScheduledPattern(makeDate(2024, 9, 15), recurrence)).toBe(true)
    expect(matchesScheduledPattern(makeDate(2024, 10, 15), recurrence)).toBe(true)
    expect(matchesScheduledPattern(makeDate(2024, 10, 16), recurrence)).toBe(false)
  })
})

describe('isScheduledTaskDueOnDay', () => {
  it('returns due for daily task on any day', () => {
    const task = createTask({
      recurrence: {
        mode: 'scheduled',
        pattern: { type: 'daily' },
      },
    })

    const result = isScheduledTaskDueOnDay(task, '2024-09-15', [])
    expect(result.isDue).toBe(true)
    expect(result.occurrenceKeys).toEqual(['2024-09-15'])
  })

  it('returns not due for weekday task on weekend', () => {
    const task = createTask({
      recurrence: {
        mode: 'scheduled',
        pattern: { type: 'weekdays' },
      },
    })

    const result = isScheduledTaskDueOnDay(task, '2024-09-15', []) // Sunday
    expect(result.isDue).toBe(false)
  })

  it('excludes completed occurrences', () => {
    const task = createTask({
      recurrence: {
        mode: 'scheduled',
        pattern: { type: 'daily' },
      },
    })

    const completions = [
      createCompletion({
        task_id: task.id,
        occurrence_key: '2024-09-15',
      }),
    ]

    const result = isScheduledTaskDueOnDay(task, '2024-09-15', completions)
    expect(result.isDue).toBe(false)
    expect(result.occurrenceKeys).toEqual([])
  })

  it('generates multiple keys for times_per_day', () => {
    const task = createTask({
      times_per_day: 2,
      recurrence: {
        mode: 'scheduled',
        pattern: { type: 'daily' },
      },
    })

    const result = isScheduledTaskDueOnDay(task, '2024-09-15', [])
    expect(result.isDue).toBe(true)
    expect(result.occurrenceKeys).toEqual(['2024-09-15-1', '2024-09-15-2'])
  })

  it('partial completion with times_per_day', () => {
    const task = createTask({
      id: 'task-2',
      times_per_day: 2,
      recurrence: {
        mode: 'scheduled',
        pattern: { type: 'daily' },
      },
    })

    const completions = [
      createCompletion({
        task_id: 'task-2',
        occurrence_key: '2024-09-15-1',
      }),
    ]

    const result = isScheduledTaskDueOnDay(task, '2024-09-15', completions)
    expect(result.isDue).toBe(true)
    expect(result.occurrenceKeys).toEqual(['2024-09-15-2'])
  })
})

describe('Interval-since-done mode', () => {
  it('returns due today if never completed and no last_completed_at', () => {
    const task = createTask({
      recurrence: {
        mode: 'interval',
        days: 3,
      } as IntervalRecurrence,
    })

    const nextDue = getIntervalNextDueDate(task, [])
    // Should be today (we use getAppDay which handles 4am boundary)
    expect(nextDue).not.toBeNull()
  })

  it('calculates next due from last completion', () => {
    const task = createTask({
      id: 'task-interval',
      recurrence: {
        mode: 'interval',
        days: 3,
      } as IntervalRecurrence,
    })

    const completions = [
      createCompletion({
        task_id: 'task-interval',
        completed_at: '2024-09-10T12:00:00Z',
      }),
    ]

    const nextDue = getIntervalNextDueDate(task, completions)
    expect(nextDue).toBe('2024-09-13')
  })

  it('uses last_completed_at when no completions exist', () => {
    const task = createTask({
      recurrence: {
        mode: 'interval',
        days: 2,
      } as IntervalRecurrence,
      last_completed_at: '2024-09-10T12:00:00Z',
    })

    const nextDue = getIntervalNextDueDate(task, [])
    expect(nextDue).toBe('2024-09-12')
  })

  it('ignores reversed completions', () => {
    const task = createTask({
      id: 'task-reversed',
      recurrence: {
        mode: 'interval',
        days: 3,
      } as IntervalRecurrence,
    })

    const completions = [
      createCompletion({
        task_id: 'task-reversed',
        completed_at: '2024-09-10T12:00:00Z',
        reversed_at: '2024-09-10T12:05:00Z', // This completion was undone
      }),
      createCompletion({
        task_id: 'task-reversed',
        completed_at: '2024-09-08T12:00:00Z',
      }),
    ]

    const nextDue = getIntervalNextDueDate(task, completions)
    expect(nextDue).toBe('2024-09-11') // 3 days after Sep 8
  })
})

describe('getCarriedOverTasks', () => {
  it('returns past due one-off tasks', () => {
    const tasks = [
      createTask({
        id: 'past-due',
        due_date: '2024-09-10',
      }),
    ]

    const result = getCarriedOverTasks(tasks, [], '2024-09-15')
    expect(result.length).toBe(1)
    expect(result[0].taskId).toBe('past-due')
  })

  it('excludes completed tasks', () => {
    const tasks = [
      createTask({
        id: 'completed',
        due_date: '2024-09-10',
      }),
    ]

    const completions = [
      createCompletion({
        task_id: 'completed',
      }),
    ]

    const result = getCarriedOverTasks(tasks, completions, '2024-09-15')
    expect(result.length).toBe(0)
  })

  it('excludes recurring tasks (they dont carry over)', () => {
    const tasks = [
      createTask({
        id: 'recurring',
        recurrence: {
          mode: 'scheduled',
          pattern: { type: 'daily' },
        },
      }),
    ]

    const result = getCarriedOverTasks(tasks, [], '2024-09-15')
    expect(result.length).toBe(0)
  })
})

describe('sortOccurrences', () => {
  it('sorts pinned first, then by time, then by size', () => {
    const tasks = [
      createTask({ id: '1', size: 'large', pinned: false }),
      createTask({ id: '2', size: 'tiny', pinned: false }),
      createTask({ id: '3', size: 'small', pinned: true }),
    ]

    const occurrences = tasks.map((task) => ({
      taskId: task.id,
      task,
      occurrenceKey: '2024-09-15',
      dueDate: '2024-09-15',
      dueTime: null,
      isCompleted: false,
      occurrenceIndex: 0,
    }))

    const sorted = sortOccurrences(occurrences)

    expect(sorted[0].taskId).toBe('3') // Pinned first
    expect(sorted[1].taskId).toBe('2') // Then tiny
    expect(sorted[2].taskId).toBe('1') // Then large
  })

  it('sorts by time when not pinned', () => {
    const tasks = [
      createTask({ id: '1', size: 'small' }),
      createTask({ id: '2', size: 'small' }),
      createTask({ id: '3', size: 'small' }),
    ]

    const occurrences = [
      { taskId: '1', task: tasks[0], occurrenceKey: '1', dueDate: '2024-09-15', dueTime: '14:00', isCompleted: false, occurrenceIndex: 0 },
      { taskId: '2', task: tasks[1], occurrenceKey: '2', dueDate: '2024-09-15', dueTime: '09:00', isCompleted: false, occurrenceIndex: 0 },
      { taskId: '3', task: tasks[2], occurrenceKey: '3', dueDate: '2024-09-15', dueTime: null, isCompleted: false, occurrenceIndex: 0 },
    ]

    const sorted = sortOccurrences(occurrences)

    expect(sorted[0].taskId).toBe('2') // 9am first
    expect(sorted[1].taskId).toBe('1') // 2pm second
    expect(sorted[2].taskId).toBe('3') // No time last
  })
})

describe('describeRecurrence', () => {
  it('describes daily pattern', () => {
    const recurrence: ScheduledRecurrence = {
      mode: 'scheduled',
      pattern: { type: 'daily' },
    }
    expect(describeRecurrence(recurrence)).toBe('Every day')
  })

  it('describes weekdays pattern', () => {
    const recurrence: ScheduledRecurrence = {
      mode: 'scheduled',
      pattern: { type: 'weekdays' },
      time: '09:00',
    }
    expect(describeRecurrence(recurrence)).toBe('Every weekday at 09:00')
  })

  it('describes weekly pattern', () => {
    const recurrence: ScheduledRecurrence = {
      mode: 'scheduled',
      pattern: { type: 'weekly', days: [1, 4] },
    }
    expect(describeRecurrence(recurrence)).toBe('Every Mon, Thu')
  })

  it('describes interval pattern', () => {
    const recurrence: IntervalRecurrence = {
      mode: 'interval',
      days: 3,
    }
    expect(describeRecurrence(recurrence)).toBe('Every 3 days (after completion)')
  })

  it('describes monthly pattern', () => {
    const recurrence: ScheduledRecurrence = {
      mode: 'scheduled',
      pattern: { type: 'monthly', day: 1 },
    }
    expect(describeRecurrence(recurrence)).toBe('Monthly on the 1st')
  })
})
