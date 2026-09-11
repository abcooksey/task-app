import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getRepairById } from '@/lib/houseState'

interface RepairResult {
  success: boolean
  newBalance: number
  alreadyDone: boolean
}

interface UndoResult {
  success: boolean
  newBalance: number
  reason: string
}

interface UndoState {
  repairId: string
  expiresAt: number
}

// RPC response types
interface PerformRepairRow {
  success: boolean
  new_balance: number
  already_done: boolean
}

interface UndoRepairRow {
  success: boolean
  new_balance: number
  reason: string
}

const UNDO_WINDOW_MS = 5000 // 5 seconds

async function performRepairRpc(repairId: string, cost: number): Promise<RepairResult> {
  // @ts-expect-error - RPC function types not in generated schema yet
  const { data, error } = await supabase.rpc('perform_repair', {
    p_repair_id: repairId,
    p_cost: cost,
  }) as {
    data: PerformRepairRow[] | null
    error: { code?: string; message: string } | null
  }

  if (error) {
    // Check for insufficient balance error
    if (error.code === 'P0001' || error.message.includes('Insufficient balance')) {
      throw new Error('Not enough coins')
    }
    throw new Error(error.message)
  }

  // RPC returns array with one row
  const row = data?.[0]
  if (!row) {
    throw new Error('No result from perform_repair')
  }

  return {
    success: row.success,
    newBalance: row.new_balance,
    alreadyDone: row.already_done,
  }
}

async function undoRepairRpc(repairId: string): Promise<UndoResult> {
  // @ts-expect-error - RPC function types not in generated schema yet
  const { data, error } = await supabase.rpc('undo_repair', {
    p_repair_id: repairId,
    p_max_age_seconds: 5,
  }) as {
    data: UndoRepairRow[] | null
    error: { message: string } | null
  }

  if (error) {
    throw new Error(error.message)
  }

  // RPC returns array with one row
  const row = data?.[0]
  if (!row) {
    throw new Error('No result from undo_repair')
  }

  return {
    success: row.success,
    newBalance: row.new_balance,
    reason: row.reason,
  }
}

export function usePerformRepair() {
  const queryClient = useQueryClient()
  const [undoState, setUndoState] = useState<UndoState | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mutation for performing repair
  const repairMutation = useMutation({
    mutationFn: ({ repairId, cost }: { repairId: string; cost: number }) =>
      performRepairRpc(repairId, cost),
    onSuccess: (result, { repairId }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['houseData'] })
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] })

      // Don't set undo state if already done (idempotent call)
      if (result.alreadyDone) {
        return
      }

      // Start undo window
      setUndoState({
        repairId,
        expiresAt: Date.now() + UNDO_WINDOW_MS,
      })

      // Clear undo after window expires
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
      undoTimerRef.current = setTimeout(() => {
        setUndoState(null)
      }, UNDO_WINDOW_MS)
    },
  })

  // Mutation for undoing repair
  const undoMutation = useMutation({
    mutationFn: (repairId: string) => undoRepairRpc(repairId),
    onSuccess: () => {
      // Clear undo state
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
      setUndoState(null)

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['houseData'] })
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] })
    },
  })

  // Perform a repair
  const performRepair = useCallback(
    (repairId: string) => {
      const repair = getRepairById(repairId)
      if (!repair) {
        throw new Error(`Unknown repair: ${repairId}`)
      }
      return repairMutation.mutateAsync({ repairId, cost: repair.cost })
    },
    [repairMutation]
  )

  // Undo the most recent repair (if within window)
  const undoRepair = useCallback(() => {
    if (!undoState) return

    // Check if still within window
    if (Date.now() > undoState.expiresAt) {
      setUndoState(null)
      return
    }

    undoMutation.mutate(undoState.repairId)
  }, [undoState, undoMutation])

  // Time remaining for undo (for progress indicator)
  const undoTimeRemaining = undoState
    ? Math.max(0, undoState.expiresAt - Date.now())
    : 0

  // Can undo right now?
  const canUndo = undoState !== null && Date.now() < undoState.expiresAt

  return {
    performRepair,
    undoRepair,
    isRepairing: repairMutation.isPending,
    isUndoing: undoMutation.isPending,
    repairError: repairMutation.error,
    undoError: undoMutation.error,
    canUndo,
    undoTimeRemaining,
    undoRepairId: undoState?.repairId ?? null,
  }
}
