#!/usr/bin/env npx tsx

/**
 * Seed catalog script for Homestead.
 *
 * Reads catalog.json and upserts all items to the catalog_items table.
 * Uses service role key for database access.
 *
 * Run: npx tsx scripts/seed-catalog.ts
 *
 * Environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (not anon key!)
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

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║              Homestead Catalog Seed                        ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

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
  console.log(`📦 Loaded catalog.json v${catalogFile.version} with ${catalogFile.items.length} items\n`)

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Transform items to DB format
  const dbItems: DbCatalogItem[] = catalogFile.items.map((item) => ({
    id: item.id,
    name: item.name,
    blurb: item.blurb || null,
    category: item.category,
    price: item.price,
    placement: item.placement,
    footprint_w: item.footprint.w,
    footprint_h: item.footprint.h,
    is_surface: item.isSurface ?? false,
    slots_json: item.slots ?? null,
    allow_multiple: item.allowMultiple ?? getDefaultAllowMultiple(item.category),
    availability: item.availability,
    rarity: item.rarity,
    texture_key: item.textureKey,
    flipped_texture: item.flippedTextureKey ?? null,
    tags: item.tags,
    version: catalogFile.version,
  }))

  // Upsert all items
  console.log('⬆️  Upserting items to catalog_items...\n')

  const { data, error } = await supabase
    .from('catalog_items')
    .upsert(dbItems, {
      onConflict: 'id',
      ignoreDuplicates: false,
    })
    .select('id')

  if (error) {
    console.error('❌ Upsert failed:', error.message)
    console.error('   Details:', error.details)
    process.exit(1)
  }

  console.log(`✅ Upserted ${dbItems.length} items successfully`)

  // Check for orphaned items in DB (items in DB but not in JSON)
  const { data: dbItemIds, error: fetchError } = await supabase
    .from('catalog_items')
    .select('id')

  if (fetchError) {
    console.error('⚠️  Could not check for orphaned items:', fetchError.message)
  } else {
    const jsonIds = new Set(catalogFile.items.map((item) => item.id))
    const orphaned = dbItemIds?.filter((row) => !jsonIds.has(row.id)) ?? []

    if (orphaned.length > 0) {
      console.log(`\n⚠️  Found ${orphaned.length} orphaned items in DB (not in catalog.json):`)
      for (const item of orphaned) {
        console.log(`   - ${item.id}`)
      }
      console.log('\n   These items exist in the database but not in catalog.json.')
      console.log('   Consider removing them with: npm run catalog:prune')
    }
  }

  console.log('\n✅ Seed complete!')
}

function getDefaultAllowMultiple(category: string): boolean {
  // Furniture and finishes default to single-copy
  // Everything else defaults to allow multiple
  switch (category) {
    case 'furniture':
    case 'wall_finish':
    case 'floor_finish':
      return false
    default:
      return true
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
