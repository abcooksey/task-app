import { describe, it, expect } from 'vitest'
import { parseTaskInput } from './parser'

// Mock the current date for consistent testing
const REFERENCE_DATE = new Date(2024, 8, 15, 12, 0, 0) // Sept 15, 2024 at noon

describe('parseTaskInput', () => {
  describe('basic title parsing', () => {
    it('returns plain text as title when no special syntax', () => {
      const result = parseTaskInput('walk the dog', REFERENCE_DATE)
      expect(result.parsed.title).toBe('walk the dog')
      expect(result.chips).toHaveLength(0)
    })

    it('trims whitespace', () => {
      const result = parseTaskInput('  buy groceries  ', REFERENCE_DATE)
      expect(result.parsed.title).toBe('buy groceries')
    })
  })

  describe('context parsing', () => {
    it('parses #work hashtag', () => {
      const result = parseTaskInput('standup meeting #work', REFERENCE_DATE)
      expect(result.parsed.context).toBe('work')
      expect(result.parsed.title).toBe('standup meeting')
      expect(result.chips.some(c => c.type === 'context' && c.value === 'work')).toBe(true)
    })

    it('parses #personal hashtag', () => {
      const result = parseTaskInput('call mom #personal', REFERENCE_DATE)
      expect(result.parsed.context).toBe('personal')
      expect(result.parsed.title).toBe('call mom')
    })

    it('is case-insensitive', () => {
      const result = parseTaskInput('meeting #WORK', REFERENCE_DATE)
      expect(result.parsed.context).toBe('work')
    })

    it('parses trailing context without hashtag', () => {
      const result = parseTaskInput('submit report work', REFERENCE_DATE)
      expect(result.parsed.context).toBe('work')
      expect(result.parsed.title).toBe('submit report')
    })
  })

  describe('size parsing', () => {
    it('parses !tiny', () => {
      const result = parseTaskInput('quick task !tiny', REFERENCE_DATE)
      expect(result.parsed.size).toBe('tiny')
      expect(result.parsed.title).toBe('quick task')
    })

    it('parses !small', () => {
      const result = parseTaskInput('email !small', REFERENCE_DATE)
      expect(result.parsed.size).toBe('small')
    })

    it('parses !medium', () => {
      const result = parseTaskInput('review PR !medium', REFERENCE_DATE)
      expect(result.parsed.size).toBe('medium')
    })

    it('parses !large', () => {
      const result = parseTaskInput('write report !large', REFERENCE_DATE)
      expect(result.parsed.size).toBe('large')
    })

    it('parses single ! as tiny', () => {
      const result = parseTaskInput('brush teeth !', REFERENCE_DATE)
      expect(result.parsed.size).toBe('tiny')
    })

    it('parses !! as small', () => {
      const result = parseTaskInput('make bed !!', REFERENCE_DATE)
      expect(result.parsed.size).toBe('small')
    })

    it('parses !!! as medium', () => {
      const result = parseTaskInput('clean kitchen !!!', REFERENCE_DATE)
      expect(result.parsed.size).toBe('medium')
    })

    it('parses !!!! as large', () => {
      const result = parseTaskInput('deep clean !!!!', REFERENCE_DATE)
      expect(result.parsed.size).toBe('large')
    })
  })

  describe('date parsing', () => {
    it('parses "tomorrow"', () => {
      const result = parseTaskInput('call dentist tomorrow', REFERENCE_DATE)
      expect(result.parsed.dueDate).toBe('2024-09-16')
      expect(result.parsed.title).toBe('call dentist')
    })

    it('parses weekday names', () => {
      // Sept 15, 2024 is a Sunday, so "friday" should be Sept 20
      const result = parseTaskInput('meeting friday', REFERENCE_DATE)
      expect(result.parsed.dueDate).toBe('2024-09-20')
    })

    it('parses "next week"', () => {
      const result = parseTaskInput('review next week', REFERENCE_DATE)
      expect(result.parsed.dueDate).toBeDefined()
    })
  })

  describe('time parsing', () => {
    it('parses time with am/pm', () => {
      const result = parseTaskInput('meeting at 3pm', REFERENCE_DATE)
      expect(result.parsed.dueTime).toBe('15:00')
    })

    it('parses time with minutes', () => {
      const result = parseTaskInput('call at 9:30am', REFERENCE_DATE)
      expect(result.parsed.dueTime).toBe('09:30')
    })

    it('parses combined date and time', () => {
      const result = parseTaskInput('dentist tomorrow at 2pm', REFERENCE_DATE)
      expect(result.parsed.dueDate).toBe('2024-09-16')
      expect(result.parsed.dueTime).toBe('14:00')
    })
  })

  describe('recurrence parsing', () => {
    describe('scheduled mode', () => {
      it('parses "daily"', () => {
        const result = parseTaskInput('brush teeth daily', REFERENCE_DATE)
        expect(result.parsed.recurrence).toEqual({
          mode: 'scheduled',
          pattern: { type: 'daily' },
        })
        expect(result.parsed.title).toBe('brush teeth')
      })

      it('parses "every day"', () => {
        const result = parseTaskInput('meditate every day', REFERENCE_DATE)
        expect(result.parsed.recurrence?.mode).toBe('scheduled')
        expect((result.parsed.recurrence as any).pattern.type).toBe('daily')
      })

      it('parses "every weekday"', () => {
        const result = parseTaskInput('standup every weekday', REFERENCE_DATE)
        expect(result.parsed.recurrence).toEqual({
          mode: 'scheduled',
          pattern: { type: 'weekdays' },
        })
      })

      it('parses "weekdays"', () => {
        const result = parseTaskInput('check email weekdays', REFERENCE_DATE)
        expect((result.parsed.recurrence as any).pattern.type).toBe('weekdays')
      })

      it('parses "weekly"', () => {
        const result = parseTaskInput('review weekly', REFERENCE_DATE)
        expect(result.parsed.recurrence).toEqual({
          mode: 'scheduled',
          pattern: { type: 'custom_days', interval: 7 },
        })
      })

      it('parses "every week"', () => {
        const result = parseTaskInput('groceries every week', REFERENCE_DATE)
        expect((result.parsed.recurrence as any).pattern.type).toBe('custom_days')
        expect((result.parsed.recurrence as any).pattern.interval).toBe(7)
      })

      it('parses "every 2 weeks"', () => {
        const result = parseTaskInput('haircut every 2 weeks', REFERENCE_DATE)
        expect((result.parsed.recurrence as any).pattern.interval).toBe(14)
      })

      it('parses "monthly"', () => {
        const result = parseTaskInput('pay rent monthly', REFERENCE_DATE)
        expect(result.parsed.recurrence?.mode).toBe('scheduled')
        expect((result.parsed.recurrence as any).pattern.type).toBe('monthly')
      })

      it('parses "every monday"', () => {
        const result = parseTaskInput('team sync every monday', REFERENCE_DATE)
        expect(result.parsed.recurrence).toEqual({
          mode: 'scheduled',
          pattern: { type: 'weekly', days: [1] },
        })
      })

      it('parses "every monday and thursday"', () => {
        const result = parseTaskInput('gym every monday and thursday', REFERENCE_DATE)
        expect(result.parsed.recurrence).toEqual({
          mode: 'scheduled',
          pattern: { type: 'weekly', days: [1, 4] },
        })
      })

      it('parses "every mon"', () => {
        const result = parseTaskInput('check-in every mon', REFERENCE_DATE)
        expect((result.parsed.recurrence as any).pattern.days).toContain(1)
      })
    })

    describe('interval mode', () => {
      it('parses "every 3 days"', () => {
        const result = parseTaskInput('shower every 3 days', REFERENCE_DATE)
        expect(result.parsed.recurrence).toEqual({
          mode: 'interval',
          days: 3,
        })
      })

      it('parses "every 1 day"', () => {
        const result = parseTaskInput('vitamins every 1 day', REFERENCE_DATE)
        expect(result.parsed.recurrence).toEqual({
          mode: 'interval',
          days: 1,
        })
      })
    })

    describe('recurrence with time', () => {
      it('adds time to scheduled recurrence', () => {
        const result = parseTaskInput('standup every weekday at 9am', REFERENCE_DATE)
        expect(result.parsed.recurrence?.mode).toBe('scheduled')
        expect((result.parsed.recurrence as any).time).toBe('09:00')
      })

      it('adds time to interval recurrence', () => {
        const result = parseTaskInput('water plants every 3 days at 8am', REFERENCE_DATE)
        expect(result.parsed.recurrence?.mode).toBe('interval')
        expect((result.parsed.recurrence as any).time).toBe('08:00')
      })
    })
  })

  describe('chip generation', () => {
    it('generates chip for context', () => {
      const result = parseTaskInput('task #work', REFERENCE_DATE)
      const contextChip = result.chips.find(c => c.type === 'context')
      expect(contextChip).toBeDefined()
      expect(contextChip?.label).toBe('work')
    })

    it('generates chip for size', () => {
      const result = parseTaskInput('task !small', REFERENCE_DATE)
      const sizeChip = result.chips.find(c => c.type === 'size')
      expect(sizeChip).toBeDefined()
      expect(sizeChip?.label).toBe('small')
    })

    it('generates chip for recurrence', () => {
      const result = parseTaskInput('task daily', REFERENCE_DATE)
      const recurrenceChip = result.chips.find(c => c.type === 'recurrence')
      expect(recurrenceChip).toBeDefined()
      expect(recurrenceChip?.label).toBe('daily')
    })

    it('generates chip for date', () => {
      const result = parseTaskInput('task tomorrow', REFERENCE_DATE)
      const dateChip = result.chips.find(c => c.type === 'date')
      expect(dateChip).toBeDefined()
      // Label is formatted by formatDateLabel - "tomorrow" becomes the display label
      expect(dateChip?.value).toBe('2024-09-16')
    })
  })

  describe('complex inputs', () => {
    it('parses full natural language input', () => {
      const result = parseTaskInput('walk the dog tomorrow at 5pm #personal !small', REFERENCE_DATE)

      expect(result.parsed.title).toBe('walk the dog')
      expect(result.parsed.context).toBe('personal')
      expect(result.parsed.size).toBe('small')
      expect(result.parsed.dueDate).toBe('2024-09-16')
      expect(result.parsed.dueTime).toBe('17:00')
    })

    it('parses recurring task with context and size', () => {
      const result = parseTaskInput('standup every weekday at 9am !tiny #work', REFERENCE_DATE)

      expect(result.parsed.title).toBe('standup')
      expect(result.parsed.context).toBe('work')
      expect(result.parsed.size).toBe('tiny')
      expect(result.parsed.recurrence?.mode).toBe('scheduled')
      expect((result.parsed.recurrence as any).pattern.type).toBe('weekdays')
      expect((result.parsed.recurrence as any).time).toBe('09:00')
    })

    it('parses interval recurrence with all modifiers', () => {
      const result = parseTaskInput('shower every 3 days #personal !!', REFERENCE_DATE)

      expect(result.parsed.title).toBe('shower')
      expect(result.parsed.context).toBe('personal')
      expect(result.parsed.size).toBe('small')
      expect(result.parsed.recurrence).toEqual({
        mode: 'interval',
        days: 3,
      })
    })

    it('handles input with multiple spaces', () => {
      const result = parseTaskInput('buy   groceries   tomorrow   #personal', REFERENCE_DATE)
      expect(result.parsed.title).toBe('buy groceries')
      expect(result.parsed.context).toBe('personal')
    })
  })

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = parseTaskInput('', REFERENCE_DATE)
      expect(result.parsed.title).toBe('')
    })

    it('handles input with only modifiers', () => {
      const result = parseTaskInput('#work !tiny', REFERENCE_DATE)
      expect(result.parsed.title).toBe('')
      expect(result.parsed.context).toBe('work')
      expect(result.parsed.size).toBe('tiny')
    })

    it('does not parse date when task is recurring', () => {
      // Recurring tasks should not have a specific due date
      const result = parseTaskInput('exercise daily tomorrow', REFERENCE_DATE)
      expect(result.parsed.recurrence).toBeDefined()
      // The dueDate should not be set for recurring tasks
      expect(result.parsed.dueDate).toBeUndefined()
    })
  })
})
