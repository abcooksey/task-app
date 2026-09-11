#!/usr/bin/env npx tsx

/**
 * Build Avatar Atlas Script
 *
 * Generates avatar sprites for all appearance variants:
 * - 6 skin tones
 * - 4 eye colors
 * - 8 hair colors × 3+ hair styles
 * - Starter clothing
 * - Purchasable wearables
 *
 * Can use either:
 * - LPC (Liberated Pixel Cup) source sprites with palette swapping
 * - Generated placeholder sprites (simple shapes via SVG)
 *
 * Run: npx tsx scripts/build-avatar-atlas.ts [--placeholders]
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.join(__dirname, '..')
const lpcSourceDir = path.join(projectRoot, 'lpc-sprites')
const outputDir = path.join(projectRoot, 'public/assets/avatar')
const manifestPath = path.join(projectRoot, 'src/game/content/manifest.json')

// =============================================================================
// Avatar Layer & Variant Definitions
// =============================================================================

/** Poses that need sprites */
const POSES = ['idle', 'sit'] as const
type Pose = (typeof POSES)[number]

/** Avatar sprite dimensions */
const SPRITE_WIDTH = 64
const SPRITE_HEIGHT = 64

// =============================================================================
// Variant Definitions (from constants.ts)
// =============================================================================

const SKIN_TONES = {
  skin_light: '#FFDFC4',
  skin_light_medium: '#F0C8A0',
  skin_medium: '#D4A574',
  skin_medium_dark: '#A67C52',
  skin_dark: '#6B4423',
  skin_deep: '#3D2314',
}

const EYE_COLORS = {
  eyes_brown: '#5D4037',
  eyes_blue: '#2196F3',
  eyes_green: '#4CAF50',
  eyes_hazel: '#8D6E63',
}

const HAIR_COLORS = {
  hair_black: '#1A1A1A',
  hair_dark_brown: '#3E2723',
  hair_light_brown: '#795548',
  hair_blonde: '#FFD54F',
  hair_red: '#C62828',
  hair_auburn: '#8B4513',
  hair_grey: '#9E9E9E',
  hair_white: '#EEEEEE',
}

const FREE_HAIR_STYLES = ['hair_short', 'hair_medium', 'hair_long']

const STARTER_TOPS = {
  starter_tee_white: '#FFFFFF',
  starter_tee_grey: '#9E9E9E',
  starter_tee_black: '#212121',
}

const STARTER_BOTTOMS = {
  starter_pants_blue: '#1565C0',
  starter_pants_black: '#212121',
  starter_pants_khaki: '#C9B896',
}

const STARTER_SHOES = {
  starter_sneakers_white: '#FFFFFF',
  starter_sneakers_black: '#212121',
}

// =============================================================================
// SVG Sprite Generators
// =============================================================================

function generateBodySvg(skinColor: string, pose: Pose): string {
  const yOffset = pose === 'sit' ? 10 : 0
  const strokeColor = darkenColor(skinColor, 30)

  return `<svg width="${SPRITE_WIDTH}" height="${SPRITE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <!-- Head -->
    <ellipse cx="32" cy="${16 + yOffset}" rx="12" ry="14" fill="${skinColor}" stroke="${strokeColor}" stroke-width="1"/>
    <!-- Neck -->
    <rect x="28" y="${28 + yOffset}" width="8" height="6" fill="${skinColor}"/>
    <!-- Body/torso -->
    <ellipse cx="32" cy="${44 + yOffset}" rx="14" ry="16" fill="${skinColor}" stroke="${strokeColor}" stroke-width="1"/>
  </svg>`
}

function generateEyesSvg(eyeColor: string, pose: Pose): string {
  const yOffset = pose === 'sit' ? 10 : 0
  const eyeY = 14 + yOffset

  return `<svg width="${SPRITE_WIDTH}" height="${SPRITE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <!-- Left eye white -->
    <ellipse cx="27" cy="${eyeY}" rx="4" ry="3" fill="#FFFFFF"/>
    <!-- Right eye white -->
    <ellipse cx="37" cy="${eyeY}" rx="4" ry="3" fill="#FFFFFF"/>
    <!-- Left pupil -->
    <circle cx="27" cy="${eyeY}" r="2" fill="${eyeColor}"/>
    <!-- Right pupil -->
    <circle cx="37" cy="${eyeY}" r="2" fill="${eyeColor}"/>
  </svg>`
}

function generateHairBackSvg(style: string, color: string, pose: Pose): string {
  const yOffset = pose === 'sit' ? 10 : 0
  const strokeColor = darkenColor(color, 20)

  let hairPath = ''
  if (style === 'hair_long') {
    hairPath = `
      <ellipse cx="32" cy="${20 + yOffset}" rx="16" ry="18" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
      <rect x="18" y="${20 + yOffset}" width="28" height="30" fill="${color}"/>
    `
  } else if (style === 'hair_medium') {
    hairPath = `
      <ellipse cx="32" cy="${18 + yOffset}" rx="15" ry="16" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
    `
  } else {
    // Short
    hairPath = `
      <ellipse cx="32" cy="${14 + yOffset}" rx="14" ry="12" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
    `
  }

  return `<svg width="${SPRITE_WIDTH}" height="${SPRITE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${hairPath}
  </svg>`
}

function generateHairFrontSvg(style: string, color: string, pose: Pose): string {
  const yOffset = pose === 'sit' ? 10 : 0
  const strokeColor = darkenColor(color, 20)

  let hairPath = ''
  if (style === 'hair_long') {
    hairPath = `
      <ellipse cx="32" cy="${8 + yOffset}" rx="14" ry="10" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
      <rect x="16" y="${10 + yOffset}" width="6" height="20" fill="${color}"/>
      <rect x="42" y="${10 + yOffset}" width="6" height="20" fill="${color}"/>
    `
  } else if (style === 'hair_medium') {
    hairPath = `
      <ellipse cx="32" cy="${6 + yOffset}" rx="13" ry="8" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
    `
  } else {
    // Short
    hairPath = `
      <ellipse cx="32" cy="${4 + yOffset}" rx="12" ry="6" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
    `
  }

  return `<svg width="${SPRITE_WIDTH}" height="${SPRITE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${hairPath}
  </svg>`
}

function generateTopSvg(color: string, pose: Pose): string {
  const yOffset = pose === 'sit' ? 10 : 0
  const strokeColor = darkenColor(color, 20)

  return `<svg width="${SPRITE_WIDTH}" height="${SPRITE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <path d="M20,${32 + yOffset} L14,${36 + yOffset} L14,${44 + yOffset} L20,${44 + yOffset} L20,${54 + yOffset} L44,${54 + yOffset} L44,${44 + yOffset} L50,${44 + yOffset} L50,${36 + yOffset} L44,${32 + yOffset} Z"
          fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
  </svg>`
}

function generateBottomSvg(color: string, pose: Pose): string {
  const strokeColor = darkenColor(color, 20)

  if (pose === 'sit') {
    return `<svg width="${SPRITE_WIDTH}" height="${SPRITE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="52" width="28" height="10" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
    </svg>`
  }

  return `<svg width="${SPRITE_WIDTH}" height="${SPRITE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <path d="M22,52 L20,62 L28,62 L32,56 L36,62 L44,62 L42,52 Z"
          fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
  </svg>`
}

function generateShoesSvg(color: string, pose: Pose): string {
  const strokeColor = darkenColor(color, 20)
  const y = pose === 'sit' ? 60 : 62

  return `<svg width="${SPRITE_WIDTH}" height="${SPRITE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="26" cy="${y}" rx="6" ry="3" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
    <ellipse cx="38" cy="${y}" rx="6" ry="3" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
  </svg>`
}

// =============================================================================
// Color Utilities
// =============================================================================

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max((num >> 16) - amt, 0)
  const G = Math.max(((num >> 8) & 0x00ff) - amt, 0)
  const B = Math.max((num & 0x0000ff) - amt, 0)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

// =============================================================================
// Asset Generation
// =============================================================================

interface GeneratedAsset {
  key: string
  path: string
  width: number
  height: number
  description: string
}

async function saveSvgAsPng(svg: string, outputPath: string): Promise<void> {
  await sharp(Buffer.from(svg)).png().toFile(outputPath)
}

async function generateAllPlaceholders(): Promise<GeneratedAsset[]> {
  const assets: GeneratedAsset[] = []

  // Ensure output directories exist
  const dirs = ['body', 'eyes', 'hair', 'clothing']
  for (const dir of dirs) {
    const dirPath = path.join(outputDir, dir)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }

  console.log('\n📦 Generating body/skin variants...')
  for (const [skinId, color] of Object.entries(SKIN_TONES)) {
    for (const pose of POSES) {
      const key = `${skinId}_${pose}`
      const svg = generateBodySvg(color, pose)
      const relativePath = `body/${key}.png`
      const fullPath = path.join(outputDir, relativePath)
      await saveSvgAsPng(svg, fullPath)
      assets.push({
        key,
        path: `/assets/avatar/${relativePath}`,
        width: SPRITE_WIDTH,
        height: SPRITE_HEIGHT,
        description: `Body: ${skinId} (${pose})`,
      })
      console.log(`  ✅ ${key}`)
    }
  }

  console.log('\n👁️  Generating eye color variants...')
  for (const [eyeId, color] of Object.entries(EYE_COLORS)) {
    for (const pose of POSES) {
      const key = `${eyeId}_${pose}`
      const svg = generateEyesSvg(color, pose)
      const relativePath = `eyes/${key}.png`
      const fullPath = path.join(outputDir, relativePath)
      await saveSvgAsPng(svg, fullPath)
      assets.push({
        key,
        path: `/assets/avatar/${relativePath}`,
        width: SPRITE_WIDTH,
        height: SPRITE_HEIGHT,
        description: `Eyes: ${eyeId} (${pose})`,
      })
      console.log(`  ✅ ${key}`)
    }
  }

  console.log('\n💇 Generating hair variants...')
  for (const style of FREE_HAIR_STYLES) {
    for (const [colorId, color] of Object.entries(HAIR_COLORS)) {
      for (const pose of POSES) {
        // Hair back layer
        const backKey = `${style}_${colorId}_back_${pose}`
        const backSvg = generateHairBackSvg(style, color, pose)
        const backPath = `hair/${backKey}.png`
        await saveSvgAsPng(backSvg, path.join(outputDir, backPath))
        assets.push({
          key: backKey,
          path: `/assets/avatar/${backPath}`,
          width: SPRITE_WIDTH,
          height: SPRITE_HEIGHT,
          description: `Hair back: ${style} ${colorId} (${pose})`,
        })

        // Hair front layer
        const frontKey = `${style}_${colorId}_front_${pose}`
        const frontSvg = generateHairFrontSvg(style, color, pose)
        const frontPath = `hair/${frontKey}.png`
        await saveSvgAsPng(frontSvg, path.join(outputDir, frontPath))
        assets.push({
          key: frontKey,
          path: `/assets/avatar/${frontPath}`,
          width: SPRITE_WIDTH,
          height: SPRITE_HEIGHT,
          description: `Hair front: ${style} ${colorId} (${pose})`,
        })

        console.log(`  ✅ ${style} + ${colorId} (${pose})`)
      }
    }
  }

  console.log('\n👕 Generating starter tops...')
  for (const [topId, color] of Object.entries(STARTER_TOPS)) {
    for (const pose of POSES) {
      const key = `${topId}_${pose}`
      const svg = generateTopSvg(color, pose)
      const relativePath = `clothing/${key}.png`
      await saveSvgAsPng(svg, path.join(outputDir, relativePath))
      assets.push({
        key,
        path: `/assets/avatar/${relativePath}`,
        width: SPRITE_WIDTH,
        height: SPRITE_HEIGHT,
        description: `Top: ${topId} (${pose})`,
      })
      console.log(`  ✅ ${key}`)
    }
  }

  console.log('\n👖 Generating starter bottoms...')
  for (const [bottomId, color] of Object.entries(STARTER_BOTTOMS)) {
    for (const pose of POSES) {
      const key = `${bottomId}_${pose}`
      const svg = generateBottomSvg(color, pose)
      const relativePath = `clothing/${key}.png`
      await saveSvgAsPng(svg, path.join(outputDir, relativePath))
      assets.push({
        key,
        path: `/assets/avatar/${relativePath}`,
        width: SPRITE_WIDTH,
        height: SPRITE_HEIGHT,
        description: `Bottom: ${bottomId} (${pose})`,
      })
      console.log(`  ✅ ${key}`)
    }
  }

  console.log('\n👟 Generating starter shoes...')
  for (const [shoeId, color] of Object.entries(STARTER_SHOES)) {
    for (const pose of POSES) {
      const key = `${shoeId}_${pose}`
      const svg = generateShoesSvg(color, pose)
      const relativePath = `clothing/${key}.png`
      await saveSvgAsPng(svg, path.join(outputDir, relativePath))
      assets.push({
        key,
        path: `/assets/avatar/${relativePath}`,
        width: SPRITE_WIDTH,
        height: SPRITE_HEIGHT,
        description: `Shoes: ${shoeId} (${pose})`,
      })
      console.log(`  ✅ ${key}`)
    }
  }

  return assets
}

// =============================================================================
// Manifest Integration
// =============================================================================

function updateManifest(avatarAssets: GeneratedAsset[]): void {
  let manifest: {
    version: number
    description: string
    assets: Record<string, unknown>
    avatarAssets?: Record<string, unknown>
    atlases: Record<string, unknown>
    notes: Record<string, string>
  }

  // Load existing manifest
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  } else {
    manifest = {
      version: 1,
      description: 'Game asset manifest for Homestead',
      assets: {},
      atlases: {},
      notes: {},
    }
  }

  // Add avatar assets section
  manifest.avatarAssets = {}
  for (const asset of avatarAssets) {
    manifest.avatarAssets[asset.key] = {
      type: 'image',
      path: asset.path,
      width: asset.width,
      height: asset.height,
      description: asset.description,
    }
  }

  manifest.notes.avatar_assets = 'Avatar layer sprites for character customization'

  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}

// =============================================================================
// LPC Asset Processing (for when real assets are available)
// =============================================================================

function checkLpcAssets(): boolean {
  if (!fs.existsSync(lpcSourceDir)) {
    console.log('ℹ️  LPC source directory not found. Will generate placeholders.')
    return false
  }

  const requiredDirs = ['base', 'hair', 'clothing']
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(lpcSourceDir, dir))) {
      console.log(`ℹ️  LPC ${dir} directory not found. Will generate placeholders.`)
      return false
    }
  }

  return true
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║           Homestead Avatar Atlas Builder                   ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  const usePlaceholders = process.argv.includes('--placeholders') || !checkLpcAssets()

  if (usePlaceholders) {
    console.log('🎨 Mode: Generating placeholder sprites\n')

    try {
      const assets = await generateAllPlaceholders()

      console.log('\n📝 Updating manifest...')
      updateManifest(assets)

      console.log('\n' + '─'.repeat(60))
      console.log(`✅ Generated ${assets.length} avatar sprites`)
      console.log(`📁 Output: ${outputDir}`)
      console.log(`📋 Manifest updated: ${manifestPath}`)

      // Summary
      const bodySpriteCount = Object.keys(SKIN_TONES).length * POSES.length
      const eyesSpriteCount = Object.keys(EYE_COLORS).length * POSES.length
      const hairSpriteCount =
        FREE_HAIR_STYLES.length * Object.keys(HAIR_COLORS).length * POSES.length * 2
      const clothingSpriteCount =
        (Object.keys(STARTER_TOPS).length +
          Object.keys(STARTER_BOTTOMS).length +
          Object.keys(STARTER_SHOES).length) *
        POSES.length

      console.log('\n📊 Breakdown:')
      console.log(`   Body/skin:  ${bodySpriteCount} sprites (${Object.keys(SKIN_TONES).length} tones × ${POSES.length} poses)`)
      console.log(`   Eyes:       ${eyesSpriteCount} sprites (${Object.keys(EYE_COLORS).length} colors × ${POSES.length} poses)`)
      console.log(`   Hair:       ${hairSpriteCount} sprites (${FREE_HAIR_STYLES.length} styles × ${Object.keys(HAIR_COLORS).length} colors × ${POSES.length} poses × 2 layers)`)
      console.log(`   Clothing:   ${clothingSpriteCount} sprites (starter items × ${POSES.length} poses)`)

      // Calculate total size
      let totalSize = 0
      const walkDir = (dir: string) => {
        if (!fs.existsSync(dir)) return
        for (const file of fs.readdirSync(dir)) {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          if (stat.isDirectory()) {
            walkDir(filePath)
          } else {
            totalSize += stat.size
          }
        }
      }
      walkDir(outputDir)
      const sizeKB = (totalSize / 1024).toFixed(1)
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(2)
      console.log(`\n📏 Total size: ${sizeKB} KB (${sizeMB} MB)`)
      console.log(`   Budget: 3 MB max`)
      console.log(`   Status: ${totalSize < 3 * 1024 * 1024 ? '✅ Under budget' : '⚠️ Over budget!'}`)
    } catch (error) {
      console.error('❌ Error generating sprites:', error)
      process.exit(1)
    }
  } else {
    console.log('🎨 Mode: Processing LPC source sprites\n')
    console.log('TODO: Implement LPC palette swapping')
    console.log('For now, use --placeholders flag or remove lpc-sprites directory')
  }
}

main()
