import type { Task } from '@/types/database'
import TaskItem from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  onComplete?: (task: Task) => void
  emptyMessage?: string
}

export default function TaskList({ tasks, onComplete, emptyMessage = 'No tasks' }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onComplete={onComplete} />
      ))}
    </div>
  )
}
