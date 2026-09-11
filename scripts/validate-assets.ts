#!/usr/bin/env npx tsx

/**
 * Asset validation script for the Homestead catalog.
 *
 * Validates:
 * - All catalog items match the CatalogItem schema
 * - All IDs are unique
 * - All textureKeys are defined and unique
 * - Footprints have positive dimensions
 * - Prices are positive
 * - Category/placement combinations are valid
 * - Calendar references point to valid catalog items
 * - Total asset size is under 4MB (when assets exist)
 *
 * Run: npx tsx scripts/validate-assets.ts
 */

import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// Schema Definitions (matching src/game/placement/types.ts)
// =============================================================================

const placementTypeSchema = z.enum([
  'floor',
  'rug',
  'wall',
  'surface',
  'outdoor',
  'wall_finish',
  'floor_finish',
  'wearable',
])

const categorySchema = z.enum([
  'furniture',
  'decor',
  'rug',
  'wall',         // Used in catalog.json
  'wall_decor',   // TypeScript alias
  'surface_decor',
  'outdoor',
  'wall_finish',
  'floor_finish',
  'clothing_top',
  'clothing_bottom',
  'clothing_shoes',
  'hair',
  'accessory',
])

const raritySchema = z.enum(['common', 'uncommon', 'rare'])

const availabilitySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('always') }),
  z.object({ kind: z.literal('rotation'), pool: z.string() }),
  z.object({ kind: z.literal('seasonal'), from: z.string(), to: z.string() }),
  z.object({ kind: z.literal('starter') }),
])

const footprintSchema = z.object({
  w: z.number().int().positive(),
  h: z.number().int().positive(),
})

const slotPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
})

const catalogItemSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_]+$/, 'ID must be lowercase alphanumeric with underscores'),
  name: z.string().min(1).max(50),
  blurb: z.string().min(1).max(200),
  category: categorySchema,
  placement: placementTypeSchema,
  tags: z.array(z.string()),
  price: z.number().int().min(0),
  rarity: raritySchema,
  footprint: footprintSchema,
  isSurface: z.boolean().optional(),
  slots: z.array(slotPositionSchema).optional(),
  allowMultiple: z.boolean().optional(),
  textureKey: z.string().min(1),
  flippedTextureKey: z.string().optional(),
  availability: availabilitySchema,
})

const catalogSchema = z.object({
  version: z.number().int().positive(),
  items: z.array(catalogItemSchema),
})

// =============================================================================
// Validation Rules
// =============================================================================

// Valid category/placement combinations
const validCategoryPlacements: Record<string, string[]> = {
  furniture: ['floor'],
  decor: ['floor', 'surface'],
  rug: ['rug'],
  wall: ['wall'],           // Used in catalog.json
  wall_decor: ['wall'],     // TypeScript alias
  surface_decor: ['surface'],
  outdoor: ['outdoor'],
  wall_finish: ['wall_finish'],
  floor_finish: ['floor_finish'],
  clothing_top: ['wearable'],
  clothing_bottom: ['wearable'],
  clothing_shoes: ['wearable'],
  hair: ['wearable'],
  accessory: ['wearable'],
}

// Valid rotation pools
const validPools = ['core', 'cozy', 'plants', 'modern', 'vintage', 'outdoor']

// =============================================================================
// Helper Functions
// =============================================================================

function formatError(message: string, itemId?: string): string {
  if (itemId) {
    return `  ❌ [${itemId}] ${message}`
  }
  return `  ❌ ${message}`
}

function formatWarning(message: string, itemId?: string): string {
  if (itemId) {
    return `  ⚠️  [${itemId}] ${message}`
  }
  return `  ⚠️  ${message}`
}

function formatSuccess(message: string): string {
  return `  ✓ ${message}`
}

// =============================================================================
// Main Validation
// =============================================================================

interface ValidationResult {
  errors: string[]
  warnings: string[]
}

function validateCatalog(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Load catalog
  const catalogPath = path.join(__dirname, '../src/game/content/catalog.json')
  if (!fs.existsSync(catalogPath)) {
    errors.push(formatError('catalog.json not found'))
    return { errors, warnings }
  }

  const rawCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))

  // Schema validation
  const parseResult = catalogSchema.safeParse(rawCatalog)
  if (!parseResult.success) {
    const zodErrors = parseResult.error.errors
    for (const err of zodErrors) {
      const pathStr = err.path.join('.')
      errors.push(formatError(`Schema error at ${pathStr}: ${err.message}`))
    }
    return { errors, warnings }
  }

  const catalog = parseResult.data
  const items = catalog.items

  console.log(`\nValidating ${items.length} catalog items...\n`)

  // Check unique IDs
  const seenIds = new Set<string>()
  for (const item of items) {
    if (seenIds.has(item.id)) {
      errors.push(formatError(`Duplicate ID`, item.id))
    }
    seenIds.add(item.id)
  }

  // Check unique textureKeys
  const seenTextureKeys = new Set<string>()
  for (const item of items) {
    if (seenTextureKeys.has(item.textureKey)) {
      warnings.push(formatWarning(`Duplicate textureKey: ${item.textureKey}`, item.id))
    }
    seenTextureKeys.add(item.textureKey)

    if (item.flippedTextureKey && seenTextureKeys.has(item.flippedTextureKey)) {
      warnings.push(formatWarning(`Duplicate flippedTextureKey: ${item.flippedTextureKey}`, item.id))
    }
    if (item.flippedTextureKey) {
      seenTextureKeys.add(item.flippedTextureKey)
    }
  }

  // Validate category/placement combinations
  for (const item of items) {
    const validPlacements = validCategoryPlacements[item.category]
    if (!validPlacements) {
      errors.push(formatError(`Unknown category: ${item.category}`, item.id))
    } else if (!validPlacements.includes(item.placement)) {
      errors.push(
        formatError(
          `Invalid category/placement: ${item.category} cannot have placement ${item.placement}`,
          item.id
        )
      )
    }
  }

  // Validate rotation pools
  for (const item of items) {
    if (item.availability.kind === 'rotation') {
      if (!validPools.includes(item.availability.pool)) {
        errors.push(
          formatError(`Unknown rotation pool: ${item.availability.pool}`, item.id)
        )
      }
    }
  }

  // Validate surface items have slots
  for (const item of items) {
    if (item.isSurface && (!item.slots || item.slots.length === 0)) {
      warnings.push(formatWarning(`Surface item has no slots defined`, item.id))
    }
    if (!item.isSurface && item.slots && item.slots.length > 0) {
      warnings.push(formatWarning(`Non-surface item has slots defined`, item.id))
    }
  }

  // Validate slot positions are within footprint
  for (const item of items) {
    if (item.slots) {
      for (const slot of item.slots) {
        if (slot.x >= item.footprint.w || slot.y >= item.footprint.h) {
          errors.push(
            formatError(
              `Slot position (${slot.x}, ${slot.y}) is outside footprint (${item.footprint.w}×${item.footprint.h})`,
              item.id
            )
          )
        }
      }
    }
  }

  // Validate prices
  for (const item of items) {
    if (item.price < 0) {
      errors.push(formatError(`Negative price: ${item.price}`, item.id))
    }
    if (item.price === 0 && item.availability.kind !== 'starter') {
      warnings.push(formatWarning(`Zero price for non-starter item`, item.id))
    }
  }

  // Check for required categories (should have at least some items)
  const categoryCounts: Record<string, number> = {}
  for (const item of items) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
  }

  const requiredCategories = ['furniture', 'decor', 'rug', 'wall_decor', 'outdoor']
  for (const cat of requiredCategories) {
    if (!categoryCounts[cat] || categoryCounts[cat] < 3) {
      warnings.push(formatWarning(`Category '${cat}' has fewer than 3 items (has ${categoryCounts[cat] || 0})`))
    }
  }

  return { errors, warnings }
}

function validateCalendarReferences(catalogIds: Set<string>): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const calendarPath = path.join(__dirname, '../src/game/content/calendar.json')
  if (!fs.existsSync(calendarPath)) {
    warnings.push(formatWarning('calendar.json not found'))
    return { errors, warnings }
  }

  const calendar = JSON.parse(fs.readFileSync(calendarPath, 'utf-8'))

  // Check seasonal item references
  if (calendar.seasonal) {
    for (const season of calendar.seasonal) {
      for (const itemId of season.items || []) {
        if (!catalogIds.has(itemId)) {
          errors.push(formatError(`Calendar seasonal '${season.id}' references missing item: ${itemId}`))
        }
      }
    }
  }

  // Check event week item references
  if (calendar.eventWeeks) {
    for (const event of calendar.eventWeeks) {
      for (const itemId of event.items || []) {
        if (!catalogIds.has(itemId)) {
          errors.push(formatError(`Calendar event '${event.id}' references missing item: ${itemId}`))
        }
      }
    }
  }

  // Check rotation pool item references
  if (calendar.rotationPools) {
    for (const [poolId, pool] of Object.entries(calendar.rotationPools)) {
      const poolData = pool as { items?: string[] }
      for (const itemId of poolData.items || []) {
        if (!catalogIds.has(itemId)) {
          errors.push(formatError(`Calendar pool '${poolId}' references missing item: ${itemId}`))
        }
      }
    }
  }

  // Check starter kit references
  if (calendar.starterKit?.items) {
    for (const itemId of calendar.starterKit.items) {
      if (!catalogIds.has(itemId)) {
        errors.push(formatError(`Starter kit references missing item: ${itemId}`))
      }
    }
  }

  // Check mystery box seasonal additions
  if (calendar.mysteryBox?.seasonalAdditions) {
    for (const [seasonId, items] of Object.entries(calendar.mysteryBox.seasonalAdditions)) {
      for (const itemId of items as string[]) {
        if (!catalogIds.has(itemId)) {
          errors.push(formatError(`Mystery box seasonal '${seasonId}' references missing item: ${itemId}`))
        }
      }
    }
  }

  return { errors, warnings }
}

function checkAssetSize(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const assetsDir = path.join(__dirname, '../public/assets')
  if (!fs.existsSync(assetsDir)) {
    warnings.push(formatWarning('No public/assets directory found (expected for Slice 10)'))
    return { errors, warnings }
  }

  let totalSize = 0
  const maxSize = 4 * 1024 * 1024 // 4MB

  function walkDir(dir: string) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        walkDir(filePath)
      } else {
        totalSize += stat.size
      }
    }
  }

  walkDir(assetsDir)

  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2)
  if (totalSize > maxSize) {
    errors.push(formatError(`Total asset size ${sizeMB}MB exceeds 4MB limit`))
  } else {
    console.log(formatSuccess(`Total asset size: ${sizeMB}MB (under 4MB limit)`))
  }

  return { errors, warnings }
}

// =============================================================================
// CLI Arguments
// =============================================================================

interface CliArgs {
  skipCalendar: boolean
  generateMissing: boolean
  help: boolean
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  return {
    skipCalendar: args.includes('--skip-calendar'),
    generateMissing: args.includes('--generate-missing'),
    help: args.includes('--help') || args.includes('-h'),
  }
}

function printHelp() {
  console.log(`
Usage: npx tsx scripts/validate-assets.ts [options]

Options:
  --skip-calendar     Skip calendar reference validation (for dev use)
  --generate-missing  Output list of missing items for catalog completion
  -h, --help         Show this help message

Examples:
  npx tsx scripts/validate-assets.ts                    # Full validation
  npx tsx scripts/validate-assets.ts --skip-calendar    # Skip calendar refs
  npx tsx scripts/validate-assets.ts --generate-missing # Show missing items
`)
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const args = parseArgs()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║             Homestead Asset Validation                     ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  let allErrors: string[] = []
  let allWarnings: string[] = []

  // Validate catalog
  console.log('\n📦 Validating catalog.json...')
  const catalogResult = validateCatalog()
  allErrors = allErrors.concat(catalogResult.errors)
  allWarnings = allWarnings.concat(catalogResult.warnings)

  if (catalogResult.errors.length === 0) {
    console.log(formatSuccess('Catalog schema valid'))
  }

  // Get catalog IDs for cross-reference checking
  const catalogPath = path.join(__dirname, '../src/game/content/catalog.json')
  let catalogIds = new Set<string>()
  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
    catalogIds = new Set(catalog.items.map((item: { id: string }) => item.id))
  }

  // Validate calendar references (unless skipped)
  if (args.skipCalendar) {
    console.log('\n📅 Skipping calendar.json validation (--skip-calendar)')
  } else {
    console.log('\n📅 Validating calendar.json references...')
    const calendarResult = validateCalendarReferences(catalogIds)

    if (args.generateMissing) {
      // Extract unique missing item IDs and output them
      const missingItems = new Set<string>()
      for (const err of calendarResult.errors) {
        const match = err.match(/missing item: ([a-z0-9_]+)/)
        if (match) {
          missingItems.add(match[1])
        }
      }

      if (missingItems.size > 0) {
        console.log(`\n📝 Missing catalog items (${missingItems.size}):`)
        const sorted = Array.from(missingItems).sort()
        for (const itemId of sorted) {
          console.log(`  - ${itemId}`)
        }
        console.log('\nAdd these items to src/game/content/catalog.json')
      }
      // Don't count these as errors in generate-missing mode
      allWarnings = allWarnings.concat(
        calendarResult.errors.map((e) => e.replace('❌', '⚠️ '))
      )
    } else {
      allErrors = allErrors.concat(calendarResult.errors)
    }
    allWarnings = allWarnings.concat(calendarResult.warnings)

    if (calendarResult.errors.length === 0) {
      console.log(formatSuccess('Calendar references valid'))
    }
  }

  // Check asset size
  console.log('\n📁 Checking asset size...')
  const assetResult = checkAssetSize()
  allErrors = allErrors.concat(assetResult.errors)
  allWarnings = allWarnings.concat(assetResult.warnings)

  // Summary
  console.log('\n' + '═'.repeat(60))

  if (allWarnings.length > 0) {
    console.log(`\n⚠️  Warnings (${allWarnings.length}):`)
    for (const warning of allWarnings) {
      console.log(warning)
    }
  }

  if (allErrors.length > 0) {
    console.log(`\n❌ Errors (${allErrors.length}):`)
    for (const error of allErrors) {
      console.log(error)
    }
    console.log('\n❌ Validation FAILED')
    process.exit(1)
  }

  console.log('\n✅ Validation PASSED')
  process.exit(0)
}

main()
