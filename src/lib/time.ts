/**
 * Time utilities for handling the 4am day boundary
 */

const DEFAULT_BOUNDARY_MINUTES = 240 // 4:00 AM
const TORONTO_TIMEZONE = 'America/Toronto'

/**
 * Get the "app day" key for a given timestamp.
 * The app day runs from 4am to 3:59am the next day.
 *
 * @param date - The timestamp to convert
 * @param boundaryMinutes - Minutes from midnight for day boundary (default 240 = 4am)
 * @returns YYYY-MM-DD string representing the app day
 */
export function getAppDay(
  date: Date = new Date(),
  boundaryMinutes: number = DEFAULT_BOUNDARY_MINUTES
): string {
  // Get time in Toronto timezone
  const torontoTime = new Date(
    date.toLocaleString('en-US', { timeZone: TORONTO_TIMEZONE })
  )

  const minutesSinceMidnight =
    torontoTime.getHours() * 60 + torontoTime.getMinutes()

  // If before the boundary (e.g., before 4am), it's still "yesterday"
  if (minutesSinceMidnight < boundaryMinutes) {
    torontoTime.setDate(torontoTime.getDate() - 1)
  }

  return formatDateKey(torontoTime)
}

/**
 * Get the start and end timestamps for an app day
 */
export function getAppDayBounds(
  dayKey: string,
  boundaryMinutes: number = DEFAULT_BOUNDARY_MINUTES
): { start: Date; end: Date } {
  const [year, month, day] = dayKey.split('-').map(Number)

  // Start at boundary time (4am)
  const boundaryHours = Math.floor(boundaryMinutes / 60)
  const boundaryMins = boundaryMinutes % 60

  const start = new Date(year, month - 1, day, boundaryHours, boundaryMins, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

/**
 * Check if a timestamp falls within a given app day
 */
export function isInAppDay(
  timestamp: Date,
  dayKey: string,
  boundaryMinutes: number = DEFAULT_BOUNDARY_MINUTES
): boolean {
  const { start, end } = getAppDayBounds(dayKey, boundaryMinutes)
  return timestamp >= start && timestamp < end
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a time as HH:mm
 */
export function formatTimeKey(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date object
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get today's app day key
 */
export function getTodayKey(boundaryMinutes: number = DEFAULT_BOUNDARY_MINUTES): string {
  return getAppDay(new Date(), boundaryMinutes)
}

/**
 * Check if the current time is within work hours (weekday 9-5 Toronto time)
 */
export function isWorkHours(): boolean {
  const now = new Date()
  const torontoTime = new Date(
    now.toLocaleString('en-US', { timeZone: TORONTO_TIMEZONE })
  )

  const dayOfWeek = torontoTime.getDay() // 0 = Sunday, 6 = Saturday
  const hour = torontoTime.getHours()

  // Weekday (1-5) and between 9am and 5pm
  return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 17
}

/**
 * Get the default context based on current time
 */
export function getDefaultContext(lastUsedContext?: 'work' | 'personal'): 'work' | 'personal' {
  // If we have a recently used context, prefer that
  // Otherwise, use work hours to decide
  if (lastUsedContext) {
    return lastUsedContext
  }
  return isWorkHours() ? 'work' : 'personal'
}
