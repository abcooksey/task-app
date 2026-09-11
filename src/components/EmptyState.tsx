import { useMemo } from 'react'

interface EmptyStateProps {
  variant: 'all-done' | 'low-energy-done' | 'no-tasks' | 'filtered-empty'
  contextFilter?: 'all' | 'work' | 'personal'
}

const ALL_DONE_MESSAGES = [
  { emoji: '🎉', title: "You're all caught up!", subtitle: 'Time to celebrate or add something new.' },
  { emoji: '✨', title: 'Nothing left to do!', subtitle: 'Enjoy your accomplishment.' },
  { emoji: '🌟', title: 'All done for today!', subtitle: "You've earned some rest." },
  { emoji: '🏆', title: 'Tasks complete!', subtitle: 'Great work getting everything done.' },
  { emoji: '🌈', title: 'Clear skies ahead!', subtitle: 'No tasks waiting for you.' },
  { emoji: '☕', title: 'Take a break!', subtitle: "You've finished everything on your list." },
  { emoji: '🎯', title: 'Bullseye!', subtitle: 'All tasks knocked out.' },
  { emoji: '🌻', title: 'Fresh and clear!', subtitle: 'Your task list is empty.' },
]

const LOW_ENERGY_MESSAGES = [
  { emoji: '🔋', title: 'Small tasks done!', subtitle: 'Turn off low energy mode to see more tasks.' },
  { emoji: '💤', title: 'Taking it easy today?', subtitle: "That's okay! No small tasks left." },
  { emoji: '🧘', title: 'Gentle progress made!', subtitle: 'Switch modes when you feel ready for more.' },
  { emoji: '🌙', title: 'Light load complete!', subtitle: 'More tasks available in regular mode.' },
]

const NO_TASKS_MESSAGES = [
  { emoji: '📝', title: 'Ready for a fresh start!', subtitle: 'Add your first task below.' },
  { emoji: '🌱', title: 'A blank canvas awaits!', subtitle: 'What would you like to accomplish?' },
  { emoji: '✏️', title: 'Nothing here yet!', subtitle: 'Add a task to get started.' },
]

const FILTERED_EMPTY_MESSAGES = {
  work: [
    { emoji: '💼', title: 'No work tasks!', subtitle: 'Enjoy some personal time, or add a work task.' },
    { emoji: '🏢', title: 'Work slate is clean!', subtitle: 'Nothing scheduled for work today.' },
  ],
  personal: [
    { emoji: '🏠', title: 'Personal tasks done!', subtitle: 'Add something fun, or switch to work.' },
    { emoji: '🌸', title: 'Personal list is clear!', subtitle: 'Nothing personal on the agenda.' },
  ],
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function EmptyState({ variant, contextFilter }: EmptyStateProps) {
  const message = useMemo(() => {
    switch (variant) {
      case 'all-done':
        return pickRandom(ALL_DONE_MESSAGES)
      case 'low-energy-done':
        return pickRandom(LOW_ENERGY_MESSAGES)
      case 'no-tasks':
        return pickRandom(NO_TASKS_MESSAGES)
      case 'filtered-empty':
        if (contextFilter === 'work') {
          return pickRandom(FILTERED_EMPTY_MESSAGES.work)
        } else if (contextFilter === 'personal') {
          return pickRandom(FILTERED_EMPTY_MESSAGES.personal)
        }
        return pickRandom(ALL_DONE_MESSAGES)
      default:
        return pickRandom(ALL_DONE_MESSAGES)
    }
  }, [variant, contextFilter])

  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">{message.emoji}</div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {message.title}
      </h2>
      <p className="text-gray-500 dark:text-gray-400">
        {message.subtitle}
      </p>
    </div>
  )
}
