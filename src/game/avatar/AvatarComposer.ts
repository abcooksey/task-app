/**
 * AvatarComposer - Pure function for resolving avatar appearance to sprite layers.
 *
 * This is the single source of truth for avatar layer ordering and composition.
 * It is shared between Phaser (room rendering) and DOM (wardrobe, header, focus timer).
 *
 * Key invariants:
 * - Never throws, always returns a valid layer array
 * - Falls back to placeholder for missing textures
 * - Falls back to starter pieces for invalid/unowned items
 */

import type {
  Appearance,
  Layer,
  LayerName,
  Pose,
  Reaction,
  WearableFrames,
  CatalogItemForComposer,
} from './types';
import { LAYER_ORDER } from './types';
import {
  DEFAULT_STARTER_TOP,
  DEFAULT_STARTER_BOTTOM,
  DEFAULT_STARTER_SHOES,
  DEFAULT_SKIN,
  DEFAULT_EYES,
  DEFAULT_HAIR_STYLE,
  DEFAULT_HAIR_COLOR,
  getPlaceholderKey,
} from './constants';

// =============================================================================
// Types
// =============================================================================

/**
 * Function to look up a catalog item by ID.
 * Returns undefined if item not found.
 */
export type CatalogLookup = (id: string) => CatalogItemForComposer | undefined;

/**
 * Function to check if a texture exists in the manifest.
 */
export type TextureExistsCheck = (textureKey: string) => boolean;

/**
 * Options for the resolve function.
 */
export interface ResolveOptions {
  /** The appearance to resolve */
  appearance: Appearance;

  /** Function to look up catalog items */
  getCatalogItem: CatalogLookup;

  /** Function to check if texture exists */
  textureExists: TextureExistsCheck;

  /** Current pose */
  pose: Pose;

  /** Animation frame index (0 for static) */
  frame: number;

  /** Optional reaction override (takes precedence over pose) */
  reaction?: Reaction;

  /** Whether to flip the avatar horizontally */
  flipped?: boolean;

  /** Force placeholder mode (all layers show as placeholders) */
  usePlaceholderArt?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the texture key for a wearable item at a given pose/reaction.
 * Falls back to idle if the specific pose isn't available.
 */
function getWearableTextureKey(
  frames: WearableFrames | undefined,
  pose: Pose,
  reaction: Reaction | undefined
): string | undefined {
  if (!frames) return undefined;

  // Reaction takes precedence
  if (reaction) {
    const reactionKey = frames[reaction];
    if (reactionKey) return reactionKey;
    // Fall back to idle for missing reaction frames
    return frames.idle;
  }

  // Use pose-specific frame
  if (pose === 'sit') {
    return frames.sit || frames.idle;
  }

  return frames.idle;
}

/**
 * Create a placeholder layer for a given layer name.
 */
function createPlaceholderLayer(
  layerName: LayerName,
  frame: number,
  flipped: boolean
): Layer {
  return {
    layerName,
    textureKey: getPlaceholderKey(layerName),
    frameIndex: frame,
    flipped,
    isPlaceholder: true,
  };
}

/**
 * Create a layer for a body part (skin, eyes, hair).
 */
function createBodyLayer(
  layerName: LayerName,
  textureKey: string,
  frame: number,
  flipped: boolean,
  textureExists: TextureExistsCheck,
  usePlaceholderArt: boolean
): Layer {
  if (usePlaceholderArt || !textureExists(textureKey)) {
    return createPlaceholderLayer(layerName, frame, flipped);
  }

  return {
    layerName,
    textureKey,
    frameIndex: frame,
    flipped,
  };
}

/**
 * Create a layer for a wearable item.
 */
function createWearableLayer(
  layerName: LayerName,
  item: CatalogItemForComposer | undefined,
  pose: Pose,
  reaction: Reaction | undefined,
  frame: number,
  flipped: boolean,
  textureExists: TextureExistsCheck,
  usePlaceholderArt: boolean
): Layer {
  if (!item) {
    return createPlaceholderLayer(layerName, frame, flipped);
  }

  const textureKey = getWearableTextureKey(item.frames, pose, reaction);

  if (usePlaceholderArt || !textureKey || !textureExists(textureKey)) {
    return createPlaceholderLayer(layerName, frame, flipped);
  }

  return {
    layerName,
    textureKey,
    frameIndex: frame,
    flipped,
  };
}

// =============================================================================
// Main Resolve Function
// =============================================================================

/**
 * Resolve an appearance into an ordered list of sprite layers.
 *
 * Layer order (bottom to top):
 * 1. hair_back - Back portion of hairstyles (ponytails, long hair)
 * 2. body - Base body with skin tone
 * 3. eyes - Eye sprite with color
 * 4. bottom - Pants, skirts, shorts
 * 5. shoes - Footwear
 * 6. top - Shirts, jackets, dresses
 * 7. hair_front - Front portion of hair (bangs, fringe)
 * 8. accessory - Glasses, hats, scarves
 *
 * @param options - Resolution options
 * @returns Ordered array of layers, ready for rendering
 */
export function resolve(options: ResolveOptions): Layer[] {
  const {
    appearance,
    getCatalogItem,
    textureExists,
    pose,
    frame,
    reaction,
    flipped = false,
    usePlaceholderArt = false,
  } = options;

  const layers: Layer[] = [];

  // Get wearable items with fallbacks
  const topItem = getCatalogItem(appearance.top) ?? getCatalogItem(DEFAULT_STARTER_TOP);
  const bottomItem = getCatalogItem(appearance.bottom) ?? getCatalogItem(DEFAULT_STARTER_BOTTOM);
  const shoesItem = getCatalogItem(appearance.shoes) ?? getCatalogItem(DEFAULT_STARTER_SHOES);
  const accessoryItem = appearance.accessory ? getCatalogItem(appearance.accessory) : undefined;

  // Check hide rules from top item
  const hidesHair = topItem?.hidesHair ?? false;
  const hidesAccessory = topItem?.hidesAccessory ?? false;

  // Also check accessory for hide rules (e.g., full-coverage hats)
  const accessoryHidesHair = accessoryItem?.hidesHair ?? false;

  // Combined hide rules
  const shouldHideHair = hidesHair || accessoryHidesHair;
  const shouldHideAccessory = hidesAccessory;

  // Resolve appearance values with fallbacks
  const skin = appearance.skin || DEFAULT_SKIN;
  const eyes = appearance.eyes || DEFAULT_EYES;
  const hairStyle = appearance.hair?.styleId || DEFAULT_HAIR_STYLE;
  const hairColor = appearance.hair?.colorId || DEFAULT_HAIR_COLOR;

  // Build texture keys for body parts
  // Format: {part}_{variant}_{pose} e.g., "body_skin_medium_idle"
  const poseKey = reaction || (pose === 'sit' ? 'sit' : 'idle');
  const bodyTextureKey = `body_${skin}_${poseKey}`;
  const eyesTextureKey = `eyes_${eyes}_${poseKey}`;
  const hairBackTextureKey = `${hairStyle}_${hairColor}_back_${poseKey}`;
  const hairFrontTextureKey = `${hairStyle}_${hairColor}_front_${poseKey}`;

  // Build layers in order
  for (const layerName of LAYER_ORDER) {
    switch (layerName) {
      case 'hair_back':
        if (!shouldHideHair) {
          layers.push(
            createBodyLayer(
              layerName,
              hairBackTextureKey,
              frame,
              flipped,
              textureExists,
              usePlaceholderArt
            )
          );
        }
        break;

      case 'body':
        layers.push(
          createBodyLayer(
            layerName,
            bodyTextureKey,
            frame,
            flipped,
            textureExists,
            usePlaceholderArt
          )
        );
        break;

      case 'eyes':
        layers.push(
          createBodyLayer(
            layerName,
            eyesTextureKey,
            frame,
            flipped,
            textureExists,
            usePlaceholderArt
          )
        );
        break;

      case 'bottom':
        layers.push(
          createWearableLayer(
            layerName,
            bottomItem,
            pose,
            reaction,
            frame,
            flipped,
            textureExists,
            usePlaceholderArt
          )
        );
        break;

      case 'shoes':
        layers.push(
          createWearableLayer(
            layerName,
            shoesItem,
            pose,
            reaction,
            frame,
            flipped,
            textureExists,
            usePlaceholderArt
          )
        );
        break;

      case 'top':
        layers.push(
          createWearableLayer(
            layerName,
            topItem,
            pose,
            reaction,
            frame,
            flipped,
            textureExists,
            usePlaceholderArt
          )
        );
        break;

      case 'hair_front':
        if (!shouldHideHair) {
          layers.push(
            createBodyLayer(
              layerName,
              hairFrontTextureKey,
              frame,
              flipped,
              textureExists,
              usePlaceholderArt
            )
          );
        }
        break;

      case 'accessory':
        // Only add accessory layer if:
        // 1. An accessory is equipped
        // 2. The top doesn't hide accessories
        if (accessoryItem && !shouldHideAccessory) {
          layers.push(
            createWearableLayer(
              layerName,
              accessoryItem,
              pose,
              reaction,
              frame,
              flipped,
              textureExists,
              usePlaceholderArt
            )
          );
        }
        break;
    }
  }

  return layers;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a simple resolve function with pre-bound catalog and texture checks.
 * Useful for components that resolve appearances repeatedly.
 */
export function createResolver(
  getCatalogItem: CatalogLookup,
  textureExists: TextureExistsCheck,
  usePlaceholderArt = false
) {
  return function resolveAppearance(
    appearance: Appearance,
    pose: Pose,
    frame: number,
    options: { reaction?: Reaction; flipped?: boolean } = {}
  ): Layer[] {
    return resolve({
      appearance,
      getCatalogItem,
      textureExists,
      pose,
      frame,
      reaction: options.reaction,
      flipped: options.flipped,
      usePlaceholderArt,
    });
  };
}

/**
 * Get a human-readable description of an outfit for accessibility.
 * Used for aria-label on avatar components.
 */
export function getOutfitDescription(
  appearance: Appearance,
  getCatalogItem: CatalogLookup
): string {
  const parts: string[] = [];

  // Hair
  const hairItem = getCatalogItem(appearance.hair.styleId);
  parts.push(hairItem?.textureKey ?? appearance.hair.styleId);

  // Top
  const topItem = getCatalogItem(appearance.top);
  parts.push(topItem?.textureKey ?? appearance.top);

  // Bottom
  const bottomItem = getCatalogItem(appearance.bottom);
  parts.push(bottomItem?.textureKey ?? appearance.bottom);

  // Shoes
  const shoesItem = getCatalogItem(appearance.shoes);
  parts.push(shoesItem?.textureKey ?? appearance.shoes);

  // Accessory (optional)
  if (appearance.accessory) {
    const accessoryItem = getCatalogItem(appearance.accessory);
    parts.push(accessoryItem?.textureKey ?? appearance.accessory);
  }

  return `Wearing ${parts.join(', ')}`;
}
