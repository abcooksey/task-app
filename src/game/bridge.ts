/**
 * React ↔ Phaser Event Bridge
 *
 * A typed event emitter for communication between React and Phaser.
 * React owns all state; Phaser only renders and emits input events.
 */

import type { Appearance, Pose, Reaction } from './avatar/types'

// Avatar anchor position
export interface AvatarAnchor {
  x: number
  y: number
  flipped: boolean
}

// House state derived from repairs.json + completed IDs
export interface HouseState {
  completedRepairIds: Set<string>
  availableRepairIds: Set<string>
  lockedRepairIds: Set<string>
  decoratingUnlocked: boolean
  progress: {
    interior: { done: number; total: number }
    exterior: { done: number; total: number }
  }
  firstRepairDone: boolean
}

// Placement data for decorate mode
export interface PlacementData {
  id: string
  inventoryId: string
  itemId: string
  region: 'floor' | 'wall' | 'yard'
  x: number
  y: number
  flipped: boolean
  parentPlacementId?: string
  slotIndex?: number
}

// Item definition for ghost rendering
export interface ItemDefForGhost {
  id: string
  name: string
  category: string
  placement: string
  footprint: { w: number; h: number }
  isSurface?: boolean
  slots?: { x: number; y: number }[]
}

// Finish state
export interface FinishState {
  wall?: string   // item_id of wallpaper
  floor?: string  // item_id of flooring
}

// All events that can be emitted/received
export type BridgeEvents = {
  // React → Phaser (commands) - Phase 2 Repair Mode
  setView: { view: 'exterior' | 'interior' }
  setHouseState: { state: HouseState }
  playRepair: { repairId: string }
  setReducedMotion: { enabled: boolean }
  setSelected: { repairId: string | null }

  // React → Phaser (commands) - Phase 3 Decorate Mode
  setPlacements: { placements: PlacementData[] }
  setFinishes: { finishes: FinishState }
  enterDecorateMode: { view: 'interior' | 'exterior' }
  exitDecorateMode: Record<string, never>
  beginGhost: { itemDef: ItemDefForGhost }
  endGhost: Record<string, never>
  setGhostPosition: { x: number; y: number; region: 'floor' | 'wall' | 'yard' }
  setGhostValidity: { valid: boolean; reason?: string }
  selectPlacement: { placementId: string | null }
  nudgeGhost: { dx: number; dy: number }
  confirmGhost: Record<string, never>

  // React → Phaser (commands) - Phase 4 Avatar
  setAvatar: { appearance: Appearance | null }
  setAvatarPose: { pose: Pose; anchor: AvatarAnchor }
  playAvatarReaction: { reaction: Reaction }
  setAvatarVisible: { visible: boolean }

  // Phaser → React (events) - Phase 2
  ready: Record<string, never>
  hotspotTapped: { repairId: string }
  repairAnimationDone: { repairId: string }
  viewReady: { view: 'exterior' | 'interior' }

  // Phaser → React (events) - Phase 3 Decorate Mode
  ghostMoved: { x: number; y: number; region: 'floor' | 'wall' | 'yard' }
  ghostDropped: { x: number; y: number; region: 'floor' | 'wall' | 'yard' }
  placementTapped: { placementId: string }
  placementDragStart: { placementId: string }
  placementDragged: { placementId: string; x: number; y: number }
  placementDropped: { placementId: string; x: number; y: number }
  emptyTapped: { region: 'floor' | 'wall' | 'yard' }
  decorateModeReady: Record<string, never>

  // Phaser → React (events) - Phase 4 Avatar
  avatarTapped: Record<string, never>
  reactionDone: { reaction: Reaction }
}

type EventCallback<K extends keyof BridgeEvents> = (data: BridgeEvents[K]) => void

class GameBridge {
  private listeners = new Map<keyof BridgeEvents, Set<EventCallback<keyof BridgeEvents>>>()

  /**
   * Emit an event to all listeners
   */
  emit<K extends keyof BridgeEvents>(event: K, data: BridgeEvents[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(fn => fn(data))
    }
  }

  /**
   * Subscribe to an event. Returns unsubscribe function.
   */
  on<K extends keyof BridgeEvents>(
    event: K,
    callback: EventCallback<K>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    const callbacks = this.listeners.get(event)!
    callbacks.add(callback as EventCallback<keyof BridgeEvents>)

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback as EventCallback<keyof BridgeEvents>)
    }
  }

  /**
   * Clear all listeners. Call on unmount to prevent memory leaks.
   */
  clear(): void {
    this.listeners.clear()
  }
}

// Singleton instance
export const bridge = new GameBridge()
