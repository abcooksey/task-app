import { describe, it, expect } from 'vitest'
import { resolve, createResolver, getOutfitDescription } from './AvatarComposer'
import type { Appearance, CatalogItemForComposer } from './types'
import { LAYER_ORDER } from './types'
import {
  DEFAULT_STARTER_TOP,
  DEFAULT_STARTER_BOTTOM,
  DEFAULT_STARTER_SHOES,
} from './constants'

// =============================================================================
// Test Fixtures
// =============================================================================

const makeAppearance = (overrides: Partial<Appearance> = {}): Appearance => ({
  skin: 'skin_medium',
  eyes: 'eyes_brown',
  hair: {
    styleId: 'hair_short',
    colorId: 'hair_black',
  },
  top: 'starter_tee_grey',
  bottom: 'starter_pants_blue',
  shoes: 'starter_sneakers_white',
  ...overrides,
})

const makeCatalogItem = (
  id: string,
  overrides: Partial<CatalogItemForComposer> = {}
): CatalogItemForComposer => ({
  id,
  textureKey: id,
  placement: 'wearable',
  layers: ['top'],
  frames: {
    idle: `${id}_idle`,
    sit: `${id}_sit`,
  },
  ...overrides,
})

// Default catalog items for testing
const testCatalogItems: Record<string, CatalogItemForComposer> = {
  starter_tee_grey: makeCatalogItem('starter_tee_grey', { layers: ['top'] }),
  starter_tee_white: makeCatalogItem('starter_tee_white', { layers: ['top'] }),
  starter_pants_blue: makeCatalogItem('starter_pants_blue', { layers: ['bottom'] }),
  starter_pants_black: makeCatalogItem('starter_pants_black', { layers: ['bottom'] }),
  starter_sneakers_white: makeCatalogItem('starter_sneakers_white', { layers: ['shoes'] }),
  starter_sneakers_black: makeCatalogItem('starter_sneakers_black', { layers: ['shoes'] }),
  top_hoodie: makeCatalogItem('top_hoodie', {
    layers: ['top'],
    hidesHair: true,
    frames: { idle: 'top_hoodie_idle', sit: 'top_hoodie_sit' },
  }),
  top_coat_winter: makeCatalogItem('top_coat_winter', {
    layers: ['top'],
    hidesAccessory: true,
    frames: { idle: 'top_coat_winter_idle', sit: 'top_coat_winter_sit' },
  }),
  acc_beanie: makeCatalogItem('acc_beanie', {
    layers: ['accessory'],
    hidesHair: true,
    frames: { idle: 'acc_beanie_idle', sit: 'acc_beanie_sit' },
  }),
  acc_glasses_round: makeCatalogItem('acc_glasses_round', {
    layers: ['accessory'],
    frames: { idle: 'acc_glasses_round_idle', sit: 'acc_glasses_round_sit' },
  }),
  bottom_jeans_dark: makeCatalogItem('bottom_jeans_dark', {
    layers: ['bottom'],
    frames: { idle: 'bottom_jeans_dark_idle', sit: 'bottom_jeans_dark_sit' },
  }),
  shoes_boots_ankle: makeCatalogItem('shoes_boots_ankle', {
    layers: ['shoes'],
    frames: { idle: 'shoes_boots_ankle_idle', sit: 'shoes_boots_ankle_sit' },
  }),
  // Item with reaction frames
  top_fancy: makeCatalogItem('top_fancy', {
    layers: ['top'],
    frames: {
      idle: 'top_fancy_idle',
      sit: 'top_fancy_sit',
      cheer: 'top_fancy_cheer',
      nod: 'top_fancy_nod',
    },
  }),
  // Item without sit frame (should fall back to idle)
  top_minimal: makeCatalogItem('top_minimal', {
    layers: ['top'],
    frames: {
      idle: 'top_minimal_idle',
      sit: '', // Empty sit frame
    },
  }),
}

// Mock texture existence check
const allTexturesExist: (key: string) => boolean = () => true
const noTexturesExist: (key: string) => boolean = () => false
const selectiveTextureExists = (existing: Set<string>) => (key: string) =>
  existing.has(key)

// Mock catalog lookup
const getCatalogItem = (id: string): CatalogItemForComposer | undefined =>
  testCatalogItems[id]

// =============================================================================
// Tests: Layer Order
// =============================================================================

describe('AvatarComposer', () => {
  describe('Layer Order', () => {
    it('returns layers in correct order: hair_back → body → eyes → bottom → shoes → top → hair_front → accessory', () => {
      const appearance = makeAppearance({
        accessory: 'acc_glasses_round',
      })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      const layerNames = layers.map((l) => l.layerName)
      expect(layerNames).toEqual([
        'hair_back',
        'body',
        'eyes',
        'bottom',
        'shoes',
        'top',
        'hair_front',
        'accessory',
      ])
    })

    it('matches LAYER_ORDER constant (without accessory when not equipped)', () => {
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      // Without accessory, should have 7 layers
      expect(layers).toHaveLength(7)

      // Layer order should match (minus accessory)
      const expectedOrder = LAYER_ORDER.filter((l) => l !== 'accessory')
      expect(layers.map((l) => l.layerName)).toEqual(expectedOrder)
    })

    it('omits accessory layer when no accessory is equipped', () => {
      const appearance = makeAppearance({ accessory: undefined })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      expect(layers.find((l) => l.layerName === 'accessory')).toBeUndefined()
    })
  })

  // =============================================================================
  // Tests: Hide Rules
  // =============================================================================

  describe('Hide Rules', () => {
    it('omits hair layers when top has hidesHair: true', () => {
      const appearance = makeAppearance({ top: 'top_hoodie' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      const layerNames = layers.map((l) => l.layerName)
      expect(layerNames).not.toContain('hair_back')
      expect(layerNames).not.toContain('hair_front')
      expect(layerNames).toContain('body')
      expect(layerNames).toContain('top')
    })

    it('omits hair layers when accessory has hidesHair: true', () => {
      const appearance = makeAppearance({ accessory: 'acc_beanie' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      const layerNames = layers.map((l) => l.layerName)
      expect(layerNames).not.toContain('hair_back')
      expect(layerNames).not.toContain('hair_front')
      expect(layerNames).toContain('accessory')
    })

    it('omits accessory layer when top has hidesAccessory: true', () => {
      const appearance = makeAppearance({
        top: 'top_coat_winter',
        accessory: 'acc_glasses_round',
      })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      const layerNames = layers.map((l) => l.layerName)
      expect(layerNames).not.toContain('accessory')
      expect(layerNames).toContain('top')
    })

    it('keeps hair visible when top does not hide hair', () => {
      const appearance = makeAppearance({ top: 'starter_tee_grey' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      const layerNames = layers.map((l) => l.layerName)
      expect(layerNames).toContain('hair_back')
      expect(layerNames).toContain('hair_front')
    })
  })

  // =============================================================================
  // Tests: Pose and Frames
  // =============================================================================

  describe('Pose and Frames', () => {
    it('uses idle frame key for stand pose', () => {
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      const topLayer = layers.find((l) => l.layerName === 'top')
      expect(topLayer?.textureKey).toBe('starter_tee_grey_idle')
    })

    it('uses sit frame key for sit pose', () => {
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'sit',
        frame: 0,
      })

      const topLayer = layers.find((l) => l.layerName === 'top')
      expect(topLayer?.textureKey).toBe('starter_tee_grey_sit')
    })

    it('uses reaction frame when reaction is specified', () => {
      const appearance = makeAppearance({ top: 'top_fancy' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
        reaction: 'cheer',
      })

      const topLayer = layers.find((l) => l.layerName === 'top')
      expect(topLayer?.textureKey).toBe('top_fancy_cheer')
    })

    it('falls back to idle when reaction frame is not available', () => {
      const appearance = makeAppearance({ top: 'starter_tee_grey' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
        reaction: 'cheer', // starter_tee_grey has no cheer frame
      })

      const topLayer = layers.find((l) => l.layerName === 'top')
      expect(topLayer?.textureKey).toBe('starter_tee_grey_idle')
    })

    it('falls back to idle when sit frame is empty', () => {
      const appearance = makeAppearance({ top: 'top_minimal' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'sit',
        frame: 0,
      })

      const topLayer = layers.find((l) => l.layerName === 'top')
      expect(topLayer?.textureKey).toBe('top_minimal_idle')
    })

    it('passes frame index to all layers', () => {
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 3,
      })

      layers.forEach((layer) => {
        expect(layer.frameIndex).toBe(3)
      })
    })
  })

  // =============================================================================
  // Tests: Flipped
  // =============================================================================

  describe('Flipped', () => {
    it('sets flipped: false by default', () => {
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      layers.forEach((layer) => {
        expect(layer.flipped).toBe(false)
      })
    })

    it('sets flipped: true when flipped option is true', () => {
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
        flipped: true,
      })

      layers.forEach((layer) => {
        expect(layer.flipped).toBe(true)
      })
    })
  })

  // =============================================================================
  // Tests: Fallbacks
  // =============================================================================

  describe('Fallbacks', () => {
    it('falls back to starter top when catalog item not found', () => {
      const appearance = makeAppearance({ top: 'nonexistent_top' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      const topLayer = layers.find((l) => l.layerName === 'top')
      expect(topLayer?.textureKey).toBe(`${DEFAULT_STARTER_TOP}_idle`)
    })

    it('falls back to starter bottom when catalog item not found', () => {
      const appearance = makeAppearance({ bottom: 'nonexistent_bottom' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      const bottomLayer = layers.find((l) => l.layerName === 'bottom')
      expect(bottomLayer?.textureKey).toBe(`${DEFAULT_STARTER_BOTTOM}_idle`)
    })

    it('falls back to starter shoes when catalog item not found', () => {
      const appearance = makeAppearance({ shoes: 'nonexistent_shoes' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      const shoesLayer = layers.find((l) => l.layerName === 'shoes')
      expect(shoesLayer?.textureKey).toBe(`${DEFAULT_STARTER_SHOES}_idle`)
    })

    it('creates placeholder layer when texture does not exist', () => {
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: noTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      // All layers should be placeholders
      layers.forEach((layer) => {
        expect(layer.isPlaceholder).toBe(true)
        expect(layer.textureKey).toMatch(/^placeholder_/)
      })
    })

    it('creates placeholder for specific missing texture', () => {
      const existing = new Set(['starter_tee_grey_idle', 'starter_pants_blue_idle'])
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: selectiveTextureExists(existing),
        pose: 'stand',
        frame: 0,
      })

      // Top and bottom should not be placeholders
      const topLayer = layers.find((l) => l.layerName === 'top')
      expect(topLayer?.isPlaceholder).toBeFalsy()

      // Shoes should be placeholder (not in existing set)
      const shoesLayer = layers.find((l) => l.layerName === 'shoes')
      expect(shoesLayer?.isPlaceholder).toBe(true)
    })
  })

  // =============================================================================
  // Tests: Placeholder Mode
  // =============================================================================

  describe('Placeholder Mode', () => {
    it('creates all placeholders when usePlaceholderArt is true', () => {
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
        usePlaceholderArt: true,
      })

      layers.forEach((layer) => {
        expect(layer.isPlaceholder).toBe(true)
        expect(layer.textureKey).toMatch(/^placeholder_/)
      })
    })

    it('placeholder texture keys match layer names', () => {
      const appearance = makeAppearance({ accessory: 'acc_glasses_round' })

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
        usePlaceholderArt: true,
      })

      layers.forEach((layer) => {
        expect(layer.textureKey).toBe(`placeholder_${layer.layerName}`)
      })
    })
  })

  // =============================================================================
  // Tests: Never Throws
  // =============================================================================

  describe('Never Throws', () => {
    it('returns valid array with empty appearance', () => {
      const appearance = {} as Appearance

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      expect(Array.isArray(layers)).toBe(true)
      expect(layers.length).toBeGreaterThan(0)
    })

    it('returns valid array when getCatalogItem always returns undefined', () => {
      const appearance = makeAppearance()

      const layers = resolve({
        appearance,
        getCatalogItem: () => undefined,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      expect(Array.isArray(layers)).toBe(true)
      // Should still have layers (placeholders)
      expect(layers.length).toBeGreaterThan(0)
    })

    it('handles null hair object gracefully', () => {
      const appearance = {
        ...makeAppearance(),
        hair: null as unknown as Appearance['hair'],
      }

      const layers = resolve({
        appearance,
        getCatalogItem,
        textureExists: allTexturesExist,
        pose: 'stand',
        frame: 0,
      })

      expect(Array.isArray(layers)).toBe(true)
    })
  })

  // =============================================================================
  // Tests: createResolver
  // =============================================================================

  describe('createResolver', () => {
    it('creates a resolver function with pre-bound dependencies', () => {
      const resolver = createResolver(getCatalogItem, allTexturesExist)
      const appearance = makeAppearance()

      const layers = resolver(appearance, 'stand', 0)

      expect(Array.isArray(layers)).toBe(true)
      expect(layers.length).toBeGreaterThan(0)
    })

    it('resolver supports reaction option', () => {
      const resolver = createResolver(getCatalogItem, allTexturesExist)
      const appearance = makeAppearance({ top: 'top_fancy' })

      const layers = resolver(appearance, 'stand', 0, { reaction: 'cheer' })

      const topLayer = layers.find((l) => l.layerName === 'top')
      expect(topLayer?.textureKey).toBe('top_fancy_cheer')
    })

    it('resolver supports flipped option', () => {
      const resolver = createResolver(getCatalogItem, allTexturesExist)
      const appearance = makeAppearance()

      const layers = resolver(appearance, 'stand', 0, { flipped: true })

      layers.forEach((layer) => {
        expect(layer.flipped).toBe(true)
      })
    })

    it('resolver with placeholder mode creates all placeholders', () => {
      const resolver = createResolver(getCatalogItem, allTexturesExist, true)
      const appearance = makeAppearance()

      const layers = resolver(appearance, 'stand', 0)

      layers.forEach((layer) => {
        expect(layer.isPlaceholder).toBe(true)
      })
    })
  })

  // =============================================================================
  // Tests: getOutfitDescription
  // =============================================================================

  describe('getOutfitDescription', () => {
    it('returns wearing description with all items', () => {
      const appearance = makeAppearance({ accessory: 'acc_glasses_round' })

      const description = getOutfitDescription(appearance, getCatalogItem)

      expect(description).toContain('Wearing')
      expect(description).toContain('hair_short') // Includes hair
    })

    it('does not include accessory when not equipped', () => {
      const appearance = makeAppearance({ accessory: undefined })

      const description = getOutfitDescription(appearance, getCatalogItem)

      expect(description).not.toContain('acc_')
    })

    it('uses textureKey as fallback when item not found', () => {
      const appearance = makeAppearance({ top: 'unknown_top' })

      const description = getOutfitDescription(appearance, getCatalogItem)

      expect(description).toContain('unknown_top')
    })
  })
})
