import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAppDay } from '../lib/time'
import type { Database } from '../types/database'

type DayState = Database['public']['Tables']['day_state']['Row']
type DayStateUpdate = Partial<Pick<DayState, 'low_energy' | 'custom_order'>>

export function useDayState() {
  const todayKey = getAppDay()

  return useQuery({
    queryKey: ['dayState', todayKey],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('day_state')
        .select('*')
        .eq('user_id', user.id)
        .eq('day_key', todayKey)
        .maybeSingle()

      if (error) throw error

      // Return defaults if no row exists
      if (!data) {
        return {
          user_id: user.id,
          day_key: todayKey,
          low_energy: false,
          custom_order: null,
        } as DayState
      }

      return data as DayState
    },
  })
}

export function useUpdateDayState() {
  const queryClient = useQueryClient()
  const todayKey = getAppDay()

  return useMutation({
    mutationFn: async (updates: DayStateUpdate) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await (supabase.from('day_state') as any).upsert({
        user_id: user.id,
        day_key: todayKey,
        ...updates,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,day_key',
      })
      .select()
      .single()

      if (error) throw error
      return data as DayState
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['dayState', todayKey] })

      const previousState = queryClient.getQueryData<DayState>(['dayState', todayKey])

      if (previousState) {
        queryClient.setQueryData<DayState>(['dayState', todayKey], {
          ...previousState,
          ...updates,
        })
      }

      return { previousState }
    },
    onError: (_error, _updates, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(['dayState', todayKey], context.previousState)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dayState', todayKey] })
    },
  })
}
