/**
 * AvatarSprite - Phaser game object for rendering the avatar.
 *
 * Composes avatar layers using AvatarComposer.resolve() and handles:
 * - Layer stacking in correct order
 * - Placeholder rendering when textures missing
 * - Idle breathe animation (2-4 frame)
 * - Sit pose (static)
 * - Reaction animations (cheer, nod)
 * - Horizontal flipping
 * - Tap events
 */

import Phaser from 'phaser'
import { resolve, type CatalogLookup, type TextureExistsCheck } from '../avatar/AvatarComposer'
import type { Appearance, Pose, Reaction, Layer, LayerName } from '../avatar/types'
import { PLACEHOLDER_PREFIX } from '../avatar/constants'

// Animation constants
const IDLE_BREATHE_DURATION = 2000 // ms for full breathe cycle
const IDLE_BREATHE_AMOUNT = 2 // pixels of vertical movement
const REACTION_DURATION = {
  cheer: 500,
  nod: 400,
}

// Placeholder colors for each layer (when no texture available)
const PLACEHOLDER_COLORS: Record<LayerName, number> = {
  hair_back: 0x8b4513,  // Brown
  body: 0xffdbac,       // Skin tone
  eyes: 0x3b82f6,       // Blue
  bottom: 0x4b5563,     // Gray (pants)
  shoes: 0x1f2937,      // Dark gray
  top: 0x22c55e,        // Green (shirt)
  hair_front: 0x8b4513, // Brown
  accessory: 0xfbbf24,  // Yellow
}

// Placeholder sizes for each layer
const PLACEHOLDER_SIZES: Record<LayerName, { w: number; h: number }> = {
  hair_back: { w: 20, h: 16 },
  body: { w: 24, h: 40 },
  eyes: { w: 16, h: 6 },
  bottom: { w: 20, h: 16 },
  shoes: { w: 18, h: 8 },
  top: { w: 22, h: 18 },
  hair_front: { w: 20, h: 12 },
  accessory: { w: 16, h: 8 },
}

// Placeholder Y offsets relative to avatar center
const PLACEHOLDER_Y_OFFSETS: Record<LayerName, number> = {
  hair_back: -22,
  body: 0,
  eyes: -14,
  bottom: 10,
  shoes: 24,
  top: -4,
  hair_front: -18,
  accessory: -24,
}

export interface AvatarSpriteConfig {
  scene: Phaser.Scene
  x: number
  y: number
  appearance: Appearance
  getCatalogItem: CatalogLookup
  pose?: Pose
  flipped?: boolean
  usePlaceholderArt?: boolean
  reducedMotion?: boolean
}

export class AvatarSprite extends Phaser.GameObjects.Container {
  private appearance: Appearance
  private getCatalogItem: CatalogLookup
  private currentPose: Pose
  private isFlipped: boolean
  private usePlaceholderArt: boolean
  private reducedMotion: boolean

  private layerSprites: Map<LayerName, Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image> = new Map()
  private breatheTween: Phaser.Tweens.Tween | null = null
  private reactionTween: Phaser.Tweens.Tween | null = null
  private currentReaction: Reaction | null = null

  private hitArea: Phaser.GameObjects.Rectangle

  constructor(config: AvatarSpriteConfig) {
    super(config.scene, config.x, config.y)

    this.appearance = config.appearance
    this.getCatalogItem = config.getCatalogItem
    this.currentPose = config.pose ?? 'stand'
    this.isFlipped = config.flipped ?? false
    this.usePlaceholderArt = config.usePlaceholderArt ?? true
    this.reducedMotion = config.reducedMotion ?? false

    // Create hit area for tap detection
    this.hitArea = this.scene.add.rectangle(0, 0, 40, 56, 0x000000, 0)
    this.hitArea.setInteractive({ useHandCursor: true })
    this.add(this.hitArea)

    // Build initial layers
    this.rebuildLayers()

    // Start idle animation if standing
    if (this.currentPose === 'stand' && !this.reducedMotion) {
      this.startIdleAnimation()
    }

    // Add to scene
    this.scene.add.existing(this)
  }

  /**
   * Check if a texture exists in the scene
   */
  private textureExists: TextureExistsCheck = (key: string) => {
    return this.scene.textures.exists(key) && key !== ''
  }

  /**
   * Rebuild all layer sprites from appearance
   */
  private rebuildLayers(): void {
    // Clear existing layers
    this.layerSprites.forEach(sprite => sprite.destroy())
    this.layerSprites.clear()

    // Resolve appearance to layers
    const layers = resolve({
      appearance: this.appearance,
      getCatalogItem: this.getCatalogItem,
      textureExists: this.textureExists,
      pose: this.currentPose,
      frame: 0,
      reaction: this.currentReaction ?? undefined,
      flipped: this.isFlipped,
      usePlaceholderArt: this.usePlaceholderArt,
    })

    // Create sprites for each layer
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      const sprite = this.createLayerSprite(layer, i)
      this.layerSprites.set(layer.layerName, sprite)
      this.add(sprite)
    }

    // Make sure hit area is on top
    this.bringToTop(this.hitArea)
  }

  /**
   * Create a sprite for a single layer
   */
  private createLayerSprite(layer: Layer, depth: number): Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image {
    const { layerName, textureKey, isPlaceholder, flipped } = layer

    if (isPlaceholder || textureKey.startsWith(PLACEHOLDER_PREFIX) || !this.textureExists(textureKey)) {
      // Create placeholder rectangle
      const size = PLACEHOLDER_SIZES[layerName]
      const color = PLACEHOLDER_COLORS[layerName]
      const yOffset = PLACEHOLDER_Y_OFFSETS[layerName]

      const rect = this.scene.add.rectangle(0, yOffset, size.w, size.h, color)
      rect.setStrokeStyle(1, 0xffffff, 0.3)
      rect.setDepth(depth)

      if (flipped) {
        rect.setScale(-1, 1)
      }

      return rect
    }

    // Create actual sprite
    const sprite = this.scene.add.image(0, 0, textureKey)
    sprite.setDepth(depth)

    if (flipped) {
      sprite.setFlipX(true)
    }

    return sprite
  }

  /**
   * Update appearance and rebuild
   */
  setAppearance(appearance: Appearance): void {
    this.appearance = appearance
    this.rebuildLayers()
  }

  /**
   * Set pose (stand or sit)
   */
  setPose(pose: Pose): void {
    if (this.currentPose === pose) return

    this.currentPose = pose
    this.rebuildLayers()

    // Handle animation changes
    if (pose === 'stand' && !this.reducedMotion) {
      this.startIdleAnimation()
    } else {
      this.stopIdleAnimation()
    }
  }

  /**
   * Set flipped state
   */
  setFlipped(flipped: boolean): void {
    if (this.isFlipped === flipped) return

    this.isFlipped = flipped
    this.rebuildLayers()
  }

  /**
   * Set reduced motion preference
   */
  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion

    if (reducedMotion) {
      this.stopIdleAnimation()
      this.stopReaction()
    } else if (this.currentPose === 'stand') {
      this.startIdleAnimation()
    }
  }

  /**
   * Start idle breathe animation
   */
  private startIdleAnimation(): void {
    if (this.breatheTween || this.reducedMotion) return

    this.breatheTween = this.scene.tweens.add({
      targets: this,
      y: this.y - IDLE_BREATHE_AMOUNT,
      duration: IDLE_BREATHE_DURATION / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  /**
   * Stop idle animation
   */
  private stopIdleAnimation(): void {
    if (this.breatheTween) {
      this.breatheTween.stop()
      this.breatheTween = null
    }
  }

  /**
   * Play a reaction animation
   */
  playReaction(reaction: Reaction): Promise<void> {
    return new Promise((resolve) => {
      if (this.reducedMotion) {
        resolve()
        return
      }

      // Stop any current reaction
      this.stopReaction()

      this.currentReaction = reaction
      const duration = REACTION_DURATION[reaction]

      // Rebuild layers with reaction
      this.rebuildLayers()

      // Play reaction animation
      switch (reaction) {
        case 'cheer':
          // Jump animation
          this.reactionTween = this.scene.tweens.add({
            targets: this,
            y: this.y - 12,
            duration: duration / 2,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
              this.currentReaction = null
              this.rebuildLayers()
              resolve()
            },
          })
          break

        case 'nod':
          // Small vertical bob
          this.reactionTween = this.scene.tweens.add({
            targets: this,
            y: this.y + 3,
            duration: duration / 3,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              this.currentReaction = null
              this.rebuildLayers()
              resolve()
            },
          })
          break
      }
    })
  }

  /**
   * Stop any current reaction
   */
  private stopReaction(): void {
    if (this.reactionTween) {
      this.reactionTween.stop()
      this.reactionTween = null
    }
    this.currentReaction = null
  }

  /**
   * Set up tap handler
   */
  onTap(callback: () => void): void {
    this.hitArea.on('pointerdown', callback)
  }

  /**
   * Remove tap handler
   */
  offTap(callback: () => void): void {
    this.hitArea.off('pointerdown', callback)
  }

  /**
   * Get the bottom y position for depth sorting
   */
  getBottomY(): number {
    return this.y + 28 // Approximate bottom of avatar
  }

  /**
   * Clean up
   */
  destroy(fromScene?: boolean): void {
    this.stopIdleAnimation()
    this.stopReaction()
    this.layerSprites.forEach(sprite => sprite.destroy())
    this.layerSprites.clear()
    super.destroy(fromScene)
  }
}
