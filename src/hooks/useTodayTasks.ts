import { useMemo } from 'react'
import { useTasks } from './useTasks'
import { useCompletions } from './useCompletions'
import {
  getTasksDueOnDay,
  getCarriedOverTasks,
  sortOccurrences,
  type TaskOccurrence,
} from '@/lib/recurrence'
import { getAppDay } from '@/lib/time'
import type { Context } from '@/types'

interface UseTodayTasksOptions {
  contextFilter?: 'all' | Context
  lowEnergyMode?: boolean
  customOrder?: string[] | null
}

export function useTodayTasks(options: UseTodayTasksOptions = {}) {
  const { contextFilter = 'all', lowEnergyMode = false, customOrder = null } = options
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks()
  const { data: completions, isLoading: completionsLoading, error: completionsError } = useCompletions()

  const todayKey = useMemo(() => getAppDay(), [])

  const { carriedOver, todayTasks, pinnedTasks } = useMemo(() => {
    if (!tasks || !completions) {
      return { carriedOver: [], todayTasks: [], pinnedTasks: [] }
    }

    // Get carried over tasks (past due, one-off only)
    const carriedOverOccurrences = getCarriedOverTasks(tasks, completions, todayKey)

    // Get tasks due today (including recurring)
    const todayOccurrences = getTasksDueOnDay(tasks, completions, todayKey)

    // Separate pinned tasks without due dates (always show in Today)
    const pinnedNoDate = tasks
      .filter((t) => t.pinned && !t.due_date && !t.recurrence && !t.deleted_at)
      .filter((t) => !completions.some((c) => c.task_id === t.id && !c.reversed_at))
      .map((task): TaskOccurrence => ({
        taskId: task.id,
        task,
        occurrenceKey: todayKey,
        dueDate: todayKey,
        dueTime: task.due_time,
        isCompleted: false,
        occurrenceIndex: 0,
      }))

    return {
      carriedOver: carriedOverOccurrences,
      todayTasks: todayOccurrences,
      pinnedTasks: pinnedNoDate,
    }
  }, [tasks, completions, todayKey])

  // Apply filters
  const { filteredOccurrences, totalBeforeFilter } = useMemo(() => {
    let all = [...carriedOver, ...pinnedTasks, ...todayTasks]

    // Remove duplicates (a task might appear in multiple categories)
    const seen = new Set<string>()
    all = all.filter((occ) => {
      const key = `${occ.taskId}-${occ.occurrenceKey}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Track total before filtering
    const totalBeforeFilter = all.length

    // Context filter
    if (contextFilter !== 'all') {
      all = all.filter((occ) => occ.task.context === contextFilter)
    }

    // Low energy mode: only tiny and small tasks
    if (lowEnergyMode) {
      all = all.filter((occ) => occ.task.size === 'tiny' || occ.task.size === 'small')
    }

    // Apply custom order if available, otherwise use default sorting
    let sorted: TaskOccurrence[]
    if (customOrder && customOrder.length > 0) {
      // Sort by custom order, putting unknown items at the end
      const orderMap = new Map(customOrder.map((id, index) => [id, index]))
      sorted = [...all].sort((a, b) => {
        const aIndex = orderMap.get(a.taskId) ?? Infinity
        const bIndex = orderMap.get(b.taskId) ?? Infinity
        return aIndex - bIndex
      })
    } else {
      sorted = sortOccurrences(all)
    }

    return { filteredOccurrences: sorted, totalBeforeFilter }
  }, [carriedOver, pinnedTasks, todayTasks, contextFilter, lowEnergyMode, customOrder])

  // Categorize for display
  const categorized = useMemo(() => {
    const carried: TaskOccurrence[] = []
    const scheduled: TaskOccurrence[] = []

    for (const occ of filteredOccurrences) {
      // Check if this is a carried-over task
      const isCarriedOver = carriedOver.some(
        (c) => c.taskId === occ.taskId && c.occurrenceKey === occ.occurrenceKey
      )

      if (isCarriedOver) {
        carried.push(occ)
      } else {
        scheduled.push(occ)
      }
    }

    return { carriedOver: carried, scheduled }
  }, [filteredOccurrences, carriedOver])

  return {
    occurrences: filteredOccurrences,
    carriedOver: categorized.carriedOver,
    scheduled: categorized.scheduled,
    totalBeforeFilter,
    todayKey,
    isLoading: tasksLoading || completionsLoading,
    error: tasksError || completionsError,
    isEmpty: filteredOccurrences.length === 0,
  }
}
