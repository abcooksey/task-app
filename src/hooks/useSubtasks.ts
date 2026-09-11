import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getSubtaskPayout } from '../config/economy'
import type { Database } from '../types/database'

type Subtask = Database['public']['Tables']['subtasks']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('sort_index', { ascending: true })

      if (error) throw error
      return (data || []) as Subtask[]
    },
    enabled: !!taskId,
  })
}

export function useCreateSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      // Get the highest sort_index for this task
      const { data: existing } = await supabase
        .from('subtasks')
        .select('sort_index')
        .eq('task_id', taskId)
        .order('sort_index', { ascending: false })
        .limit(1)

      const nextIndex = existing && existing.length > 0
        ? (existing[0] as { sort_index: number }).sort_index + 1
        : 0

      const { data, error } = await (supabase.from('subtasks') as any)
        .insert({
          task_id: taskId,
          title,
          sort_index: nextIndex,
        })
        .select()
        .single()

      if (error) throw error
      return data as Subtask
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] })
    },
  })
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      taskId,
      ...updates
    }: {
      id: string
      taskId: string
      title?: string
      completed_at?: string | null
    }) => {
      const { data, error } = await (supabase.from('subtasks') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Subtask
    },
    onMutate: async ({ id, taskId, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] })

      const previousSubtasks = queryClient.getQueryData<Subtask[]>(['subtasks', taskId])

      if (previousSubtasks) {
        queryClient.setQueryData<Subtask[]>(['subtasks', taskId],
          previousSubtasks.map(s => s.id === id ? { ...s, ...updates } : s)
        )
      }

      return { previousSubtasks, taskId }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSubtasks) {
        queryClient.setQueryData(['subtasks', context.taskId], context.previousSubtasks)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] })
    },
  })
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; taskId: string }) => {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onMutate: async ({ id, taskId }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] })

      const previousSubtasks = queryClient.getQueryData<Subtask[]>(['subtasks', taskId])

      if (previousSubtasks) {
        queryClient.setQueryData<Subtask[]>(['subtasks', taskId],
          previousSubtasks.filter(s => s.id !== id)
        )
      }

      return { previousSubtasks, taskId }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSubtasks) {
        queryClient.setQueryData(['subtasks', context.taskId], context.previousSubtasks)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] })
    },
  })
}

export function useCompleteSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, taskId, completed }: { id: string; taskId: string; completed: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update the subtask
      const { data: subtaskData, error: subtaskError } = await (supabase.from('subtasks') as any)
        .update({
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single()

      if (subtaskError) throw subtaskError
      const subtask = subtaskData as Subtask

      // If completing (not uncompleting), award coins
      if (completed) {
        // Get the parent task to know its size
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single()

        if (taskError) throw taskError
        const task = taskData as Task

        // Get all subtasks to calculate payout
        const { data: allSubtasks, error: allError } = await supabase
          .from('subtasks')
          .select('*')
          .eq('task_id', taskId)
          .order('sort_index', { ascending: true })

        if (allError) throw allError
        const subtasks = allSubtasks as Subtask[]

        const subtaskIndex = subtasks.findIndex(s => s.id === id)
        const payout = getSubtaskPayout(task.size, subtasks.length, subtaskIndex)

        // Add coin ledger entry
        if (payout > 0) {
          await (supabase.from('coin_ledger') as any).insert({
            user_id: user.id,
            amount: payout,
            reason: 'subtask_completion',
            ref_type: 'subtask',
            ref_id: id,
            meta: {
              task_id: taskId,
              task_title: task.title,
              subtask_title: subtask.title,
            },
          })
        }
      }

      return subtask
    },
    onMutate: async ({ id, taskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] })

      const previousSubtasks = queryClient.getQueryData<Subtask[]>(['subtasks', taskId])

      if (previousSubtasks) {
        queryClient.setQueryData<Subtask[]>(['subtasks', taskId],
          previousSubtasks.map(s =>
            s.id === id
              ? { ...s, completed_at: completed ? new Date().toISOString() : null }
              : s
          )
        )
      }

      return { previousSubtasks, taskId }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSubtasks) {
        queryClient.setQueryData(['subtasks', context.taskId], context.previousSubtasks)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] })
      // Also invalidate coin balance
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] })
    },
  })
}
