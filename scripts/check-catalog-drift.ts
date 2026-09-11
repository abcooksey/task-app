#!/usr/bin/env npx tsx

/**
 * Catalog drift check script for Homestead.
 *
 * Compares catalog.json against the catalog_items table in Supabase.
 * Fails if there are any differences (added, removed, or changed items).
 *
 * Run: npx tsx scripts/check-catalog-drift.ts
 *
 * Use in CI to ensure catalog.json and DB stay in sync.
 *
 * Environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (not anon key!)
 *
 * Options:
 *   --fix    Run seed-catalog.ts to fix drift
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// Types
// =============================================================================

interface CatalogItem {
  id: string
  name: string
  blurb: string
  category: string
  placement: string
  tags: string[]
  price: number
  rarity: string
  footprint: { w: number; h: number }
  isSurface?: boolean
  slots?: { x: number; y: number }[]
  allowMultiple?: boolean
  textureKey: string
  flippedTextureKey?: string
  availability: { kind: string; pool?: string; from?: string; to?: string }
}

interface CatalogFile {
  version: number
  items: CatalogItem[]
}

interface DbCatalogItem {
  id: string
  name: string
  blurb: string | null
  category: string
  price: number
  placement: string
  footprint_w: number
  footprint_h: number
  is_surface: boolean
  slots_json: { x: number; y: number }[] | null
  allow_multiple: boolean
  availability: object
  rarity: string
  texture_key: string
  flipped_texture: string | null
  tags: string[]
  version: number
}

interface Difference {
  itemId: string
  type: 'added' | 'removed' | 'changed'
  field?: string
  jsonValue?: unknown
  dbValue?: unknown
}

// =============================================================================
// Comparison
// =============================================================================

function compareItem(jsonItem: CatalogItem, dbItem: DbCatalogItem): Difference[] {
  const diffs: Difference[] = []

  const check = (field: string, jsonVal: unknown, dbVal: unknown) => {
    const jsonStr = JSON.stringify(jsonVal)
    const dbStr = JSON.stringify(dbVal)
    if (jsonStr !== dbStr) {
      diffs.push({
        itemId: jsonItem.id,
        type: 'changed',
        field,
        jsonValue: jsonVal,
        dbValue: dbVal,
      })
    }
  }

  check('name', jsonItem.name, dbItem.name)
  check('blurb', jsonItem.blurb, dbItem.blurb)
  check('category', jsonItem.category, dbItem.category)
  check('placement', jsonItem.placement, dbItem.placement)
  check('price', jsonItem.price, dbItem.price)
  check('rarity', jsonItem.rarity, dbItem.rarity)
  check('footprint', jsonItem.footprint, { w: dbItem.footprint_w, h: dbItem.footprint_h })
  check('isSurface', jsonItem.isSurface ?? false, dbItem.is_surface)
  check('slots', jsonItem.slots ?? null, dbItem.slots_json)
  check('allowMultiple', jsonItem.allowMultiple ?? getDefaultAllowMultiple(jsonItem.category), dbItem.allow_multiple)
  check('availability', jsonItem.availability, dbItem.availability)
  check('textureKey', jsonItem.textureKey, dbItem.texture_key)
  check('flippedTextureKey', jsonItem.flippedTextureKey ?? null, dbItem.flipped_texture)
  check('tags', jsonItem.tags, dbItem.tags)

  return diffs
}

function getDefaultAllowMultiple(category: string): boolean {
  switch (category) {
    case 'furniture':
    case 'wall_finish':
    case 'floor_finish':
      return false
    default:
      return true
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║            Homestead Catalog Drift Check                   ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  const shouldFix = process.argv.includes('--fix')

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:')
    if (!supabaseUrl) console.error('   - SUPABASE_URL')
    if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nSet these variables and try again.')
    process.exit(1)
  }

  // Load catalog.json
  const catalogPath = path.join(__dirname, '../src/game/content/catalog.json')
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ catalog.json not found at:', catalogPath)
    process.exit(1)
  }

  const catalogFile: CatalogFile = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
  console.log(`📦 catalog.json: v${catalogFile.version}, ${catalogFile.items.length} items`)

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Fetch all items from DB
  const { data: dbItems, error } = await supabase
    .from('catalog_items')
    .select('*')

  if (error) {
    console.error('❌ Failed to fetch catalog items:', error.message)
    process.exit(1)
  }

  console.log(`📦 Database: ${dbItems?.length ?? 0} items\n`)

  // Build maps for comparison
  const jsonItemMap = new Map(catalogFile.items.map((item) => [item.id, item]))
  const dbItemMap = new Map((dbItems ?? []).map((item) => [item.id, item as DbCatalogItem]))

  const differences: Difference[] = []

  // Check for items in JSON but not in DB (added)
  for (const [id] of jsonItemMap) {
    if (!dbItemMap.has(id)) {
      differences.push({ itemId: id, type: 'added' })
    }
  }

  // Check for items in DB but not in JSON (removed)
  for (const [id] of dbItemMap) {
    if (!jsonItemMap.has(id)) {
      differences.push({ itemId: id, type: 'removed' })
    }
  }

  // Check for changed items
  for (const [id, jsonItem] of jsonItemMap) {
    const dbItem = dbItemMap.get(id)
    if (dbItem) {
      const itemDiffs = compareItem(jsonItem, dbItem)
      differences.push(...itemDiffs)
    }
  }

  // Report results
  if (differences.length === 0) {
    console.log('✅ No drift detected - catalog.json and database are in sync!')
    process.exit(0)
  }

  console.log(`❌ Found ${differences.length} differences:\n`)

  const added = differences.filter((d) => d.type === 'added')
  const removed = differences.filter((d) => d.type === 'removed')
  const changed = differences.filter((d) => d.type === 'changed')

  if (added.length > 0) {
    console.log(`📥 Items in JSON but not in DB (${added.length}):`)
    for (const diff of added) {
      console.log(`   + ${diff.itemId}`)
    }
    console.log()
  }

  if (removed.length > 0) {
    console.log(`📤 Items in DB but not in JSON (${removed.length}):`)
    for (const diff of removed) {
      console.log(`   - ${diff.itemId}`)
    }
    console.log()
  }

  if (changed.length > 0) {
    console.log(`🔄 Changed items (${changed.length}):`)
    // Group by item ID
    const byItem = new Map<string, Difference[]>()
    for (const diff of changed) {
      const existing = byItem.get(diff.itemId) ?? []
      existing.push(diff)
      byItem.set(diff.itemId, existing)
    }

    for (const [itemId, diffs] of byItem) {
      console.log(`   ${itemId}:`)
      for (const diff of diffs) {
        console.log(`     ${diff.field}: ${JSON.stringify(diff.dbValue)} → ${JSON.stringify(diff.jsonValue)}`)
      }
    }
    console.log()
  }

  if (shouldFix) {
    console.log('🔧 Running seed-catalog.ts to fix drift...\n')
    const { spawn } = await import('child_process')
    const seedProcess = spawn(
      process.execPath,
      ['--import', 'tsx', path.join(__dirname, 'seed-catalog.ts')],
      {
        stdio: 'inherit',
        env: process.env,
      }
    )

    seedProcess.on('close', (code) => {
      process.exit(code ?? 0)
    })
  } else {
    console.log('Run with --fix to sync database with catalog.json')
    console.log('Or run: npm run catalog:seed')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
