import { useState } from 'react'
import type { TaskOccurrence } from '@/lib/recurrence'
import { describeRecurrence } from '@/lib/recurrence'
import { useUpdateTask, useDeleteTask, useDeferTask } from '@/hooks/useTasks'
import { useSubtasks } from '@/hooks/useSubtasks'
import { BASE_PAYOUTS, getDreadMultiplier } from '@/config/economy'
import { useConfirm } from '@/components/ConfirmDialog'
import SubtaskList from './SubtaskList'
import type { Recurrence } from '@/types'

interface TaskOccurrenceItemProps {
  occurrence: TaskOccurrence
  onComplete?: (occurrence: TaskOccurrence) => void
  onEdit?: (occurrence: TaskOccurrence) => void
}

export default function TaskOccurrenceItem({ occurrence, onComplete, onEdit }: TaskOccurrenceItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { task } = occurrence
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const deferTask = useDeferTask()
  const { data: subtasks } = useSubtasks(task.id)
  const { confirm, ConfirmDialog } = useConfirm()

  // Subtask progress
  const subtaskCount = subtasks?.length || 0
  const completedSubtasks = subtasks?.filter(s => s.completed_at).length || 0

  const contextColors = {
    work: 'bg-work-light text-work-dark dark:bg-work/20 dark:text-blue-300',
    personal: 'bg-personal-light text-personal-dark dark:bg-personal/20 dark:text-emerald-300',
  }

  const sizeLabels = {
    tiny: { label: 'T', dots: 1 },
    small: { label: 'S', dots: 2 },
    medium: { label: 'M', dots: 3 },
    large: { label: 'L', dots: 4 },
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete(occurrence)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (confirmed) {
      deleteTask.mutate(task.id)
    }
  }

  const handleDefer = () => {
    deferTask.mutate(task)
    setIsExpanded(false)
  }

  // Get occurrence label for times_per_day tasks
  const getOccurrenceLabel = () => {
    if (task.times_per_day <= 1) return null
    return `${occurrence.occurrenceIndex + 1}/${task.times_per_day}`
  }

  // Calculate potential dread bonus
  const getDreadBonusInfo = () => {
    if (task.recurrence || task.defer_count === 0) return null
    const multiplier = getDreadMultiplier(task.defer_count)
    const baseCoins = BASE_PAYOUTS[task.size]
    const bonusCoins = Math.round(baseCoins * (multiplier - 1))
    return { multiplier, bonusCoins }
  }

  const occurrenceLabel = getOccurrenceLabel()
  const dreadBonus = getDreadBonusInfo()
  const canDefer = !task.recurrence // Can only defer non-recurring tasks

  return (
    <div className="card overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Complete button */}
        <button
          onClick={handleComplete}
          className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors touch-target flex items-center justify-center"
          aria-label="Complete task"
        >
          <span className="sr-only">Complete</span>
        </button>

        {/* Task content */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 text-left min-w-0"
          aria-expanded={isExpanded}
          aria-label={`${task.title}, click to ${isExpanded ? 'collapse' : 'expand'} details`}
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-900 dark:text-white truncate">
              {task.title}
            </span>
            {occurrenceLabel && (
              <span className="text-xs text-gray-400 font-medium">
                ({occurrenceLabel})
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Context badge */}
            <span className={`text-xs px-1.5 py-0.5 rounded ${contextColors[task.context]}`}>
              {task.context}
            </span>

            {/* Size indicator */}
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              {Array.from({ length: sizeLabels[task.size].dots }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              ))}
              <span className="ml-1">+{BASE_PAYOUTS[task.size]}</span>
            </span>

            {/* Dread bonus indicator */}
            {dreadBonus && (
              <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                +{dreadBonus.bonusCoins} dread
              </span>
            )}

            {/* Time */}
            {occurrence.dueTime && (
              <span className="text-xs text-gray-400">
                {occurrence.dueTime.slice(0, 5)}
              </span>
            )}

            {/* Pinned indicator */}
            {task.pinned && (
              <span className="text-xs text-amber-500">📌</span>
            )}

            {/* Recurring indicator */}
            {task.recurrence && (
              <span className="text-xs text-purple-500">🔄</span>
            )}

            {/* Subtask progress */}
            {subtaskCount > 0 && (
              <span className="text-xs text-gray-400">
                ☑ {completedSubtasks}/{subtaskCount}
              </span>
            )}

            {/* Defer count */}
            {task.defer_count > 0 && !task.recurrence && (
              <span className="text-xs text-orange-500" title={`Deferred ${task.defer_count} time${task.defer_count > 1 ? 's' : ''}`}>
                🔥 x{task.defer_count}
              </span>
            )}
          </div>
        </button>

        {/* Expand indicator */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700">
          <div className="pt-3 space-y-3">
            {/* Recurrence description */}
            {task.recurrence && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Schedule</label>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {describeRecurrence(task.recurrence as Recurrence)}
                </p>
              </div>
            )}

            {/* Dread bonus explanation */}
            {dreadBonus && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <div className="text-sm font-medium text-orange-700 dark:text-orange-400">
                  🔥 Dread Bonus Active!
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                  Deferred {task.defer_count}x = {dreadBonus.multiplier.toFixed(2)}x multiplier (+{dreadBonus.bonusCoins} bonus coins)
                </div>
              </div>
            )}

            {/* Notes */}
            {task.notes && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Notes</label>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{task.notes}</p>
              </div>
            )}

            {/* Subtasks */}
            <SubtaskList taskId={task.id} />

            {/* Quick actions */}
            <div className="flex gap-2 pt-2 flex-wrap">
              {/* Edit button */}
              {onEdit && (
                <button
                  onClick={() => onEdit(occurrence)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Edit
                </button>
              )}

              {/* Defer button - only for non-recurring tasks */}
              {canDefer && (
                <button
                  onClick={handleDefer}
                  disabled={deferTask.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50"
                >
                  {deferTask.isPending ? 'Deferring...' : '→ Tomorrow'}
                </button>
              )}

              {!task.recurrence && (
                <button
                  onClick={() => updateTask.mutate({ id: task.id, pinned: !task.pinned })}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    task.pinned
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {task.pinned ? 'Unpin' : 'Pin to Today'}
                </button>
              )}

              {task.recurrence && (
                <button
                  onClick={() => updateTask.mutate({ id: task.id, is_paused: !task.is_paused })}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    task.is_paused
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {task.is_paused ? 'Resume' : 'Pause'}
                </button>
              )}

              <button
                onClick={handleDelete}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {ConfirmDialog}
    </div>
  )
}
