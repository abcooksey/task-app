import { useState, useRef, useEffect } from 'react'
import {
  useSubtasks,
  useCreateSubtask,
  useCompleteSubtask,
  useDeleteSubtask,
} from '@/hooks/useSubtasks'

interface SubtaskListProps {
  taskId: string
}

export default function SubtaskList({ taskId }: SubtaskListProps) {
  const { data: subtasks, isLoading } = useSubtasks(taskId)
  const createSubtask = useCreateSubtask()
  const completeSubtask = useCompleteSubtask()
  const deleteSubtask = useDeleteSubtask()

  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleAdd = () => {
    if (!newTitle.trim()) {
      setIsAdding(false)
      return
    }

    createSubtask.mutate(
      { taskId, title: newTitle.trim() },
      {
        onSuccess: () => {
          setNewTitle('')
          // Keep input open for adding more
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setNewTitle('')
    }
  }

  const handleToggleComplete = (subtaskId: string, currentlyCompleted: boolean) => {
    completeSubtask.mutate({
      id: subtaskId,
      taskId,
      completed: !currentlyCompleted,
    })
  }

  const handleDelete = (subtaskId: string) => {
    deleteSubtask.mutate({ id: subtaskId, taskId })
  }

  if (isLoading) {
    return (
      <div className="text-xs text-gray-400 py-2">Loading subtasks...</div>
    )
  }

  const completedCount = subtasks?.filter(s => s.completed_at).length || 0
  const totalCount = subtasks?.length || 0

  return (
    <div className="space-y-2">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Subtasks {totalCount > 0 && `(${completedCount}/${totalCount})`}
        </label>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            + Add
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      {subtasks && subtasks.length > 0 && (
        <ul className="space-y-1">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="flex items-center gap-2 group"
            >
              <button
                onClick={() => handleToggleComplete(subtask.id, !!subtask.completed_at)}
                className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${
                  subtask.completed_at
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                }`}
              >
                {subtask.completed_at && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  subtask.completed_at
                    ? 'text-gray-400 dark:text-gray-500 line-through'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {subtask.title}
              </span>
              <button
                onClick={() => handleDelete(subtask.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                aria-label="Delete subtask"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add new subtask input */}
      {isAdding && (
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-4 h-4 rounded border border-gray-300 dark:border-gray-600" />
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAdd}
            placeholder="Add subtask..."
            className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
          />
          {createSubtask.isPending && (
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* Empty state */}
      {(!subtasks || subtasks.length === 0) && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full text-left text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 py-1"
        >
          + Add a subtask to break this down
        </button>
      )}
    </div>
  )
}
