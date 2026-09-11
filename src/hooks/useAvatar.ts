/**
 * Avatar data fetching and mutations hook.
 *
 * Provides:
 * - Current appearance from database
 * - Saved outfits
 * - Free appearance options
 * - Owned wearables
 * - Mutations for saving appearance/outfits
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Appearance, Outfit } from '@/game/avatar/types'
import type { Json } from '@/types/database'
import { FREE_APPEARANCE_OPTIONS, DEFAULT_APPEARANCE } from '@/game/avatar/constants'

// =============================================================================
// Types
// =============================================================================

interface AvatarData {
  /** Current appearance (null if not initialized) */
  appearance: Appearance | null
  /** Saved outfits */
  outfits: Outfit[]
  /** Free options from database (fallback to constants if unavailable) */
  freeOptions: typeof FREE_APPEARANCE_OPTIONS
  /** Owned wearable item IDs */
  ownedWearables: string[]
  /** Whether avatar has been initialized */
  isInitialized: boolean
}

interface OutfitRow {
  id: string
  user_id: string
  name: string
  appearance_json: Json
  sort_index: number
  created_at: string
}

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchAvatarData(): Promise<AvatarData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Use the RPC function to get all data in one call
  const { data, error } = await supabase.rpc('get_avatar_data') as {
    data: {
      avatar_json: Json
      outfits_json: Json
      free_options_json: Json
      owned_wearables_json: Json
    }[] | null
    error: { message: string } | null
  }

  if (error) {
    // If RPC doesn't exist yet (migration not run), fall back to constants
    console.warn('get_avatar_data RPC failed, using defaults:', error.message)
    return {
      appearance: null,
      outfits: [],
      freeOptions: FREE_APPEARANCE_OPTIONS,
      ownedWearables: [],
      isInitialized: false,
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      appearance: null,
      outfits: [],
      freeOptions: FREE_APPEARANCE_OPTIONS,
      ownedWearables: [],
      isInitialized: false,
    }
  }

  // Parse avatar appearance
  const avatarRow = result.avatar_json as { appearance_json?: Json } | null
  const appearance = avatarRow?.appearance_json
    ? (avatarRow.appearance_json as unknown as Appearance)
    : null

  // Parse outfits
  const outfitsArray = (result.outfits_json as OutfitRow[] | null) ?? []
  const outfits: Outfit[] = outfitsArray.map(row => ({
    id: row.id,
    name: row.name,
    appearance: row.appearance_json as unknown as Appearance,
    sortIndex: row.sort_index,
    createdAt: row.created_at,
  }))

  // Parse owned wearables
  const ownedWearables = (result.owned_wearables_json as string[] | null) ?? []

  return {
    appearance,
    outfits,
    freeOptions: FREE_APPEARANCE_OPTIONS, // Use constants, DB is just for validation
    ownedWearables,
    isInitialized: appearance !== null,
  }
}

// =============================================================================
// Hook
// =============================================================================

export function useAvatar() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['avatar'],
    queryFn: fetchAvatarData,
    staleTime: 1000 * 60, // 1 minute
  })

  // Initialize avatar mutation (creates default appearance)
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('initialize_avatar') as {
        data: { appearance_json: Json } | null
        error: { message: string } | null
      }

      if (error) throw new Error(error.message)
      return data?.appearance_json as unknown as Appearance
    },
    onSuccess: (appearance) => {
      // Optimistically update the cache
      queryClient.setQueryData(['avatar'], (old: AvatarData | undefined) => ({
        ...old,
        appearance,
        isInitialized: true,
      }))
    },
  })

  // Save appearance mutation
  const saveAppearanceMutation = useMutation({
    mutationFn: async (appearance: Appearance) => {
      // @ts-expect-error - RPC function types not fully integrated
      const { data, error } = await supabase.rpc('save_avatar', {
        p_appearance_json: appearance as unknown as Json,
      }) as {
        data: { appearance_json: Json } | null
        error: { message: string } | null
      }

      if (error) throw new Error(error.message)
      return data?.appearance_json as unknown as Appearance
    },
    onMutate: async (newAppearance) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['avatar'] })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AvatarData>(['avatar'])

      // Optimistically update
      queryClient.setQueryData(['avatar'], (old: AvatarData | undefined) => ({
        ...old,
        appearance: newAppearance,
        isInitialized: true,
      }))

      return { previousData }
    },
    onError: (_err, _newAppearance, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['avatar'], context.previousData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar'] })
    },
  })

  // Save outfit mutation
  const saveOutfitMutation = useMutation({
    mutationFn: async ({ name, appearance }: { name: string; appearance: Appearance }) => {
      // @ts-expect-error - RPC function types not fully integrated
      const { data, error } = await supabase.rpc('save_outfit', {
        p_outfit_id: null,
        p_name: name,
        p_appearance_json: appearance as unknown as Json,
      }) as {
        data: OutfitRow | null
        error: { message: string } | null
      }

      if (error) {
        if (error.message.includes('Maximum 12')) {
          throw new Error('Maximum 12 outfits reached')
        }
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar'] })
    },
  })

  // Update outfit mutation
  const updateOutfitMutation = useMutation({
    mutationFn: async ({ id, name, appearance }: { id: string; name: string; appearance: Appearance }) => {
      // @ts-expect-error - RPC function types not fully integrated
      const { data, error } = await supabase.rpc('save_outfit', {
        p_outfit_id: id,
        p_name: name,
        p_appearance_json: appearance as unknown as Json,
      }) as {
        data: OutfitRow | null
        error: { message: string } | null
      }

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar'] })
    },
  })

  // Delete outfit mutation
  const deleteOutfitMutation = useMutation({
    mutationFn: async (outfitId: string) => {
      // @ts-expect-error - RPC function types not fully integrated
      const { error } = await supabase.rpc('delete_outfit', {
        p_outfit_id: outfitId,
      })

      if (error) throw new Error(error.message)
    },
    onMutate: async (outfitId) => {
      await queryClient.cancelQueries({ queryKey: ['avatar'] })

      const previousData = queryClient.getQueryData<AvatarData>(['avatar'])

      // Optimistically remove outfit
      queryClient.setQueryData(['avatar'], (old: AvatarData | undefined) => ({
        ...old,
        outfits: old?.outfits.filter(o => o.id !== outfitId) ?? [],
      }))

      return { previousData }
    },
    onError: (_err, _outfitId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['avatar'], context.previousData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar'] })
    },
  })

  // Helper to check if an item is owned
  const isOwned = (itemId: string): boolean => {
    if (!data) return false
    return data.ownedWearables.includes(itemId)
  }

  // Helper to check if an item is free
  const isFree = (itemId: string): boolean => {
    const free = data?.freeOptions ?? FREE_APPEARANCE_OPTIONS
    return (
      free.skins.includes(itemId) ||
      free.eyeColors.includes(itemId) ||
      free.hairColors.includes(itemId) ||
      free.hairStyles.includes(itemId) ||
      free.starterTops.includes(itemId) ||
      free.starterBottoms.includes(itemId) ||
      free.starterShoes.includes(itemId)
    )
  }

  // Helper to check if an item can be equipped
  const canEquip = (itemId: string): boolean => {
    return isFree(itemId) || isOwned(itemId)
  }

  return {
    // Data
    appearance: data?.appearance ?? null,
    outfits: data?.outfits ?? [],
    freeOptions: data?.freeOptions ?? FREE_APPEARANCE_OPTIONS,
    ownedWearables: data?.ownedWearables ?? [],
    isInitialized: data?.isInitialized ?? false,
    isLoading,
    error,

    // Default for fallback
    defaultAppearance: DEFAULT_APPEARANCE,

    // Mutations
    initializeAvatar: initializeMutation.mutateAsync,
    isInitializing: initializeMutation.isPending,

    saveAppearance: saveAppearanceMutation.mutateAsync,
    isSaving: saveAppearanceMutation.isPending,
    saveError: saveAppearanceMutation.error,

    saveOutfit: saveOutfitMutation.mutateAsync,
    isSavingOutfit: saveOutfitMutation.isPending,

    updateOutfit: updateOutfitMutation.mutateAsync,
    isUpdatingOutfit: updateOutfitMutation.isPending,

    deleteOutfit: deleteOutfitMutation.mutateAsync,
    isDeletingOutfit: deleteOutfitMutation.isPending,

    // Helpers
    isOwned,
    isFree,
    canEquip,
  }
}
