import { useState } from 'react'
import type { Task } from '@/types/database'
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { BASE_PAYOUTS } from '@/config/economy'

interface TaskItemProps {
  task: Task
  onComplete?: (task: Task) => void
}

export default function TaskItem({ task, onComplete }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

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
      onComplete(task)
    }
  }

  const handleDelete = () => {
    deleteTask.mutate(task.id)
  }

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
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-900 dark:text-white truncate">
              {task.title}
            </span>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-1">
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

            {/* Due date */}
            {task.due_date && (
              <span className="text-xs text-gray-400">
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}

            {/* Time */}
            {task.due_time && (
              <span className="text-xs text-gray-400">
                {task.due_time.slice(0, 5)}
              </span>
            )}

            {/* Pinned indicator */}
            {task.pinned && (
              <span className="text-xs text-amber-500">pinned</span>
            )}

            {/* Recurring indicator */}
            {task.recurrence && (
              <span className="text-xs text-purple-500">recurring</span>
            )}
          </div>
        </button>

        {/* Expand indicator */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
            {/* Notes */}
            {task.notes && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Notes</label>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{task.notes}</p>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-2 pt-2">
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
    </div>
  )
}
