import { supabase } from '../lib/supabase'
import type { Database, Json } from '../types/database'
import type { Appearance } from '../game/avatar/types'
import { correctAppearance } from '../game/avatar/validateAppearance'

// Phase 1-2 types
type Task = Database['public']['Tables']['tasks']['Row']
type Subtask = Database['public']['Tables']['subtasks']['Row']
type Completion = Database['public']['Tables']['completions']['Row']
type CoinLedgerEntry = Database['public']['Tables']['coin_ledger']['Row']
type Settings = Database['public']['Tables']['settings']['Row']

// Phase 3 types
type InventoryItem = Database['public']['Tables']['inventory']['Row']
type Placement = Database['public']['Tables']['placements']['Row']
type RoomFinish = Database['public']['Tables']['room_finishes']['Row']
type MysteryOpening = Database['public']['Tables']['mystery_openings']['Row']
type FocusSession = Database['public']['Tables']['focus_sessions']['Row']
type HouseRepair = Database['public']['Tables']['house_repairs']['Row']
type HouseState = Database['public']['Tables']['house_state']['Row']

// Phase 4 types
type AvatarRow = Database['public']['Tables']['avatar']['Row']
type OutfitRow = Database['public']['Tables']['outfits']['Row']

// Current export version
const EXPORT_VERSION = 3

// Version 1 data (Phase 1-2)
interface ExportDataV1 {
  version: 1
  exportedAt: string
  tasks: Omit<Task, 'user_id'>[]
  subtasks: Subtask[]
  completions: Omit<Completion, 'user_id'>[]
  coinLedger: Omit<CoinLedgerEntry, 'user_id'>[]
  settings: Omit<Settings, 'user_id'> | null
}

// Version 2 data (Phase 3 additions)
interface ExportDataV2 {
  version: 2
  exportedAt: string
  // Phase 1-2 data
  tasks: Omit<Task, 'user_id'>[]
  subtasks: Subtask[]
  completions: Omit<Completion, 'user_id'>[]
  coinLedger: Omit<CoinLedgerEntry, 'user_id'>[]
  settings: Omit<Settings, 'user_id'> | null
  // Phase 3 data
  inventory: Omit<InventoryItem, 'user_id'>[]
  placements: Omit<Placement, 'user_id'>[]
  roomFinishes: Omit<RoomFinish, 'user_id'>[]
  mysteryOpenings: Omit<MysteryOpening, 'user_id'>[]
  focusSessions: Omit<FocusSession, 'user_id'>[]
  houseRepairs: Omit<HouseRepair, 'user_id'>[]
  houseState: Omit<HouseState, 'user_id'> | null
}

// Version 3 data (Phase 4 additions)
interface ExportDataV3 {
  version: 3
  exportedAt: string
  // Phase 1-2 data
  tasks: Omit<Task, 'user_id'>[]
  subtasks: Subtask[]
  completions: Omit<Completion, 'user_id'>[]
  coinLedger: Omit<CoinLedgerEntry, 'user_id'>[]
  settings: Omit<Settings, 'user_id'> | null
  // Phase 3 data
  inventory: Omit<InventoryItem, 'user_id'>[]
  placements: Omit<Placement, 'user_id'>[]
  roomFinishes: Omit<RoomFinish, 'user_id'>[]
  mysteryOpenings: Omit<MysteryOpening, 'user_id'>[]
  focusSessions: Omit<FocusSession, 'user_id'>[]
  houseRepairs: Omit<HouseRepair, 'user_id'>[]
  houseState: Omit<HouseState, 'user_id'> | null
  // Phase 4 data
  avatar: Omit<AvatarRow, 'user_id'> | null
  outfits: Omit<OutfitRow, 'user_id'>[]
}

export type ExportData = ExportDataV1 | ExportDataV2 | ExportDataV3

export async function exportUserData(): Promise<ExportDataV3> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch all user data in parallel
  const [
    tasksRes,
    completionsRes,
    ledgerRes,
    inventoryRes,
    placementsRes,
    roomFinishesRes,
    mysteryOpeningsRes,
    focusSessionsRes,
    houseRepairsRes,
    outfitsRes,
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', user.id),
    supabase.from('completions').select('*').eq('user_id', user.id),
    supabase.from('coin_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('inventory').select('*').eq('user_id', user.id),
    supabase.from('placements').select('*').eq('user_id', user.id),
    supabase.from('room_finishes').select('*').eq('user_id', user.id),
    supabase.from('mystery_openings').select('*').eq('user_id', user.id),
    supabase.from('focus_sessions').select('*').eq('user_id', user.id),
    supabase.from('house_repairs').select('*').eq('user_id', user.id),
    supabase.from('outfits').select('*').eq('user_id', user.id).order('sort_index', { ascending: true }),
  ])

  // Settings, house_state, and avatar fetched separately to handle maybeSingle()
  const [settingsRes, houseStateRes, avatarRes] = await Promise.all([
    supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('house_state').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('avatar').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  // Check for errors
  if (tasksRes.error) throw tasksRes.error
  if (completionsRes.error) throw completionsRes.error
  if (ledgerRes.error) throw ledgerRes.error
  if (inventoryRes.error) throw inventoryRes.error
  if (placementsRes.error) throw placementsRes.error
  if (roomFinishesRes.error) throw roomFinishesRes.error
  if (mysteryOpeningsRes.error) throw mysteryOpeningsRes.error
  if (focusSessionsRes.error) throw focusSessionsRes.error
  if (houseRepairsRes.error) throw houseRepairsRes.error
  if (outfitsRes.error) throw outfitsRes.error

  const tasksData = tasksRes.data as Task[] | null
  const completionsData = completionsRes.data as Completion[] | null
  const ledgerData = ledgerRes.data as CoinLedgerEntry[] | null
  const inventoryData = inventoryRes.data as InventoryItem[] | null
  const placementsData = placementsRes.data as Placement[] | null
  const roomFinishesData = roomFinishesRes.data as RoomFinish[] | null
  const mysteryOpeningsData = mysteryOpeningsRes.data as MysteryOpening[] | null
  const focusSessionsData = focusSessionsRes.data as FocusSession[] | null
  const houseRepairsData = houseRepairsRes.data as HouseRepair[] | null
  const outfitsData = outfitsRes.data as OutfitRow[] | null

  // Get task IDs to fetch subtasks
  const taskIds = (tasksData || []).map(t => t.id)

  // Fetch subtasks for all tasks
  let subtasksData: Subtask[] = []
  if (taskIds.length > 0) {
    const subtasksRes = await supabase.from('subtasks').select('*').in('task_id', taskIds)
    subtasksData = (subtasksRes.data as Subtask[] | null) || []
  }

  // Strip user_id from exported data (will be replaced on import)
  const tasks = (tasksData || []).map((task) => {
    const { user_id, ...rest } = task
    return rest
  })

  const completions = (completionsData || []).map((completion) => {
    const { user_id, ...rest } = completion
    return rest
  })

  const coinLedger = (ledgerData || []).map((entry) => {
    const { user_id, ...rest } = entry
    return rest
  })

  const inventory = (inventoryData || []).map((item) => {
    const { user_id, ...rest } = item
    return rest
  })

  const placements = (placementsData || []).map((placement) => {
    const { user_id, ...rest } = placement
    return rest
  })

  const roomFinishes = (roomFinishesData || []).map((finish) => {
    const { user_id, ...rest } = finish
    return rest
  })

  const mysteryOpenings = (mysteryOpeningsData || []).map((opening) => {
    const { user_id, ...rest } = opening
    return rest
  })

  const focusSessions = (focusSessionsData || []).map((session) => {
    const { user_id, ...rest } = session
    return rest
  })

  const houseRepairs = (houseRepairsData || []).map((repair) => {
    const { user_id, ...rest } = repair
    return rest
  })

  let settings: Omit<Settings, 'user_id'> | null = null
  if (settingsRes.data) {
    const settingsData = settingsRes.data as Settings
    const { user_id, ...rest } = settingsData
    settings = rest
  }

  let houseState: Omit<HouseState, 'user_id'> | null = null
  if (houseStateRes.data) {
    const stateData = houseStateRes.data as HouseState
    const { user_id, ...rest } = stateData
    houseState = rest
  }

  // Phase 4: Avatar
  let avatar: Omit<AvatarRow, 'user_id'> | null = null
  if (avatarRes.data) {
    const avatarData = avatarRes.data as AvatarRow
    const { user_id, ...rest } = avatarData
    avatar = rest
  }

  // Phase 4: Outfits
  const outfits = (outfitsData || []).map((outfit) => {
    const { user_id, ...rest } = outfit
    return rest
  })

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    subtasks: subtasksData,
    completions,
    coinLedger,
    settings,
    inventory,
    placements,
    roomFinishes,
    mysteryOpenings,
    focusSessions,
    houseRepairs,
    houseState,
    avatar,
    outfits,
  }
}

export function downloadExportData(data: ExportData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date().toISOString().split('T')[0]
  const filename = `homestead-backup-${date}.json`

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface ImportResult {
  tasks: number
  subtasks: number
  completions: number
  coinLedger: number
  settings: boolean
  // Phase 3 counts
  inventory: number
  placements: number
  roomFinishes: number
  mysteryOpenings: number
  focusSessions: number
  houseRepairs: number
  houseState: boolean
  // Phase 4 counts
  avatar: boolean
  outfits: number
  outfitsSkipped: number // Count of outfits skipped due to invalid items
}

export async function importUserData(data: ExportData): Promise<ImportResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Validate version
  if (!data.version || (data.version !== 1 && data.version !== 2 && data.version !== 3)) {
    throw new Error('Invalid export file version')
  }

  const result: ImportResult = {
    tasks: 0,
    subtasks: 0,
    completions: 0,
    coinLedger: 0,
    settings: false,
    inventory: 0,
    placements: 0,
    roomFinishes: 0,
    mysteryOpenings: 0,
    focusSessions: 0,
    houseRepairs: 0,
    houseState: false,
    avatar: false,
    outfits: 0,
    outfitsSkipped: 0,
  }

  // Create ID mappings
  const taskIdMap = new Map<string, string>()
  const inventoryIdMap = new Map<string, string>()
  const placementIdMap = new Map<string, string>()

  // Import tasks first (needed for task_id remapping)
  if (data.tasks && data.tasks.length > 0) {
    for (const task of data.tasks) {
      const oldId = task.id
      const newId = crypto.randomUUID()
      taskIdMap.set(oldId, newId)

      const { error } = await (supabase.from('tasks') as any).upsert({
        ...task,
        id: newId,
        user_id: user.id,
      }, {
        onConflict: 'id',
      })

      if (!error) result.tasks++
    }
  }

  // Import subtasks (with remapped task_id)
  if (data.subtasks && data.subtasks.length > 0) {
    for (const subtask of data.subtasks) {
      const newTaskId = taskIdMap.get(subtask.task_id)
      if (!newTaskId) continue // Skip orphaned subtasks

      const { error } = await (supabase.from('subtasks') as any).upsert({
        ...subtask,
        id: crypto.randomUUID(),
        task_id: newTaskId,
      }, {
        onConflict: 'id',
      })

      if (!error) result.subtasks++
    }
  }

  // Import completions (with remapped task_id)
  if (data.completions && data.completions.length > 0) {
    for (const completion of data.completions) {
      const newTaskId = taskIdMap.get(completion.task_id)
      if (!newTaskId) continue // Skip orphaned completions

      const { error } = await (supabase.from('completions') as any).upsert({
        ...completion,
        id: crypto.randomUUID(),
        task_id: newTaskId,
        user_id: user.id,
      }, {
        onConflict: 'id',
      })

      if (!error) result.completions++
    }
  }

  // Import coin ledger (with remapped ref_id for task references)
  if (data.coinLedger && data.coinLedger.length > 0) {
    for (const entry of data.coinLedger) {
      let newRefId = entry.ref_id
      if (entry.ref_type === 'task' && entry.ref_id) {
        newRefId = taskIdMap.get(entry.ref_id) || entry.ref_id
      }
      // Note: inventory refs will be remapped after inventory import if needed

      const { error } = await (supabase.from('coin_ledger') as any).insert({
        ...entry,
        id: crypto.randomUUID(),
        ref_id: newRefId,
        user_id: user.id,
      })

      if (!error) result.coinLedger++
    }
  }

  // Import settings
  if (data.settings) {
    const { error } = await (supabase.from('settings') as any).upsert({
      ...data.settings,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

    if (!error) result.settings = true
  }

  // Phase 3 data (only if version 2 or 3)
  if (data.version === 2 || data.version === 3) {
    const v2Data = data as ExportDataV2 | ExportDataV3

    // Import inventory (needed for placements and mystery_openings remapping)
    if (v2Data.inventory && v2Data.inventory.length > 0) {
      for (const item of v2Data.inventory) {
        const oldId = item.id
        const newId = crypto.randomUUID()
        inventoryIdMap.set(oldId, newId)

        // Remap ledger_id if it references a coin ledger entry
        // Note: ledger_id references don't need remapping as they're for audit only

        const { error } = await (supabase.from('inventory') as any).insert({
          ...item,
          id: newId,
          user_id: user.id,
        })

        if (!error) result.inventory++
      }
    }

    // Import placements (with remapped inventory_id and parent_placement_id)
    if (v2Data.placements && v2Data.placements.length > 0) {
      // First pass: create all placements with remapped inventory_id
      for (const placement of v2Data.placements) {
        const newInventoryId = inventoryIdMap.get(placement.inventory_id)
        if (!newInventoryId) continue // Skip if inventory item not found

        const oldId = placement.id
        const newId = crypto.randomUUID()
        placementIdMap.set(oldId, newId)

        const { error } = await (supabase.from('placements') as any).insert({
          ...placement,
          id: newId,
          inventory_id: newInventoryId,
          parent_placement_id: null, // Will be updated in second pass
          user_id: user.id,
        })

        if (!error) result.placements++
      }

      // Second pass: update parent_placement_id references
      for (const placement of v2Data.placements) {
        if (!placement.parent_placement_id) continue

        const newPlacementId = placementIdMap.get(placement.id)
        const newParentId = placementIdMap.get(placement.parent_placement_id)
        if (!newPlacementId || !newParentId) continue

        await (supabase.from('placements') as any)
          .update({ parent_placement_id: newParentId })
          .eq('id', newPlacementId)
      }
    }

    // Import room finishes (item_id references catalog, not inventory - no remapping needed)
    if (v2Data.roomFinishes && v2Data.roomFinishes.length > 0) {
      for (const finish of v2Data.roomFinishes) {
        const { error } = await (supabase.from('room_finishes') as any).upsert({
          ...finish,
          user_id: user.id,
        }, {
          onConflict: 'user_id,view',
        })

        if (!error) result.roomFinishes++
      }
    }

    // Import mystery openings (with remapped inventory_id)
    if (v2Data.mysteryOpenings && v2Data.mysteryOpenings.length > 0) {
      for (const opening of v2Data.mysteryOpenings) {
        const newInventoryId = inventoryIdMap.get(opening.inventory_id)
        if (!newInventoryId) continue // Skip if inventory item not found

        const { error } = await (supabase.from('mystery_openings') as any).upsert({
          ...opening,
          inventory_id: newInventoryId,
          user_id: user.id,
        }, {
          onConflict: 'user_id,day_key',
        })

        if (!error) result.mysteryOpenings++
      }
    }

    // Import focus sessions (with remapped task_id if linked)
    if (v2Data.focusSessions && v2Data.focusSessions.length > 0) {
      for (const session of v2Data.focusSessions) {
        let newTaskId = session.task_id
        if (session.task_id) {
          newTaskId = taskIdMap.get(session.task_id) || null
        }

        const { error } = await (supabase.from('focus_sessions') as any).insert({
          ...session,
          id: crypto.randomUUID(),
          task_id: newTaskId,
          user_id: user.id,
        })

        if (!error) result.focusSessions++
      }
    }

    // Import house repairs
    if (v2Data.houseRepairs && v2Data.houseRepairs.length > 0) {
      for (const repair of v2Data.houseRepairs) {
        const { error } = await (supabase.from('house_repairs') as any).upsert({
          ...repair,
          user_id: user.id,
        }, {
          onConflict: 'user_id,repair_id',
        })

        if (!error) result.houseRepairs++
      }
    }

    // Import house state
    if (v2Data.houseState) {
      const { error } = await (supabase.from('house_state') as any).upsert({
        ...v2Data.houseState,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

      if (!error) result.houseState = true
    }
  }

  // Phase 4 data (only if version 3)
  if (data.version === 3) {
    const v3Data = data as ExportDataV3

    // Build the set of owned item IDs from imported inventory
    // This includes catalog item IDs (item_id field) that the user owns
    const ownedItemIds = new Set<string>()
    if (v3Data.inventory) {
      for (const item of v3Data.inventory) {
        ownedItemIds.add(item.item_id)
      }
    }

    // Import avatar
    if (v3Data.avatar) {
      // Correct the appearance in case some items are no longer owned
      const appearanceJson = v3Data.avatar.appearance_json as unknown as Appearance
      const correctedAppearance = correctAppearance(appearanceJson, ownedItemIds)

      const { error } = await (supabase.from('avatar') as any).upsert({
        user_id: user.id,
        appearance_json: correctedAppearance as unknown as Json,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

      if (!error) result.avatar = true
    }

    // Import outfits
    if (v3Data.outfits && v3Data.outfits.length > 0) {
      for (const outfit of v3Data.outfits) {
        const appearanceJson = outfit.appearance_json as unknown as Appearance

        // Validate the outfit's appearance - skip entirely invalid outfits
        const correctedAppearance = correctAppearance(appearanceJson, ownedItemIds)

        // Check if the outfit was significantly changed (indicates major issues)
        // We'll import it anyway with corrections, but count it
        const wasModified =
          correctedAppearance.top !== appearanceJson.top ||
          correctedAppearance.bottom !== appearanceJson.bottom ||
          correctedAppearance.shoes !== appearanceJson.shoes ||
          correctedAppearance.accessory !== appearanceJson.accessory ||
          correctedAppearance.hair.styleId !== appearanceJson.hair?.styleId

        if (wasModified) {
          result.outfitsSkipped++ // Count as modified (not actually skipped, but corrected)
        }

        const { error } = await (supabase.from('outfits') as any).insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          name: outfit.name,
          appearance_json: correctedAppearance as unknown as Json,
          sort_index: outfit.sort_index,
          created_at: outfit.created_at,
        })

        if (!error) result.outfits++
      }
    }
  }

  return result
}

export function validateImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const data = JSON.parse(text)

        // Basic validation
        if (typeof data !== 'object' || data === null) {
          throw new Error('Invalid file format')
        }

        // Accept version 1, 2, or 3
        if (data.version !== 1 && data.version !== 2 && data.version !== 3) {
          throw new Error('Unsupported file version')
        }

        if (!Array.isArray(data.tasks)) {
          throw new Error('Invalid file: missing tasks array')
        }

        // Version 2+ specific validation
        if (data.version === 2 || data.version === 3) {
          if (!Array.isArray(data.inventory)) {
            throw new Error('Invalid file: missing inventory array')
          }
          if (!Array.isArray(data.placements)) {
            throw new Error('Invalid file: missing placements array')
          }
        }

        // Version 3 specific validation
        if (data.version === 3) {
          if (!Array.isArray(data.outfits)) {
            throw new Error('Invalid file: missing outfits array')
          }
        }

        resolve(data as ExportData)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse file'))
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
