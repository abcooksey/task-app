import Phaser from 'phaser'
import { bridge, type HouseState, type PlacementData, type ItemDefForGhost, type FinishState, type AvatarAnchor } from '../bridge'
import { AvatarSprite } from '../sprites/AvatarSprite'
import type { Appearance, Pose, Reaction } from '../avatar/types'
import type { CatalogItemForComposer } from '../avatar/types'
import hotspotsData from '../content/hotspots.json'
import repairsData from '../content/repairs.json'
import roomsData from '../content/rooms.json'
import manifestData from '../content/manifest.json'

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

  // Grid size
  private readonly GRID_SIZE = 16

  // Avatar state (Phase 4)
  private avatarSprite: AvatarSprite | null = null
  private avatarAppearance: Appearance | null = null
  private avatarPose: Pose = 'stand'
  private avatarAnchor: AvatarAnchor = { x: 160, y: 240, flipped: false }
  private avatarVisible = true
  private catalogItems: Map<string, CatalogItemForComposer> = new Map()

  constructor() {
    super({ key: 'HouseScene' })
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

    // Create container for hotspots
    this.hotspotsContainer = this.add.container(0, 0)

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

    // Decorate mode commands
    bridge.on('setPlacements', ({ placements }) => {
      this.placements = placements
      if (this.decorateMode) {
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
   * Render the current view (placeholder version)
   */
  private renderScene(): void {
    // Clear existing background
    if (this.background) {
      this.background.destroy()
    }
    if (this.viewLabel) {
      this.viewLabel.destroy()
    }

    const { width, height } = this.scale

    // Placeholder background based on view
    const bgColor = this.currentView === 'interior' ? 0x2d2d44 : 0x3d5a3d
    this.background = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      bgColor
    )

    // View label (temporary, for development)
    this.viewLabel = this.add.text(
      width / 2,
      height / 2 - 100,
      this.currentView === 'interior' ? 'INTERIOR VIEW' : 'EXTERIOR VIEW',
      {
        fontSize: '20px',
        color: '#666666',
        fontFamily: 'system-ui, sans-serif',
      }
    )
    this.viewLabel.setOrigin(0.5)
    this.viewLabel.setAlpha(0.5)

    // Recreate hotspots for new view
    this.createHotspots()

    // Update avatar for view change
    this.updateAvatar()
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

    // Clear existing decorate containers
    this.clearDecorateMode()

    const { width, height } = this.scale

    // Create background
    if (this.background) {
      this.background.destroy()
    }
    const bgColor = this.currentView === 'interior' ? 0x2d2d44 : 0x3d5a3d
    this.background = this.add.rectangle(width / 2, height / 2, width, height, bgColor)
    this.background.setDepth(0)

    // Create layer containers in proper order
    this.floorBaseContainer = this.add.container(0, 0)
    this.floorBaseContainer.setDepth(10)

    this.rugContainer = this.add.container(0, 0)
    this.rugContainer.setDepth(20)

    this.furnitureContainer = this.add.container(0, 0)
    this.furnitureContainer.setDepth(30)

    // Character layer (Phase 4: avatar, body double)
    this.characterContainer = this.add.container(0, 0)
    this.characterContainer.setDepth(35)

    this.wallBaseContainer = this.add.container(0, 0)
    this.wallBaseContainer.setDepth(40)

    this.wallDecorContainer = this.add.container(0, 0)
    this.wallDecorContainer.setDepth(50)

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
   * Clear decorate mode elements
   */
  private clearDecorateMode(): void {
    this.placedItems.forEach(item => item.container.destroy())
    this.placedItems.clear()

    this.floorBaseContainer?.destroy()
    this.rugContainer?.destroy()
    this.furnitureContainer?.destroy()
    this.characterContainer?.destroy()
    this.wallBaseContainer?.destroy()
    this.wallDecorContainer?.destroy()
    this.gridOverlay?.destroy()

    this.floorBaseContainer = null
    this.rugContainer = null
    this.furnitureContainer = null
    this.characterContainer = null
    this.wallBaseContainer = null
    this.wallDecorContainer = null
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
   */
  private renderGridOverlay(): void {
    if (!this.gridOverlay) return
    this.gridOverlay.removeAll(true)

    const regions: ('floor' | 'wall' | 'yard')[] = ['floor', 'wall', 'yard']

    for (const regionId of regions) {
      const region = this.getRegionConfig(regionId)
      if (!region) continue

      // Draw grid dots at intersections
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
      // Get footprints (we'd need item defs, for now assume 2x2)
      const aBottom = a.y + 2 // placeholder
      const bBottom = b.y + 2
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

    // Placeholder footprint (in real impl, get from catalog)
    const footprint = { w: 2, h: 2 }

    // Calculate pixel position
    const px = region.x + placement.x * this.GRID_SIZE + (footprint.w * this.GRID_SIZE) / 2
    const py = region.y + placement.y * this.GRID_SIZE + (footprint.h * this.GRID_SIZE) / 2

    // Create container
    const container = this.add.container(px, py)

    // Grid-based dimensions for fallback
    const gridWidth = footprint.w * this.GRID_SIZE
    const gridHeight = footprint.h * this.GRID_SIZE

    // Try to use sprite if texture exists
    const textureKey = placement.itemId
    let rect: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
    let label: Phaser.GameObjects.Text | null = null

    if (this.textures.exists(textureKey)) {
      // Use actual sprite
      const sprite = this.add.image(0, 0, textureKey)

      // Scale sprite to fit grid cell while maintaining aspect ratio
      const scaleX = gridWidth / sprite.width
      const scaleY = gridHeight / sprite.height
      const scale = Math.min(scaleX, scaleY) * 0.9 // 90% to leave some padding

      sprite.setScale(scale)
      rect = sprite
      container.add(sprite)
    } else {
      // Fallback to colored rectangle
      const color = this.getPlacementColor(placement.itemId)
      const fallbackRect = this.add.rectangle(0, 0, gridWidth - 2, gridHeight - 2, color)
      fallbackRect.setStrokeStyle(1, 0xffffff, 0.5)
      rect = fallbackRect

      // Label only shown for fallback rectangles
      label = this.add.text(0, 0, placement.itemId.slice(0, 8), {
        fontSize: '8px',
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

    // Set depth based on bottom edge
    const bottomEdge = placement.y + footprint.h
    container.setDepth(bottomEdge * 10 + placement.id.charCodeAt(0) % 10)

    // Make interactive
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

    // Set up pointer tracking
    this.input.on('pointermove', this.handleGhostMove, this)
    this.input.on('pointerup', this.handleGhostDrop, this)
  }

  /**
   * End ghost placement
   */
  private endGhostInternal(): void {
    this.ghostItemDef = null

    if (this.ghostContainer) {
      this.ghostContainer.destroy()
      this.ghostContainer = null
    }

    this.input.off('pointermove', this.handleGhostMove, this)
    this.input.off('pointerup', this.handleGhostDrop, this)
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
   * Handle ghost drop
   */
  private handleGhostDrop(): void {
    if (!this.ghostItemDef) return

    bridge.emit('ghostDropped', {
      x: this.ghostGridX,
      y: this.ghostGridY,
      region: this.ghostRegion,
    })
  }

  /**
   * Handle pointer down in decorate mode
   */
  private handleDecoratePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.ghostItemDef) return // Placing item

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
