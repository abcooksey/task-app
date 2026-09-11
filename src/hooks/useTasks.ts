import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/database'

type TaskInsert = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>
type TaskUpdate = Partial<TaskInsert> & { id: string }

// Fetch all non-deleted tasks
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Task[]
    },
  })
}

// Fetch deleted tasks (for restore)
export function useDeletedTasks() {
  return useQuery({
    queryKey: ['tasks', 'deleted'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Task[]
    },
  })
}

// Create a new task
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (task: Partial<TaskInsert> & { title: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const newTask = {
        user_id: user.id,
        title: task.title,
        context: task.context ?? 'personal',
        size: task.size ?? 'small',
        notes: task.notes ?? null,
        due_date: task.due_date ?? null,
        due_time: task.due_time ?? null,
        recurrence: task.recurrence ?? null,
        times_per_day: task.times_per_day ?? 1,
        is_paused: false,
        defer_count: 0,
        pinned: task.pinned ?? false,
        last_completed_at: null,
        sort_index: null,
        is_template: false,
        deleted_at: null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tasks') as any)
        .insert(newTask)
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    // Optimistic update
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

      const optimisticTask: Task = {
        id: crypto.randomUUID(),
        user_id: 'temp',
        title: newTask.title,
        context: newTask.context ?? 'personal',
        size: newTask.size ?? 'small',
        notes: newTask.notes ?? null,
        due_date: newTask.due_date ?? null,
        due_time: newTask.due_time ?? null,
        recurrence: newTask.recurrence ?? null,
        times_per_day: newTask.times_per_day ?? 1,
        is_paused: false,
        defer_count: 0,
        pinned: newTask.pinned ?? false,
        last_completed_at: null,
        sort_index: null,
        is_template: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old ? [optimisticTask, ...old] : [optimisticTask]
      )

      return { previousTasks }
    },
    onError: (_err, _newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Update a task
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tasks') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        )
      )

      return { previousTasks }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Soft delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tasks') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', taskId)

      if (error) throw error
      return taskId
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.filter((task) => task.id !== taskId)
      )

      return { previousTasks }
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'deleted'] })
    },
  })
}

// Restore a deleted task
export function useRestoreTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tasks') as any)
        .update({ deleted_at: null })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'deleted'] })
    },
  })
}

// Defer a task to tomorrow (increments defer_count for dread bonus)
export function useDeferTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (task: Task) => {
      // Calculate tomorrow's date
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowKey = tomorrow.toISOString().split('T')[0]

      const updates = {
        due_date: tomorrowKey,
        defer_count: task.defer_count + 1,
        pinned: false, // Unpin when deferring
        updated_at: new Date().toISOString(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tasks') as any)
        .update(updates)
        .eq('id', task.id)
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

      // Calculate tomorrow for optimistic update
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowKey = tomorrow.toISOString().split('T')[0]

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) =>
          t.id === task.id
            ? { ...t, due_date: tomorrowKey, defer_count: t.defer_count + 1, pinned: false }
            : t
        )
      )

      return { previousTasks }
    },
    onError: (_err, _task, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['completions'] })
    },
  })
}
