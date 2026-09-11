/**
 * Avatar module - Phase 4 avatar appearance and composition.
 *
 * This module provides:
 * - Type definitions for avatar appearance
 * - Pure functions for layer composition (AvatarComposer)
 * - Validation utilities (validateAppearance)
 * - Constants for free options and defaults
 */

// Types
export type {
  Appearance,
  Layer,
  LayerName,
  Pose,
  Reaction,
  WearableFrames,
  WearableItemData,
  CatalogItemForComposer,
  ValidationResult,
  ValidationProblem,
  ValidationReason,
  FreeAppearanceOptions,
  Outfit,
  SkinId,
  EyeColorId,
  HairStyleId,
  HairColorId,
  ItemId,
} from './types';

export { LAYER_ORDER, DEFAULT_APPEARANCE } from './types';

// Composer
export {
  resolve,
  createResolver,
  getOutfitDescription,
  type CatalogLookup,
  type TextureExistsCheck,
  type ResolveOptions,
} from './AvatarComposer';

// Validation
export {
  validateAppearance,
  isFieldValid,
  correctAppearance,
  formatValidationProblems,
} from './validateAppearance';

// Constants
export {
  FREE_SKINS,
  FREE_EYE_COLORS,
  FREE_HAIR_COLORS,
  FREE_HAIR_STYLES,
  STARTER_TOPS,
  STARTER_BOTTOMS,
  STARTER_SHOES,
  FREE_APPEARANCE_OPTIONS,
  DEFAULT_STARTER_TOP,
  DEFAULT_STARTER_BOTTOM,
  DEFAULT_STARTER_SHOES,
  DEFAULT_SKIN,
  DEFAULT_EYES,
  DEFAULT_HAIR_STYLE,
  DEFAULT_HAIR_COLOR,
  PLACEHOLDER_PREFIX,
  getPlaceholderKey,
  FREE_SKINS_SET,
  FREE_EYE_COLORS_SET,
  FREE_HAIR_COLORS_SET,
  FREE_HAIR_STYLES_SET,
  STARTER_TOPS_SET,
  STARTER_BOTTOMS_SET,
  STARTER_SHOES_SET,
  ALL_FREE_IDS_SET,
} from './constants';
