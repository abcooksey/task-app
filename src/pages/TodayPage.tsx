import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTodayTasks } from '@/hooks/useTodayTasks'
import { useCompleteTask, type CompletionResult } from '@/hooks/useCompletions'
import { useUpdateTask } from '@/hooks/useTasks'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { useDayState, useUpdateDayState } from '@/hooks/useDayState'
import { useNotifications, parseTimeToDate } from '@/hooks/useNotifications'
import { useHouseState } from '@/hooks/useHouseState'
import { useStore } from '@/hooks/useStore'
import { useAvatarCheer } from '@/contexts/AvatarCheerContext'
import { getCheapestAvailableRepair } from '@/lib/houseState'
import QuickCapture from '@/components/capture/QuickCapture'
import SortableTaskList from '@/components/tasks/SortableTaskList'
import TaskEditModal from '@/components/tasks/TaskEditModal'
import CoinCelebration from '@/components/celebration/CoinCelebration'
import EmptyState from '@/components/EmptyState'
import NotificationBanner from '@/components/NotificationBanner'
import NudgeCard from '@/components/NudgeCard'
import FocusCard from '@/components/FocusCard'
import { TaskListSkeleton } from '@/components/Skeleton'
import type { TaskOccurrence } from '@/lib/recurrence'
import type { Context } from '@/types'
import type { Task } from '@/types/database'

export default function TodayPage() {
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const { data: dayState } = useDayState()
  const updateDayState = useUpdateDayState()
  const { state: houseState, isLoading: houseLoading } = useHouseState()
  const { rotationItems } = useStore()
  const { playCheer } = useAvatarCheer()

  // Local state for "all" mode (not persisted since it's transient)
  const [showAll, setShowAll] = useState(false)
  const [celebrationResult, setCelebrationResult] = useState<CompletionResult | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const updateTask = useUpdateTask()

  // Get persisted values with fallbacks
  const savedContext = settings?.last_used_context ?? 'personal'
  const contextFilter: 'all' | Context = showAll ? 'all' : savedContext
  const lowEnergyMode = dayState?.low_energy ?? false
  const customOrder = (dayState?.custom_order as string[] | null) ?? null

  const {
    carriedOver,
    scheduled,
    totalBeforeFilter,
    isLoading,
    error,
    isEmpty,
  } = useTodayTasks({ contextFilter, lowEnergyMode, customOrder })

  const completeTask = useCompleteTask()

  // Handlers that persist state
  const handleContextChange = useCallback((ctx: 'all' | Context) => {
    if (ctx === 'all') {
      setShowAll(true)
    } else {
      setShowAll(false)
      updateSettings.mutate({ last_used_context: ctx })
    }
  }, [updateSettings])

  const handleLowEnergyToggle = useCallback(() => {
    updateDayState.mutate({ low_energy: !lowEnergyMode })
  }, [updateDayState, lowEnergyMode])

  // Notifications
  const { enabled: notificationsEnabled, scheduleNotification, cancelScheduledNotification } = useNotifications()

  // Schedule notifications for tasks with due times
  useEffect(() => {
    if (!notificationsEnabled) return

    const allOccurrences = [...carriedOver, ...scheduled]

    for (const occ of allOccurrences) {
      if (occ.dueTime && occ.dueDate) {
        const notificationTime = parseTimeToDate(occ.dueTime, occ.dueDate)
        scheduleNotification(
          occ.taskId,
          occ.task.title,
          notificationTime,
          `Due at ${occ.dueTime.slice(0, 5)}`
        )
      }
    }

    // Cleanup: cancel notifications for tasks that are no longer in the list
    return () => {
      for (const occ of allOccurrences) {
        cancelScheduledNotification(occ.taskId)
      }
    }
  }, [notificationsEnabled, carriedOver, scheduled, scheduleNotification, cancelScheduledNotification])

  const handleComplete = useCallback((occurrence: TaskOccurrence) => {
    completeTask.mutate(
      { task: occurrence.task, occurrenceKey: occurrence.occurrenceKey },
      {
        onSuccess: (result) => {
          setCelebrationResult(result)
          playCheer()
        },
      }
    )
  }, [completeTask, playCheer])

  const handleCelebrationComplete = useCallback(() => {
    setCelebrationResult(null)
  }, [])

  const handleReorder = useCallback((newOrder: string[]) => {
    updateDayState.mutate({ custom_order: newOrder })
  }, [updateDayState])

  const handleEdit = useCallback((occurrence: TaskOccurrence) => {
    setEditingTask(occurrence.task)
  }, [])

  // Determine which nudge to show (if any)
  const nudgeInfo = useMemo(() => {
    if (houseLoading || !houseState) return null

    // If there are available repairs, show repair nudge
    if (houseState.availableRepairIds.size > 0) {
      const cheapestRepair = getCheapestAvailableRepair(houseState)
      return {
        type: 'repair' as const,
        repairName: cheapestRepair?.name,
        repairCost: cheapestRepair?.cost,
      }
    }

    // If decorating is unlocked (all interior repairs done), show store refresh
    if (houseState.decoratingUnlocked && rotationItems.length > 0) {
      return {
        type: 'store-refresh' as const,
        itemCount: rotationItems.length,
      }
    }

    return null
  }, [houseState, houseLoading, rotationItems])

  return (
    <div className="space-y-6">
      {/* Notification prompt */}
      <NotificationBanner />

      {/* Focus card */}
      <FocusCard />

      {/* Nudge card */}
      {nudgeInfo && (
        <NudgeCard
          type={nudgeInfo.type}
          itemCount={nudgeInfo.type === 'store-refresh' ? nudgeInfo.itemCount : undefined}
          repairName={nudgeInfo.type === 'repair' ? nudgeInfo.repairName : undefined}
          repairCost={nudgeInfo.type === 'repair' ? nudgeInfo.repairCost : undefined}
        />
      )}

      {/* Header controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Context filter */}
        <div className="flex gap-2">
          {(['all', 'work', 'personal'] as const).map((ctx) => (
            <button
              key={ctx}
              onClick={() => handleContextChange(ctx)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                contextFilter === ctx
                  ? ctx === 'work'
                    ? 'bg-work text-white'
                    : ctx === 'personal'
                    ? 'bg-personal text-white'
                    : 'bg-gray-800 text-white dark:bg-white dark:text-gray-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {ctx === 'all' ? 'All' : ctx.charAt(0).toUpperCase() + ctx.slice(1)}
            </button>
          ))}
        </div>

        {/* Low energy toggle */}
        <button
          onClick={handleLowEnergyToggle}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            lowEnergyMode
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {lowEnergyMode ? '🔋 Low energy' : '⚡ All sizes'}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && <TaskListSkeleton count={4} />}

      {/* Error state */}
      {error && (
        <div className="text-center py-12 text-red-500">
          Error loading tasks. Please refresh.
        </div>
      )}

      {/* Task lists */}
      {!isLoading && !error && (
        <>
          {/* Carried over section */}
          {carriedOver.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Carried over
              </h2>
              <SortableTaskList
                occurrences={carriedOver}
                onComplete={handleComplete}
                onReorder={handleReorder}
                onEdit={handleEdit}
              />
            </section>
          )}

          {/* Today section */}
          {scheduled.length > 0 && (
            <section>
              {carriedOver.length > 0 && (
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Today
                </h2>
              )}
              <SortableTaskList
                occurrences={scheduled}
                onComplete={handleComplete}
                onReorder={handleReorder}
                onEdit={handleEdit}
              />
            </section>
          )}

          {/* Empty state */}
          {isEmpty && (
            <EmptyState
              variant={
                lowEnergyMode
                  ? 'low-energy-done'
                  : totalBeforeFilter === 0
                  ? 'no-tasks'
                  : contextFilter !== 'all'
                  ? 'filtered-empty'
                  : 'all-done'
              }
              contextFilter={contextFilter}
            />
          )}
        </>
      )}

      {/* Quick capture */}
      <QuickCapture defaultContext={contextFilter === 'all' ? 'personal' : contextFilter} />

      {/* Celebration overlay */}
      <CoinCelebration result={celebrationResult} onComplete={handleCelebrationComplete} />

      {/* Edit modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(updates) => {
            updateTask.mutate({ id: editingTask.id, ...updates })
            setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}
