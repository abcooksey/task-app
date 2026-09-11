import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getAppDay } from '@/lib/time'
import type { CatalogItem, InventoryItem } from '@/types/database'
import { getCurrentRotation, isSeasonalActive } from '@/lib/rotation'
import calendarData from '@/game/content/calendar.json'

interface StoreData {
  catalog: CatalogItem[]
  inventory: InventoryItem[]
  canOpenMysteryBox: boolean
  hasClaimedStarterKit: boolean
  rotationItems: string[]
  rotationWeek: number
  rotationYear: number
  nextRefresh: Date
  activeSeasons: string[]
}

async function fetchStoreData(): Promise<StoreData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch catalog and inventory in parallel
  const [catalogResult, inventoryResult, mysteryResult] = await Promise.all([
    supabase.from('catalog_items').select('*'),
    supabase.from('inventory').select('*').eq('user_id', user.id),
    supabase
      .from('mystery_openings')
      .select('id')
      .eq('user_id', user.id)
      .eq('day_key', getAppDay())
      .single(),
  ])

  if (catalogResult.error) {
    console.warn('catalog query failed:', catalogResult.error.message)
  }
  if (inventoryResult.error) {
    console.warn('inventory query failed:', inventoryResult.error.message)
  }

  const catalog = (catalogResult.data as CatalogItem[]) ?? []
  const inventory = (inventoryResult.data as InventoryItem[]) ?? []

  // Mystery box: can open if no record for today
  const canOpenMysteryBox = mysteryResult.error?.code === 'PGRST116' || !mysteryResult.data

  // Check if starter kit has been claimed (any item with source='starter')
  const hasClaimedStarterKit = inventory.some(item => item.source === 'starter')

  // Get rotation items
  const rotationPool = catalog.filter(
    item => (item.availability as { kind: string })?.kind === 'rotation'
  )
  const { items: rotationItems, week, year, nextRefresh } = getCurrentRotation(rotationPool)

  // Get active seasons
  const now = new Date()
  const activeSeasons = calendarData.seasonal
    .filter(season => {
      const [startMonth, startDay] = season.from.split('-').map(Number)
      const [endMonth, endDay] = season.to.split('-').map(Number)
      return isSeasonalActive(startMonth, startDay, endMonth, endDay, now)
    })
    .map(season => season.id)

  return {
    catalog,
    inventory,
    canOpenMysteryBox,
    hasClaimedStarterKit,
    rotationItems,
    rotationWeek: week,
    rotationYear: year,
    nextRefresh,
    activeSeasons,
  }
}

export function useStore() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['store'],
    queryFn: fetchStoreData,
    staleTime: 1000 * 60, // 1 minute
  })

  // Buy item mutation
  const buyMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const clientRequestId = `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2)}`

      // @ts-expect-error - RPC function types not fully integrated with supabase client
      const { data, error } = await supabase.rpc('buy_item', {
        p_item_id: itemId,
        p_client_request_id: clientRequestId,
      }) as {
        data: { success: boolean; inventory_id: string; new_balance: number }[] | null
        error: { code?: string; message: string } | null
      }

      if (error) {
        if (error.code === 'P0001' || error.message.includes('Insufficient balance')) {
          throw new Error('Not enough coins')
        }
        throw new Error(error.message)
      }

      const row = data?.[0]
      if (!row) throw new Error('No result from buy_item')
      return { inventory_id: row.inventory_id, new_balance: row.new_balance }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] })
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] })
    },
  })

  // Open mystery box mutation
  const mysteryBoxMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('open_mystery_box') as {
        data: { item_id: string; inventory_id: string; new_balance: number }[] | null
        error: { code?: string; message: string } | null
      }

      if (error) {
        if (error.message.includes('already opened')) {
          throw new Error('Already opened today')
        }
        throw new Error(error.message)
      }

      const row = data?.[0]
      if (!row) throw new Error('No result from open_mystery_box')
      return { item_id: row.item_id, inventory_id: row.inventory_id, new_balance: row.new_balance }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] })
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] })
    },
  })

  // Claim starter kit mutation
  const starterKitMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('claim_starter_kit') as {
        data: { items: string[]; already_claimed: boolean }[] | null
        error: { message: string } | null
      }

      if (error) throw new Error(error.message)

      const row = data?.[0]
      if (!row) throw new Error('No result from claim_starter_kit')
      return { items: row.items, already_claimed: row.already_claimed }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] })
    },
  })

  // Helper to get owned count for an item
  const getOwnedCount = (itemId: string): number => {
    if (!data?.inventory) return 0
    return data.inventory.filter(inv => inv.item_id === itemId).length
  }

  // Helper to check if item is owned
  const isOwned = (itemId: string): boolean => {
    return getOwnedCount(itemId) > 0
  }

  // Wearable categories for filtering
  const WEARABLE_CATEGORIES = ['clothing_top', 'clothing_bottom', 'clothing_shoes', 'accessory', 'hair']

  // Check if an item is a wearable
  const isWearable = (item: CatalogItem): boolean => {
    return WEARABLE_CATEGORIES.includes(item.category)
  }

  // Categorize items for display
  const categorizedItems = () => {
    if (!data?.catalog) return { rotation: [], seasonal: [], always: [], wearables: [] }

    const catalogMap = new Map(data.catalog.map(item => [item.id, item]))

    // Rotation items (current week) - split into decor and wearables
    const rotationAll = data.rotationItems
      .map(id => catalogMap.get(id))
      .filter((item): item is CatalogItem => item !== undefined)

    const rotation = rotationAll.filter(item => !isWearable(item))
    const rotationWearables = rotationAll.filter(item => isWearable(item))

    // Seasonal items (currently active) - split into decor and wearables
    const seasonalItemIds = new Set<string>()
    for (const season of calendarData.seasonal) {
      if (data.activeSeasons.includes(season.id)) {
        for (const itemId of season.items) {
          seasonalItemIds.add(itemId)
        }
        // Also add seasonal wearables
        if ('wearables' in season) {
          for (const itemId of (season as { wearables?: string[] }).wearables || []) {
            seasonalItemIds.add(itemId)
          }
        }
      }
    }
    const seasonalAll = data.catalog.filter(item => seasonalItemIds.has(item.id))
    const seasonal = seasonalAll.filter(item => !isWearable(item))
    const seasonalWearables = seasonalAll.filter(item => isWearable(item))

    // Always available items - split into decor and wearables
    const alwaysAll = data.catalog.filter(
      item => (item.availability as { kind: string })?.kind === 'always'
    )
    const always = alwaysAll.filter(item => !isWearable(item))
    const alwaysWearables = alwaysAll.filter(item => isWearable(item))

    // Combined wearables list (rotation first, then seasonal, then always)
    const wearables = [...rotationWearables, ...seasonalWearables, ...alwaysWearables]

    return { rotation, seasonal, always, wearables, rotationWearables, seasonalWearables, alwaysWearables }
  }

  return {
    catalog: data?.catalog ?? [],
    inventory: data?.inventory ?? [],
    canOpenMysteryBox: data?.canOpenMysteryBox ?? false,
    hasClaimedStarterKit: data?.hasClaimedStarterKit ?? false,
    rotationItems: data?.rotationItems ?? [],
    rotationWeek: data?.rotationWeek ?? 0,
    rotationYear: data?.rotationYear ?? 0,
    nextRefresh: data?.nextRefresh ?? new Date(),
    activeSeasons: data?.activeSeasons ?? [],
    isLoading,
    error,
    buyItem: buyMutation.mutateAsync,
    isBuying: buyMutation.isPending,
    buyError: buyMutation.error,
    openMysteryBox: mysteryBoxMutation.mutateAsync,
    isOpeningMysteryBox: mysteryBoxMutation.isPending,
    claimStarterKit: starterKitMutation.mutateAsync,
    getOwnedCount,
    isOwned,
    categorizedItems,
  }
}
