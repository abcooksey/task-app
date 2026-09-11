import { useState, useMemo } from 'react'
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { describeRecurrence } from '@/lib/recurrence'
import { getAppDay } from '@/lib/time'
import { BASE_PAYOUTS } from '@/config/economy'
import TaskEditModal from '@/components/tasks/TaskEditModal'
import { TaskListSkeleton } from '@/components/Skeleton'
import { useConfirm } from '@/components/ConfirmDialog'
import type { Task } from '@/types/database'
import type { Context, Recurrence } from '@/types'

type FilterType = 'all' | 'one-off' | 'recurring'

export default function AllTasksPage() {
  const [contextFilter, setContextFilter] = useState<'all' | Context>('all')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const { data: tasks = [], isLoading, error } = useTasks()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { confirm, ConfirmDialog } = useConfirm()

  const todayKey = getAppDay()

  // Filter and group tasks
  const { recurring, today, upcoming, someday } = useMemo(() => {
    let filtered = tasks

    // Apply context filter
    if (contextFilter !== 'all') {
      filtered = filtered.filter(t => t.context === contextFilter)
    }

    // Apply type filter
    if (typeFilter === 'one-off') {
      filtered = filtered.filter(t => !t.recurrence)
    } else if (typeFilter === 'recurring') {
      filtered = filtered.filter(t => t.recurrence)
    }

    // Group tasks
    const recurring: Task[] = []
    const today: Task[] = []
    const upcoming: Task[] = []
    const someday: Task[] = []

    for (const task of filtered) {
      if (task.recurrence) {
        recurring.push(task)
      } else if (task.due_date === todayKey) {
        today.push(task)
      } else if (task.due_date && task.due_date > todayKey) {
        upcoming.push(task)
      } else if (!task.due_date || task.due_date < todayKey) {
        someday.push(task)
      }
    }

    // Sort upcoming by date
    upcoming.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

    return { recurring, today, upcoming, someday }
  }, [tasks, contextFilter, typeFilter, todayKey])

  const handleDelete = async (taskId: string, taskTitle: string) => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${taskTitle}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (confirmed) {
      deleteTask.mutate(taskId)
      setExpandedTaskId(null)
    }
  }

  const handleTogglePause = (task: Task) => {
    updateTask.mutate({ id: task.id, is_paused: !task.is_paused })
  }

  const totalTasks = recurring.length + today.length + upcoming.length + someday.length

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          All Tasks
          {!isLoading && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({totalTasks})
            </span>
          )}
        </h2>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-4">
        {/* Context filter */}
        <div className="flex gap-2">
          {(['all', 'work', 'personal'] as const).map((ctx) => (
            <button
              key={ctx}
              onClick={() => setContextFilter(ctx)}
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

        {/* Type filter */}
        <div className="flex gap-2">
          {([
            { value: 'all', label: 'All Types' },
            { value: 'one-off', label: 'One-off' },
            { value: 'recurring', label: 'Recurring' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                typeFilter === value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <TaskListSkeleton count={5} />}

      {/* Error state */}
      {error && (
        <div className="text-center py-12 text-red-500">
          Error loading tasks. Please refresh.
        </div>
      )}

      {/* Task groups */}
      {!isLoading && !error && (
        <div className="space-y-8">
          {/* Recurring tasks */}
          {recurring.length > 0 && (
            <TaskSection
              title="Recurring"
              icon="🔄"
              tasks={recurring}
              expandedTaskId={expandedTaskId}
              onToggleExpand={setExpandedTaskId}
              onDelete={handleDelete}
              onTogglePause={handleTogglePause}
              onEdit={setEditingTask}
            />
          )}

          {/* Today */}
          {today.length > 0 && (
            <TaskSection
              title="Due Today"
              icon="☀️"
              tasks={today}
              expandedTaskId={expandedTaskId}
              onToggleExpand={setExpandedTaskId}
              onDelete={handleDelete}
              onTogglePause={handleTogglePause}
              onEdit={setEditingTask}
            />
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <TaskSection
              title="Upcoming"
              icon="📅"
              tasks={upcoming}
              expandedTaskId={expandedTaskId}
              onToggleExpand={setExpandedTaskId}
              onDelete={handleDelete}
              onTogglePause={handleTogglePause}
              onEdit={setEditingTask}
              showDueDate
            />
          )}

          {/* Someday / No date */}
          {someday.length > 0 && (
            <TaskSection
              title="Someday"
              icon="💭"
              tasks={someday}
              expandedTaskId={expandedTaskId}
              onToggleExpand={setExpandedTaskId}
              onDelete={handleDelete}
              onTogglePause={handleTogglePause}
              onEdit={setEditingTask}
              showDueDate
            />
          )}

          {/* Empty state */}
          {totalTasks === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No tasks yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Add your first task from the Today page.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
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

      {/* Confirm Dialog */}
      {ConfirmDialog}
    </div>
  )
}

// =============================================================================
// Task Section Component
// =============================================================================

interface TaskSectionProps {
  title: string
  icon: string
  tasks: Task[]
  expandedTaskId: string | null
  onToggleExpand: (id: string | null) => void
  onDelete: (id: string, title: string) => void
  onTogglePause: (task: Task) => void
  onEdit: (task: Task) => void
  showDueDate?: boolean
}

function TaskSection({
  title,
  icon,
  tasks,
  expandedTaskId,
  onToggleExpand,
  onDelete,
  onTogglePause,
  onEdit,
  showDueDate,
}: TaskSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
        <span>{icon}</span>
        {title}
        <span className="text-gray-400">({tasks.length})</span>
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            isExpanded={expandedTaskId === task.id}
            onToggleExpand={() => onToggleExpand(expandedTaskId === task.id ? null : task.id)}
            onDelete={() => onDelete(task.id, task.title)}
            onTogglePause={() => onTogglePause(task)}
            onEdit={() => onEdit(task)}
            showDueDate={showDueDate}
          />
        ))}
      </div>
    </section>
  )
}

// =============================================================================
// Task List Item Component
// =============================================================================

interface TaskListItemProps {
  task: Task
  isExpanded: boolean
  onToggleExpand: () => void
  onDelete: () => void
  onTogglePause: () => void
  onEdit: () => void
  showDueDate?: boolean
}

function TaskListItem({
  task,
  isExpanded,
  onToggleExpand,
  onDelete,
  onTogglePause,
  onEdit,
  showDueDate,
}: TaskListItemProps) {
  const contextColors = {
    work: 'bg-work-light text-work-dark dark:bg-work/20 dark:text-blue-300',
    personal: 'bg-personal-light text-personal-dark dark:bg-personal/20 dark:text-emerald-300',
  }

  const sizeLabels = {
    tiny: { dots: 1 },
    small: { dots: 2 },
    medium: { dots: 3 },
    large: { dots: 4 },
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={`card overflow-hidden ${task.is_paused ? 'opacity-60' : ''}`}>
      {/* Main row */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-gray-900 dark:text-white truncate ${task.is_paused ? 'line-through' : ''}`}>
              {task.title}
            </span>
            {task.is_paused && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400">paused</span>
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

            {/* Due date */}
            {showDueDate && task.due_date && (
              <span className="text-xs text-gray-400">
                {formatDate(task.due_date)}
              </span>
            )}

            {/* Recurrence */}
            {task.recurrence && (
              <span className="text-xs text-purple-500 dark:text-purple-400">
                {describeRecurrence(task.recurrence as Recurrence)}
              </span>
            )}

            {/* Times per day */}
            {task.times_per_day > 1 && (
              <span className="text-xs text-gray-400">
                {task.times_per_day}x/day
              </span>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

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

            {/* Defer count */}
            {task.defer_count > 0 && (
              <div className="text-sm text-orange-600 dark:text-orange-400">
                Deferred {task.defer_count} time{task.defer_count > 1 ? 's' : ''} (dread bonus active!)
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 flex-wrap">
              <button
                onClick={onEdit}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Edit
              </button>

              {task.recurrence && (
                <button
                  onClick={onTogglePause}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    task.is_paused
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}
                >
                  {task.is_paused ? 'Resume' : 'Pause'}
                </button>
              )}

              <button
                onClick={onDelete}
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
