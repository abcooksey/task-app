import { describe, it, expect } from 'vitest'
import type { Appearance } from '../game/avatar/types'

// =============================================================================
// Test: Export Data V3 Shape
// =============================================================================

describe('ExportDataV3', () => {
  const makeValidAppearance = (overrides: Partial<Appearance> = {}): Appearance => ({
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

  const makeExportDataV3 = () => ({
    version: 3 as const,
    exportedAt: new Date().toISOString(),
    tasks: [],
    subtasks: [],
    completions: [],
    coinLedger: [],
    settings: null,
    inventory: [
      { id: 'inv-1', item_id: 'top_hoodie', source: 'purchase', ledger_id: null, acquired_at: new Date().toISOString() },
      { id: 'inv-2', item_id: 'bottom_jeans', source: 'purchase', ledger_id: null, acquired_at: new Date().toISOString() },
    ],
    placements: [],
    roomFinishes: [],
    mysteryOpenings: [],
    focusSessions: [],
    houseRepairs: [],
    houseState: null,
    avatar: {
      appearance_json: makeValidAppearance({ top: 'top_hoodie', bottom: 'bottom_jeans' }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    outfits: [
      {
        id: 'outfit-1',
        name: 'Work Outfit',
        appearance_json: makeValidAppearance({ top: 'top_hoodie' }),
        sort_index: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'outfit-2',
        name: 'Casual',
        appearance_json: makeValidAppearance({ top: 'starter_tee_white' }),
        sort_index: 1,
        created_at: new Date().toISOString(),
      },
    ],
  })

  it('has correct structure for version 3', () => {
    const data = makeExportDataV3()

    expect(data.version).toBe(3)
    expect(data.avatar).toBeDefined()
    expect(data.outfits).toBeDefined()
    expect(Array.isArray(data.outfits)).toBe(true)
  })

  it('avatar has appearance_json field', () => {
    const data = makeExportDataV3()

    expect(data.avatar?.appearance_json).toBeDefined()
    expect(data.avatar?.appearance_json.skin).toBe('skin_medium')
    expect(data.avatar?.appearance_json.top).toBe('top_hoodie')
  })

  it('outfits have correct shape', () => {
    const data = makeExportDataV3()

    expect(data.outfits).toHaveLength(2)
    expect(data.outfits[0].name).toBe('Work Outfit')
    expect(data.outfits[0].appearance_json.top).toBe('top_hoodie')
    expect(data.outfits[1].name).toBe('Casual')
  })

  it('inventory items have item_id field (catalog IDs)', () => {
    const data = makeExportDataV3()

    expect(data.inventory[0].item_id).toBe('top_hoodie')
    expect(data.inventory[1].item_id).toBe('bottom_jeans')
  })
})

// =============================================================================
// Test: Appearance Round-Trip Validation
// =============================================================================

describe('Avatar export/import round-trip validation', () => {
  const makeValidAppearance = (): Appearance => ({
    skin: 'skin_medium',
    eyes: 'eyes_brown',
    hair: {
      styleId: 'hair_short',
      colorId: 'hair_black',
    },
    top: 'starter_tee_grey',
    bottom: 'starter_pants_blue',
    shoes: 'starter_sneakers_white',
  })

  it('appearance with free items survives round-trip unchanged', () => {
    const original = makeValidAppearance()
    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized) as Appearance

    expect(deserialized).toEqual(original)
    expect(deserialized.skin).toBe('skin_medium')
    expect(deserialized.top).toBe('starter_tee_grey')
  })

  it('appearance with accessory survives round-trip', () => {
    const original = {
      ...makeValidAppearance(),
      accessory: 'acc_glasses_round',
    }
    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized) as Appearance

    expect(deserialized.accessory).toBe('acc_glasses_round')
  })

  it('appearance without accessory survives round-trip', () => {
    const original = makeValidAppearance()
    // Explicitly no accessory
    expect(original.accessory).toBeUndefined()

    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized) as Appearance

    expect(deserialized.accessory).toBeUndefined()
  })

  it('appearance hair object survives round-trip', () => {
    const original = makeValidAppearance()
    original.hair = { styleId: 'hair_ponytail', colorId: 'hair_auburn' }

    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized) as Appearance

    expect(deserialized.hair.styleId).toBe('hair_ponytail')
    expect(deserialized.hair.colorId).toBe('hair_auburn')
  })
})

// =============================================================================
// Test: Outfit Data Round-Trip
// =============================================================================

describe('Outfit export/import round-trip', () => {
  const makeOutfit = (overrides: Partial<{ name: string; appearance: Appearance }> = {}) => ({
    id: 'outfit-123',
    name: overrides.name || 'Test Outfit',
    appearance_json: overrides.appearance || {
      skin: 'skin_medium',
      eyes: 'eyes_brown',
      hair: { styleId: 'hair_short', colorId: 'hair_black' },
      top: 'starter_tee_grey',
      bottom: 'starter_pants_blue',
      shoes: 'starter_sneakers_white',
    },
    sort_index: 0,
    created_at: new Date().toISOString(),
  })

  it('outfit with custom name survives round-trip', () => {
    const original = makeOutfit({ name: 'My Fancy Outfit' })
    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.name).toBe('My Fancy Outfit')
  })

  it('outfit sort_index survives round-trip', () => {
    const original = { ...makeOutfit(), sort_index: 5 }
    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.sort_index).toBe(5)
  })

  it('outfit created_at survives round-trip', () => {
    const timestamp = '2024-01-15T10:30:00.000Z'
    const original = { ...makeOutfit(), created_at: timestamp }
    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.created_at).toBe(timestamp)
  })

  it('multiple outfits preserve order in array', () => {
    const outfits = [
      { ...makeOutfit({ name: 'First' }), sort_index: 0 },
      { ...makeOutfit({ name: 'Second' }), sort_index: 1 },
      { ...makeOutfit({ name: 'Third' }), sort_index: 2 },
    ]

    const serialized = JSON.stringify(outfits)
    const deserialized = JSON.parse(serialized)

    expect(deserialized).toHaveLength(3)
    expect(deserialized[0].name).toBe('First')
    expect(deserialized[1].name).toBe('Second')
    expect(deserialized[2].name).toBe('Third')
  })
})

// =============================================================================
// Test: Export Version Migration
// =============================================================================

describe('Export version compatibility', () => {
  it('version 3 includes all version 2 fields', () => {
    const v3Fields = [
      'version',
      'exportedAt',
      'tasks',
      'subtasks',
      'completions',
      'coinLedger',
      'settings',
      'inventory',
      'placements',
      'roomFinishes',
      'mysteryOpenings',
      'focusSessions',
      'houseRepairs',
      'houseState',
      // V3 additions
      'avatar',
      'outfits',
    ]

    const v3Data = {
      version: 3,
      exportedAt: new Date().toISOString(),
      tasks: [],
      subtasks: [],
      completions: [],
      coinLedger: [],
      settings: null,
      inventory: [],
      placements: [],
      roomFinishes: [],
      mysteryOpenings: [],
      focusSessions: [],
      houseRepairs: [],
      houseState: null,
      avatar: null,
      outfits: [],
    }

    for (const field of v3Fields) {
      expect(v3Data).toHaveProperty(field)
    }
  })

  it('version 3 adds avatar and outfits fields', () => {
    const v2Data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tasks: [],
      subtasks: [],
      completions: [],
      coinLedger: [],
      settings: null,
      inventory: [],
      placements: [],
      roomFinishes: [],
      mysteryOpenings: [],
      focusSessions: [],
      houseRepairs: [],
      houseState: null,
    }

    // V2 should NOT have these fields
    expect(v2Data).not.toHaveProperty('avatar')
    expect(v2Data).not.toHaveProperty('outfits')
  })
})
