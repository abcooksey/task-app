import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskOccurrenceItem from './TaskOccurrenceItem'
import type { TaskOccurrence } from '@/lib/recurrence'

interface SortableTaskItemProps {
  id: string
  occurrence: TaskOccurrence
  onComplete: (occurrence: TaskOccurrence) => void
  onEdit?: (occurrence: TaskOccurrence) => void
}

export default function SortableTaskItem({
  id,
  occurrence,
  onComplete,
  onEdit,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 touch-none"
        aria-label="Drag to reorder"
      >
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>

      {/* Task item with left padding for drag handle */}
      <div className="pl-6">
        <TaskOccurrenceItem occurrence={occurrence} onComplete={onComplete} onEdit={onEdit} />
      </div>
    </div>
  )
}
