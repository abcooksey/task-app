#!/usr/bin/env npx tsx

/**
 * Generates color variants for rugs and wall finishes.
 * Also creates improved placeholder sprites.
 *
 * Run: npx tsx scripts/generate-color-variants.ts
 */

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.join(__dirname, '..')
const outputDir = path.join(projectRoot, 'public/assets/sprites')

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║         Homestead Color Variant Generator                  ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

// ============================================================================
// WALL FINISH COLORS - Generate solid color tiles
// ============================================================================

const WALL_FINISH_COLORS: Record<string, string> = {
  wall_finish_cream: '#F5F0E6',
  wall_finish_sage: '#9CAF88',
  wall_finish_burnt_orange: '#CC5500',
  wall_finish_navy: '#1E3A5F',
  wall_finish_white: '#FAFAFA',
}

const FLOOR_FINISH_COLORS: Record<string, string> = {
  floor_finish_warm_wood: '#8B6914',
  floor_finish_light_wood: '#C4A35A',
  floor_finish_tile_white: '#E8E8E8',
  floor_finish_carpet_grey: '#808080',
  floor_finish_stone: '#696969',
}

async function generateSolidColorTile(
  outputPath: string,
  color: string,
  width = 64,
  height = 64
): Promise<void> {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${color}"/>
      <!-- Add subtle texture -->
      <rect width="${width}" height="${height}" fill="url(#noise)" opacity="0.05"/>
      <defs>
        <pattern id="noise" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="2" height="2" fill="#000"/>
          <rect x="2" y="2" width="2" height="2" fill="#000"/>
        </pattern>
      </defs>
    </svg>
  `

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath)
}

// ============================================================================
// RUG COLOR TINTS - Apply seasonal tints to base rugs
// ============================================================================

interface TintConfig {
  sourceKey: string
  tint: { r: number; g: number; b: number }
  saturation?: number
  brightness?: number
}

const RUG_TINTS: Record<string, TintConfig> = {
  // Autumn leaves rug - warm orange/red tint
  rug_autumn_leaves: {
    sourceKey: 'rug_round_cream',
    tint: { r: 255, g: 140, b: 0 }, // Orange
    saturation: 1.3,
    brightness: 1.0,
  },
  // Winter pattern rug - cool blue tint
  rug_winter_pattern: {
    sourceKey: 'rug_rectangular',
    tint: { r: 135, g: 206, b: 235 }, // Sky blue
    saturation: 0.9,
    brightness: 1.1,
  },
  // Sheepskin - warm white/cream
  rug_sheepskin: {
    sourceKey: 'rug_circular_soft',
    tint: { r: 255, g: 250, b: 240 }, // Floral white
    saturation: 0.5,
    brightness: 1.2,
  },
  // Vintage persian - rich burgundy
  rug_vintage_persian: {
    sourceKey: 'rug_rectangular',
    tint: { r: 128, g: 0, b: 32 }, // Burgundy
    saturation: 1.4,
    brightness: 0.9,
  },
}

async function applyTint(
  inputPath: string,
  outputPath: string,
  tint: { r: number; g: number; b: number },
  saturation = 1.0,
  brightness = 1.0
): Promise<void> {
  if (!fs.existsSync(inputPath)) {
    console.log(`  ⚠️  Source not found: ${inputPath}`)
    return
  }

  await sharp(inputPath)
    .modulate({
      saturation,
      brightness,
    })
    .tint(tint)
    .toFile(outputPath)
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  let generated = 0

  // Generate wall finish colors
  console.log('🎨 Generating wall finish colors...')
  const wallFinishDir = path.join(outputDir, 'wall_finish')
  if (!fs.existsSync(wallFinishDir)) {
    fs.mkdirSync(wallFinishDir, { recursive: true })
  }

  for (const [key, color] of Object.entries(WALL_FINISH_COLORS)) {
    const outputPath = path.join(wallFinishDir, `${key}.png`)
    await generateSolidColorTile(outputPath, color)
    console.log(`  ✅ ${key} (${color})`)
    generated++
  }

  // Generate floor finish colors
  console.log('\n🎨 Generating floor finish colors...')
  const floorFinishDir = path.join(outputDir, 'floor_finish')
  if (!fs.existsSync(floorFinishDir)) {
    fs.mkdirSync(floorFinishDir, { recursive: true })
  }

  for (const [key, color] of Object.entries(FLOOR_FINISH_COLORS)) {
    const outputPath = path.join(floorFinishDir, `${key}.png`)
    await generateSolidColorTile(outputPath, color, 64, 64)
    console.log(`  ✅ ${key} (${color})`)
    generated++
  }

  // Generate rug tints
  console.log('\n🎨 Generating rug color variants...')
  const rugDir = path.join(outputDir, 'rug')

  for (const [targetKey, config] of Object.entries(RUG_TINTS)) {
    const sourcePath = path.join(rugDir, `${config.sourceKey}.png`)
    const outputPath = path.join(rugDir, `${targetKey}.png`)

    if (!fs.existsSync(sourcePath)) {
      console.log(`  ⚠️  Source rug not found: ${config.sourceKey}`)
      continue
    }

    await applyTint(
      sourcePath,
      outputPath,
      config.tint,
      config.saturation,
      config.brightness
    )
    console.log(`  ✅ ${targetKey} <- ${config.sourceKey} + tint`)
    generated++
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`✅ Generated: ${generated} color variants`)
}

main().catch(console.error)
