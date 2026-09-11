#!/usr/bin/env npx tsx

/**
 * Generates manifest.json by scanning copied assets.
 *
 * Run: npx tsx scripts/generate-manifest.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.join(__dirname, '..')
const spritesDir = path.join(projectRoot, 'public/assets/sprites')
const manifestPath = path.join(projectRoot, 'src/game/content/manifest.json')

interface AssetEntry {
  type: 'image'
  path: string
  width: number
  height: number
  description: string
}

interface Manifest {
  version: number
  description: string
  assets: Record<string, AssetEntry>
  atlases: Record<string, unknown>
  notes: Record<string, string>
}

// Get image dimensions using 'file' command
function getImageDimensions(filePath: string): { width: number; height: number } {
  try {
    const output = execSync(`file "${filePath}"`, { encoding: 'utf-8' })
    // Parse output like: "file.png: PNG image data, 141 x 141, ..."
    const match = output.match(/(\d+)\s*x\s*(\d+)/)
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) }
    }
  } catch (e) {
    // fallback
  }
  return { width: 64, height: 64 } // default
}

// Category descriptions
const categoryDescriptions: Record<string, string> = {
  furniture: 'Furniture item',
  decor: 'Decorative item',
  rug: 'Rug/floor covering',
  wall: 'Wall decoration',
  surface_decor: 'Surface decoration',
  outdoor: 'Outdoor item',
  wall_finish: 'Wall finish/paint',
  floor_finish: 'Floor finish/material',
}

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║           Homestead Manifest Generator                     ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

const assets: Record<string, AssetEntry> = {}

// Scan each category folder
const categories = fs.readdirSync(spritesDir).filter((f) =>
  fs.statSync(path.join(spritesDir, f)).isDirectory()
)

for (const category of categories) {
  const categoryPath = path.join(spritesDir, category)
  const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.png'))

  for (const file of files) {
    const textureKey = file.replace('.png', '')
    const filePath = path.join(categoryPath, file)
    const dims = getImageDimensions(filePath)

    assets[textureKey] = {
      type: 'image',
      path: `/assets/sprites/${category}/${file}`,
      width: dims.width,
      height: dims.height,
      description: `${categoryDescriptions[category] || 'Asset'}: ${textureKey.replace(/_/g, ' ')}`,
    }

    console.log(`✅ ${textureKey} (${dims.width}x${dims.height})`)
  }
}

// Build manifest
const manifest: Manifest = {
  version: 1,
  description: 'Game asset manifest for Homestead. Maps texture keys to asset files.',
  assets,
  atlases: {},
  notes: {
    catalog_items: 'Catalog item textures are loaded dynamically based on textureKey in catalog.json',
    asset_source: 'Assets sourced from Kenney.nl (CC0 license)',
  },
}

// Write manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

console.log('\n' + '─'.repeat(60))
console.log(`✅ Generated manifest with ${Object.keys(assets).length} assets`)
console.log(`📝 Written to: ${manifestPath}`)
