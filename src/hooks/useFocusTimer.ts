import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FocusSession, Json } from '@/types/database'

// Constants
const CHUNK_MINUTES = 5
const COINS_PER_CHUNK = 3
const COMPLETION_BONUS = 10

interface PausePeriod {
  start: string
  end: string | null
}

// RPC response types
interface SessionRow {
  id: string
  user_id: string
  task_id: string | null
  planned_minutes: number
  started_at: string
  paused_json: Json
  ended_at: string | null
  status: string
  chunks_paid: number
  created_at: string
}

interface PayChunkRow {
  success: boolean
  new_balance: number
  reason: string
}

/**
 * Calculate elapsed seconds from session data.
 * Accounts for pause periods.
 */
function calculateElapsedSeconds(session: FocusSession): number {
  const startedAt = new Date(session.started_at).getTime()
  const now = Date.now()

  // Calculate total paused time
  const pausePeriods = (session.paused_json as unknown as PausePeriod[]) || []
  let pausedMs = 0

  for (const period of pausePeriods) {
    const pauseStart = new Date(period.start).getTime()
    const pauseEnd = period.end ? new Date(period.end).getTime() : now
    pausedMs += pauseEnd - pauseStart
  }

  // If currently paused, don't count time since last pause started
  if (session.status === 'paused') {
    const elapsed = (now - startedAt - pausedMs) / 1000
    return Math.max(0, Math.floor(elapsed))
  }

  const elapsed = (now - startedAt - pausedMs) / 1000
  return Math.max(0, Math.floor(elapsed))
}

/**
 * Calculate how many chunks have been completed.
 */
function calculateCompletedChunks(elapsedSeconds: number): number {
  return Math.floor(elapsedSeconds / (CHUNK_MINUTES * 60))
}

/**
 * Calculate coins earned (chunks × coins per chunk).
 */
function calculateEarnedCoins(
  completedChunks: number,
  isComplete: boolean
): number {
  const chunkCoins = completedChunks * COINS_PER_CHUNK
  const bonus = isComplete ? COMPLETION_BONUS : 0
  return chunkCoins + bonus
}

async function fetchRunningSession(): Promise<FocusSession | null> {
  const { data, error } = await supabase.rpc('get_running_focus_session') as {
    data: SessionRow[] | null
    error: { message: string } | null
  }

  if (error) {
    console.warn('get_running_focus_session failed:', error.message)
    return null
  }

  const row = data?.[0]
  if (!row) return null

  return {
    id: row.id,
    user_id: row.user_id,
    task_id: row.task_id,
    planned_minutes: row.planned_minutes,
    started_at: row.started_at,
    paused_json: row.paused_json,
    ended_at: row.ended_at,
    status: row.status as 'running' | 'paused' | 'done' | 'stopped',
    chunks_paid: row.chunks_paid,
    created_at: row.created_at,
  }
}

export function useFocusTimer() {
  const queryClient = useQueryClient()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [pendingChunks, setPendingChunks] = useState<number[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch running session
  const { data: session, isLoading, refetch } = useQuery({
    queryKey: ['focusSession'],
    queryFn: fetchRunningSession,
    staleTime: 1000 * 5, // 5 seconds
    refetchOnWindowFocus: true,
  })

  // Start session mutation
  const startMutation = useMutation({
    mutationFn: async ({ minutes, taskId }: { minutes: number; taskId?: string }) => {
      // @ts-expect-error - RPC function types not fully integrated with supabase client
      const { data, error } = await supabase.rpc('create_focus_session', {
        p_planned_minutes: minutes,
        p_task_id: taskId ?? null,
      }) as {
        data: SessionRow[] | null
        error: { message: string } | null
      }

      if (error) throw new Error(error.message)
      const row = data?.[0]
      if (!row) throw new Error('No session returned')
      return row
    },
    onSuccess: () => {
      refetch()
    },
  })

  // Update session mutation (pause/resume/stop)
  const updateMutation = useMutation({
    mutationFn: async ({ sessionId, action }: { sessionId: string; action: 'pause' | 'resume' | 'stop' | 'complete' }) => {
      // @ts-expect-error - RPC function types not fully integrated with supabase client
      const { data, error } = await supabase.rpc('update_focus_session', {
        p_session_id: sessionId,
        p_action: action,
      }) as {
        data: SessionRow[] | null
        error: { message: string } | null
      }

      if (error) throw new Error(error.message)
      const row = data?.[0]
      if (!row) throw new Error('No session returned')
      return row
    },
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] })
    },
  })

  // Pay chunk mutation
  const payChunkMutation = useMutation({
    mutationFn: async ({ sessionId, chunkIndex }: { sessionId: string; chunkIndex: number }) => {
      // @ts-expect-error - RPC function types not fully integrated with supabase client
      const { data, error } = await supabase.rpc('pay_focus_chunk', {
        p_session_id: sessionId,
        p_chunk_index: chunkIndex,
      }) as {
        data: PayChunkRow[] | null
        error: { message: string } | null
      }

      if (error) throw new Error(error.message)
      const row = data?.[0]
      if (!row?.success) {
        console.warn('pay_focus_chunk failed:', row?.reason)
      }
      return row
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] })
    },
  })

  // Tick timer effect
  useEffect(() => {
    if (!session || session.status === 'done' || session.status === 'stopped') {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
      return
    }

    // Update elapsed time
    const updateElapsed = () => {
      const elapsed = calculateElapsedSeconds(session)
      setElapsedSeconds(elapsed)

      // Check for new chunks to pay
      const completedChunks = calculateCompletedChunks(elapsed)
      const unpaidChunks: number[] = []

      for (let i = session.chunks_paid; i < completedChunks; i++) {
        unpaidChunks.push(i)
      }

      if (unpaidChunks.length > 0) {
        setPendingChunks(prev => {
          const newPending = unpaidChunks.filter(c => !prev.includes(c))
          return [...prev, ...newPending]
        })
      }

      // Check for completion
      const plannedSeconds = session.planned_minutes * 60
      if (elapsed >= plannedSeconds && session.status === 'running') {
        // Auto-complete
        updateMutation.mutate({ sessionId: session.id, action: 'complete' })
      }
    }

    updateElapsed()

    // Only tick if running
    if (session.status === 'running') {
      tickRef.current = setInterval(updateElapsed, 1000)
    }

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [session, updateMutation])

  // Process pending chunk payments
  useEffect(() => {
    if (!session || pendingChunks.length === 0) return

    const processChunks = async () => {
      for (const chunkIndex of pendingChunks) {
        try {
          await payChunkMutation.mutateAsync({ sessionId: session.id, chunkIndex })
        } catch (err) {
          console.error('Failed to pay chunk:', err)
        }
      }
      setPendingChunks([])
      refetch() // Refresh session to get updated chunks_paid
    }

    processChunks()
  }, [pendingChunks, session, payChunkMutation, refetch])

  // Computed values
  const completedChunks = calculateCompletedChunks(elapsedSeconds)
  const plannedSeconds = session ? session.planned_minutes * 60 : 0
  const isComplete = session?.status === 'done'
  const isStopped = session?.status === 'stopped'
  const earnedCoins = calculateEarnedCoins(completedChunks, isComplete)
  const progress = plannedSeconds > 0 ? Math.min(1, elapsedSeconds / plannedSeconds) : 0

  // Actions
  const startSession = useCallback(async (minutes: number, taskId?: string) => {
    await startMutation.mutateAsync({ minutes, taskId })
  }, [startMutation])

  const pauseSession = useCallback(async () => {
    if (!session) return
    await updateMutation.mutateAsync({ sessionId: session.id, action: 'pause' })
  }, [session, updateMutation])

  const resumeSession = useCallback(async () => {
    if (!session) return
    await updateMutation.mutateAsync({ sessionId: session.id, action: 'resume' })
  }, [session, updateMutation])

  const stopSession = useCallback(async () => {
    if (!session) return
    await updateMutation.mutateAsync({ sessionId: session.id, action: 'stop' })
  }, [session, updateMutation])

  const clearSession = useCallback(() => {
    queryClient.setQueryData(['focusSession'], null)
    setElapsedSeconds(0)
    setPendingChunks([])
  }, [queryClient])

  return {
    // State
    session,
    isLoading,
    elapsedSeconds,
    plannedSeconds,
    completedChunks,
    earnedCoins,
    progress,
    isComplete,
    isStopped,
    isRunning: session?.status === 'running',
    isPaused: session?.status === 'paused',
    hasSession: !!session && session.status !== 'done' && session.status !== 'stopped',

    // Actions
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    clearSession,

    // Loading states
    isStarting: startMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}

/**
 * Format seconds as MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format remaining time
 */
export function formatRemaining(elapsedSeconds: number, plannedSeconds: number): string {
  const remaining = Math.max(0, plannedSeconds - elapsedSeconds)
  return formatTime(remaining)
}
