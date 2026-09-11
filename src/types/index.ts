import { z } from 'zod'

// Re-export database types
export * from './database'

// =============================================================================
// Zod Schemas for validation at boundaries
// =============================================================================

export const contextSchema = z.enum(['work', 'personal'])
export type Context = z.infer<typeof contextSchema>

export const sizeSchema = z.enum(['tiny', 'small', 'medium', 'large'])
export type Size = z.infer<typeof sizeSchema>

// Recurrence schemas
export const scheduledPatternSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('daily') }),
  z.object({ type: z.literal('weekdays') }),
  z.object({ type: z.literal('weekly'), days: z.array(z.number().min(0).max(6)) }),
  z.object({ type: z.literal('monthly'), day: z.number().min(1).max(31) }),
  z.object({ type: z.literal('custom_days'), interval: z.number().min(1) }),
])
export type ScheduledPattern = z.infer<typeof scheduledPatternSchema>

export const scheduledRecurrenceSchema = z.object({
  mode: z.literal('scheduled'),
  pattern: scheduledPatternSchema,
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})
export type ScheduledRecurrence = z.infer<typeof scheduledRecurrenceSchema>

export const intervalRecurrenceSchema = z.object({
  mode: z.literal('interval'),
  days: z.number().min(1),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})
export type IntervalRecurrence = z.infer<typeof intervalRecurrenceSchema>

export const recurrenceSchema = z.discriminatedUnion('mode', [
  scheduledRecurrenceSchema,
  intervalRecurrenceSchema,
])
export type Recurrence = z.infer<typeof recurrenceSchema>

// Task creation schema (from quick capture)
export const taskCreateSchema = z.object({
  title: z.string().min(1).max(500),
  context: contextSchema.default('personal'),
  size: sizeSchema.default('small'),
  notes: z.string().max(10000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  recurrence: recurrenceSchema.optional(),
  times_per_day: z.number().min(1).max(10).default(1),
  last_completed_at: z.string().datetime().optional(),
  pinned: z.boolean().default(false),
})
export type TaskCreate = z.infer<typeof taskCreateSchema>

// Subtask schema
export const subtaskSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  sort_index: z.number(),
  completed_at: z.string().datetime().nullable(),
})
export type SubtaskData = z.infer<typeof subtaskSchema>

// Ledger entry schema
export const ledgerReasonSchema = z.enum([
  'task_completion',
  'variable_bonus',
  'jackpot_bonus',
  'dread_bonus',
  'first_of_day_bonus',
  'subtask_completion',
  'reversal',
  'repair',
  'repair_refund',
  'purchase',
  'mystery_box',
  'focus',
  'focus_bonus',
  'starter',
])
export type LedgerReasonType = z.infer<typeof ledgerReasonSchema>

// Settings schemas
export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  weekends: z.boolean().optional(),
})

export const contextConfigSchema = z.object({
  name: z.string().max(20),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().max(50),
})

export const settingsSchema = z.object({
  day_boundary_minutes: z.number().min(0).max(1439).default(240), // 4am
  quiet_hours: z.record(z.string(), quietHoursSchema).optional(),
  contexts: z.record(z.string(), contextConfigSchema).optional(),
  reduced_motion: z.boolean().default(false),
  last_used_context: contextSchema.default('personal'),
})
export type SettingsData = z.infer<typeof settingsSchema>

// Export/Import schema
export const exportDataSchema = z.object({
  version: z.number(),
  exported_at: z.string().datetime(),
  tasks: z.array(z.record(z.unknown())),
  subtasks: z.array(z.record(z.unknown())),
  completions: z.array(z.record(z.unknown())),
  coin_ledger: z.array(z.record(z.unknown())),
  day_state: z.array(z.record(z.unknown())),
  settings: z.record(z.unknown()),
})
export type ExportData = z.infer<typeof exportDataSchema>

// =============================================================================
// UI Types
// =============================================================================

// Task with computed display info for Today view
export interface TaskDisplay {
  id: string
  title: string
  context: Context
  size: Size
  notes: string | null
  dueTime: string | null
  isRecurring: boolean
  isCarriedOver: boolean
  isPinned: boolean
  deferCount: number
  subtasks: SubtaskData[]
  completedSubtasks: number
  totalSubtasks: number
  occurrenceKey: string // For recurring tasks
  sortIndex: number
}

// Parsed result from natural language input
export interface ParsedTask {
  title: string
  context?: Context
  size?: Size
  dueDate?: string
  dueTime?: string
  recurrence?: Recurrence
}

export interface ParsedChip {
  type: 'date' | 'time' | 'recurrence' | 'context' | 'size'
  label: string
  value: unknown
  raw: string // Original text that was parsed
}

// Completion result with payout breakdown
export interface CompletionResult {
  taskId: string
  occurrenceKey: string
  baseAmount: number
  variableBonus: { type: 'none' | 'standard' | 'jackpot'; amount: number }
  dreadBonus: number
  firstOfDayBonus: number
  totalAmount: number
  newBalance: number
  milestone: number | null
}
