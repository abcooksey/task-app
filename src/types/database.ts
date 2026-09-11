/**
 * Database types generated from schema
 * This file should match the Supabase schema exactly
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LedgerReason =
  | 'task_completion'
  | 'variable_bonus'
  | 'jackpot_bonus'
  | 'dread_bonus'
  | 'first_of_day_bonus'
  | 'subtask_completion'
  | 'reversal'
  | 'repair'
  | 'repair_refund'
  | 'purchase'
  | 'mystery_box'
  | 'focus'
  | 'focus_bonus'
  | 'starter'

export type ItemCategory =
  | 'furniture'
  | 'decor'
  | 'rug'
  | 'wall_decor'
  | 'surface_decor'
  | 'outdoor'
  | 'wall_finish'
  | 'floor_finish'
  | 'clothing_top'
  | 'clothing_bottom'
  | 'clothing_shoes'
  | 'hair'
  | 'accessory'

export type PlacementType =
  | 'floor'
  | 'rug'
  | 'wall'
  | 'surface'
  | 'outdoor'
  | 'wall_finish'
  | 'floor_finish'
  | 'wearable'

export type ItemRarity = 'common' | 'uncommon' | 'rare'

export type InventorySource = 'purchase' | 'mystery' | 'starter'

export type FocusSessionStatus = 'running' | 'paused' | 'done' | 'stopped'

export type FreeAppearanceCategory =
  | 'skin'
  | 'eyes'
  | 'hair_color'
  | 'hair_style'
  | 'starter_top'
  | 'starter_bottom'
  | 'starter_shoes'

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          context: 'work' | 'personal'
          size: 'tiny' | 'small' | 'medium' | 'large'
          notes: string | null
          due_date: string | null
          due_time: string | null
          recurrence: Json | null
          times_per_day: number
          is_paused: boolean
          defer_count: number
          pinned: boolean
          last_completed_at: string | null
          sort_index: number | null
          is_template: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          context?: 'work' | 'personal'
          size?: 'tiny' | 'small' | 'medium' | 'large'
          notes?: string | null
          due_date?: string | null
          due_time?: string | null
          recurrence?: Json | null
          times_per_day?: number
          is_paused?: boolean
          defer_count?: number
          pinned?: boolean
          last_completed_at?: string | null
          sort_index?: number | null
          is_template?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          context?: 'work' | 'personal'
          size?: 'tiny' | 'small' | 'medium' | 'large'
          notes?: string | null
          due_date?: string | null
          due_time?: string | null
          recurrence?: Json | null
          times_per_day?: number
          is_paused?: boolean
          defer_count?: number
          pinned?: boolean
          last_completed_at?: string | null
          sort_index?: number | null
          is_template?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subtasks: {
        Row: {
          id: string
          task_id: string
          title: string
          sort_index: number
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          sort_index?: number
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          title?: string
          sort_index?: number
          completed_at?: string | null
          created_at?: string
        }
      }
      completions: {
        Row: {
          id: string
          task_id: string
          user_id: string
          occurrence_key: string | null
          completed_at: string
          reversed_at: string | null
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          occurrence_key?: string | null
          completed_at?: string
          reversed_at?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          occurrence_key?: string | null
          completed_at?: string
          reversed_at?: string | null
        }
      }
      coin_ledger: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: LedgerReason
          ref_type: string | null
          ref_id: string | null
          meta: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          reason: LedgerReason
          ref_type?: string | null
          ref_id?: string | null
          meta?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          reason?: LedgerReason
          ref_type?: string | null
          ref_id?: string | null
          meta?: Json | null
          created_at?: string
        }
      }
      day_state: {
        Row: {
          user_id: string
          day_key: string
          low_energy: boolean
          custom_order: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          day_key: string
          low_energy?: boolean
          custom_order?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          day_key?: string
          low_energy?: boolean
          custom_order?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          user_id: string
          day_boundary_minutes: number
          quiet_hours: Json | null
          contexts: Json | null
          reduced_motion: boolean
          last_used_context: 'work' | 'personal'
          try_on_history: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          day_boundary_minutes?: number
          quiet_hours?: Json | null
          contexts?: Json | null
          reduced_motion?: boolean
          last_used_context?: 'work' | 'personal'
          try_on_history?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          day_boundary_minutes?: number
          quiet_hours?: Json | null
          contexts?: Json | null
          reduced_motion?: boolean
          last_used_context?: 'work' | 'personal'
          try_on_history?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      house_repairs: {
        Row: {
          user_id: string
          repair_id: string
          completed_at: string
          ledger_id: string | null
        }
        Insert: {
          user_id: string
          repair_id: string
          completed_at?: string
          ledger_id?: string | null
        }
        Update: {
          user_id?: string
          repair_id?: string
          completed_at?: string
          ledger_id?: string | null
        }
      }
      house_state: {
        Row: {
          user_id: string
          last_view: 'interior' | 'exterior'
          sfx_enabled: boolean
          first_repair_done: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          last_view?: 'interior' | 'exterior'
          sfx_enabled?: boolean
          first_repair_done?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          last_view?: 'interior' | 'exterior'
          sfx_enabled?: boolean
          first_repair_done?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      catalog_items: {
        Row: {
          id: string
          name: string
          blurb: string | null
          category: ItemCategory
          price: number
          placement: PlacementType
          footprint_w: number
          footprint_h: number
          is_surface: boolean
          slots_json: Json | null
          allow_multiple: boolean
          availability: Json
          rarity: ItemRarity
          texture_key: string
          flipped_texture: string | null
          tags: string[]
          version: number
          // Phase 4 wearable columns
          layers_json: Json | null
          hides_hair: boolean
          hides_accessory: boolean
          family: string | null
          frames_json: Json | null
          sit_anchor_json: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          blurb?: string | null
          category: ItemCategory
          price: number
          placement: PlacementType
          footprint_w?: number
          footprint_h?: number
          is_surface?: boolean
          slots_json?: Json | null
          allow_multiple?: boolean
          availability: Json
          rarity?: ItemRarity
          texture_key: string
          flipped_texture?: string | null
          tags?: string[]
          version?: number
          layers_json?: Json | null
          hides_hair?: boolean
          hides_accessory?: boolean
          family?: string | null
          frames_json?: Json | null
          sit_anchor_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          blurb?: string | null
          category?: ItemCategory
          price?: number
          placement?: PlacementType
          footprint_w?: number
          footprint_h?: number
          is_surface?: boolean
          slots_json?: Json | null
          allow_multiple?: boolean
          availability?: Json
          rarity?: ItemRarity
          texture_key?: string
          flipped_texture?: string | null
          tags?: string[]
          version?: number
          layers_json?: Json | null
          hides_hair?: boolean
          hides_accessory?: boolean
          family?: string | null
          frames_json?: Json | null
          sit_anchor_json?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          user_id: string
          item_id: string
          source: InventorySource
          ledger_id: string | null
          acquired_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          source: InventorySource
          ledger_id?: string | null
          acquired_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          source?: InventorySource
          ledger_id?: string | null
          acquired_at?: string
        }
      }
      placements: {
        Row: {
          id: string
          user_id: string
          inventory_id: string
          view: 'interior' | 'exterior'
          region: 'floor' | 'wall' | 'yard'
          x: number
          y: number
          flipped: boolean
          parent_placement_id: string | null
          slot_index: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          inventory_id: string
          view: 'interior' | 'exterior'
          region: 'floor' | 'wall' | 'yard'
          x: number
          y: number
          flipped?: boolean
          parent_placement_id?: string | null
          slot_index?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          inventory_id?: string
          view?: 'interior' | 'exterior'
          region?: 'floor' | 'wall' | 'yard'
          x?: number
          y?: number
          flipped?: boolean
          parent_placement_id?: string | null
          slot_index?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      room_finishes: {
        Row: {
          user_id: string
          view: 'interior' | 'exterior'
          wall_item_id: string | null
          floor_item_id: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          view: 'interior' | 'exterior'
          wall_item_id?: string | null
          floor_item_id?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          view?: 'interior' | 'exterior'
          wall_item_id?: string | null
          floor_item_id?: string | null
          updated_at?: string
        }
      }
      mystery_openings: {
        Row: {
          user_id: string
          day_key: string
          inventory_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          day_key: string
          inventory_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          day_key?: string
          inventory_id?: string
          created_at?: string
        }
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          planned_minutes: number
          started_at: string
          paused_json: Json
          ended_at: string | null
          status: FocusSessionStatus
          chunks_paid: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id?: string | null
          planned_minutes: number
          started_at?: string
          paused_json?: Json
          ended_at?: string | null
          status?: FocusSessionStatus
          chunks_paid?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string | null
          planned_minutes?: number
          started_at?: string
          paused_json?: Json
          ended_at?: string | null
          status?: FocusSessionStatus
          chunks_paid?: number
          created_at?: string
        }
      }
      // Phase 4: Avatar tables
      avatar: {
        Row: {
          user_id: string
          appearance_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          appearance_json: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          appearance_json?: Json
          created_at?: string
          updated_at?: string
        }
      }
      outfits: {
        Row: {
          id: string
          user_id: string
          name: string
          appearance_json: Json
          sort_index: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          appearance_json: Json
          sort_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          appearance_json?: Json
          sort_index?: number
          created_at?: string
        }
      }
      free_appearance_options: {
        Row: {
          id: string
          category: FreeAppearanceCategory
        }
        Insert: {
          id: string
          category: FreeAppearanceCategory
        }
        Update: {
          id?: string
          category?: FreeAppearanceCategory
        }
      }
    }
    Functions: {
      get_house_data: {
        Args: Record<string, never>
        Returns: {
          repair_ids: string[]
          last_view: string
          sfx_enabled: boolean
          first_repair_done: boolean
        }[]
      }
      perform_repair: {
        Args: {
          p_repair_id: string
          p_cost: number
        }
        Returns: {
          success: boolean
          new_balance: number
          already_done: boolean
        }[]
      }
      undo_repair: {
        Args: {
          p_repair_id: string
          p_max_age_seconds?: number
        }
        Returns: {
          success: boolean
          new_balance: number
          reason: string
        }[]
      }
      update_house_state: {
        Args: {
          p_last_view?: string | null
          p_sfx_enabled?: boolean | null
        }
        Returns: {
          user_id: string
          last_view: string
          sfx_enabled: boolean
          first_repair_done: boolean
          created_at: string
          updated_at: string
        }
      }
      buy_item: {
        Args: {
          p_item_id: string
          p_client_request_id: string
        }
        Returns: {
          success: boolean
          inventory_id: string
          new_balance: number
        }[]
      }
      open_mystery_box: {
        Args: {
          p_day_boundary_minutes?: number
        }
        Returns: {
          success: boolean
          item_id: string | null
          inventory_id: string | null
          new_balance: number
          reason: string
        }[]
      }
      claim_starter_kit: {
        Args: Record<string, never>
        Returns: {
          success: boolean
          items_granted: string[]
          already_claimed: boolean
        }[]
      }
      pay_focus_chunk: {
        Args: {
          p_session_id: string
          p_chunk_index: number
        }
        Returns: {
          success: boolean
          new_balance: number
          reason: string
        }[]
      }
      get_store_data: {
        Args: Record<string, never>
        Returns: {
          inventory_json: Json
          placements_json: Json
          finishes_json: Json
          mystery_opened_today: boolean
        }[]
      }
      save_placement: {
        Args: {
          p_inventory_id: string
          p_view: string
          p_region: string
          p_x: number
          p_y: number
          p_flipped?: boolean
          p_parent_placement_id?: string | null
          p_slot_index?: number | null
        }
        Returns: {
          id: string
          user_id: string
          inventory_id: string
          view: string
          region: string
          x: number
          y: number
          flipped: boolean
          parent_placement_id: string | null
          slot_index: number | null
          created_at: string
          updated_at: string
        }
      }
      remove_placement: {
        Args: {
          p_placement_id: string
        }
        Returns: boolean
      }
      apply_finish: {
        Args: {
          p_view: string
          p_wall_item_id?: string | null
          p_floor_item_id?: string | null
        }
        Returns: {
          user_id: string
          view: string
          wall_item_id: string | null
          floor_item_id: string | null
          updated_at: string
        }
      }
      create_focus_session: {
        Args: {
          p_planned_minutes: number
          p_task_id?: string | null
        }
        Returns: {
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
      }
      update_focus_session: {
        Args: {
          p_session_id: string
          p_action: string
        }
        Returns: {
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
      }
      get_running_focus_session: {
        Args: Record<string, never>
        Returns: {
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
        } | null
      }
      // Phase 4: Avatar functions
      save_avatar: {
        Args: {
          p_appearance_json: Json
        }
        Returns: {
          user_id: string
          appearance_json: Json
          created_at: string
          updated_at: string
        }
      }
      get_avatar: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          appearance_json: Json
          created_at: string
          updated_at: string
        } | null
      }
      initialize_avatar: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          appearance_json: Json
          created_at: string
          updated_at: string
        }
      }
      save_outfit: {
        Args: {
          p_outfit_id: string | null
          p_name: string
          p_appearance_json: Json
        }
        Returns: {
          id: string
          user_id: string
          name: string
          appearance_json: Json
          sort_index: number
          created_at: string
        }
      }
      delete_outfit: {
        Args: {
          p_outfit_id: string
        }
        Returns: boolean
      }
      get_outfits: {
        Args: Record<string, never>
        Returns: {
          id: string
          user_id: string
          name: string
          appearance_json: Json
          sort_index: number
          created_at: string
        }[]
      }
      reorder_outfits: {
        Args: {
          p_outfit_ids: string[]
        }
        Returns: boolean
      }
      get_avatar_data: {
        Args: Record<string, never>
        Returns: {
          avatar_json: Json
          outfits_json: Json
          free_options_json: Json
          owned_wearables_json: Json
        }[]
      }
    }
  }
}

// Convenience types
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type Subtask = Database['public']['Tables']['subtasks']['Row']
export type Completion = Database['public']['Tables']['completions']['Row']
export type CoinLedgerEntry = Database['public']['Tables']['coin_ledger']['Row']
export type DayState = Database['public']['Tables']['day_state']['Row']
export type Settings = Database['public']['Tables']['settings']['Row']
export type HouseRepair = Database['public']['Tables']['house_repairs']['Row']
export type HouseStateRow = Database['public']['Tables']['house_state']['Row']
export type CatalogItem = Database['public']['Tables']['catalog_items']['Row']
export type InventoryItem = Database['public']['Tables']['inventory']['Row']
export type Placement = Database['public']['Tables']['placements']['Row']
export type RoomFinish = Database['public']['Tables']['room_finishes']['Row']
export type MysteryOpening = Database['public']['Tables']['mystery_openings']['Row']
export type FocusSession = Database['public']['Tables']['focus_sessions']['Row']

// Phase 4: Avatar types
export type AvatarRow = Database['public']['Tables']['avatar']['Row']
export type Outfit = Database['public']['Tables']['outfits']['Row']
export type OutfitInsert = Database['public']['Tables']['outfits']['Insert']
export type FreeAppearanceOption = Database['public']['Tables']['free_appearance_options']['Row']
