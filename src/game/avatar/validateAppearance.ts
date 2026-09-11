/**
 * validateAppearance - Validates an avatar appearance against ownership and free options.
 *
 * Validation rules:
 * 1. skin must be in freeIds.skins
 * 2. eyes must be in freeIds.eyeColors
 * 3. hair.colorId must be in freeIds.hairColors
 * 4. hair.styleId must be in freeIds.hairStyles OR in ownedItemIds
 * 5. top must be in freeIds.starterTops OR in ownedItemIds
 * 6. bottom must be in freeIds.starterBottoms OR in ownedItemIds
 * 7. shoes must be in freeIds.starterShoes OR in ownedItemIds
 * 8. accessory (if present) must be in ownedItemIds
 */

import type {
  Appearance,
  ValidationResult,
  ValidationProblem,
  FreeAppearanceOptions,
} from './types';
import {
  FREE_SKINS_SET,
  FREE_EYE_COLORS_SET,
  FREE_HAIR_COLORS_SET,
  FREE_HAIR_STYLES_SET,
  STARTER_TOPS_SET,
  STARTER_BOTTOMS_SET,
  STARTER_SHOES_SET,
  DEFAULT_SKIN,
  DEFAULT_EYES,
  DEFAULT_HAIR_STYLE,
  DEFAULT_HAIR_COLOR,
  DEFAULT_STARTER_TOP,
  DEFAULT_STARTER_BOTTOM,
  DEFAULT_STARTER_SHOES,
} from './constants';

// =============================================================================
// Validation Function
// =============================================================================

/**
 * Validate an appearance against owned items and free options.
 *
 * @param appearance - The appearance to validate
 * @param ownedItemIds - Set of item IDs the user owns
 * @param freeIds - Optional custom free options (defaults to constants)
 * @returns Validation result with ok flag and any problems found
 */
export function validateAppearance(
  appearance: Appearance,
  ownedItemIds: Set<string>,
  freeIds?: FreeAppearanceOptions
): ValidationResult {
  const problems: ValidationProblem[] = [];

  // Use provided free IDs or defaults
  const skins = freeIds ? new Set(freeIds.skins) : FREE_SKINS_SET;
  const eyeColors = freeIds ? new Set(freeIds.eyeColors) : FREE_EYE_COLORS_SET;
  const hairColors = freeIds ? new Set(freeIds.hairColors) : FREE_HAIR_COLORS_SET;
  const hairStyles = freeIds ? new Set(freeIds.hairStyles) : FREE_HAIR_STYLES_SET;
  const starterTops = freeIds ? new Set(freeIds.starterTops) : STARTER_TOPS_SET;
  const starterBottoms = freeIds ? new Set(freeIds.starterBottoms) : STARTER_BOTTOMS_SET;
  const starterShoes = freeIds ? new Set(freeIds.starterShoes) : STARTER_SHOES_SET;

  // 1. Validate skin (must be free)
  if (!appearance.skin) {
    problems.push({
      field: 'skin',
      itemId: '',
      reason: 'invalid_id',
    });
  } else if (!skins.has(appearance.skin)) {
    problems.push({
      field: 'skin',
      itemId: appearance.skin,
      reason: 'not_free',
    });
  }

  // 2. Validate eyes (must be free)
  if (!appearance.eyes) {
    problems.push({
      field: 'eyes',
      itemId: '',
      reason: 'invalid_id',
    });
  } else if (!eyeColors.has(appearance.eyes)) {
    problems.push({
      field: 'eyes',
      itemId: appearance.eyes,
      reason: 'not_free',
    });
  }

  // 3. Validate hair color (must be free)
  if (!appearance.hair?.colorId) {
    problems.push({
      field: 'hair.colorId',
      itemId: '',
      reason: 'invalid_id',
    });
  } else if (!hairColors.has(appearance.hair.colorId)) {
    problems.push({
      field: 'hair.colorId',
      itemId: appearance.hair.colorId,
      reason: 'not_free',
    });
  }

  // 4. Validate hair style (must be free OR owned)
  if (!appearance.hair?.styleId) {
    problems.push({
      field: 'hair.styleId',
      itemId: '',
      reason: 'invalid_id',
    });
  } else if (!hairStyles.has(appearance.hair.styleId) && !ownedItemIds.has(appearance.hair.styleId)) {
    problems.push({
      field: 'hair.styleId',
      itemId: appearance.hair.styleId,
      reason: 'not_owned',
    });
  }

  // 5. Validate top (must be starter OR owned)
  if (!appearance.top) {
    problems.push({
      field: 'top',
      itemId: '',
      reason: 'invalid_id',
    });
  } else if (!starterTops.has(appearance.top) && !ownedItemIds.has(appearance.top)) {
    problems.push({
      field: 'top',
      itemId: appearance.top,
      reason: 'not_owned',
    });
  }

  // 6. Validate bottom (must be starter OR owned)
  if (!appearance.bottom) {
    problems.push({
      field: 'bottom',
      itemId: '',
      reason: 'invalid_id',
    });
  } else if (!starterBottoms.has(appearance.bottom) && !ownedItemIds.has(appearance.bottom)) {
    problems.push({
      field: 'bottom',
      itemId: appearance.bottom,
      reason: 'not_owned',
    });
  }

  // 7. Validate shoes (must be starter OR owned)
  if (!appearance.shoes) {
    problems.push({
      field: 'shoes',
      itemId: '',
      reason: 'invalid_id',
    });
  } else if (!starterShoes.has(appearance.shoes) && !ownedItemIds.has(appearance.shoes)) {
    problems.push({
      field: 'shoes',
      itemId: appearance.shoes,
      reason: 'not_owned',
    });
  }

  // 8. Validate accessory (if present, must be owned)
  if (appearance.accessory !== undefined && appearance.accessory !== null) {
    if (appearance.accessory === '') {
      problems.push({
        field: 'accessory',
        itemId: '',
        reason: 'invalid_id',
      });
    } else if (!ownedItemIds.has(appearance.accessory)) {
      problems.push({
        field: 'accessory',
        itemId: appearance.accessory,
        reason: 'not_owned',
      });
    }
  }

  return {
    ok: problems.length === 0,
    problems,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a specific appearance field is valid.
 * Useful for real-time validation in wardrobe UI.
 */
export function isFieldValid(
  field: keyof Appearance | 'hair.styleId' | 'hair.colorId',
  value: string,
  ownedItemIds: Set<string>,
  freeIds?: FreeAppearanceOptions
): boolean {
  const skins = freeIds ? new Set(freeIds.skins) : FREE_SKINS_SET;
  const eyeColors = freeIds ? new Set(freeIds.eyeColors) : FREE_EYE_COLORS_SET;
  const hairColors = freeIds ? new Set(freeIds.hairColors) : FREE_HAIR_COLORS_SET;
  const hairStyles = freeIds ? new Set(freeIds.hairStyles) : FREE_HAIR_STYLES_SET;
  const starterTops = freeIds ? new Set(freeIds.starterTops) : STARTER_TOPS_SET;
  const starterBottoms = freeIds ? new Set(freeIds.starterBottoms) : STARTER_BOTTOMS_SET;
  const starterShoes = freeIds ? new Set(freeIds.starterShoes) : STARTER_SHOES_SET;

  if (!value) return false;

  switch (field) {
    case 'skin':
      return skins.has(value);
    case 'eyes':
      return eyeColors.has(value);
    case 'hair.colorId':
      return hairColors.has(value);
    case 'hair.styleId':
      return hairStyles.has(value) || ownedItemIds.has(value);
    case 'top':
      return starterTops.has(value) || ownedItemIds.has(value);
    case 'bottom':
      return starterBottoms.has(value) || ownedItemIds.has(value);
    case 'shoes':
      return starterShoes.has(value) || ownedItemIds.has(value);
    case 'accessory':
      return ownedItemIds.has(value);
    default:
      return false;
  }
}

/**
 * Get a corrected appearance by replacing invalid items with defaults.
 * Used when loading saved outfits where some items may no longer be owned.
 */
export function correctAppearance(
  appearance: Appearance,
  ownedItemIds: Set<string>,
  freeIds?: FreeAppearanceOptions
): Appearance {
  const validation = validateAppearance(appearance, ownedItemIds, freeIds);

  if (validation.ok) {
    return appearance;
  }

  const corrected = { ...appearance };

  // Build a set of problem fields for fast lookup
  const problemFields = new Set(validation.problems.map((p) => p.field));

  if (problemFields.has('skin')) {
    corrected.skin = DEFAULT_SKIN;
  }

  if (problemFields.has('eyes')) {
    corrected.eyes = DEFAULT_EYES;
  }

  if (problemFields.has('hair.colorId')) {
    corrected.hair = {
      ...corrected.hair,
      colorId: DEFAULT_HAIR_COLOR,
    };
  }

  if (problemFields.has('hair.styleId')) {
    corrected.hair = {
      ...corrected.hair,
      styleId: DEFAULT_HAIR_STYLE,
    };
  }

  if (problemFields.has('top')) {
    corrected.top = DEFAULT_STARTER_TOP;
  }

  if (problemFields.has('bottom')) {
    corrected.bottom = DEFAULT_STARTER_BOTTOM;
  }

  if (problemFields.has('shoes')) {
    corrected.shoes = DEFAULT_STARTER_SHOES;
  }

  if (problemFields.has('accessory')) {
    // Remove invalid accessory
    delete corrected.accessory;
  }

  return corrected;
}

/**
 * Format validation problems as human-readable messages.
 * Useful for error display in UI.
 */
export function formatValidationProblems(problems: ValidationProblem[]): string[] {
  return problems.map((p) => {
    const fieldName = p.field.replace('.', ' ');
    switch (p.reason) {
      case 'invalid_id':
        return `${fieldName} is missing or invalid`;
      case 'not_free':
        return `${fieldName} "${p.itemId}" is not a free option`;
      case 'not_owned':
        return `${fieldName} "${p.itemId}" is not owned`;
      default:
        return `${fieldName} has an unknown problem`;
    }
  });
}
