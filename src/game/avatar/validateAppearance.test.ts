import { describe, it, expect } from 'vitest'
import {
  validateAppearance,
  isFieldValid,
  correctAppearance,
  formatValidationProblems,
} from './validateAppearance'
import type { Appearance, FreeAppearanceOptions, ValidationProblem } from './types'
import {
  FREE_SKINS,
  FREE_EYE_COLORS,
  FREE_HAIR_COLORS,
  FREE_HAIR_STYLES,
  STARTER_TOPS,
  STARTER_BOTTOMS,
  STARTER_SHOES,
  DEFAULT_SKIN,
  DEFAULT_EYES,
  DEFAULT_HAIR_STYLE,
  DEFAULT_HAIR_COLOR,
  DEFAULT_STARTER_TOP,
  DEFAULT_STARTER_BOTTOM,
  DEFAULT_STARTER_SHOES,
} from './constants'

// =============================================================================
// Test Fixtures
// =============================================================================

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

const emptyOwned = new Set<string>()
const ownedItems = new Set(['hair_ponytail', 'top_hoodie', 'bottom_jeans_dark', 'shoes_boots_ankle', 'acc_glasses_round'])

// =============================================================================
// Tests: validateAppearance - Valid Cases
// =============================================================================

describe('validateAppearance', () => {
  describe('Valid appearances', () => {
    it('accepts appearance with all free options', () => {
      const appearance = makeValidAppearance()

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(true)
      expect(result.problems).toHaveLength(0)
    })

    it('accepts appearance with all starter clothing', () => {
      const appearance = makeValidAppearance({
        top: 'starter_tee_white',
        bottom: 'starter_pants_black',
        shoes: 'starter_sneakers_black',
      })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(true)
    })

    it('accepts appearance with owned hair style', () => {
      const appearance = makeValidAppearance({
        hair: { styleId: 'hair_ponytail', colorId: 'hair_black' },
      })

      const result = validateAppearance(appearance, ownedItems)

      expect(result.ok).toBe(true)
    })

    it('accepts appearance with owned top', () => {
      const appearance = makeValidAppearance({ top: 'top_hoodie' })

      const result = validateAppearance(appearance, ownedItems)

      expect(result.ok).toBe(true)
    })

    it('accepts appearance with owned bottom', () => {
      const appearance = makeValidAppearance({ bottom: 'bottom_jeans_dark' })

      const result = validateAppearance(appearance, ownedItems)

      expect(result.ok).toBe(true)
    })

    it('accepts appearance with owned shoes', () => {
      const appearance = makeValidAppearance({ shoes: 'shoes_boots_ankle' })

      const result = validateAppearance(appearance, ownedItems)

      expect(result.ok).toBe(true)
    })

    it('accepts appearance with owned accessory', () => {
      const appearance = makeValidAppearance({ accessory: 'acc_glasses_round' })

      const result = validateAppearance(appearance, ownedItems)

      expect(result.ok).toBe(true)
    })

    it('accepts appearance without accessory', () => {
      const appearance = makeValidAppearance({ accessory: undefined })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(true)
    })

    it('validates all free skin tones', () => {
      for (const skin of FREE_SKINS) {
        const appearance = makeValidAppearance({ skin })
        const result = validateAppearance(appearance, emptyOwned)
        expect(result.ok).toBe(true)
      }
    })

    it('validates all free eye colors', () => {
      for (const eyes of FREE_EYE_COLORS) {
        const appearance = makeValidAppearance({ eyes })
        const result = validateAppearance(appearance, emptyOwned)
        expect(result.ok).toBe(true)
      }
    })

    it('validates all free hair colors', () => {
      for (const colorId of FREE_HAIR_COLORS) {
        const appearance = makeValidAppearance({
          hair: { styleId: 'hair_short', colorId },
        })
        const result = validateAppearance(appearance, emptyOwned)
        expect(result.ok).toBe(true)
      }
    })

    it('validates all free hair styles', () => {
      for (const styleId of FREE_HAIR_STYLES) {
        const appearance = makeValidAppearance({
          hair: { styleId, colorId: 'hair_black' },
        })
        const result = validateAppearance(appearance, emptyOwned)
        expect(result.ok).toBe(true)
      }
    })

    it('validates all starter tops', () => {
      for (const top of STARTER_TOPS) {
        const appearance = makeValidAppearance({ top })
        const result = validateAppearance(appearance, emptyOwned)
        expect(result.ok).toBe(true)
      }
    })

    it('validates all starter bottoms', () => {
      for (const bottom of STARTER_BOTTOMS) {
        const appearance = makeValidAppearance({ bottom })
        const result = validateAppearance(appearance, emptyOwned)
        expect(result.ok).toBe(true)
      }
    })

    it('validates all starter shoes', () => {
      for (const shoes of STARTER_SHOES) {
        const appearance = makeValidAppearance({ shoes })
        const result = validateAppearance(appearance, emptyOwned)
        expect(result.ok).toBe(true)
      }
    })
  })

  // =============================================================================
  // Tests: validateAppearance - Invalid Cases
  // =============================================================================

  describe('Invalid appearances', () => {
    it('rejects invalid skin tone', () => {
      const appearance = makeValidAppearance({ skin: 'skin_alien_green' })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'skin',
        itemId: 'skin_alien_green',
        reason: 'not_free',
      })
    })

    it('rejects invalid eye color', () => {
      const appearance = makeValidAppearance({ eyes: 'eyes_red' })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'eyes',
        itemId: 'eyes_red',
        reason: 'not_free',
      })
    })

    it('rejects invalid hair color', () => {
      const appearance = makeValidAppearance({
        hair: { styleId: 'hair_short', colorId: 'hair_neon_pink' },
      })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'hair.colorId',
        itemId: 'hair_neon_pink',
        reason: 'not_free',
      })
    })

    it('rejects unowned hair style', () => {
      const appearance = makeValidAppearance({
        hair: { styleId: 'hair_mohawk', colorId: 'hair_black' },
      })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'hair.styleId',
        itemId: 'hair_mohawk',
        reason: 'not_owned',
      })
    })

    it('rejects unowned top', () => {
      const appearance = makeValidAppearance({ top: 'top_fancy_jacket' })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'top',
        itemId: 'top_fancy_jacket',
        reason: 'not_owned',
      })
    })

    it('rejects unowned bottom', () => {
      const appearance = makeValidAppearance({ bottom: 'bottom_designer_pants' })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'bottom',
        itemId: 'bottom_designer_pants',
        reason: 'not_owned',
      })
    })

    it('rejects unowned shoes', () => {
      const appearance = makeValidAppearance({ shoes: 'shoes_fancy_heels' })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'shoes',
        itemId: 'shoes_fancy_heels',
        reason: 'not_owned',
      })
    })

    it('rejects unowned accessory', () => {
      const appearance = makeValidAppearance({ accessory: 'acc_fancy_necklace' })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'accessory',
        itemId: 'acc_fancy_necklace',
        reason: 'not_owned',
      })
    })

    it('rejects empty accessory string', () => {
      const appearance = makeValidAppearance({ accessory: '' })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'accessory',
        itemId: '',
        reason: 'invalid_id',
      })
    })

    it('collects multiple problems', () => {
      const appearance = makeValidAppearance({
        skin: 'invalid_skin',
        eyes: 'invalid_eyes',
        top: 'unowned_top',
      })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems.length).toBe(3)
    })
  })

  // =============================================================================
  // Tests: validateAppearance - Missing Fields
  // =============================================================================

  describe('Missing fields', () => {
    it('rejects missing skin', () => {
      const appearance = { ...makeValidAppearance(), skin: '' }

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'skin',
        itemId: '',
        reason: 'invalid_id',
      })
    })

    it('rejects missing eyes', () => {
      const appearance = { ...makeValidAppearance(), eyes: '' }

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'eyes',
        itemId: '',
        reason: 'invalid_id',
      })
    })

    it('rejects missing hair styleId', () => {
      const appearance = makeValidAppearance({
        hair: { styleId: '', colorId: 'hair_black' },
      })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'hair.styleId',
        itemId: '',
        reason: 'invalid_id',
      })
    })

    it('rejects missing hair colorId', () => {
      const appearance = makeValidAppearance({
        hair: { styleId: 'hair_short', colorId: '' },
      })

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'hair.colorId',
        itemId: '',
        reason: 'invalid_id',
      })
    })

    it('rejects missing top', () => {
      const appearance = { ...makeValidAppearance(), top: '' }

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'top',
        itemId: '',
        reason: 'invalid_id',
      })
    })

    it('rejects missing bottom', () => {
      const appearance = { ...makeValidAppearance(), bottom: '' }

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'bottom',
        itemId: '',
        reason: 'invalid_id',
      })
    })

    it('rejects missing shoes', () => {
      const appearance = { ...makeValidAppearance(), shoes: '' }

      const result = validateAppearance(appearance, emptyOwned)

      expect(result.ok).toBe(false)
      expect(result.problems).toContainEqual({
        field: 'shoes',
        itemId: '',
        reason: 'invalid_id',
      })
    })
  })

  // =============================================================================
  // Tests: validateAppearance - Custom Free Options
  // =============================================================================

  describe('Custom free options', () => {
    it('accepts custom free options', () => {
      const customFreeOptions: FreeAppearanceOptions = {
        skins: ['custom_skin'],
        eyeColors: ['custom_eyes'],
        hairColors: ['custom_hair_color'],
        hairStyles: ['custom_hair_style'],
        starterTops: ['custom_top'],
        starterBottoms: ['custom_bottom'],
        starterShoes: ['custom_shoes'],
      }

      const appearance: Appearance = {
        skin: 'custom_skin',
        eyes: 'custom_eyes',
        hair: { styleId: 'custom_hair_style', colorId: 'custom_hair_color' },
        top: 'custom_top',
        bottom: 'custom_bottom',
        shoes: 'custom_shoes',
      }

      const result = validateAppearance(appearance, emptyOwned, customFreeOptions)

      expect(result.ok).toBe(true)
    })

    it('rejects non-custom options when custom options are provided', () => {
      const customFreeOptions: FreeAppearanceOptions = {
        skins: ['custom_skin'],
        eyeColors: ['custom_eyes'],
        hairColors: ['custom_hair_color'],
        hairStyles: ['custom_hair_style'],
        starterTops: ['custom_top'],
        starterBottoms: ['custom_bottom'],
        starterShoes: ['custom_shoes'],
      }

      const appearance = makeValidAppearance() // Uses default free options

      const result = validateAppearance(appearance, emptyOwned, customFreeOptions)

      expect(result.ok).toBe(false)
      // Should have problems for skin, eyes, hair, and all clothing
      expect(result.problems.length).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// Tests: isFieldValid
// =============================================================================

describe('isFieldValid', () => {
  it('validates free skin', () => {
    expect(isFieldValid('skin', 'skin_medium', emptyOwned)).toBe(true)
    expect(isFieldValid('skin', 'invalid_skin', emptyOwned)).toBe(false)
  })

  it('validates free eyes', () => {
    expect(isFieldValid('eyes', 'eyes_brown', emptyOwned)).toBe(true)
    expect(isFieldValid('eyes', 'invalid_eyes', emptyOwned)).toBe(false)
  })

  it('validates free hair color', () => {
    expect(isFieldValid('hair.colorId', 'hair_black', emptyOwned)).toBe(true)
    expect(isFieldValid('hair.colorId', 'invalid_color', emptyOwned)).toBe(false)
  })

  it('validates free hair style', () => {
    expect(isFieldValid('hair.styleId', 'hair_short', emptyOwned)).toBe(true)
  })

  it('validates owned hair style', () => {
    expect(isFieldValid('hair.styleId', 'hair_ponytail', ownedItems)).toBe(true)
    expect(isFieldValid('hair.styleId', 'hair_ponytail', emptyOwned)).toBe(false)
  })

  it('validates starter top', () => {
    expect(isFieldValid('top', 'starter_tee_grey', emptyOwned)).toBe(true)
  })

  it('validates owned top', () => {
    expect(isFieldValid('top', 'top_hoodie', ownedItems)).toBe(true)
    expect(isFieldValid('top', 'top_hoodie', emptyOwned)).toBe(false)
  })

  it('validates starter bottom', () => {
    expect(isFieldValid('bottom', 'starter_pants_blue', emptyOwned)).toBe(true)
  })

  it('validates owned bottom', () => {
    expect(isFieldValid('bottom', 'bottom_jeans_dark', ownedItems)).toBe(true)
  })

  it('validates starter shoes', () => {
    expect(isFieldValid('shoes', 'starter_sneakers_white', emptyOwned)).toBe(true)
  })

  it('validates owned shoes', () => {
    expect(isFieldValid('shoes', 'shoes_boots_ankle', ownedItems)).toBe(true)
  })

  it('validates owned accessory', () => {
    expect(isFieldValid('accessory', 'acc_glasses_round', ownedItems)).toBe(true)
    expect(isFieldValid('accessory', 'acc_glasses_round', emptyOwned)).toBe(false)
  })

  it('returns false for empty values', () => {
    expect(isFieldValid('skin', '', emptyOwned)).toBe(false)
    expect(isFieldValid('top', '', emptyOwned)).toBe(false)
  })
})

// =============================================================================
// Tests: correctAppearance
// =============================================================================

describe('correctAppearance', () => {
  it('returns same appearance when valid', () => {
    const appearance = makeValidAppearance()

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected).toEqual(appearance)
  })

  it('corrects invalid skin to default', () => {
    const appearance = makeValidAppearance({ skin: 'invalid_skin' })

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected.skin).toBe(DEFAULT_SKIN)
  })

  it('corrects invalid eyes to default', () => {
    const appearance = makeValidAppearance({ eyes: 'invalid_eyes' })

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected.eyes).toBe(DEFAULT_EYES)
  })

  it('corrects invalid hair style to default', () => {
    const appearance = makeValidAppearance({
      hair: { styleId: 'unowned_style', colorId: 'hair_black' },
    })

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected.hair.styleId).toBe(DEFAULT_HAIR_STYLE)
    expect(corrected.hair.colorId).toBe('hair_black') // Unchanged
  })

  it('corrects invalid hair color to default', () => {
    const appearance = makeValidAppearance({
      hair: { styleId: 'hair_short', colorId: 'invalid_color' },
    })

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected.hair.colorId).toBe(DEFAULT_HAIR_COLOR)
    expect(corrected.hair.styleId).toBe('hair_short') // Unchanged
  })

  it('corrects invalid top to default starter', () => {
    const appearance = makeValidAppearance({ top: 'unowned_top' })

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected.top).toBe(DEFAULT_STARTER_TOP)
  })

  it('corrects invalid bottom to default starter', () => {
    const appearance = makeValidAppearance({ bottom: 'unowned_bottom' })

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected.bottom).toBe(DEFAULT_STARTER_BOTTOM)
  })

  it('corrects invalid shoes to default starter', () => {
    const appearance = makeValidAppearance({ shoes: 'unowned_shoes' })

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected.shoes).toBe(DEFAULT_STARTER_SHOES)
  })

  it('removes invalid accessory', () => {
    const appearance = makeValidAppearance({ accessory: 'unowned_accessory' })

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected.accessory).toBeUndefined()
  })

  it('keeps valid accessory', () => {
    const appearance = makeValidAppearance({ accessory: 'acc_glasses_round' })

    const corrected = correctAppearance(appearance, ownedItems)

    expect(corrected.accessory).toBe('acc_glasses_round')
  })

  it('corrects multiple invalid fields at once', () => {
    const appearance = makeValidAppearance({
      skin: 'invalid',
      eyes: 'invalid',
      top: 'invalid',
      accessory: 'invalid',
    })

    const corrected = correctAppearance(appearance, emptyOwned)

    expect(corrected.skin).toBe(DEFAULT_SKIN)
    expect(corrected.eyes).toBe(DEFAULT_EYES)
    expect(corrected.top).toBe(DEFAULT_STARTER_TOP)
    expect(corrected.accessory).toBeUndefined()
  })
})

// =============================================================================
// Tests: formatValidationProblems
// =============================================================================

describe('formatValidationProblems', () => {
  it('formats invalid_id reason', () => {
    const problems: ValidationProblem[] = [
      { field: 'skin', itemId: '', reason: 'invalid_id' },
    ]

    const messages = formatValidationProblems(problems)

    expect(messages[0]).toContain('skin')
    expect(messages[0]).toContain('missing or invalid')
  })

  it('formats not_free reason', () => {
    const problems: ValidationProblem[] = [
      { field: 'skin', itemId: 'alien_skin', reason: 'not_free' },
    ]

    const messages = formatValidationProblems(problems)

    expect(messages[0]).toContain('skin')
    expect(messages[0]).toContain('alien_skin')
    expect(messages[0]).toContain('not a free option')
  })

  it('formats not_owned reason', () => {
    const problems: ValidationProblem[] = [
      { field: 'top', itemId: 'fancy_top', reason: 'not_owned' },
    ]

    const messages = formatValidationProblems(problems)

    expect(messages[0]).toContain('top')
    expect(messages[0]).toContain('fancy_top')
    expect(messages[0]).toContain('not owned')
  })

  it('formats nested field names', () => {
    const problems: ValidationProblem[] = [
      { field: 'hair.styleId', itemId: 'style', reason: 'not_owned' },
    ]

    const messages = formatValidationProblems(problems)

    expect(messages[0]).toContain('hair styleId')
  })

  it('formats multiple problems', () => {
    const problems: ValidationProblem[] = [
      { field: 'skin', itemId: '', reason: 'invalid_id' },
      { field: 'top', itemId: 'top', reason: 'not_owned' },
    ]

    const messages = formatValidationProblems(problems)

    expect(messages).toHaveLength(2)
  })
})
