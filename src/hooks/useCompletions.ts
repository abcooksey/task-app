import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getAppDay } from '@/lib/time'
import {
  BASE_PAYOUTS,
  getDreadMultiplier,
  rollVariableBonus,
  FIRST_OF_DAY_BONUS,
} from '@/config/economy'
import type { Completion, Task, LedgerReason } from '@/types/database'

// =============================================================================
// Types
// =============================================================================

export interface CompletionResult {
  completionId: string
  basePayout: number
  dreadBonus: number
  variableBonus: number
  variableBonusType: 'none' | 'standard' | 'jackpot'
  firstOfDayBonus: number
  totalPayout: number
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all completions for the current user
 */
export function useCompletions() {
  return useQuery({
    queryKey: ['completions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('completions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Completion[]
    },
  })
}

/**
 * Fetch completions for a specific date range (for heatmap, etc.)
 */
export function useCompletionsInRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['completions', 'range', startDate, endDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('completions')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startDate)
        .lte('completed_at', endDate)
        .is('reversed_at', null)

      if (error) throw error
      return (data ?? []) as Completion[]
    },
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Complete a task occurrence and award coins
 */
export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      task,
      occurrenceKey,
    }: {
      task: Task
      occurrenceKey: string
    }): Promise<CompletionResult> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const now = new Date().toISOString()
      const todayKey = getAppDay()

      // 1. Calculate base payout
      const basePayout = BASE_PAYOUTS[task.size]

      // 2. Calculate dread bonus (only for non-recurring tasks with defers)
      let dreadBonus = 0
      if (!task.recurrence && task.defer_count > 0) {
        const dreadMultiplier = getDreadMultiplier(task.defer_count)
        dreadBonus = Math.round(basePayout * (dreadMultiplier - 1))
      }

      // 3. Roll for variable bonus
      const variableRoll = rollVariableBonus(Math.random)
      const variableBonus = Math.round(basePayout * variableRoll.multiplier)

      // 4. Check if first completion of the day
      const { count: todayCompletions } = await supabase
        .from('completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('completed_at', `${todayKey}T00:00:00`)
        .lt('completed_at', `${todayKey}T23:59:59`)
        .is('reversed_at', null)

      const firstOfDayBonus = (todayCompletions ?? 0) === 0 ? FIRST_OF_DAY_BONUS : 0

      // 5. Insert completion record
      const { data: completionData, error: completionError } = await supabase
        .from('completions')
        .insert({
          task_id: task.id,
          user_id: user.id,
          occurrence_key: occurrenceKey,
          completed_at: now,
        } as any)
        .select()
        .single()

      if (completionError) throw completionError
      const completion = completionData as Completion

      // 6. Insert coin ledger entries
      const ledgerEntries: Array<{
        user_id: string
        amount: number
        reason: LedgerReason
        ref_type: string
        ref_id: string
        meta: Record<string, unknown> | null
      }> = []

      // Base payout entry
      ledgerEntries.push({
        user_id: user.id,
        amount: basePayout,
        reason: 'task_completion',
        ref_type: 'completion',
        ref_id: completion.id,
        meta: { task_id: task.id, task_title: task.title, size: task.size },
      })

      // Dread bonus entry
      if (dreadBonus > 0) {
        ledgerEntries.push({
          user_id: user.id,
          amount: dreadBonus,
          reason: 'dread_bonus',
          ref_type: 'completion',
          ref_id: completion.id,
          meta: { defer_count: task.defer_count },
        })
      }

      // Variable bonus entry
      if (variableBonus > 0) {
        ledgerEntries.push({
          user_id: user.id,
          amount: variableBonus,
          reason: variableRoll.type === 'jackpot' ? 'jackpot_bonus' : 'variable_bonus',
          ref_type: 'completion',
          ref_id: completion.id,
          meta: { multiplier: variableRoll.multiplier },
        })
      }

      // First of day bonus entry
      if (firstOfDayBonus > 0) {
        ledgerEntries.push({
          user_id: user.id,
          amount: firstOfDayBonus,
          reason: 'first_of_day_bonus',
          ref_type: 'completion',
          ref_id: completion.id,
          meta: null,
        })
      }

      const { error: ledgerError } = await supabase
        .from('coin_ledger')
        .insert(ledgerEntries as any)

      if (ledgerError) throw ledgerError

      // 7. Update task's last_completed_at for interval recurrence
      if (task.recurrence) {
        await (supabase
          .from('tasks') as any)
          .update({ last_completed_at: now, updated_at: now })
          .eq('id', task.id)
      }

      const totalPayout = basePayout + dreadBonus + variableBonus + firstOfDayBonus

      return {
        completionId: completion.id,
        basePayout,
        dreadBonus,
        variableBonus,
        variableBonusType: variableRoll.type,
        firstOfDayBonus,
        totalPayout,
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['completions'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] })
    },
  })
}

/**
 * Reverse (uncomplete) a task completion
 */
export function useReverseCompletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (completionId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const now = new Date().toISOString()

      // 1. Mark completion as reversed
      const { error: completionError } = await (supabase
        .from('completions') as any)
        .update({ reversed_at: now })
        .eq('id', completionId)
        .eq('user_id', user.id)

      if (completionError) throw completionError

      // 2. Find all ledger entries for this completion and sum them
      const { data: ledgerEntriesData, error: ledgerReadError } = await supabase
        .from('coin_ledger')
        .select('amount')
        .eq('ref_type', 'completion')
        .eq('ref_id', completionId)
        .eq('user_id', user.id)

      if (ledgerReadError) throw ledgerReadError

      const ledgerEntries = (ledgerEntriesData ?? []) as Array<{ amount: number }>
      const totalToReverse = ledgerEntries.reduce(
        (sum, entry) => sum + entry.amount,
        0
      )

      // 3. Insert reversal entry (negative amount)
      if (totalToReverse > 0) {
        const { error: reversalError } = await supabase
          .from('coin_ledger')
          .insert({
            user_id: user.id,
            amount: -totalToReverse,
            reason: 'reversal',
            ref_type: 'completion',
            ref_id: completionId,
            meta: { original_amount: totalToReverse },
          } as any)

        if (reversalError) throw reversalError
      }

      return { reversedAmount: totalToReverse }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completions'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] })
    },
  })
}
