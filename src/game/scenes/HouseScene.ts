import Phaser from 'phaser'
import { bridge, type HouseState, type PlacementData, type ItemDefForGhost, type FinishState, type AvatarAnchor } from '../bridge'
import { AvatarSprite } from '../sprites/AvatarSprite'
import type { Appearance, Pose, Reaction } from '../avatar/types'
import type { CatalogItemForComposer } from '../avatar/types'
import hotspotsData from '../content/hotspots.json'
import repairsData from '../content/repairs.json'
import roomsData from '../content/rooms.json'
import manifestData from '../content/manifest.json'
import catalogData from '../content/catalog.json'

interface ManifestAsset {
  type: 'image'
  path: string
  width: number
  height: number
  description: string
}

interface HotspotConfig {
  x: number
  y: number
  width: number
  height: number
  label: string
}

interface RepairConfig {
  id: string
  animationType: 'sweep' | 'hammer' | 'sparkle' | 'paint' | 'swap'
}

interface HotspotSprite {
  container: Phaser.GameObjects.Container
  rect: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  repairId: string
  pulseTween: Phaser.Tweens.Tween | null
}

interface RegionConfig {
  id: string
  x: number
  y: number
  width: number
  height: number
  gridWidth: number
  gridHeight: number
}

interface PlacedItemSprite {
  container: Phaser.GameObjects.Container
  rect: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text | null
  placementId: string
  itemId: string
  region: 'floor' | 'wall' | 'yard'
  gridX: number
  gridY: number
  footprint: { w: number; h: number }
}

interface CatalogItemData {
  id: string
  footprint: { w: number; h: number }
  placement: string
  category: string
}

// Animation durations
const ANIM_DURATION = {
  sweep: 1500,
  hammer: 2000,
  sparkle: 1800,
  paint: 2200,
  swap: 1600,
}

// Colors for different animation types
const ANIM_COLORS = {
  sweep: 0x8b5cf6,    // Purple for sweep
  hammer: 0xf59e0b,   // Amber for hammer
  sparkle: 0xfbbf24,  // Yellow for sparkle
  paint: 0x3b82f6,    // Blue for paint
  swap: 0x10b981,     // Green for swap
}

// Room box geometry for 360x640 canvas (correct 3D box perspective)
// The room fills most of the canvas - minimal blank space above/below
const ROOM_GEOMETRY = {
  // Front opening (viewer's perspective - full width, minimal margins)
  front: {
    top: 50,        // Ceiling starts here (small margin above)
    bottom: 620,    // Floor ends here (small margin below)
    left: 0,        // Full width left edge
    right: 360,     // Full width right edge
  },
  // Back wall (inset rectangle - where the wall actually is)
  backWall: {
    top: 120,       // Top of back wall (ceiling depth = 70px)
    bottom: 380,    // Bottom of back wall (floor depth = 240px)
    left: 60,       // Inset from left (side wall width at back)
    right: 300,     // Inset from right
  },
  // Floor grid configuration
  floorGrid: {
    cols: 8,
    rows: 6,
  },
}

// Interior palette - Animal Crossing style (warm, cozy, well-lit)
const INTERIOR_COLORS = {
  // Background (outside the room box)
  background: 0x1a1a2e,      // Dark purple-gray

  // Walls - warm cream tones with depth
  wallBase: 0xF5EBE0,        // Warm cream (back wall - brightest)
  wallCeiling: 0xEDE4D8,     // Slightly darker (ceiling)
  wallLeft: 0xE0D4C6,        // Medium shadow (left wall)
  wallRight: 0xD4C8BA,       // Darker shadow (right wall)

  // Floor - rich warm wood
  floorWood: 0xC4956A,       // Main wood color
  floorWoodLight: 0xD4A87A,  // Wood highlight
  floorWoodDark: 0x9B7550,   // Wood shadow/grain

  // Trim and accents
  baseboard: 0x8B6B4A,       // Warm brown trim
  cornerLine: 0x6B5040,      // Dark corner accent

  // Window
  windowFrame: 0x6B5343,     // Dark wood frame
  windowGlass: 0xB8E4F0,     // Bright sky blue
  windowReflect: 0xFFFFFF,   // White highlight

  // Door
  doorWood: 0x8B6B4A,        // Door matches trim
  doorPanels: 0x7A5A3A,      // Slightly darker panels
  doorKnob: 0xD4A84B,        // Brass
}

// Exterior palette
const EXTERIOR_COLORS = {
  skyTop: 0x87CEEB,        // Light sky blue
  skyBottom: 0xE0F0FF,     // Pale blue horizon
  houseSiding: 0xE8DFD4,   // Cream house
  houseShadow: 0xD4C8B8,   // Shadow
  roofShingles: 0x6B5B4F,  // Brown roof
  roofShadow: 0x4A3F36,    // Darker roof
  grass: 0x7CB342,         // Vibrant green
  grassDark: 0x5D8A28,     // Grass shadow
  pathStone: 0xC9B99A,     // Tan path
  fenceWood: 0xA89070,     // Fence
  bushGreen: 0x4A7C4E,     // Shrubs
}

/**
 * Main house scene - renders interior or exterior view
 *
 * This scene only handles rendering. All state is owned by React
 * and pushed via the bridge.
 */
export class HouseScene extends Phaser.Scene {
  private currentView: 'interior' | 'exterior' = 'interior'
  private houseState: HouseState | null = null
  private reducedMotion = false
  private background: Phaser.GameObjects.Rectangle | null = null
  private viewLabel: Phaser.GameObjects.Text | null = null
  private roomGraphics: Phaser.GameObjects.Graphics | null = null
  private hotspots: Map<string, HotspotSprite> = new Map()
  private hotspotsContainer: Phaser.GameObjects.Container | null = null
  private effectsContainer: Phaser.GameObjects.Container | null = null
  private repairConfigs: Map<string, RepairConfig> = new Map()

  // Decorate mode state
  private decorateMode = false
  private placements: PlacementData[] = []
  private placedItems: Map<string, PlacedItemSprite> = new Map()
  private finishes: FinishState = {}
  private selectedPlacementId: string | null = null

  // Layer containers for decorate mode
  private floorBaseContainer: Phaser.GameObjects.Container | null = null
  private rugContainer: Phaser.GameObjects.Container | null = null
  private furnitureContainer: Phaser.GameObjects.Container | null = null
  private characterContainer: Phaser.GameObjects.Container | null = null  // Phase 4: avatar layer
  private wallBaseContainer: Phaser.GameObjects.Container | null = null
  private wallDecorContainer: Phaser.GameObjects.Container | null = null

  // Ghost (item being placed)
  private ghostContainer: Phaser.GameObjects.Container | null = null
  private ghostItemDef: ItemDefForGhost | null = null
  private ghostValid = true
  private ghostReason = ''
  private ghostRegion: 'floor' | 'wall' | 'yard' = 'floor'
  private ghostGridX = 0
  private ghostGridY = 0

  // Grid overlay
  private gridOverlay: Phaser.GameObjects.Container | null = null

  // Drag state
  private draggingPlacement: PlacedItemSprite | null = null

  // Grid size (matches rooms.json gridSize)
  private readonly GRID_SIZE = 32

  // Avatar state (Phase 4)
  private avatarSprite: AvatarSprite | null = null
  private avatarAppearance: Appearance | null = null
  private avatarPose: Pose = 'stand'
  private avatarAnchor: AvatarAnchor = { x: 160, y: 240, flipped: false }
  private avatarVisible = true
  private catalogItems: Map<string, CatalogItemForComposer> = new Map()

  // Catalog lookup for item footprints
  private itemCatalog: Map<string, CatalogItemData> = new Map()

  constructor() {
    super({ key: 'HouseScene' })

    // Build item catalog lookup
    for (const item of (catalogData as { items: CatalogItemData[] }).items) {
      this.itemCatalog.set(item.id, item)
    }
  }

  preload(): void {
    // Load all sprites from manifest
    const assets = manifestData.assets as Record<string, ManifestAsset>
    for (const [key, asset] of Object.entries(assets)) {
      if (asset.type === 'image') {
        this.load.image(key, asset.path)
      }
    }
  }

  create(): void {
    // Set up camera bounds
    this.cameras.main.setBackgroundColor('#1a1a2e')

    // Build repair config map
    for (const repair of repairsData.repairs) {
      this.repairConfigs.set(repair.id, repair as RepairConfig)
    }

    // Create graphics object for room rendering (below hotspots)
    this.roomGraphics = this.add.graphics()
    this.roomGraphics.setDepth(1)

    // Create container for hotspots
    this.hotspotsContainer = this.add.container(0, 0)
    this.hotspotsContainer.setDepth(50)

    // Create container for effects (on top)
    this.effectsContainer = this.add.container(0, 0)

    // Create placeholder background
    this.renderScene()

    // Listen to bridge commands
    bridge.on('setView', ({ view }) => {
      this.currentView = view
      this.renderScene()
      bridge.emit('viewReady', { view })
    })

    bridge.on('setHouseState', ({ state }) => {
      const prevState = this.houseState
      this.houseState = state
      this.updateHotspots()

      // Check for view completion
      if (prevState) {
        this.checkViewCompletion(prevState, state)
      }
    })

    bridge.on('setReducedMotion', ({ enabled }) => {
      this.reducedMotion = enabled
      this.updateHotspotAnimations()
      this.updateAvatarReducedMotion()
    })

    bridge.on('playRepair', ({ repairId }) => {
      this.playRepairAnimation(repairId)
    })

    bridge.on('setSelected', ({ repairId }) => {
      this.highlightHotspot(repairId)
    })

    // Placement commands (work in both normal and decorate modes)
    bridge.on('setPlacements', ({ placements }) => {
      this.placements = placements
      // Render if containers exist (they're created in both renderScene and renderDecorateMode)
      if (this.furnitureContainer) {
        this.renderPlacements()
      }
    })

    bridge.on('setFinishes', ({ finishes }) => {
      this.finishes = finishes
      if (this.decorateMode) {
        this.renderFinishes()
      }
    })

    bridge.on('enterDecorateMode', ({ view }) => {
      this.currentView = view
      this.decorateMode = true
      this.updateAvatarVisibility() // Hide avatar in decorate mode
      this.renderDecorateMode()
      bridge.emit('decorateModeReady', {})
    })

    bridge.on('exitDecorateMode', () => {
      this.decorateMode = false
      this.endGhostInternal()
      this.clearDecorateMode()
      this.renderScene()
      this.updateAvatarVisibility() // Show avatar after exiting decorate mode
    })

    bridge.on('beginGhost', ({ itemDef }) => {
      this.beginGhostInternal(itemDef)
    })

    bridge.on('endGhost', () => {
      this.endGhostInternal()
    })

    bridge.on('setGhostPosition', ({ x, y, region }) => {
      this.setGhostPositionInternal(x, y, region)
    })

    bridge.on('setGhostValidity', ({ valid, reason }) => {
      this.ghostValid = valid
      this.ghostReason = reason ?? ''
      this.updateGhostAppearance()
    })

    bridge.on('selectPlacement', ({ placementId }) => {
      this.selectPlacementInternal(placementId)
    })

    // Avatar commands (Phase 4)
    bridge.on('setAvatar', ({ appearance }) => {
      this.avatarAppearance = appearance
      this.updateAvatar()
    })

    bridge.on('setAvatarPose', ({ pose, anchor }) => {
      this.avatarPose = pose
      this.avatarAnchor = anchor
      this.updateAvatarPose()
    })

    bridge.on('playAvatarReaction', ({ reaction }) => {
      this.playAvatarReaction(reaction)
    })

    bridge.on('setAvatarVisible', ({ visible }) => {
      this.avatarVisible = visible
      this.updateAvatarVisibility()
    })

    // Signal ready
    bridge.emit('ready', {})
  }

  /**
   * Render the current view
   */
  private renderScene(): void {
    // Clear existing background
    if (this.background) {
      this.background.destroy()
      this.background = null
    }
    if (this.viewLabel) {
      this.viewLabel.destroy()
      this.viewLabel = null
    }

    // Clear and render room graphics
    if (this.roomGraphics) {
      this.roomGraphics.clear()

      if (this.currentView === 'interior') {
        this.renderInteriorRoom()
      } else {
        this.renderExteriorView()
      }
    }

    // Recreate hotspots for new view
    this.createHotspots()

    // Create placement containers for normal mode (non-interactive display)
    this.clearPlacementContainers()
    this.createPlacementContainers()

    // Render placed items (non-interactive in normal mode)
    this.renderPlacements()

    // Update avatar for view change
    this.updateAvatar()
  }

  /**
   * Clear placement containers
   */
  private clearPlacementContainers(): void {
    this.placedItems.forEach(item => item.container.destroy())
    this.placedItems.clear()

    this.floorBaseContainer?.destroy()
    this.rugContainer?.destroy()
    this.furnitureContainer?.destroy()
    this.wallBaseContainer?.destroy()
    this.wallDecorContainer?.destroy()

    this.floorBaseContainer = null
    this.rugContainer = null
    this.furnitureContainer = null
    this.wallBaseContainer = null
    this.wallDecorContainer = null
  }

  /**
   * Create containers for placed items
   */
  private createPlacementContainers(): void {
    this.floorBaseContainer = this.add.container(0, 0)
    this.floorBaseContainer.setDepth(10)

    this.rugContainer = this.add.container(0, 0)
    this.rugContainer.setDepth(20)

    this.furnitureContainer = this.add.container(0, 0)
    this.furnitureContainer.setDepth(30)

    this.wallBaseContainer = this.add.container(0, 0)
    this.wallBaseContainer.setDepth(40)

    this.wallDecorContainer = this.add.container(0, 0)
    this.wallDecorContainer.setDepth(50)
  }

  /**
   * Render interior room with correct 3D box perspective
   *
   * The room is a 3D BOX viewed from the front:
   * - Blank space is ABOVE the ceiling and BELOW the floor (not on sides!)
   * - The "front opening" spans the full width of the screen
   * - The "back wall" is a smaller rectangle inset from the edges
   * - CEILING connects front-top to back-wall-top (trapezoid)
   * - FLOOR connects back-wall-bottom to front-bottom (trapezoid)
   * - SIDE WALLS are narrow vertical faces connecting ceiling to floor
   */
  private renderInteriorRoom(): void {
    const g = this.roomGraphics
    if (!g) return

    const { front, backWall } = ROOM_GEOMETRY

    // === 1. BACK WALL (rectangle at back of room) ===
    g.fillStyle(INTERIOR_COLORS.wallBase)
    g.fillRect(
      backWall.left,
      backWall.top,
      backWall.right - backWall.left,
      backWall.bottom - backWall.top
    )

    // Subtle gradient effect on back wall (lighter at top)
    g.fillStyle(0xFFFFFF, 0.08)
    g.fillRect(
      backWall.left,
      backWall.top,
      backWall.right - backWall.left,
      (backWall.bottom - backWall.top) * 0.3
    )

    // === 2. CEILING (trapezoid: wide at front, narrow at back) ===
    g.fillStyle(INTERIOR_COLORS.wallCeiling)
    g.beginPath()
    g.moveTo(front.left, front.top)         // Front-left (screen edge)
    g.lineTo(front.right, front.top)        // Front-right (screen edge)
    g.lineTo(backWall.right, backWall.top)  // Back-right (back wall)
    g.lineTo(backWall.left, backWall.top)   // Back-left (back wall)
    g.closePath()
    g.fillPath()

    // === 3. LEFT WALL (quadrilateral connecting ceiling to floor) ===
    g.fillStyle(INTERIOR_COLORS.wallLeft)
    g.beginPath()
    g.moveTo(front.left, front.top)          // Top-front (ceiling)
    g.lineTo(backWall.left, backWall.top)    // Top-back (back wall)
    g.lineTo(backWall.left, backWall.bottom) // Bottom-back (back wall)
    g.lineTo(front.left, front.bottom)       // Bottom-front (floor)
    g.closePath()
    g.fillPath()

    // === 4. RIGHT WALL (quadrilateral connecting ceiling to floor) ===
    g.fillStyle(INTERIOR_COLORS.wallRight)
    g.beginPath()
    g.moveTo(front.right, front.top)          // Top-front (ceiling)
    g.lineTo(backWall.right, backWall.top)    // Top-back (back wall)
    g.lineTo(backWall.right, backWall.bottom) // Bottom-back (back wall)
    g.lineTo(front.right, front.bottom)       // Bottom-front (floor)
    g.closePath()
    g.fillPath()

    // === 5. FLOOR (trapezoid: narrow at back, wide at front) ===
    g.fillStyle(INTERIOR_COLORS.floorWood)
    g.beginPath()
    g.moveTo(backWall.left, backWall.bottom)  // Back-left
    g.lineTo(backWall.right, backWall.bottom) // Back-right
    g.lineTo(front.right, front.bottom)       // Front-right
    g.lineTo(front.left, front.bottom)        // Front-left
    g.closePath()
    g.fillPath()

    // === 6. FLOOR BOARD LINES (converging to vanishing point) ===
    this.drawFloorBoards(g)

    // === 7. SHADOW WHERE FLOOR MEETS BACK WALL ===
    g.fillStyle(0x000000, 0.12)
    g.beginPath()
    g.moveTo(backWall.left, backWall.bottom - 4)
    g.lineTo(backWall.right, backWall.bottom - 4)
    g.lineTo(backWall.right, backWall.bottom + 3)
    g.lineTo(backWall.left, backWall.bottom + 3)
    g.closePath()
    g.fillPath()

    // === 8. BASEBOARD (trim line at wall/floor junction) ===
    g.lineStyle(4, INTERIOR_COLORS.baseboard)
    g.lineBetween(backWall.left, backWall.bottom, backWall.right, backWall.bottom)

    // Side baseboard lines (along the perspective)
    g.lineStyle(3, INTERIOR_COLORS.baseboard)
    g.lineBetween(backWall.left, backWall.bottom, front.left, front.bottom)
    g.lineBetween(backWall.right, backWall.bottom, front.right, front.bottom)

    // === 9. CORNER DEPTH LINES (where walls meet) ===
    g.lineStyle(2, INTERIOR_COLORS.cornerLine, 0.4)
    // Vertical corners where side walls meet back wall
    g.lineBetween(backWall.left, backWall.top, backWall.left, backWall.bottom)
    g.lineBetween(backWall.right, backWall.top, backWall.right, backWall.bottom)

    // Ceiling corners (where ceiling meets back wall)
    g.lineStyle(1, INTERIOR_COLORS.cornerLine, 0.3)
    g.lineBetween(front.left, front.top, backWall.left, backWall.top)
    g.lineBetween(front.right, front.top, backWall.right, backWall.top)

    // === 10. WINDOW (on the back wall) ===
    const backWallWidth = backWall.right - backWall.left
    const backWallHeight = backWall.bottom - backWall.top
    const winW = Math.min(70, backWallWidth * 0.35)
    const winH = Math.min(60, backWallHeight * 0.35)
    const winX = backWall.left + backWallWidth * 0.68 - winW / 2
    const winY = backWall.top + 25

    // Window outer frame
    g.fillStyle(INTERIOR_COLORS.windowFrame)
    g.fillRect(winX - 5, winY - 5, winW + 10, winH + 10)

    // Window glass
    g.fillStyle(INTERIOR_COLORS.windowGlass)
    g.fillRect(winX, winY, winW, winH)

    // Window reflection highlight
    g.fillStyle(INTERIOR_COLORS.windowReflect, 0.25)
    g.fillRect(winX + 3, winY + 3, winW * 0.25, winH * 0.35)

    // Window cross frame
    g.lineStyle(3, INTERIOR_COLORS.windowFrame)
    g.lineBetween(winX + winW / 2, winY, winX + winW / 2, winY + winH)
    g.lineBetween(winX, winY + winH / 2, winX + winW, winY + winH / 2)

    // === 11. DOOR (on the back wall) ===
    const doorW = Math.min(45, backWallWidth * 0.22)
    const doorX = backWall.left + 25
    const doorTop = backWall.top + 20
    const doorBottom = backWall.bottom

    // Door frame (slightly larger than door)
    g.fillStyle(INTERIOR_COLORS.cornerLine)
    g.fillRect(doorX - 4, doorTop - 4, doorW + 8, doorBottom - doorTop + 4)

    // Door body
    g.fillStyle(INTERIOR_COLORS.doorWood)
    g.fillRect(doorX, doorTop, doorW, doorBottom - doorTop)

    // Door panels (inset rectangles)
    g.fillStyle(INTERIOR_COLORS.doorPanels)
    const panelW = doorW - 10
    const panelH = Math.min(35, (doorBottom - doorTop - 30) / 2)
    g.fillRect(doorX + 5, doorTop + 10, panelW, panelH)
    g.fillRect(doorX + 5, doorTop + panelH + 20, panelW, panelH)

    // Panel borders
    g.lineStyle(1, INTERIOR_COLORS.cornerLine, 0.4)
    g.strokeRect(doorX + 5, doorTop + 10, panelW, panelH)
    g.strokeRect(doorX + 5, doorTop + panelH + 20, panelW, panelH)

    // Door knob
    g.fillStyle(INTERIOR_COLORS.doorKnob)
    g.fillCircle(doorX + doorW - 8, doorTop + (doorBottom - doorTop) / 2, 4)

    // Knob highlight
    g.fillStyle(0xFFFFFF, 0.35)
    g.fillCircle(doorX + doorW - 9, doorTop + (doorBottom - doorTop) / 2 - 1, 1.5)
  }

  /**
   * Draw floor boards with perspective convergence
   * Floor boards converge toward a vanishing point behind the back wall
   */
  private drawFloorBoards(g: Phaser.GameObjects.Graphics): void {
    const { front, backWall, floorGrid } = ROOM_GEOMETRY

    // === HORIZONTAL BOARD LINES (parallel to back wall, getting wider toward front) ===
    g.lineStyle(1, INTERIOR_COLORS.floorWoodDark, 0.25)

    for (let row = 1; row < floorGrid.rows; row++) {
      const t = row / floorGrid.rows

      // Y position interpolates from back wall bottom to front bottom
      const y = backWall.bottom + (front.bottom - backWall.bottom) * t

      // X positions interpolate with perspective (wider at front)
      const leftX = backWall.left + (front.left - backWall.left) * t
      const rightX = backWall.right + (front.right - backWall.right) * t

      g.lineBetween(leftX, y, rightX, y)
    }

    // === VERTICAL BOARD LINES (converging toward vanishing point) ===
    g.lineStyle(1, INTERIOR_COLORS.floorWoodDark, 0.18)

    for (let col = 0; col <= floorGrid.cols; col++) {
      const tCol = col / floorGrid.cols

      // Back edge position (on back wall)
      const backX = backWall.left + (backWall.right - backWall.left) * tCol

      // Front edge position (on screen edge)
      const frontX = front.left + (front.right - front.left) * tCol

      g.lineBetween(backX, backWall.bottom, frontX, front.bottom)
    }

    // === WOOD GRAIN TEXTURE (subtle darker patches for depth) ===
    g.fillStyle(INTERIOR_COLORS.floorWoodDark, 0.08)
    for (let row = 0; row < floorGrid.rows - 1; row++) {
      for (let col = 0; col < 4; col++) {
        const t = (row + 0.5) / floorGrid.rows
        const y = backWall.bottom + (front.bottom - backWall.bottom) * t

        // Calculate row left/right with perspective
        const rowLeft = backWall.left + (front.left - backWall.left) * t
        const rowRight = backWall.right + (front.right - backWall.right) * t
        const rowWidth = rowRight - rowLeft

        // Stagger grain marks
        const x = rowLeft + rowWidth * ((col + 0.2 + (row % 2) * 0.5) / 4)
        const grainWidth = 12 + t * 20
        const grainHeight = 3 + t * 3

        // Draw only if within bounds
        if (x > front.left && x < front.right) {
          g.fillEllipse(x, y, grainWidth, grainHeight)
        }
      }
    }
  }

  /**
   * Calculate pixel position and scale for an item on the perspective floor grid
   * Items at the back appear smaller and higher, items at front appear larger and lower
   */
  private getFloorPosition(
    gridX: number,
    gridY: number,
    footprint: { w: number; h: number }
  ): { x: number; y: number; scale: number } {
    const { front, backWall, floorGrid } = ROOM_GEOMETRY

    // Clamp grid position
    const clampedX = Math.max(0, Math.min(gridX, floorGrid.cols - footprint.w))
    const clampedY = Math.max(0, Math.min(gridY, floorGrid.rows - footprint.h))

    // Calculate the center of the footprint in grid coordinates
    const centerGridX = clampedX + footprint.w / 2
    const centerGridY = clampedY + footprint.h / 2

    // Interpolation factor (0 = back row, 1 = front row)
    const t = centerGridY / floorGrid.rows

    // Row geometry at this depth
    const backWidth = backWall.right - backWall.left
    const frontWidth = front.right - front.left
    const rowWidth = backWidth + (frontWidth - backWidth) * t
    const rowLeft = backWall.left + (front.left - backWall.left) * t

    // Cell width at this row
    const cellWidth = rowWidth / floorGrid.cols

    // X position (center of footprint cell)
    const x = rowLeft + centerGridX * cellWidth

    // Y position interpolates from back wall bottom to front bottom
    const y = backWall.bottom + (front.bottom - backWall.bottom) * t

    // Scale factor (smaller at back, larger at front)
    // Range from ~55% at back to 100% at front
    const scale = 0.55 + 0.45 * t

    return { x, y, scale }
  }

  /**
   * Render exterior cottage view - fills entire screen
   */
  private renderExteriorView(): void {
    const g = this.roomGraphics
    if (!g) return

    const { width, height } = this.scale
    const cx = width / 2

    // Layout coordinates - fills entire screen
    const groundY = Math.round(height * 0.55) // Ground starts at 55% down
    const houseTop = 120 // Top of house walls
    const houseBottom = groundY - 20 // House sits slightly above ground
    const roofPeak = 40 // Peak of the roof (near top)
    const houseLeft = 30
    const houseRight = width - 30
    const houseWidth = houseRight - houseLeft

    // 1. Sky gradient (fills top portion)
    g.fillStyle(EXTERIOR_COLORS.skyTop)
    g.fillRect(0, 0, width, groundY / 2)
    g.fillStyle(EXTERIOR_COLORS.skyBottom)
    g.fillRect(0, groundY / 2, width, groundY / 2)

    // 2. Grass/ground - extends to bottom of screen
    g.fillStyle(EXTERIOR_COLORS.grass)
    g.fillRect(0, groundY, width, height - groundY)

    // Grass texture (subtle darker patches)
    g.fillStyle(EXTERIOR_COLORS.grassDark, 0.3)
    for (let i = 0; i < 8; i++) {
      const gx = 20 + (i * 38) % width
      const gy = groundY + 15 + (i * 17) % 40
      g.fillEllipse(gx, gy, 25, 8)
    }

    // 3. Roof (triangle with shadow)
    const roofOverhang = 15

    // Roof shadow (right side)
    g.fillStyle(EXTERIOR_COLORS.roofShadow)
    g.beginPath()
    g.moveTo(cx, roofPeak - 5)
    g.lineTo(houseRight + roofOverhang + 5, houseTop + 5)
    g.lineTo(houseRight + roofOverhang, houseTop)
    g.lineTo(cx, roofPeak)
    g.closePath()
    g.fillPath()

    // Main roof
    g.fillStyle(EXTERIOR_COLORS.roofShingles)
    g.beginPath()
    g.moveTo(cx, roofPeak)
    g.lineTo(houseRight + roofOverhang, houseTop)
    g.lineTo(houseLeft - roofOverhang, houseTop)
    g.closePath()
    g.fillPath()

    // Roof shingle lines
    g.lineStyle(1, EXTERIOR_COLORS.roofShadow, 0.5)
    const shingleRows = 4
    for (let i = 1; i <= shingleRows; i++) {
      const t = i / (shingleRows + 1)
      const y = roofPeak + (houseTop - roofPeak) * t
      const halfWidth = (houseWidth / 2 + roofOverhang) * t
      g.lineBetween(cx - halfWidth, y, cx + halfWidth, y)
    }

    // 4. House body
    g.fillStyle(EXTERIOR_COLORS.houseSiding)
    g.fillRect(houseLeft, houseTop, houseWidth, houseBottom - houseTop)

    // House shadow on right side
    g.fillStyle(EXTERIOR_COLORS.houseShadow, 0.3)
    g.fillRect(houseRight - 20, houseTop, 20, houseBottom - houseTop)

    // 5. Door (centered)
    const doorW = 30
    const doorH = 55
    const doorX = cx - doorW / 2
    const doorY = houseBottom - doorH

    g.fillStyle(EXTERIOR_COLORS.roofShingles)
    g.fillRect(doorX, doorY, doorW, doorH)

    // Door frame
    g.lineStyle(2, 0x3D2817)
    g.strokeRect(doorX, doorY, doorW, doorH)

    // Door panels
    g.lineStyle(1, 0x3D2817)
    g.strokeRect(doorX + 5, doorY + 5, doorW - 10, 20)
    g.strokeRect(doorX + 5, doorY + 30, doorW - 10, 20)

    // Door knob
    g.fillStyle(INTERIOR_COLORS.doorKnob)
    g.fillCircle(doorX + doorW - 8, doorY + doorH / 2, 3)

    // 6. Windows (two, flanking the door)
    const winW = 28
    const winH = 32
    const winY = houseTop + 40

    // Left window
    const leftWinX = houseLeft + 20
    g.fillStyle(INTERIOR_COLORS.windowFrame)
    g.fillRect(leftWinX - 3, winY - 3, winW + 6, winH + 6)
    g.fillStyle(INTERIOR_COLORS.windowGlass)
    g.fillRect(leftWinX, winY, winW, winH)
    g.lineStyle(2, INTERIOR_COLORS.windowFrame)
    g.lineBetween(leftWinX + winW / 2, winY, leftWinX + winW / 2, winY + winH)
    g.lineBetween(leftWinX, winY + winH / 2, leftWinX + winW, winY + winH / 2)

    // Right window
    const rightWinX = houseRight - 20 - winW
    g.fillStyle(INTERIOR_COLORS.windowFrame)
    g.fillRect(rightWinX - 3, winY - 3, winW + 6, winH + 6)
    g.fillStyle(INTERIOR_COLORS.windowGlass)
    g.fillRect(rightWinX, winY, winW, winH)
    g.lineStyle(2, INTERIOR_COLORS.windowFrame)
    g.lineBetween(rightWinX + winW / 2, winY, rightWinX + winW / 2, winY + winH)
    g.lineBetween(rightWinX, winY + winH / 2, rightWinX + winW, winY + winH / 2)

    // 7. Path (stone path leading to door)
    g.fillStyle(EXTERIOR_COLORS.pathStone)
    g.beginPath()
    g.moveTo(doorX - 5, houseBottom)
    g.lineTo(doorX + doorW + 5, houseBottom)
    g.lineTo(doorX + doorW + 20, height)
    g.lineTo(doorX - 20, height)
    g.closePath()
    g.fillPath()

    // Path stone lines
    g.lineStyle(1, 0x8B7355, 0.4)
    for (let py = houseBottom + 15; py < height; py += 18) {
      const t = (py - houseBottom) / (height - houseBottom)
      const pathHalfW = 20 + t * 15
      g.lineBetween(cx - pathHalfW, py, cx + pathHalfW, py)
    }

    // 8. Fence sections (left and right)
    const fenceH = 35
    const fenceY = groundY - fenceH + 10

    // Left fence
    g.fillStyle(EXTERIOR_COLORS.fenceWood)
    for (let i = 0; i < 3; i++) {
      const fx = 15 + i * 18
      g.fillRect(fx, fenceY, 6, fenceH)
      // Picket top
      g.beginPath()
      g.moveTo(fx, fenceY)
      g.lineTo(fx + 3, fenceY - 6)
      g.lineTo(fx + 6, fenceY)
      g.closePath()
      g.fillPath()
    }
    // Fence rail
    g.fillRect(10, fenceY + 10, 55, 4)

    // Right fence
    for (let i = 0; i < 3; i++) {
      const fx = width - 55 + i * 18
      g.fillRect(fx, fenceY, 6, fenceH)
      g.beginPath()
      g.moveTo(fx, fenceY)
      g.lineTo(fx + 3, fenceY - 6)
      g.lineTo(fx + 6, fenceY)
      g.closePath()
      g.fillPath()
    }
    g.fillRect(width - 60, fenceY + 10, 55, 4)

    // 9. Bushes (decorative shrubs)
    g.fillStyle(EXTERIOR_COLORS.bushGreen)

    // Left bushes
    g.fillEllipse(35, groundY - 5, 22, 14)
    g.fillEllipse(25, groundY, 15, 10)

    // Right bushes
    g.fillEllipse(width - 35, groundY - 5, 22, 14)
    g.fillEllipse(width - 25, groundY, 15, 10)

    // Bushes by door
    g.fillEllipse(doorX - 15, houseBottom - 8, 14, 10)
    g.fillEllipse(doorX + doorW + 15, houseBottom - 8, 14, 10)

    // 10. Chimney (small, on roof)
    g.fillStyle(EXTERIOR_COLORS.roofShingles)
    g.fillRect(cx + 25, roofPeak + 15, 18, 30)
    g.fillStyle(EXTERIOR_COLORS.roofShadow)
    g.fillRect(cx + 25, roofPeak + 15, 18, 5)
  }

  /**
   * Create hotspot sprites for current view
   */
  private createHotspots(): void {
    // Clear existing hotspots
    this.hotspots.forEach(hs => {
      if (hs.pulseTween) {
        hs.pulseTween.stop()
      }
      hs.container.destroy()
    })
    this.hotspots.clear()

    if (!this.hotspotsContainer) return

    const configs = hotspotsData.hotspots as Record<string, HotspotConfig>

    // Create hotspots for current view only
    for (const [repairId, config] of Object.entries(configs)) {
      const isInterior = repairId.startsWith('int_')
      const isCurrentView = (isInterior && this.currentView === 'interior') ||
                           (!isInterior && this.currentView === 'exterior')

      if (!isCurrentView) continue

      const hotspot = this.createHotspot(repairId, config)
      this.hotspots.set(repairId, hotspot)
    }

    // Update hotspot states based on current house state
    this.updateHotspots()
  }

  /**
   * Create a single hotspot sprite
   */
  private createHotspot(repairId: string, config: HotspotConfig): HotspotSprite {
    const container = this.add.container(config.x, config.y)

    // Create rectangle (will be colored based on state)
    const rect = this.add.rectangle(0, 0, config.width, config.height, 0x888888)
    rect.setStrokeStyle(2, 0xffffff)
    rect.setInteractive({ useHandCursor: true })

    // Create label
    const label = this.add.text(0, 0, config.label, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    })
    label.setOrigin(0.5)

    container.add([rect, label])
    this.hotspotsContainer?.add(container)

    // Handle click/tap
    rect.on('pointerdown', () => {
      bridge.emit('hotspotTapped', { repairId })
    })

    return {
      container,
      rect,
      label,
      repairId,
      pulseTween: null,
    }
  }

  /**
   * Update hotspot appearance based on house state
   */
  private updateHotspots(): void {
    if (!this.houseState) return

    this.hotspots.forEach((hotspot, repairId) => {
      const isCompleted = this.houseState!.completedRepairIds.has(repairId)
      const isAvailable = this.houseState!.availableRepairIds.has(repairId)
      const isLocked = this.houseState!.lockedRepairIds.has(repairId)

      // Determine if visible based on first-repair guidance
      let isVisible = true
      if (!this.houseState!.firstRepairDone) {
        // Only show starter repairs
        const isStarter = ['int_garbage', 'int_cobwebs', 'ext_yard', 'ext_mailbox'].includes(repairId)
        isVisible = isStarter || isCompleted
      }

      hotspot.container.setVisible(isVisible && !isCompleted)

      if (isCompleted) {
        // Completed - hide entirely
        this.stopPulse(hotspot)
      } else if (isAvailable && isVisible) {
        // Available - green, pulsing
        hotspot.rect.setFillStyle(0x22c55e, 0.6)
        hotspot.rect.setStrokeStyle(2, 0x4ade80)
        hotspot.label.setColor('#ffffff')
        this.startPulse(hotspot)
      } else if (isLocked && isVisible) {
        // Locked - gray, static
        hotspot.rect.setFillStyle(0x4b5563, 0.4)
        hotspot.rect.setStrokeStyle(2, 0x6b7280)
        hotspot.label.setColor('#9ca3af')
        this.stopPulse(hotspot)
      }
    })
  }

  /**
   * Start pulse animation for available hotspot
   */
  private startPulse(hotspot: HotspotSprite): void {
    if (this.reducedMotion || hotspot.pulseTween) return

    hotspot.pulseTween = this.tweens.add({
      targets: hotspot.container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  /**
   * Stop pulse animation
   */
  private stopPulse(hotspot: HotspotSprite): void {
    if (hotspot.pulseTween) {
      hotspot.pulseTween.stop()
      hotspot.pulseTween = null
    }
    hotspot.container.setScale(1)
  }

  /**
   * Update animations based on reduced motion setting
   */
  private updateHotspotAnimations(): void {
    this.hotspots.forEach(hotspot => {
      if (this.reducedMotion) {
        this.stopPulse(hotspot)
      } else if (this.houseState?.availableRepairIds.has(hotspot.repairId)) {
        this.startPulse(hotspot)
      }
    })
  }

  /**
   * Play repair animation based on animation type
   */
  private playRepairAnimation(repairId: string): void {
    const hotspot = this.hotspots.get(repairId)
    if (!hotspot) {
      bridge.emit('repairAnimationDone', { repairId })
      return
    }

    // Stop any existing pulse
    this.stopPulse(hotspot)

    // Get animation type
    const repairConfig = this.repairConfigs.get(repairId)
    const animType = repairConfig?.animationType ?? 'sparkle'

    if (this.reducedMotion) {
      // Reduced motion: quick fade
      this.tweens.add({
        targets: hotspot.container,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          hotspot.container.setVisible(false)
          hotspot.container.setAlpha(1)
          bridge.emit('repairAnimationDone', { repairId })
        },
      })
      return
    }

    // Play animation based on type
    const duration = ANIM_DURATION[animType]
    const color = ANIM_COLORS[animType]

    switch (animType) {
      case 'sweep':
        this.playSweepAnimation(hotspot, duration, color)
        break
      case 'hammer':
        this.playHammerAnimation(hotspot, duration, color)
        break
      case 'sparkle':
        this.playSparkleAnimation(hotspot, duration, color)
        break
      case 'paint':
        this.playPaintAnimation(hotspot, duration, color)
        break
      case 'swap':
        this.playSwapAnimation(hotspot, duration, color)
        break
      default:
        this.playSparkleAnimation(hotspot, duration, color)
    }
  }

  /**
   * Sweep animation - side-to-side motion with particles
   */
  private playSweepAnimation(hotspot: HotspotSprite, duration: number, color: number): void {
    const { x, y } = hotspot.container
    const particles = this.createParticles(x, y, color, 8)

    // Sweep motion
    this.tweens.add({
      targets: hotspot.container,
      x: x + 30,
      duration: duration * 0.2,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    })

    // Fade out
    this.tweens.add({
      targets: hotspot.container,
      alpha: 0,
      delay: duration * 0.7,
      duration: duration * 0.3,
      onComplete: () => {
        hotspot.container.setVisible(false)
        hotspot.container.setAlpha(1)
        hotspot.container.setX(x)
        this.destroyParticles(particles)
        bridge.emit('repairAnimationDone', { repairId: hotspot.repairId })
      },
    })
  }

  /**
   * Hammer animation - bouncing impact effect
   */
  private playHammerAnimation(hotspot: HotspotSprite, duration: number, color: number): void {
    const { x, y } = hotspot.container

    // Create impact particles on each "hit"
    const hitTimes = [0.2, 0.4, 0.6]
    hitTimes.forEach(t => {
      this.time.delayedCall(duration * t, () => {
        this.createImpactEffect(x, y, color)
      })
    })

    // Bouncing/shaking motion
    this.tweens.add({
      targets: hotspot.container,
      y: y - 5,
      duration: 100,
      yoyo: true,
      repeat: 5,
      ease: 'Bounce.easeOut',
    })

    // Flash color on hits
    this.tweens.add({
      targets: hotspot.rect,
      fillColor: color,
      duration: 100,
      yoyo: true,
      repeat: 5,
    })

    // Final fade out
    this.tweens.add({
      targets: hotspot.container,
      alpha: 0,
      scale: 1.2,
      delay: duration * 0.7,
      duration: duration * 0.3,
      onComplete: () => {
        hotspot.container.setVisible(false)
        hotspot.container.setAlpha(1)
        hotspot.container.setScale(1)
        hotspot.container.setY(y)
        bridge.emit('repairAnimationDone', { repairId: hotspot.repairId })
      },
    })
  }

  /**
   * Sparkle animation - expanding sparkles
   */
  private playSparkleAnimation(hotspot: HotspotSprite, duration: number, color: number): void {
    const { x, y } = hotspot.container
    const particles = this.createParticles(x, y, color, 12)

    // Sparkle burst
    particles.forEach((p, i) => {
      const angle = (i / particles.length) * Math.PI * 2
      const distance = 40 + Math.random() * 20
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: duration * 0.6,
        delay: i * 30,
        ease: 'Cubic.easeOut',
      })
    })

    // Main element grows and fades
    this.tweens.add({
      targets: hotspot.container,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: duration * 0.8,
      ease: 'Back.easeIn',
      onComplete: () => {
        hotspot.container.setVisible(false)
        hotspot.container.setAlpha(1)
        hotspot.container.setScale(1)
        this.destroyParticles(particles)
        bridge.emit('repairAnimationDone', { repairId: hotspot.repairId })
      },
    })
  }

  /**
   * Paint animation - color fill effect
   */
  private playPaintAnimation(hotspot: HotspotSprite, duration: number, color: number): void {
    const { x, y } = hotspot.container

    // Create paint drip effect
    const drips: Phaser.GameObjects.Rectangle[] = []
    for (let i = 0; i < 5; i++) {
      const drip = this.add.rectangle(
        x + (Math.random() - 0.5) * 40,
        y - 30,
        8,
        4,
        color
      )
      drips.push(drip)
      this.effectsContainer?.add(drip)

      // Animate drip falling
      this.tweens.add({
        targets: drip,
        y: y + 20 + Math.random() * 20,
        scaleY: 3,
        alpha: 0,
        duration: duration * 0.5,
        delay: i * 100,
        ease: 'Cubic.easeIn',
      })
    }

    // Color transition
    this.tweens.add({
      targets: hotspot.rect,
      fillColor: color,
      duration: duration * 0.5,
    })

    // Final fade
    this.tweens.add({
      targets: hotspot.container,
      alpha: 0,
      delay: duration * 0.7,
      duration: duration * 0.3,
      onComplete: () => {
        hotspot.container.setVisible(false)
        hotspot.container.setAlpha(1)
        drips.forEach(d => d.destroy())
        bridge.emit('repairAnimationDone', { repairId: hotspot.repairId })
      },
    })
  }

  /**
   * Swap animation - flip/replace effect
   */
  private playSwapAnimation(hotspot: HotspotSprite, duration: number, color: number): void {
    const { x, y } = hotspot.container

    // Create "new" element that will appear
    const newRect = this.add.rectangle(x, y, hotspot.rect.width, hotspot.rect.height, color)
    newRect.setAlpha(0)
    newRect.setScale(0.5)
    this.effectsContainer?.add(newRect)

    // Flip out old
    this.tweens.add({
      targets: hotspot.container,
      scaleX: 0,
      duration: duration * 0.4,
      ease: 'Cubic.easeIn',
    })

    // Flip in new
    this.tweens.add({
      targets: newRect,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      delay: duration * 0.4,
      duration: duration * 0.3,
      ease: 'Cubic.easeOut',
    })

    // Fade out new (it's fixed now!)
    this.tweens.add({
      targets: newRect,
      alpha: 0,
      scale: 1.2,
      delay: duration * 0.7,
      duration: duration * 0.3,
      onComplete: () => {
        hotspot.container.setVisible(false)
        hotspot.container.setAlpha(1)
        hotspot.container.setScale(1)
        newRect.destroy()
        bridge.emit('repairAnimationDone', { repairId: hotspot.repairId })
      },
    })
  }

  /**
   * Create particle effects
   */
  private createParticles(x: number, y: number, color: number, count: number): Phaser.GameObjects.Arc[] {
    const particles: Phaser.GameObjects.Arc[] = []
    for (let i = 0; i < count; i++) {
      const particle = this.add.circle(x, y, 4 + Math.random() * 3, color)
      particle.setAlpha(0.8)
      this.effectsContainer?.add(particle)
      particles.push(particle)
    }
    return particles
  }

  /**
   * Destroy particle effects
   */
  private destroyParticles(particles: Phaser.GameObjects.Arc[]): void {
    particles.forEach(p => p.destroy())
  }

  /**
   * Create impact effect for hammer animation
   */
  private createImpactEffect(x: number, y: number, color: number): void {
    // Impact ring
    const ring = this.add.circle(x, y, 10, color, 0)
    ring.setStrokeStyle(3, color)
    this.effectsContainer?.add(ring)

    this.tweens.add({
      targets: ring,
      radius: 30,
      alpha: 0,
      duration: 300,
      onComplete: () => ring.destroy(),
    })

    // Small particles
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5
      const particle = this.add.circle(x, y, 3, color)
      this.effectsContainer?.add(particle)

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 25,
        y: y + Math.sin(angle) * 25,
        alpha: 0,
        duration: 250,
        onComplete: () => particle.destroy(),
      })
    }
  }

  /**
   * Check if a view was just completed and play celebration
   */
  private checkViewCompletion(prevState: HouseState, newState: HouseState): void {
    const prevInteriorDone = prevState.progress.interior.done
    const newInteriorDone = newState.progress.interior.done
    const interiorTotal = newState.progress.interior.total

    const prevExteriorDone = prevState.progress.exterior.done
    const newExteriorDone = newState.progress.exterior.done
    const exteriorTotal = newState.progress.exterior.total

    // Check interior completion
    if (prevInteriorDone < interiorTotal && newInteriorDone === interiorTotal) {
      if (this.currentView === 'interior') {
        this.playCelebration()
      }
    }

    // Check exterior completion
    if (prevExteriorDone < exteriorTotal && newExteriorDone === exteriorTotal) {
      if (this.currentView === 'exterior') {
        this.playCelebration()
      }
    }
  }

  /**
   * Play celebration effect for view completion
   */
  private playCelebration(): void {
    if (this.reducedMotion) return

    const { width, height } = this.scale
    const colors = [0xfbbf24, 0x22c55e, 0x3b82f6, 0xec4899, 0x8b5cf6]

    // Create confetti burst
    for (let i = 0; i < 50; i++) {
      const x = width * 0.2 + Math.random() * width * 0.6
      const color = colors[Math.floor(Math.random() * colors.length)]
      const confetti = this.add.rectangle(
        x,
        -10,
        6 + Math.random() * 6,
        10 + Math.random() * 10,
        color
      )
      confetti.setRotation(Math.random() * Math.PI)
      this.effectsContainer?.add(confetti)

      // Fall animation
      this.tweens.add({
        targets: confetti,
        y: height + 50,
        rotation: confetti.rotation + Math.PI * (2 + Math.random() * 2),
        duration: 2000 + Math.random() * 1000,
        delay: i * 30,
        ease: 'Quad.easeIn',
        onComplete: () => confetti.destroy(),
      })

      // Horizontal drift
      this.tweens.add({
        targets: confetti,
        x: x + (Math.random() - 0.5) * 100,
        duration: 2000 + Math.random() * 1000,
        delay: i * 30,
        ease: 'Sine.easeInOut',
      })
    }

    // Celebration text
    const text = this.add.text(width / 2, height / 2, 'COMPLETE!', {
      fontSize: '32px',
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    })
    text.setOrigin(0.5)
    text.setAlpha(0)
    text.setScale(0.5)
    this.effectsContainer?.add(text)

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    })

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: height / 2 - 50,
      delay: 1500,
      duration: 500,
      onComplete: () => text.destroy(),
    })
  }

  /**
   * Highlight a hotspot when selected
   */
  private highlightHotspot(repairId: string | null): void {
    // Reset all hotspots
    this.hotspots.forEach(hs => {
      hs.rect.setStrokeStyle(2,
        this.houseState?.availableRepairIds.has(hs.repairId) ? 0x4ade80 : 0x6b7280
      )
    })

    // Highlight selected
    if (repairId) {
      const hotspot = this.hotspots.get(repairId)
      if (hotspot) {
        hotspot.rect.setStrokeStyle(3, 0xfbbf24) // Yellow highlight
      }
    }
  }

  // ==========================================================================
  // DECORATE MODE
  // ==========================================================================

  /**
   * Get region config from rooms.json
   */
  private getRegionConfig(regionId: 'floor' | 'wall' | 'yard'): RegionConfig | null {
    const room = roomsData.rooms.main
    const region = room.regions[regionId]
    if (!region) return null
    return {
      id: region.id,
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      gridWidth: region.gridWidth,
      gridHeight: region.gridHeight,
    }
  }

  /**
   * Render decorate mode - replaces normal scene rendering
   */
  private renderDecorateMode(): void {
    // Hide repair mode elements
    if (this.hotspotsContainer) {
      this.hotspotsContainer.setVisible(false)
    }

    // Clear existing containers
    this.clearPlacementContainers()
    this.gridOverlay?.destroy()
    this.gridOverlay = null
    this.characterContainer?.destroy()
    this.characterContainer = null

    const { width, height } = this.scale

    // Create background
    if (this.background) {
      this.background.destroy()
    }
    const bgColor = this.currentView === 'interior' ? 0x2d2d44 : 0x3d5a3d
    this.background = this.add.rectangle(width / 2, height / 2, width, height, bgColor)
    this.background.setDepth(0)

    // Create placement containers
    this.createPlacementContainers()

    // Character layer (Phase 4: avatar, body double)
    this.characterContainer = this.add.container(0, 0)
    this.characterContainer.setDepth(35)

    // Grid overlay on top (but below ghost)
    this.gridOverlay = this.add.container(0, 0)
    this.gridOverlay.setDepth(90)

    // Effects container for ghost
    if (this.effectsContainer) {
      this.effectsContainer.setDepth(100)
    }

    // Render finishes
    this.renderFinishes()

    // Render grid overlay
    this.renderGridOverlay()

    // Render placements
    this.renderPlacements()

    // View label
    if (this.viewLabel) {
      this.viewLabel.destroy()
    }
    this.viewLabel = this.add.text(
      width / 2,
      20,
      'DECORATE MODE - ' + (this.currentView === 'interior' ? 'INTERIOR' : 'EXTERIOR'),
      {
        fontSize: '14px',
        color: '#888888',
        fontFamily: 'system-ui, sans-serif',
      }
    )
    this.viewLabel.setOrigin(0.5)
    this.viewLabel.setDepth(200)

    // Set up input for empty taps
    this.input.on('pointerdown', this.handleDecoratePointerDown, this)
  }

  /**
   * Clear decorate mode elements (grid overlay, input handlers)
   */
  private clearDecorateMode(): void {
    // Clear placement containers (will be recreated in renderScene)
    this.clearPlacementContainers()

    // Clear decorate-specific elements
    this.characterContainer?.destroy()
    this.characterContainer = null

    this.gridOverlay?.destroy()
    this.gridOverlay = null

    this.input.off('pointerdown', this.handleDecoratePointerDown, this)
  }

  /**
   * Render finishes (wall/floor colors)
   */
  private renderFinishes(): void {
    if (!this.floorBaseContainer || !this.wallBaseContainer) return

    // Clear existing
    this.floorBaseContainer.removeAll(true)
    this.wallBaseContainer.removeAll(true)

    // Floor finish
    const floorRegion = this.getRegionConfig('floor')
    if (floorRegion) {
      const floorColor = this.finishes.floor ? 0x8b7355 : 0x5c4a3d // Wood brown or dark wood
      const floor = this.add.rectangle(
        floorRegion.x + floorRegion.width / 2,
        floorRegion.y + floorRegion.height / 2,
        floorRegion.width,
        floorRegion.height,
        floorColor
      )
      this.floorBaseContainer.add(floor)
    }

    // Wall finish
    const wallRegion = this.getRegionConfig('wall')
    if (wallRegion) {
      const wallColor = this.finishes.wall ? 0xd4c4b0 : 0xc9b99a // Cream or beige
      const wall = this.add.rectangle(
        wallRegion.x + wallRegion.width / 2,
        wallRegion.y + wallRegion.height / 2,
        wallRegion.width,
        wallRegion.height,
        wallColor
      )
      this.wallBaseContainer.add(wall)
    }

    // Yard area
    if (this.currentView === 'interior') {
      const yardRegion = this.getRegionConfig('yard')
      if (yardRegion) {
        const yard = this.add.rectangle(
          yardRegion.x + yardRegion.width / 2,
          yardRegion.y + yardRegion.height / 2,
          yardRegion.width,
          yardRegion.height,
          0x4a7c4e // Green
        )
        this.floorBaseContainer.add(yard)
      }
    }
  }

  /**
   * Render grid overlay (subtle dotted cells)
   * For floor in interior view, renders a perspective grid
   */
  private renderGridOverlay(): void {
    if (!this.gridOverlay) return
    this.gridOverlay.removeAll(true)

    const regions: ('floor' | 'wall' | 'yard')[] = ['floor', 'wall', 'yard']

    for (const regionId of regions) {
      const region = this.getRegionConfig(regionId)
      if (!region) continue

      // Interior floor uses perspective grid
      if (regionId === 'floor' && this.currentView === 'interior') {
        this.renderPerspectiveFloorGrid()
        continue
      }

      // Wall and yard use flat grid
      for (let gx = 0; gx <= region.gridWidth; gx++) {
        for (let gy = 0; gy <= region.gridHeight; gy++) {
          const px = region.x + gx * this.GRID_SIZE
          const py = region.y + gy * this.GRID_SIZE

          const dot = this.add.circle(px, py, 1, 0xffffff, 0.3)
          this.gridOverlay.add(dot)
        }
      }

      // Region border
      const border = this.add.rectangle(
        region.x + region.width / 2,
        region.y + region.height / 2,
        region.width,
        region.height
      )
      border.setStrokeStyle(1, 0xffffff, 0.2)
      border.setFillStyle(0x000000, 0)
      this.gridOverlay.add(border)
    }
  }

  /**
   * Render a perspective floor grid for decorate mode
   * Grid dots spread wider toward the front (bottom) of the room
   */
  private renderPerspectiveFloorGrid(): void {
    if (!this.gridOverlay) return

    const { front, backWall, floorGrid } = ROOM_GEOMETRY

    // Draw grid dots at each intersection
    for (let row = 0; row <= floorGrid.rows; row++) {
      for (let col = 0; col <= floorGrid.cols; col++) {
        // Interpolation factor (0 = back row, 1 = front row)
        const t = row / floorGrid.rows

        // Row geometry at this depth
        const rowLeft = backWall.left + (front.left - backWall.left) * t
        const rowRight = backWall.right + (front.right - backWall.right) * t
        const rowWidth = rowRight - rowLeft
        const cellWidth = rowWidth / floorGrid.cols

        // X position for this column
        const px = rowLeft + col * cellWidth

        // Y position interpolates from back wall bottom to front bottom
        const py = backWall.bottom + (front.bottom - backWall.bottom) * t

        // Dot size scales with perspective (larger at front)
        const dotSize = 1 + t * 0.5

        const dot = this.add.circle(px, py, dotSize, 0xffffff, 0.3)
        this.gridOverlay.add(dot)
      }
    }

    // Draw subtle grid lines
    const graphics = this.add.graphics()
    graphics.lineStyle(1, 0xffffff, 0.1)

    // Horizontal lines
    for (let row = 0; row <= floorGrid.rows; row++) {
      const t = row / floorGrid.rows
      const y = backWall.bottom + (front.bottom - backWall.bottom) * t
      const leftX = backWall.left + (front.left - backWall.left) * t
      const rightX = backWall.right + (front.right - backWall.right) * t
      graphics.lineBetween(leftX, y, rightX, y)
    }

    // Vertical lines (converging)
    for (let col = 0; col <= floorGrid.cols; col++) {
      const tCol = col / floorGrid.cols
      const backX = backWall.left + (backWall.right - backWall.left) * tCol
      const frontX = front.left + (front.right - front.left) * tCol
      graphics.lineBetween(backX, backWall.bottom, frontX, front.bottom)
    }

    this.gridOverlay.add(graphics)
  }

  /**
   * Render all placements
   */
  private renderPlacements(): void {
    // Clear existing
    this.placedItems.forEach(item => item.container.destroy())
    this.placedItems.clear()

    // Filter placements for current view
    const viewPlacements = this.placements.filter(p => {
      // Interior view shows floor and wall, exterior shows yard
      if (this.currentView === 'interior') {
        return p.region === 'floor' || p.region === 'wall'
      } else {
        return p.region === 'yard'
      }
    })

    // Sort by depth (bottom edge, then id)
    const sortedPlacements = [...viewPlacements].sort((a, b) => {
      // Get actual footprints from catalog for proper depth sorting
      const aFootprint = this.itemCatalog.get(a.itemId)?.footprint ?? { w: 2, h: 2 }
      const bFootprint = this.itemCatalog.get(b.itemId)?.footprint ?? { w: 2, h: 2 }
      const aBottom = a.y + aFootprint.h
      const bBottom = b.y + bFootprint.h
      if (aBottom !== bBottom) return aBottom - bBottom
      return a.id.localeCompare(b.id)
    })

    // Render each placement
    for (const placement of sortedPlacements) {
      this.renderPlacement(placement)
    }
  }

  /**
   * Render a single placement
   */
  private renderPlacement(placement: PlacementData): void {
    const region = this.getRegionConfig(placement.region)
    if (!region) return

    // Get actual footprint from catalog, fallback to 2x2
    const catalogItem = this.itemCatalog.get(placement.itemId)
    const footprint = catalogItem?.footprint ?? { w: 2, h: 2 }

    // Calculate pixel position based on region type
    let px: number
    let py: number
    let perspectiveScale = 1

    if (placement.region === 'floor' && this.currentView === 'interior') {
      // Use perspective positioning for floor items
      const floorPos = this.getFloorPosition(placement.x, placement.y, footprint)
      px = floorPos.x
      py = floorPos.y
      perspectiveScale = floorPos.scale
    } else {
      // Wall and yard use flat grid positioning
      px = region.x + placement.x * this.GRID_SIZE + (footprint.w * this.GRID_SIZE) / 2
      py = region.y + placement.y * this.GRID_SIZE + (footprint.h * this.GRID_SIZE) / 2
    }

    // Create container
    const container = this.add.container(px, py)

    // Grid-based dimensions for fallback (scaled by perspective)
    const gridWidth = footprint.w * this.GRID_SIZE * perspectiveScale
    const gridHeight = footprint.h * this.GRID_SIZE * perspectiveScale

    // Try to use sprite if texture exists
    const textureKey = placement.itemId
    let rect: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
    let label: Phaser.GameObjects.Text | null = null

    if (this.textures.exists(textureKey)) {
      // Use actual sprite
      const sprite = this.add.image(0, 0, textureKey)

      // Scale sprite to fill its footprint area nicely
      // With GRID_SIZE=32, a 2x2 footprint is 64x64 pixels
      const targetWidth = footprint.w * this.GRID_SIZE * 0.9 * perspectiveScale
      const targetHeight = footprint.h * this.GRID_SIZE * 0.9 * perspectiveScale

      // Scale to fit within footprint while maintaining aspect ratio
      const scaleX = targetWidth / sprite.width
      const scaleY = targetHeight / sprite.height
      const scale = Math.min(scaleX, scaleY)

      sprite.setScale(scale)

      // Position sprite so its bottom aligns with the grid position
      // This gives better visual grounding
      sprite.setOrigin(0.5, 0.85)

      rect = sprite
      container.add(sprite)
    } else {
      // Fallback to colored rectangle (scaled for perspective)
      const color = this.getPlacementColor(placement.itemId)
      const fallbackRect = this.add.rectangle(0, 0, gridWidth - 2, gridHeight - 2, color)
      fallbackRect.setStrokeStyle(1, 0xffffff, 0.5)
      rect = fallbackRect

      // Label only shown for fallback rectangles
      const fontSize = Math.max(6, Math.round(8 * perspectiveScale))
      label = this.add.text(0, 0, placement.itemId.slice(0, 8), {
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
      })
      label.setOrigin(0.5)
      container.add([fallbackRect, label])
    }

    // Add to appropriate layer
    const targetContainer = placement.region === 'wall'
      ? this.wallDecorContainer
      : placement.region === 'yard'
        ? this.furnitureContainer // outdoor uses furniture layer
        : this.furnitureContainer

    if (targetContainer) {
      targetContainer.add(container)
    }

    // Set depth based on grid Y position (items further back have lower depth)
    // For floor items with perspective, use the actual py position
    const depthValue = placement.region === 'floor'
      ? py * 10 + placement.id.charCodeAt(0) % 10
      : (placement.y + footprint.h) * 10 + placement.id.charCodeAt(0) % 10
    container.setDepth(depthValue)

    // Only make interactive in decorate mode
    if (this.decorateMode) {
      rect.setInteractive({ useHandCursor: true, draggable: true })

      rect.on('pointerdown', () => {
        if (this.ghostItemDef) return // Don't interact while placing
        bridge.emit('placementTapped', { placementId: placement.id })
      })

      rect.on('dragstart', () => {
        if (this.ghostItemDef) return
        this.startDragPlacement(placement.id)
      })

      rect.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (!this.draggingPlacement) return
        container.setPosition(px + dragX, py + dragY)

        // Calculate grid position
        const newGridX = Math.floor((px + dragX - region.x) / this.GRID_SIZE)
        const newGridY = Math.floor((py + dragY - region.y) / this.GRID_SIZE)

        bridge.emit('placementDragged', {
          placementId: placement.id,
          x: newGridX,
          y: newGridY,
        })
      })

      rect.on('dragend', () => {
        if (!this.draggingPlacement) return

        // Calculate final grid position
        const finalGridX = Math.floor((container.x - region.x) / this.GRID_SIZE)
        const finalGridY = Math.floor((container.y - region.y) / this.GRID_SIZE)

        bridge.emit('placementDropped', {
          placementId: placement.id,
          x: finalGridX,
          y: finalGridY,
        })

        this.draggingPlacement = null
      })
    }

    // Store reference
    const placedItem: PlacedItemSprite = {
      container,
      rect,
      label,
      placementId: placement.id,
      itemId: placement.itemId,
      region: placement.region,
      gridX: placement.x,
      gridY: placement.y,
      footprint,
    }

    this.placedItems.set(placement.id, placedItem)

    // Highlight if selected
    if (this.selectedPlacementId === placement.id) {
      if (rect instanceof Phaser.GameObjects.Rectangle) {
        rect.setStrokeStyle(2, 0xfbbf24)
      } else {
        rect.setTint(0xfbbf24)
      }
    }
  }

  /**
   * Get color for placement based on item category
   */
  private getPlacementColor(itemId: string): number {
    if (itemId.startsWith('furniture_')) return 0x8b5cf6 // Purple
    if (itemId.startsWith('decor_')) return 0x22c55e    // Green
    if (itemId.startsWith('rug_')) return 0xf59e0b     // Amber
    if (itemId.startsWith('wall_')) return 0x3b82f6    // Blue
    if (itemId.startsWith('surface_')) return 0xec4899 // Pink
    if (itemId.startsWith('outdoor_')) return 0x14b8a6 // Teal
    return 0x6b7280 // Gray default
  }

  /**
   * Begin ghost placement
   */
  private beginGhostInternal(itemDef: ItemDefForGhost): void {
    this.ghostItemDef = itemDef
    this.ghostValid = true
    this.ghostReason = ''

    // Determine region based on placement type
    if (itemDef.placement === 'wall') {
      this.ghostRegion = 'wall'
    } else if (itemDef.placement === 'outdoor') {
      this.ghostRegion = 'yard'
    } else {
      this.ghostRegion = 'floor'
    }

    // Create ghost container
    if (this.ghostContainer) {
      this.ghostContainer.destroy()
    }

    this.ghostContainer = this.add.container(0, 0)
    this.ghostContainer.setDepth(100)
    this.ghostContainer.setAlpha(0.7)

    // Create ghost rect
    const width = itemDef.footprint.w * this.GRID_SIZE
    const height = itemDef.footprint.h * this.GRID_SIZE
    const rect = this.add.rectangle(0, 0, width - 2, height - 2, 0x22c55e)
    rect.setStrokeStyle(2, 0x22c55e)

    // Label
    const label = this.add.text(0, height / 2 + 10, itemDef.name, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#00000080',
      padding: { x: 4, y: 2 },
    })
    label.setOrigin(0.5, 0)

    this.ghostContainer.add([rect, label])

    // Set up pointer tracking - use pointerdown for click-to-place (more reliable than pointerup)
    this.input.on('pointermove', this.handleGhostMove, this)
    this.input.on('pointerdown', this.handleGhostDrop, this)
    console.log('[HouseScene] Ghost event listeners attached')

    // Initialize ghost position at current pointer location
    const pointer = this.input.activePointer
    this.initializeGhostPosition(pointer.x, pointer.y, itemDef)
  }

  /**
   * Initialize ghost position from pointer coordinates
   */
  private initializeGhostPosition(pointerX: number, pointerY: number, itemDef: ItemDefForGhost): void {
    // Find which region the pointer is in
    const regions: ('floor' | 'wall' | 'yard')[] = ['floor', 'wall', 'yard']

    for (const regionId of regions) {
      const region = this.getRegionConfig(regionId)
      if (!region) continue

      if (
        pointerX >= region.x &&
        pointerX < region.x + region.width &&
        pointerY >= region.y &&
        pointerY < region.y + region.height
      ) {
        // Calculate grid position
        let gridX = Math.floor((pointerX - region.x) / this.GRID_SIZE)
        let gridY = Math.floor((pointerY - region.y) / this.GRID_SIZE)

        // Clamp to valid range considering footprint
        gridX = Math.max(0, Math.min(gridX, region.gridWidth - itemDef.footprint.w))
        gridY = Math.max(0, Math.min(gridY, region.gridHeight - itemDef.footprint.h))

        // Update ghost state
        this.ghostGridX = gridX
        this.ghostGridY = gridY
        this.ghostRegion = regionId

        // Position the ghost container
        const px = region.x + gridX * this.GRID_SIZE + (itemDef.footprint.w * this.GRID_SIZE) / 2
        const py = region.y + gridY * this.GRID_SIZE + (itemDef.footprint.h * this.GRID_SIZE) / 2
        this.ghostContainer?.setPosition(px, py)

        // Emit initial position to React for validation
        bridge.emit('ghostMoved', { x: gridX, y: gridY, region: regionId })
        return
      }
    }

    // If pointer isn't in any region, default to center of expected region
    const expectedRegion = this.getRegionConfig(this.ghostRegion)
    if (expectedRegion) {
      const gridX = Math.floor(expectedRegion.gridWidth / 2 - itemDef.footprint.w / 2)
      const gridY = Math.floor(expectedRegion.gridHeight / 2 - itemDef.footprint.h / 2)

      this.ghostGridX = gridX
      this.ghostGridY = gridY

      const px = expectedRegion.x + gridX * this.GRID_SIZE + (itemDef.footprint.w * this.GRID_SIZE) / 2
      const py = expectedRegion.y + gridY * this.GRID_SIZE + (itemDef.footprint.h * this.GRID_SIZE) / 2
      this.ghostContainer?.setPosition(px, py)

      // Emit initial position
      bridge.emit('ghostMoved', { x: gridX, y: gridY, region: this.ghostRegion })
    }
  }

  /**
   * End ghost placement
   */
  private endGhostInternal(): void {
    console.log('[HouseScene] endGhostInternal called')
    this.ghostItemDef = null

    if (this.ghostContainer) {
      this.ghostContainer.destroy()
      this.ghostContainer = null
    }

    this.input.off('pointermove', this.handleGhostMove, this)
    this.input.off('pointerdown', this.handleGhostDrop, this)
  }

  /**
   * Set ghost position from React
   */
  private setGhostPositionInternal(x: number, y: number, region: 'floor' | 'wall' | 'yard'): void {
    if (!this.ghostContainer || !this.ghostItemDef) return

    this.ghostGridX = x
    this.ghostGridY = y
    this.ghostRegion = region

    const regionConfig = this.getRegionConfig(region)
    if (!regionConfig) return

    // Calculate pixel position
    const px = regionConfig.x + x * this.GRID_SIZE + (this.ghostItemDef.footprint.w * this.GRID_SIZE) / 2
    const py = regionConfig.y + y * this.GRID_SIZE + (this.ghostItemDef.footprint.h * this.GRID_SIZE) / 2

    this.ghostContainer.setPosition(px, py)
  }

  /**
   * Update ghost appearance based on validity
   */
  private updateGhostAppearance(): void {
    if (!this.ghostContainer) return

    const rect = this.ghostContainer.getAt(0) as Phaser.GameObjects.Rectangle
    const label = this.ghostContainer.getAt(1) as Phaser.GameObjects.Text

    if (this.ghostValid) {
      rect.setFillStyle(0x22c55e, 0.6) // Green
      rect.setStrokeStyle(2, 0x22c55e)
      label.setText(this.ghostItemDef?.name ?? '')
    } else {
      rect.setFillStyle(0xef4444, 0.6) // Red
      rect.setStrokeStyle(2, 0xef4444)
      label.setText(this.ghostReason || 'Invalid')
    }
  }

  /**
   * Handle pointer move for ghost
   */
  private handleGhostMove(pointer: Phaser.Input.Pointer): void {
    if (!this.ghostContainer || !this.ghostItemDef) return

    // Find which region the pointer is in
    const regions: ('floor' | 'wall' | 'yard')[] = ['floor', 'wall', 'yard']
    let foundRegion: 'floor' | 'wall' | 'yard' | null = null
    let gridX = 0
    let gridY = 0

    for (const regionId of regions) {
      const region = this.getRegionConfig(regionId)
      if (!region) continue

      if (
        pointer.x >= region.x &&
        pointer.x < region.x + region.width &&
        pointer.y >= region.y &&
        pointer.y < region.y + region.height
      ) {
        foundRegion = regionId
        gridX = Math.floor((pointer.x - region.x) / this.GRID_SIZE)
        gridY = Math.floor((pointer.y - region.y) / this.GRID_SIZE)

        // Clamp to valid range considering footprint
        gridX = Math.max(0, Math.min(gridX, region.gridWidth - this.ghostItemDef.footprint.w))
        gridY = Math.max(0, Math.min(gridY, region.gridHeight - this.ghostItemDef.footprint.h))
        break
      }
    }

    if (foundRegion && (gridX !== this.ghostGridX || gridY !== this.ghostGridY || foundRegion !== this.ghostRegion)) {
      this.ghostGridX = gridX
      this.ghostGridY = gridY
      this.ghostRegion = foundRegion

      // Update position
      const region = this.getRegionConfig(foundRegion)!
      const px = region.x + gridX * this.GRID_SIZE + (this.ghostItemDef.footprint.w * this.GRID_SIZE) / 2
      const py = region.y + gridY * this.GRID_SIZE + (this.ghostItemDef.footprint.h * this.GRID_SIZE) / 2
      this.ghostContainer.setPosition(px, py)

      // Emit to React for validation
      bridge.emit('ghostMoved', { x: gridX, y: gridY, region: foundRegion })
    }
  }

  /**
   * Handle ghost drop (called on pointerdown for click-to-place)
   */
  private handleGhostDrop(_pointer: Phaser.Input.Pointer): void {
    if (!this.ghostItemDef) {
      console.log('[HouseScene] handleGhostDrop: no ghostItemDef, ignoring')
      return
    }

    console.log('[HouseScene] handleGhostDrop: emitting ghostDropped', {
      x: this.ghostGridX,
      y: this.ghostGridY,
      region: this.ghostRegion,
    })

    bridge.emit('ghostDropped', {
      x: this.ghostGridX,
      y: this.ghostGridY,
      region: this.ghostRegion,
    })
  }

  /**
   * Handle pointer down in decorate mode (for selecting/deselecting items)
   */
  private handleDecoratePointerDown(pointer: Phaser.Input.Pointer): void {
    console.log('[HouseScene] handleDecoratePointerDown, ghostItemDef:', !!this.ghostItemDef)
    if (this.ghostItemDef) return // Placing item - let handleGhostDrop handle it

    // Check if clicking on empty space
    const regions: ('floor' | 'wall' | 'yard')[] = ['floor', 'wall', 'yard']

    for (const regionId of regions) {
      const region = this.getRegionConfig(regionId)
      if (!region) continue

      if (
        pointer.x >= region.x &&
        pointer.x < region.x + region.width &&
        pointer.y >= region.y &&
        pointer.y < region.y + region.height
      ) {
        // Check if we clicked on an item
        let clickedItem = false
        this.placedItems.forEach(item => {
          const bounds = item.rect.getBounds()
          if (bounds.contains(pointer.x, pointer.y)) {
            clickedItem = true
          }
        })

        if (!clickedItem) {
          bridge.emit('emptyTapped', { region: regionId })
        }
        break
      }
    }
  }

  /**
   * Select a placement
   */
  private selectPlacementInternal(placementId: string | null): void {
    // Deselect previous
    if (this.selectedPlacementId) {
      const prev = this.placedItems.get(this.selectedPlacementId)
      if (prev && prev.rect instanceof Phaser.GameObjects.Rectangle) {
        prev.rect.setStrokeStyle(1, 0xffffff, 0.5)
      } else if (prev && prev.rect instanceof Phaser.GameObjects.Image) {
        prev.rect.clearTint()
      }
    }

    this.selectedPlacementId = placementId

    // Select new
    if (placementId) {
      const item = this.placedItems.get(placementId)
      if (item && item.rect instanceof Phaser.GameObjects.Rectangle) {
        item.rect.setStrokeStyle(2, 0xfbbf24) // Yellow highlight
      } else if (item && item.rect instanceof Phaser.GameObjects.Image) {
        item.rect.setTint(0xfbbf24) // Yellow tint for sprites
      }
    }
  }

  /**
   * Start dragging a placement
   */
  private startDragPlacement(placementId: string): void {
    const item = this.placedItems.get(placementId)
    if (!item) return

    this.draggingPlacement = item
    bridge.emit('placementDragStart', { placementId })
  }

  // ==========================================================================
  // AVATAR (Phase 4)
  // ==========================================================================

  /**
   * Catalog lookup function for AvatarComposer
   */
  private getCatalogItem = (id: string): CatalogItemForComposer | undefined => {
    return this.catalogItems.get(id)
  }

  /**
   * Update or create avatar sprite based on appearance
   */
  private updateAvatar(): void {
    // Destroy existing avatar
    if (this.avatarSprite) {
      this.avatarSprite.destroy()
      this.avatarSprite = null
    }

    // Don't create if no appearance or in decorate mode
    if (!this.avatarAppearance || this.decorateMode) {
      return
    }

    // Only show avatar in interior view
    if (this.currentView !== 'interior') {
      return
    }

    // Get default anchor from rooms.json
    const room = roomsData.rooms.main as { avatarAnchor?: { x: number; y: number; facing: string } }
    const defaultAnchor = room.avatarAnchor ?? { x: 160, y: 240, facing: 'down' }

    // Use custom anchor if set, otherwise default
    const anchor = this.avatarAnchor.x !== 0 ? this.avatarAnchor : {
      x: defaultAnchor.x,
      y: defaultAnchor.y,
      flipped: defaultAnchor.facing === 'left',
    }

    // Create avatar sprite
    this.avatarSprite = new AvatarSprite({
      scene: this,
      x: anchor.x,
      y: anchor.y,
      appearance: this.avatarAppearance,
      getCatalogItem: this.getCatalogItem,
      pose: this.avatarPose,
      flipped: anchor.flipped,
      usePlaceholderArt: true, // Use placeholders for now
      reducedMotion: this.reducedMotion,
    })

    // Add to character container if in decorate mode, otherwise effects container
    if (this.characterContainer) {
      this.characterContainer.add(this.avatarSprite)
    } else {
      this.avatarSprite.setDepth(35) // Same as character layer
    }

    // Set up tap handler
    this.avatarSprite.onTap(() => {
      bridge.emit('avatarTapped', {})
    })

    // Update visibility
    this.updateAvatarVisibility()

    // Update depth
    this.updateAvatarDepth()
  }

  /**
   * Update avatar pose and position
   */
  private updateAvatarPose(): void {
    if (!this.avatarSprite) return

    this.avatarSprite.setPose(this.avatarPose)
    this.avatarSprite.setFlipped(this.avatarAnchor.flipped)
    this.avatarSprite.setPosition(this.avatarAnchor.x, this.avatarAnchor.y)

    this.updateAvatarDepth()
  }

  /**
   * Play avatar reaction
   */
  private async playAvatarReaction(reaction: Reaction): Promise<void> {
    if (!this.avatarSprite) return

    await this.avatarSprite.playReaction(reaction)
    bridge.emit('reactionDone', { reaction })
  }

  /**
   * Update avatar visibility
   */
  private updateAvatarVisibility(): void {
    if (!this.avatarSprite) return

    // Hide in decorate mode or when explicitly hidden
    const visible = this.avatarVisible && !this.decorateMode && this.currentView === 'interior'
    this.avatarSprite.setVisible(visible)
  }

  /**
   * Update avatar depth for proper sorting with furniture
   */
  private updateAvatarDepth(): void {
    if (!this.avatarSprite) return

    // Depth based on bottom edge (same as furniture)
    const bottomY = this.avatarSprite.getBottomY()
    const depth = bottomY * 10

    this.avatarSprite.setDepth(depth)
  }

  /**
   * Update avatar when reduced motion changes
   */
  private updateAvatarReducedMotion(): void {
    if (!this.avatarSprite) return
    this.avatarSprite.setReducedMotion(this.reducedMotion)
  }
}
