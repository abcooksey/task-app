/**
 * Natural Language Parser for Task Input
 *
 * Parses strings like:
 * - "walk the dog tomorrow at 5pm #personal"
 * - "standup every weekday at 9am !tiny #work"
 * - "shower every 3 days"
 * - "call mom friday"
 * - "buy groceries !!"
 */

import * as chrono from 'chrono-node'
import type { Context, Size, Recurrence, ScheduledRecurrence, IntervalRecurrence } from '@/types'
import { formatDateKey } from './time'

// =============================================================================
// Types
// =============================================================================

export interface ParsedTask {
  title: string
  context?: Context
  size?: Size
  dueDate?: string      // YYYY-MM-DD
  dueTime?: string      // HH:mm
  recurrence?: Recurrence
}

export interface ParsedChip {
  type: 'date' | 'time' | 'recurrence' | 'context' | 'size'
  label: string
  value: unknown
  startIndex: number
  endIndex: number
}

export interface ParseResult {
  parsed: ParsedTask
  chips: ParsedChip[]
  cleanTitle: string
}

// =============================================================================
// Recurrence Patterns
// =============================================================================

interface RecurrenceMatch {
  recurrence: Recurrence
  matchedText: string
  startIndex: number
  endIndex: number
}

const RECURRENCE_PATTERNS: Array<{
  pattern: RegExp
  build: (match: RegExpMatchArray) => Recurrence
}> = [
  // Interval-since-done patterns (these should be interval mode)
  {
    pattern: /every\s+(\d+)\s+days?(?:\s+after)?/i,
    build: (match): IntervalRecurrence => ({
      mode: 'interval',
      days: parseInt(match[1], 10),
    }),
  },

  // Scheduled patterns
  {
    pattern: /\b(?:every\s+)?daily\b/i,
    build: (): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'daily' },
    }),
  },
  {
    pattern: /every\s+day\b/i,
    build: (): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'daily' },
    }),
  },
  {
    pattern: /every\s+weekday\b/i,
    build: (): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'weekdays' },
    }),
  },
  {
    pattern: /\bweekdays?\b/i,
    build: (): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'weekdays' },
    }),
  },
  {
    pattern: /every\s+week\b/i,
    build: (): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'custom_days', interval: 7 },
    }),
  },
  {
    pattern: /\bweekly\b/i,
    build: (): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'custom_days', interval: 7 },
    }),
  },
  {
    pattern: /every\s+(\d+)\s+weeks?\b/i,
    build: (match): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'custom_days', interval: parseInt(match[1], 10) * 7 },
    }),
  },
  {
    pattern: /\bmonthly\b/i,
    build: (): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'monthly', day: new Date().getDate() },
    }),
  },
  {
    pattern: /every\s+month\b/i,
    build: (): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'monthly', day: new Date().getDate() },
    }),
  },
  {
    pattern: /(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(?:every|each)\s+month/i,
    build: (match): ScheduledRecurrence => ({
      mode: 'scheduled',
      pattern: { type: 'monthly', day: parseInt(match[1], 10) },
    }),
  },
  // Weekly on specific days
  {
    pattern: /every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+and\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))?(?:\s+and\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))?/i,
    build: (match): ScheduledRecurrence => {
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      }
      const days: number[] = []
      for (let i = 1; i <= 3; i++) {
        if (match[i]) {
          days.push(dayMap[match[i].toLowerCase()])
        }
      }
      return {
        mode: 'scheduled',
        pattern: { type: 'weekly', days: days.sort() },
      }
    },
  },
  // Single day patterns
  {
    pattern: /every\s+(mon|tue|wed|thu|fri|sat|sun)(?:day)?s?\b/i,
    build: (match): ScheduledRecurrence => {
      const dayMap: Record<string, number> = {
        sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
      }
      const day = dayMap[match[1].toLowerCase().slice(0, 3)]
      return {
        mode: 'scheduled',
        pattern: { type: 'weekly', days: [day] },
      }
    },
  },
]

function parseRecurrence(text: string): RecurrenceMatch | null {
  for (const { pattern, build } of RECURRENCE_PATTERNS) {
    const match = text.match(pattern)
    if (match && match.index !== undefined) {
      return {
        recurrence: build(match),
        matchedText: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      }
    }
  }
  return null
}

// =============================================================================
// Context Parsing
// =============================================================================

interface ContextMatch {
  context: Context
  matchedText: string
  startIndex: number
  endIndex: number
}

function parseContext(text: string): ContextMatch | null {
  // #work or #personal tags
  const hashtagMatch = text.match(/#(work|personal)\b/i)
  if (hashtagMatch && hashtagMatch.index !== undefined) {
    return {
      context: hashtagMatch[1].toLowerCase() as Context,
      matchedText: hashtagMatch[0],
      startIndex: hashtagMatch.index,
      endIndex: hashtagMatch.index + hashtagMatch[0].length,
    }
  }

  // Trailing "work" or "personal" (at end of string)
  const trailingMatch = text.match(/\s+(work|personal)$/i)
  if (trailingMatch && trailingMatch.index !== undefined) {
    return {
      context: trailingMatch[1].toLowerCase() as Context,
      matchedText: trailingMatch[0],
      startIndex: trailingMatch.index,
      endIndex: trailingMatch.index + trailingMatch[0].length,
    }
  }

  return null
}

// =============================================================================
// Size Parsing
// =============================================================================

interface SizeMatch {
  size: Size
  matchedText: string
  startIndex: number
  endIndex: number
}

function parseSize(text: string): SizeMatch | null {
  // Named sizes: !tiny, !small, !medium, !large
  const namedMatch = text.match(/!(tiny|small|medium|large)\b/i)
  if (namedMatch && namedMatch.index !== undefined) {
    return {
      size: namedMatch[1].toLowerCase() as Size,
      matchedText: namedMatch[0],
      startIndex: namedMatch.index,
      endIndex: namedMatch.index + namedMatch[0].length,
    }
  }

  // Exclamation marks: ! = tiny, !! = small, !!! = medium, !!!! = large
  // Match at end of string or followed by space
  const exclaimMatch = text.match(/(!{1,4})(?:\s|$)/)
  if (exclaimMatch && exclaimMatch.index !== undefined) {
    const count = exclaimMatch[1].length
    const sizes: Size[] = ['tiny', 'small', 'medium', 'large']
    return {
      size: sizes[Math.min(count - 1, 3)],
      matchedText: exclaimMatch[1],
      startIndex: exclaimMatch.index,
      endIndex: exclaimMatch.index + exclaimMatch[1].length,
    }
  }

  return null
}

// =============================================================================
// Date/Time Parsing with Chrono
// =============================================================================

interface DateTimeMatch {
  date?: string       // YYYY-MM-DD
  time?: string       // HH:mm
  matchedText: string
  startIndex: number
  endIndex: number
}

function parseDateTime(text: string, referenceDate?: Date): DateTimeMatch | null {
  // Use chrono to parse natural language dates
  const results = chrono.parse(text, referenceDate ?? new Date(), { forwardDate: true })

  if (results.length === 0) return null

  const result = results[0]
  const start = result.start

  let date: string | undefined
  let time: string | undefined

  // Extract date if present
  if (start.isCertain('day') || start.isCertain('weekday')) {
    const d = start.date()
    date = formatDateKey(d)
  }

  // Extract time if present
  if (start.isCertain('hour')) {
    const d = start.date()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    time = `${hours}:${minutes}`
  }

  if (!date && !time) return null

  return {
    date,
    time,
    matchedText: result.text,
    startIndex: result.index,
    endIndex: result.index + result.text.length,
  }
}

// =============================================================================
// Main Parser
// =============================================================================

export function parseTaskInput(input: string, referenceDate?: Date): ParseResult {
  let text = input.trim()
  const chips: ParsedChip[] = []
  const parsed: ParsedTask = { title: '' }

  // Parse in order of specificity to avoid conflicts

  // 1. Parse recurrence first (before chrono, as "every day" etc. might confuse it)
  const recurrenceMatch = parseRecurrence(text)
  if (recurrenceMatch) {
    parsed.recurrence = recurrenceMatch.recurrence
    chips.push({
      type: 'recurrence',
      label: describeRecurrenceShort(recurrenceMatch.recurrence),
      value: recurrenceMatch.recurrence,
      startIndex: recurrenceMatch.startIndex,
      endIndex: recurrenceMatch.endIndex,
    })
    // Remove from text
    text = text.slice(0, recurrenceMatch.startIndex) + text.slice(recurrenceMatch.endIndex)
    text = text.replace(/\s+/g, ' ').trim()
  }

  // 2. Parse context
  const contextMatch = parseContext(text)
  if (contextMatch) {
    parsed.context = contextMatch.context
    chips.push({
      type: 'context',
      label: contextMatch.context,
      value: contextMatch.context,
      startIndex: contextMatch.startIndex,
      endIndex: contextMatch.endIndex,
    })
    text = text.slice(0, contextMatch.startIndex) + text.slice(contextMatch.endIndex)
    text = text.replace(/\s+/g, ' ').trim()
  }

  // 3. Parse size
  const sizeMatch = parseSize(text)
  if (sizeMatch) {
    parsed.size = sizeMatch.size
    chips.push({
      type: 'size',
      label: sizeMatch.size,
      value: sizeMatch.size,
      startIndex: sizeMatch.startIndex,
      endIndex: sizeMatch.endIndex,
    })
    text = text.slice(0, sizeMatch.startIndex) + text.slice(sizeMatch.endIndex)
    text = text.replace(/\s+/g, ' ').trim()
  }

  // 4. Parse date/time (last, as it's most flexible)
  // Only parse if not recurring (recurring tasks get their time from recurrence)
  if (!parsed.recurrence) {
    const dateTimeMatch = parseDateTime(text, referenceDate)
    if (dateTimeMatch) {
      if (dateTimeMatch.date) {
        parsed.dueDate = dateTimeMatch.date
        chips.push({
          type: 'date',
          label: formatDateLabel(dateTimeMatch.date),
          value: dateTimeMatch.date,
          startIndex: dateTimeMatch.startIndex,
          endIndex: dateTimeMatch.endIndex,
        })
      }
      if (dateTimeMatch.time) {
        parsed.dueTime = dateTimeMatch.time
        chips.push({
          type: 'time',
          label: dateTimeMatch.time,
          value: dateTimeMatch.time,
          startIndex: dateTimeMatch.startIndex,
          endIndex: dateTimeMatch.endIndex,
        })
      }
      text = text.slice(0, dateTimeMatch.startIndex) + text.slice(dateTimeMatch.endIndex)
      text = text.replace(/\s+/g, ' ').trim()
    }
  } else {
    // For recurring tasks, extract time for the recurrence
    const timeOnlyMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)
    if (timeOnlyMatch && timeOnlyMatch.index !== undefined) {
      let hours = parseInt(timeOnlyMatch[1], 10)
      const minutes = timeOnlyMatch[2] ? parseInt(timeOnlyMatch[2], 10) : 0
      const ampm = timeOnlyMatch[3]?.toLowerCase()

      if (ampm === 'pm' && hours < 12) hours += 12
      if (ampm === 'am' && hours === 12) hours = 0

      const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      // Add time to recurrence
      if (parsed.recurrence) {
        (parsed.recurrence as ScheduledRecurrence | IntervalRecurrence).time = time
      }

      chips.push({
        type: 'time',
        label: time,
        value: time,
        startIndex: timeOnlyMatch.index,
        endIndex: timeOnlyMatch.index + timeOnlyMatch[0].length,
      })

      text = text.slice(0, timeOnlyMatch.index) + text.slice(timeOnlyMatch.index + timeOnlyMatch[0].length)
      text = text.replace(/\s+/g, ' ').trim()
    }
  }

  // Clean up remaining text as title
  const cleanTitle = text
    .replace(/\s+/g, ' ')
    .trim()

  parsed.title = cleanTitle

  return {
    parsed,
    chips,
    cleanTitle,
  }
}

// =============================================================================
// Helpers
// =============================================================================

function describeRecurrenceShort(recurrence: Recurrence): string {
  if (recurrence.mode === 'interval') {
    const days = recurrence.days
    if (days === 1) return 'daily (after done)'
    return `every ${days} days`
  }

  const pattern = recurrence.pattern
  switch (pattern.type) {
    case 'daily':
      return 'daily'
    case 'weekdays':
      return 'weekdays'
    case 'weekly': {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      return pattern.days.map((d) => dayNames[d]).join(', ')
    }
    case 'monthly':
      return 'monthly'
    case 'custom_days':
      if (pattern.interval === 7) return 'weekly'
      if (pattern.interval === 14) return 'every 2 weeks'
      return `every ${pattern.interval} days`
    default:
      return 'recurring'
  }
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dateOnly = new Date(date)
  dateOnly.setHours(12, 0, 0, 0)

  if (dateOnly.getTime() === today.getTime()) {
    return 'today'
  }
  if (dateOnly.getTime() === tomorrow.getTime()) {
    return 'tomorrow'
  }

  // Check if within this week
  const daysUntil = Math.floor((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil > 0 && daysUntil < 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayNames[date.getDay()]
  }

  // Otherwise, show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Re-export for use in components
export { formatDateLabel as formatDate }
