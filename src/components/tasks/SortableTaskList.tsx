import { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers'
import SortableTaskItem from './SortableTaskItem'
import type { TaskOccurrence } from '@/lib/recurrence'

interface SortableTaskListProps {
  occurrences: TaskOccurrence[]
  onComplete: (occurrence: TaskOccurrence) => void
  onReorder: (taskIds: string[]) => void
  onEdit?: (occurrence: TaskOccurrence) => void
}

export default function SortableTaskList({
  occurrences,
  onComplete,
  onReorder,
  onEdit,
}: SortableTaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = occurrences.findIndex(
          (occ) => `${occ.taskId}-${occ.occurrenceKey}` === active.id
        )
        const newIndex = occurrences.findIndex(
          (occ) => `${occ.taskId}-${occ.occurrenceKey}` === over.id
        )

        const reorderedOccurrences = arrayMove(occurrences, oldIndex, newIndex)
        const newOrder = reorderedOccurrences.map((occ) => occ.taskId)
        onReorder(newOrder)
      }
    },
    [occurrences, onReorder]
  )

  const itemIds = occurrences.map((occ) => `${occ.taskId}-${occ.occurrenceKey}`)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {occurrences.map((occ) => (
            <SortableTaskItem
              key={`${occ.taskId}-${occ.occurrenceKey}`}
              id={`${occ.taskId}-${occ.occurrenceKey}`}
              occurrence={occ}
              onComplete={onComplete}
              onEdit={onEdit}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
