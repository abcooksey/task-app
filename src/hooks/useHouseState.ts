import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { deriveHouseState, type HouseState } from '@/lib/houseState'

interface HouseData {
  repairIds: string[]
  lastView: 'interior' | 'exterior'
  sfxEnabled: boolean
  firstRepairDone: boolean
}

interface DerivedHouseData {
  state: HouseState
  lastView: 'interior' | 'exterior'
  sfxEnabled: boolean
}

// RPC response types
interface GetHouseDataRow {
  repair_ids: string[]
  last_view: string
  sfx_enabled: boolean
  first_repair_done: boolean
}

async function fetchHouseData(): Promise<HouseData> {
  const { data, error } = await supabase.rpc('get_house_data') as {
    data: GetHouseDataRow[] | null
    error: Error | null
  }

  if (error) {
    // Table may not exist yet or user has no data - return defaults
    console.warn('get_house_data failed:', error.message)
    return {
      repairIds: [],
      lastView: 'interior',
      sfxEnabled: false,
      firstRepairDone: false,
    }
  }

  // RPC returns an array with one row
  const row = data?.[0] ?? {
    repair_ids: [],
    last_view: 'interior',
    sfx_enabled: false,
    first_repair_done: false,
  }

  return {
    repairIds: row.repair_ids ?? [],
    lastView: (row.last_view as 'interior' | 'exterior') ?? 'interior',
    sfxEnabled: row.sfx_enabled ?? false,
    firstRepairDone: row.first_repair_done ?? false,
  }
}

async function updateHousePrefs(
  lastView?: 'interior' | 'exterior',
  sfxEnabled?: boolean
): Promise<void> {
  // @ts-expect-error - RPC function types not in generated schema yet
  const { error } = await supabase.rpc('update_house_state', {
    p_last_view: lastView ?? null,
    p_sfx_enabled: sfxEnabled ?? null,
  })

  if (error) {
    throw new Error(`Failed to update house state: ${error.message}`)
  }
}

export function useHouseState() {
  const queryClient = useQueryClient()

  const { data: houseData, isLoading, error } = useQuery({
    queryKey: ['houseData'],
    queryFn: fetchHouseData,
    staleTime: 1000 * 30, // 30 seconds
  })

  // Derive state from fetched data
  const derivedData: DerivedHouseData | null = houseData
    ? {
        state: deriveHouseState(houseData.repairIds, houseData.firstRepairDone),
        lastView: houseData.lastView,
        sfxEnabled: houseData.sfxEnabled,
      }
    : null

  // Mutation for updating preferences
  const updatePrefsMutation = useMutation({
    mutationFn: ({
      lastView,
      sfxEnabled,
    }: {
      lastView?: 'interior' | 'exterior'
      sfxEnabled?: boolean
    }) => updateHousePrefs(lastView, sfxEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['houseData'] })
    },
  })

  return {
    state: derivedData?.state ?? null,
    lastView: derivedData?.lastView ?? 'interior',
    sfxEnabled: derivedData?.sfxEnabled ?? false,
    isLoading,
    error,
    updatePrefs: updatePrefsMutation.mutate,
    isUpdating: updatePrefsMutation.isPending,
  }
}

/**
 * Invalidate house data - call this after repairs to refresh state.
 */
export function useInvalidateHouseState() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['houseData'] })
    queryClient.invalidateQueries({ queryKey: ['coinBalance'] })
  }
}
