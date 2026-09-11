import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAppDay } from '../lib/time'
import type { Database } from '../types/database'

type Completion = Database['public']['Tables']['completions']['Row']
type CoinLedgerEntry = Database['public']['Tables']['coin_ledger']['Row']

interface DailyStats {
  date: string
  completions: number
  coins: number
}

interface Stats {
  // Totals
  totalCompletions: number
  totalCoins: number

  // Daily breakdown (last 30 days)
  dailyStats: DailyStats[]

  // Streaks (positive framing only)
  currentStreak: number
  longestStreak: number

  // Best performance
  bestDay: { date: string; completions: number } | null
  bestCoinDay: { date: string; coins: number } | null

  // Averages
  avgCompletionsPerDay: number
  avgCoinsPerDay: number

  // This week vs last week
  thisWeekCompletions: number
  lastWeekCompletions: number
  thisWeekCoins: number
  lastWeekCoins: number
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<Stats> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch completions and coin ledger
      const [completionsRes, ledgerRes] = await Promise.all([
        supabase
          .from('completions')
          .select('*')
          .eq('user_id', user.id)
          .is('reversed_at', null)
          .order('completed_at', { ascending: true }),
        supabase
          .from('coin_ledger')
          .select('*')
          .eq('user_id', user.id)
          .gt('amount', 0) // Only positive entries
          .order('created_at', { ascending: true }),
      ])

      const completions = (completionsRes.data || []) as Completion[]
      const ledger = (ledgerRes.data || []) as CoinLedgerEntry[]

      // Build daily stats map
      const dailyMap = new Map<string, { completions: number; coins: number }>()

      for (const c of completions) {
        const day = c.completed_at.split('T')[0]
        const existing = dailyMap.get(day) || { completions: 0, coins: 0 }
        existing.completions++
        dailyMap.set(day, existing)
      }

      for (const entry of ledger) {
        const day = entry.created_at.split('T')[0]
        const existing = dailyMap.get(day) || { completions: 0, coins: 0 }
        existing.coins += entry.amount
        dailyMap.set(day, existing)
      }

      // Get last 30 days
      const today = getAppDay()
      const last30Days: DailyStats[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        const stats = dailyMap.get(dateKey) || { completions: 0, coins: 0 }
        last30Days.push({ date: dateKey, ...stats })
      }

      // Calculate streaks
      const { currentStreak, longestStreak } = calculateStreaks(dailyMap, today)

      // Find best days
      let bestDay: { date: string; completions: number } | null = null
      let bestCoinDay: { date: string; coins: number } | null = null

      for (const [date, stats] of dailyMap) {
        if (!bestDay || stats.completions > bestDay.completions) {
          bestDay = { date, completions: stats.completions }
        }
        if (!bestCoinDay || stats.coins > bestCoinDay.coins) {
          bestCoinDay = { date, coins: stats.coins }
        }
      }

      // Calculate totals
      const totalCompletions = completions.length
      const totalCoins = ledger.reduce((sum, e) => sum + e.amount, 0)

      // Calculate averages (days with at least one completion)
      const activeDays = Array.from(dailyMap.values()).filter(d => d.completions > 0).length
      const avgCompletionsPerDay = activeDays > 0 ? totalCompletions / activeDays : 0
      const avgCoinsPerDay = activeDays > 0 ? totalCoins / activeDays : 0

      // This week vs last week
      const thisWeekStart = new Date()
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
      const lastWeekStart = new Date(thisWeekStart)
      lastWeekStart.setDate(lastWeekStart.getDate() - 7)

      let thisWeekCompletions = 0
      let lastWeekCompletions = 0
      let thisWeekCoins = 0
      let lastWeekCoins = 0

      for (const [date, stats] of dailyMap) {
        const d = new Date(date)
        if (d >= thisWeekStart) {
          thisWeekCompletions += stats.completions
          thisWeekCoins += stats.coins
        } else if (d >= lastWeekStart && d < thisWeekStart) {
          lastWeekCompletions += stats.completions
          lastWeekCoins += stats.coins
        }
      }

      return {
        totalCompletions,
        totalCoins,
        dailyStats: last30Days,
        currentStreak,
        longestStreak,
        bestDay,
        bestCoinDay,
        avgCompletionsPerDay,
        avgCoinsPerDay,
        thisWeekCompletions,
        lastWeekCompletions,
        thisWeekCoins,
        lastWeekCoins,
      }
    },
  })
}

function calculateStreaks(
  dailyMap: Map<string, { completions: number; coins: number }>,
  today: string
): { currentStreak: number; longestStreak: number } {
  // Sort dates
  const dates = Array.from(dailyMap.keys())
    .filter(d => dailyMap.get(d)!.completions > 0)
    .sort()

  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  let longestStreak = 1
  let currentStreak = 0
  let tempStreak = 1

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1])
    const currDate = new Date(dates[i])
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 1
    }
  }

  // Check if current streak is active (includes today or yesterday)
  const lastActiveDate = dates[dates.length - 1]
  const todayDate = new Date(today)
  const lastDate = new Date(lastActiveDate)
  const daysDiff = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff <= 1) {
    // Streak is active - count backwards from last active date
    currentStreak = 1
    for (let i = dates.length - 2; i >= 0; i--) {
      const prevDate = new Date(dates[i])
      const currDate = new Date(dates[i + 1])
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }

  return { currentStreak, longestStreak }
}

// Format helpers
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
