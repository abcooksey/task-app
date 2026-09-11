import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Settings = Database['public']['Tables']['settings']['Row']
type SettingsUpdate = Partial<Omit<Settings, 'user_id' | 'created_at' | 'updated_at'>>

const DEFAULT_SETTINGS: Omit<Settings, 'user_id' | 'created_at' | 'updated_at'> = {
  day_boundary_minutes: 240, // 4am
  quiet_hours: null,
  contexts: null,
  reduced_motion: false,
  last_used_context: 'personal',
  try_on_history: null,
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // No settings row exists yet - return defaults
        if (error.code === 'PGRST116') {
          return { ...DEFAULT_SETTINGS, user_id: user.id } as Settings
        }
        throw error
      }

      return data as Settings
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: SettingsUpdate) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await (supabase
        .from('settings') as any)
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single()

      if (error) throw error
      return data as Settings
    },
    onMutate: async (updates) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['settings'] })

      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<Settings>(['settings'])

      // Optimistically update
      if (previousSettings) {
        queryClient.setQueryData<Settings>(['settings'], {
          ...previousSettings,
          ...updates,
        })
      }

      return { previousSettings }
    },
    onError: (_error, _updates, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

// Convenience hook for getting day boundary
export function useDayBoundary() {
  const { data: settings } = useSettings()
  return settings?.day_boundary_minutes ?? 240
}

// Convenience hook for reduced motion preference
export function useReducedMotion() {
  const { data: settings } = useSettings()
  return settings?.reduced_motion ?? false
}
