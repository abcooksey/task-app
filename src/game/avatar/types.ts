/**
 * Avatar type definitions for Phase 4.
 *
 * The avatar's visual representation is never stored as a pre-rendered image.
 * Instead, an Appearance object describes what the avatar looks like, and a
 * pure function (AvatarComposer.resolve) converts that data into an ordered
 * list of sprite layers.
 */

// =============================================================================
// Core Types
// =============================================================================

/** Skin tone identifier (always free) */
export type SkinId = string;

/** Eye color identifier (always free) */
export type EyeColorId = string;

/** Hair style identifier (some free, some purchasable) */
export type HairStyleId = string;

/** Hair color identifier (always free) */
export type HairColorId = string;

/** Catalog item identifier */
export type ItemId = string;

/**
 * The complete appearance state of an avatar.
 * This is stored in the database and used to render the avatar.
 */
export interface Appearance {
  /** Skin tone - always free */
  skin: SkinId;

  /** Eye color - always free */
  eyes: EyeColorId;

  /** Hair configuration */
  hair: {
    /** Hair style - some free, some purchasable */
    styleId: HairStyleId;
    /** Hair color - always free */
    colorId: HairColorId;
  };

  /** Top/shirt - must be owned or starter */
  top: ItemId;

  /** Bottom/pants - must be owned or starter */
  bottom: ItemId;

  /** Shoes - must be owned or starter */
  shoes: ItemId;

  /** Optional accessory - must be owned if present */
  accessory?: ItemId;
}

// =============================================================================
// Layer System
// =============================================================================

/**
 * Layer names in render order (bottom to top).
 * This order is fixed and never changes.
 */
export const LAYER_ORDER = [
  'hair_back',
  'body',
  'eyes',
  'bottom',
  'shoes',
  'top',
  'hair_front',
  'accessory',
] as const;

export type LayerName = (typeof LAYER_ORDER)[number];

/**
 * A single resolved layer ready for rendering.
 */
export interface Layer {
  /** Which layer slot this occupies */
  layerName: LayerName;

  /** Texture/sprite key from manifest */
  textureKey: string;

  /** Animation frame index (0 for static) */
  frameIndex: number;

  /** Whether to mirror horizontally */
  flipped: boolean;

  /** Whether this is a placeholder (missing texture) */
  isPlaceholder?: boolean;
}

// =============================================================================
// Poses and Animations
// =============================================================================

/** Available avatar poses */
export type Pose = 'stand' | 'sit';

/** Available reaction animations */
export type Reaction = 'cheer' | 'nod';

/**
 * Frame configuration for a wearable item.
 * Maps poses to texture keys.
 */
export interface WearableFrames {
  /** Texture key for standing/idle pose */
  idle: string;

  /** Texture key for sitting pose */
  sit: string;

  /** Texture key for cheer reaction (falls back to idle) */
  cheer?: string;

  /** Texture key for nod reaction (falls back to idle) */
  nod?: string;
}

// =============================================================================
// Catalog Integration
// =============================================================================

/**
 * Wearable-specific fields on catalog items.
 */
export interface WearableItemData {
  /** Must be 'wearable' for avatar items */
  placement: 'wearable';

  /** Which layer(s) this item occupies */
  layers: LayerName[];

  /** Per-pose texture keys */
  frames: WearableFrames;

  /** If true, hides hair_front and hair_back layers */
  hidesHair?: boolean;

  /** If true, hides accessory layer */
  hidesAccessory?: boolean;

  /** Groups color variants (e.g., "sweater" for sweater_red, sweater_blue) */
  family?: string;
}

/**
 * Minimal catalog item interface for composer.
 * The full CatalogItem has more fields but we only need these.
 */
export interface CatalogItemForComposer {
  id: string;
  textureKey: string;
  placement?: string;
  layers?: LayerName[];
  frames?: WearableFrames;
  hidesHair?: boolean;
  hidesAccessory?: boolean;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Reason why an appearance field is invalid.
 */
export type ValidationReason = 'not_owned' | 'not_free' | 'invalid_id';

/**
 * A single validation problem.
 */
export interface ValidationProblem {
  /** Which appearance field has the problem */
  field: keyof Appearance | 'hair.styleId' | 'hair.colorId';

  /** The problematic item ID */
  itemId: string;

  /** Why it's invalid */
  reason: ValidationReason;
}

/**
 * Result of validating an appearance.
 */
export interface ValidationResult {
  /** True if appearance is valid */
  ok: boolean;

  /** List of problems found (empty if ok) */
  problems: ValidationProblem[];
}

// =============================================================================
// Free Options
// =============================================================================

/**
 * All appearance options that are free from first run.
 * These never appear with a price and can be changed instantly.
 */
export interface FreeAppearanceOptions {
  /** Available skin tones */
  skins: SkinId[];

  /** Available eye colors */
  eyeColors: EyeColorId[];

  /** Available hair colors */
  hairColors: HairColorId[];

  /** Free hair styles (not all styles are free) */
  hairStyles: HairStyleId[];

  /** Free starter tops */
  starterTops: ItemId[];

  /** Free starter bottoms */
  starterBottoms: ItemId[];

  /** Free starter shoes */
  starterShoes: ItemId[];
}

// =============================================================================
// Outfit Storage
// =============================================================================

/**
 * A saved outfit configuration.
 */
export interface Outfit {
  /** Unique identifier */
  id: string;

  /** User-defined name (max 24 characters) */
  name: string;

  /** Snapshot of appearance at save time */
  appearance: Appearance;

  /** Sort order in outfit list */
  sortIndex: number;

  /** When this outfit was created */
  createdAt: string;
}

// =============================================================================
// Default Appearance
// =============================================================================

/**
 * Default appearance for new users.
 * All values are from free options.
 */
export const DEFAULT_APPEARANCE: Appearance = {
  skin: 'skin_medium',
  eyes: 'eyes_brown',
  hair: {
    styleId: 'hair_short',
    colorId: 'hair_black',
  },
  top: 'starter_tee_grey',
  bottom: 'starter_pants_blue',
  shoes: 'starter_sneakers_white',
  // No accessory by default
};
