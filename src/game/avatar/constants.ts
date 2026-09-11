/**
 * Avatar constants - free options and starter pieces.
 *
 * These define all appearance options that are free from first run.
 * Users can change these instantly at any time without spending coins.
 */

import type { FreeAppearanceOptions, Appearance } from './types';

// =============================================================================
// Free Skin Tones (6 options)
// =============================================================================

export const FREE_SKINS = [
  'skin_light',
  'skin_light_medium',
  'skin_medium',
  'skin_medium_dark',
  'skin_dark',
  'skin_deep',
] as const;

// =============================================================================
// Free Eye Colors (4 options)
// =============================================================================

export const FREE_EYE_COLORS = [
  'eyes_brown',
  'eyes_blue',
  'eyes_green',
  'eyes_hazel',
] as const;

// =============================================================================
// Free Hair Colors (8 options)
// =============================================================================

export const FREE_HAIR_COLORS = [
  'hair_black',
  'hair_dark_brown',
  'hair_light_brown',
  'hair_blonde',
  'hair_red',
  'hair_auburn',
  'hair_grey',
  'hair_white',
] as const;

// =============================================================================
// Free Hair Styles (3 options - additional styles are purchasable)
// =============================================================================

export const FREE_HAIR_STYLES = [
  'hair_short',
  'hair_medium',
  'hair_long',
] as const;

// =============================================================================
// Starter Clothing (free from first run)
// =============================================================================

export const STARTER_TOPS = [
  'starter_tee_white',
  'starter_tee_grey',
  'starter_tee_black',
] as const;

export const STARTER_BOTTOMS = [
  'starter_pants_blue',
  'starter_pants_black',
  'starter_pants_khaki',
] as const;

export const STARTER_SHOES = [
  'starter_sneakers_white',
  'starter_sneakers_black',
] as const;

// =============================================================================
// Combined Free Options Object
// =============================================================================

/**
 * All free appearance options in one object.
 * Used by validateAppearance to check if items are free.
 */
export const FREE_APPEARANCE_OPTIONS: FreeAppearanceOptions = {
  skins: [...FREE_SKINS],
  eyeColors: [...FREE_EYE_COLORS],
  hairColors: [...FREE_HAIR_COLORS],
  hairStyles: [...FREE_HAIR_STYLES],
  starterTops: [...STARTER_TOPS],
  starterBottoms: [...STARTER_BOTTOMS],
  starterShoes: [...STARTER_SHOES],
};

// =============================================================================
// Default Fallbacks
// =============================================================================

/**
 * Default starter pieces used as fallbacks when validation fails.
 */
export const DEFAULT_STARTER_TOP = 'starter_tee_grey';
export const DEFAULT_STARTER_BOTTOM = 'starter_pants_blue';
export const DEFAULT_STARTER_SHOES = 'starter_sneakers_white';

/**
 * Default appearance values for fallbacks.
 */
export const DEFAULT_SKIN = 'skin_medium';
export const DEFAULT_EYES = 'eyes_brown';
export const DEFAULT_HAIR_STYLE = 'hair_short';
export const DEFAULT_HAIR_COLOR = 'hair_black';

/**
 * Complete default appearance for new users.
 */
export const DEFAULT_APPEARANCE: Appearance = {
  skin: DEFAULT_SKIN,
  eyes: DEFAULT_EYES,
  hair: {
    styleId: DEFAULT_HAIR_STYLE,
    colorId: DEFAULT_HAIR_COLOR,
  },
  top: DEFAULT_STARTER_TOP,
  bottom: DEFAULT_STARTER_BOTTOM,
  shoes: DEFAULT_STARTER_SHOES,
  // No accessory by default
};

// =============================================================================
// Placeholder Texture Keys
// =============================================================================

/**
 * Placeholder texture key prefix for missing assets.
 * Used when usePlaceholderArt is true or texture is missing.
 */
export const PLACEHOLDER_PREFIX = 'placeholder_';

/**
 * Generate placeholder texture key for a layer.
 */
export function getPlaceholderKey(layerName: string): string {
  return `${PLACEHOLDER_PREFIX}${layerName}`;
}

// =============================================================================
// Sets for Fast Lookup
// =============================================================================

/** Set of all free skin IDs for O(1) lookup */
export const FREE_SKINS_SET = new Set<string>(FREE_SKINS);

/** Set of all free eye color IDs for O(1) lookup */
export const FREE_EYE_COLORS_SET = new Set<string>(FREE_EYE_COLORS);

/** Set of all free hair color IDs for O(1) lookup */
export const FREE_HAIR_COLORS_SET = new Set<string>(FREE_HAIR_COLORS);

/** Set of all free hair style IDs for O(1) lookup */
export const FREE_HAIR_STYLES_SET = new Set<string>(FREE_HAIR_STYLES);

/** Set of all starter top IDs for O(1) lookup */
export const STARTER_TOPS_SET = new Set<string>(STARTER_TOPS);

/** Set of all starter bottom IDs for O(1) lookup */
export const STARTER_BOTTOMS_SET = new Set<string>(STARTER_BOTTOMS);

/** Set of all starter shoe IDs for O(1) lookup */
export const STARTER_SHOES_SET = new Set<string>(STARTER_SHOES);

/** Combined set of all free item IDs (excluding wearables which need ownership check) */
export const ALL_FREE_IDS_SET = new Set<string>([
  ...FREE_SKINS,
  ...FREE_EYE_COLORS,
  ...FREE_HAIR_COLORS,
  ...FREE_HAIR_STYLES,
  ...STARTER_TOPS,
  ...STARTER_BOTTOMS,
  ...STARTER_SHOES,
]);
