import { useState, useRef, useEffect, useMemo } from 'react'
import { useCreateTask } from '@/hooks/useTasks'
import { parseTaskInput, type ParsedChip } from '@/lib/parser'
import type { Context } from '@/types'

interface QuickCaptureProps {
  defaultContext?: Context
}

export default function QuickCapture({ defaultContext = 'personal' }: QuickCaptureProps) {
  const [input, setInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const createTask = useCreateTask()

  // Parse input using the natural language parser
  const parseResult = useMemo(() => {
    if (!input.trim()) return null
    return parseTaskInput(input)
  }, [input])

  // Handle keyboard shortcut (n) to focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault()
        setIsExpanded(true)
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !parseResult) return

    const { parsed } = parseResult

    if (!parsed.title) return

    createTask.mutate(
      {
        title: parsed.title,
        context: parsed.context ?? defaultContext,
        size: parsed.size ?? 'small',
        due_date: parsed.dueDate ?? null,
        due_time: parsed.dueTime ?? null,
        recurrence: parsed.recurrence ?? null,
      },
      {
        onSuccess: () => {
          setInput('')
          setIsExpanded(false)
          inputRef.current?.focus()
        },
      }
    )
  }

  // Get chip style based on type
  const getChipStyle = (chip: ParsedChip): string => {
    switch (chip.type) {
      case 'context':
        return chip.value === 'work'
          ? 'bg-work-light text-work-dark dark:bg-work/20 dark:text-blue-300'
          : 'bg-personal-light text-personal-dark dark:bg-personal/20 dark:text-emerald-300'
      case 'size':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'date':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'time':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'recurrence':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  // Get chip icon based on type
  const getChipIcon = (chip: ParsedChip): string => {
    switch (chip.type) {
      case 'context':
        return ''
      case 'size':
        return ''
      case 'date':
        return '📅'
      case 'time':
        return '⏰'
      case 'recurrence':
        return '🔄'
      default:
        return ''
    }
  }

  // Render chips for preview
  const renderChips = () => {
    if (!parseResult || parseResult.chips.length === 0) {
      // Show default context if no chips parsed
      return (
        <span className={`text-xs px-2 py-1 rounded-full ${
          defaultContext === 'work'
            ? 'bg-work-light text-work-dark dark:bg-work/20 dark:text-blue-300'
            : 'bg-personal-light text-personal-dark dark:bg-personal/20 dark:text-emerald-300'
        }`}>
          {defaultContext}
        </span>
      )
    }

    // Dedupe chips by type (date and time can overlap)
    const seenTypes = new Set<string>()
    const uniqueChips: ParsedChip[] = []

    for (const chip of parseResult.chips) {
      if (!seenTypes.has(chip.type)) {
        seenTypes.add(chip.type)
        uniqueChips.push(chip)
      }
    }

    // Add default context chip if none was parsed
    const hasContext = uniqueChips.some(c => c.type === 'context')

    return (
      <>
        {!hasContext && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            defaultContext === 'work'
              ? 'bg-work-light text-work-dark dark:bg-work/20 dark:text-blue-300'
              : 'bg-personal-light text-personal-dark dark:bg-personal/20 dark:text-emerald-300'
          }`}>
            {defaultContext}
          </span>
        )}
        {uniqueChips.map((chip, i) => (
          <span
            key={`${chip.type}-${i}`}
            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getChipStyle(chip)}`}
          >
            {getChipIcon(chip) && <span>{getChipIcon(chip)}</span>}
            {chip.label}
          </span>
        ))}
      </>
    )
  }

  return (
    <>
      {/* Mobile: Floating action button */}
      <button
        onClick={() => {
          setIsExpanded(true)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className="md:hidden fixed right-4 bottom-20 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-primary-700 active:scale-95 transition-transform z-20"
        aria-label="Add task"
      >
        +
      </button>

      {/* Desktop: Always visible input */}
      <div className="hidden md:block fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-xl px-4">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a task... (press 'n' to focus)"
            className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!input.trim() || createTask.isPending}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-primary-600 disabled:text-gray-300 dark:disabled:text-gray-600"
          >
            {createTask.isPending ? (
              <span className="animate-spin">...</span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </form>

        {/* Preview chips */}
        {input.trim() && (
          <div className="flex flex-wrap gap-2 mt-2 px-1">
            {renderChips()}
            {parseResult?.cleanTitle && (
              <span className="text-xs text-gray-500 dark:text-gray-400 italic ml-auto">
                "{parseResult.cleanTitle}"
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mobile: Expandable input modal */}
      {isExpanded && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsExpanded(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What do you need to do?"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />

              {/* Preview chips */}
              {input.trim() && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {renderChips()}
                </div>
              )}

              {/* Clean title preview */}
              {parseResult?.cleanTitle && input.trim() && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Task: <span className="text-gray-900 dark:text-white font-medium">{parseResult.cleanTitle}</span>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || createTask.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
                >
                  {createTask.isPending ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
