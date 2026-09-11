#!/usr/bin/env npx tsx

/**
 * Credits check script for the Homestead catalog.
 *
 * Ensures every asset in the catalog has a corresponding credit entry.
 * This is required for legal compliance with asset licenses.
 *
 * Validates:
 * - CREDITS.md exists and has valid format
 * - Every textureKey in catalog.json has a credit entry
 * - No orphaned credits (credits for non-existent assets)
 * - Required fields are present (source, license, author where applicable)
 *
 * Run: npx tsx scripts/check-credits.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// Types
// =============================================================================

interface CreditEntry {
  textureKey: string
  source: string
  license: string
  author?: string
  url?: string
  modifications?: string
}

interface ParsedCredits {
  entries: CreditEntry[]
  errors: string[]
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatError(message: string): string {
  return `  ❌ ${message}`
}

function formatWarning(message: string): string {
  return `  ⚠️  ${message}`
}

function formatSuccess(message: string): string {
  return `  ✓ ${message}`
}

// =============================================================================
// Credits Parser
// =============================================================================

/**
 * Parse CREDITS.md file format:
 *
 * Supports two formats:
 *
 * 1. Individual entries:
 * ### texture_key_name
 * - **Source**: Asset pack name or "Original"
 * - **License**: CC0 / CC-BY 4.0 / MIT / etc.
 *
 * 2. Bulk entries (for CC0 assets from same source):
 * ### Pack Name
 * - **Source**: [Link](url)
 * - **License**: CC0 1.0 (Public Domain)
 * **Assets used:**
 * | Category | Assets |
 * | ... | texture_key_1, texture_key_2, ... |
 */
function parseCreditsFile(content: string): ParsedCredits {
  const entries: CreditEntry[] = []
  const errors: string[] = []

  const lines = content.split('\n')
  let currentEntry: Partial<CreditEntry> | null = null
  let currentBulkSource: { source: string; license: string; author?: string } | null = null
  let lineNumber = 0
  let inTable = false

  for (const line of lines) {
    lineNumber++

    // New entry starts with ###
    if (line.startsWith('### ')) {
      // Save previous entry if it was an individual entry
      if (currentEntry && currentEntry.textureKey && /^[a-z0-9_]+$/.test(currentEntry.textureKey)) {
        if (currentEntry.source && currentEntry.license) {
          entries.push(currentEntry as CreditEntry)
        } else {
          const missing = []
          if (!currentEntry.source) missing.push('Source')
          if (!currentEntry.license) missing.push('License')
          errors.push(`Entry "${currentEntry.textureKey}" missing required fields: ${missing.join(', ')}`)
        }
      }

      const headerText = line.slice(4).trim()

      // Check if this is a valid texture key (individual entry) or a bulk header
      if (/^[a-z0-9_]+$/.test(headerText)) {
        // Individual texture key entry
        currentEntry = { textureKey: headerText }
        currentBulkSource = null
        inTable = false
      } else {
        // Bulk header (pack name) - reset for bulk parsing
        currentEntry = null
        currentBulkSource = null
        inTable = false
      }
      continue
    }

    // Parse source/license fields for bulk entries
    if (line.startsWith('- **Source**:') && !currentEntry) {
      const match = line.match(/\*\*Source\*\*:\s*(.+)/)
      if (match) {
        if (!currentBulkSource) currentBulkSource = { source: '', license: '' }
        currentBulkSource.source = match[1].trim()
      }
      continue
    }

    if (line.startsWith('- **License**:') && !currentEntry) {
      const match = line.match(/\*\*License\*\*:\s*(.+)/)
      if (match) {
        if (!currentBulkSource) currentBulkSource = { source: '', license: '' }
        currentBulkSource.license = match[1].trim()
      }
      continue
    }

    if (line.startsWith('- **Author**:') && !currentEntry) {
      const match = line.match(/\*\*Author\*\*:\s*(.+)/)
      if (match) {
        if (!currentBulkSource) currentBulkSource = { source: '', license: '' }
        currentBulkSource.author = match[1].trim()
      }
      continue
    }

    // Parse entry fields for individual entries
    if (currentEntry && line.startsWith('- **')) {
      const match = line.match(/^- \*\*([^*]+)\*\*:\s*(.+)$/)
      if (match) {
        const [, field, value] = match
        const fieldLower = field.toLowerCase().trim()

        switch (fieldLower) {
          case 'source':
            currentEntry.source = value.trim()
            break
          case 'license':
            currentEntry.license = value.trim()
            break
          case 'author':
            currentEntry.author = value.trim()
            break
          case 'url':
            currentEntry.url = value.trim()
            break
          case 'modifications':
            currentEntry.modifications = value.trim()
            break
        }
      }
      continue
    }

    // Check for table start (bulk asset listing)
    if (line.startsWith('| Category') || line.startsWith('|---')) {
      inTable = true
      continue
    }

    // Parse table rows for bulk entries
    if (inTable && line.startsWith('|') && currentBulkSource?.source && currentBulkSource?.license) {
      // Parse table row: | Category | asset1, asset2, asset3 |
      const cells = line.split('|').map(c => c.trim()).filter(c => c)
      if (cells.length >= 2) {
        const assetsCell = cells[1] // Second column has the assets
        const assetKeys = assetsCell.split(',').map(a => a.trim()).filter(a => /^[a-z0-9_]+$/.test(a))

        for (const key of assetKeys) {
          entries.push({
            textureKey: key,
            source: currentBulkSource.source,
            license: currentBulkSource.license,
            author: currentBulkSource.author,
          })
        }
      }
      continue
    }

    // Empty line or non-table line ends table parsing
    if (inTable && !line.startsWith('|')) {
      inTable = false
    }
  }

  // Don't forget the last individual entry
  if (currentEntry && currentEntry.textureKey && /^[a-z0-9_]+$/.test(currentEntry.textureKey)) {
    if (currentEntry.source && currentEntry.license) {
      entries.push(currentEntry as CreditEntry)
    } else if (currentEntry.textureKey) {
      const missing = []
      if (!currentEntry.source) missing.push('Source')
      if (!currentEntry.license) missing.push('License')
      errors.push(`Entry "${currentEntry.textureKey}" missing required fields: ${missing.join(', ')}`)
    }
  }

  return { entries, errors }
}

// =============================================================================
// Validation
// =============================================================================

interface ValidationResult {
  errors: string[]
  warnings: string[]
}

function checkCredits(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Load catalog
  const catalogPath = path.join(__dirname, '../src/game/content/catalog.json')
  if (!fs.existsSync(catalogPath)) {
    errors.push(formatError('catalog.json not found'))
    return { errors, warnings }
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
  const items = catalog.items as Array<{ id: string; textureKey: string; flippedTextureKey?: string }>

  // Collect all texture keys from catalog
  const requiredKeys = new Set<string>()
  for (const item of items) {
    requiredKeys.add(item.textureKey)
    if (item.flippedTextureKey) {
      requiredKeys.add(item.flippedTextureKey)
    }
  }

  console.log(`Found ${requiredKeys.size} unique texture keys in catalog\n`)

  // Check CREDITS.md exists
  const creditsPath = path.join(__dirname, '../CREDITS.md')
  if (!fs.existsSync(creditsPath)) {
    errors.push(formatError('CREDITS.md not found'))
    errors.push(formatError(`Create CREDITS.md with entries for all ${requiredKeys.size} texture keys`))

    // Output list of required keys
    console.log('\n📝 Required texture keys:')
    const sorted = Array.from(requiredKeys).sort()
    for (const key of sorted.slice(0, 10)) {
      console.log(`  - ${key}`)
    }
    if (sorted.length > 10) {
      console.log(`  ... and ${sorted.length - 10} more`)
    }

    return { errors, warnings }
  }

  // Parse CREDITS.md
  const creditsContent = fs.readFileSync(creditsPath, 'utf-8')
  const parsed = parseCreditsFile(creditsContent)

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push(formatError(`CREDITS.md: ${err}`))
    }
  }

  const creditedKeys = new Set(parsed.entries.map((e) => e.textureKey))
  console.log(`Found ${creditedKeys.size} credited texture keys in CREDITS.md\n`)

  // Check for missing credits
  const missingCredits: string[] = []
  for (const key of requiredKeys) {
    if (!creditedKeys.has(key)) {
      missingCredits.push(key)
    }
  }

  if (missingCredits.length > 0) {
    errors.push(formatError(`${missingCredits.length} texture keys missing credits:`))
    for (const key of missingCredits.sort()) {
      errors.push(`     - ${key}`)
    }
  }

  // Check for orphaned credits (credits for assets not in catalog)
  const orphanedCredits: string[] = []
  for (const key of creditedKeys) {
    if (!requiredKeys.has(key)) {
      orphanedCredits.push(key)
    }
  }

  if (orphanedCredits.length > 0) {
    warnings.push(formatWarning(`${orphanedCredits.length} credits for non-existent assets (may be intentional):`))
    for (const key of orphanedCredits.sort()) {
      warnings.push(`     - ${key}`)
    }
  }

  // Validate license types
  const validLicenses = [
    'CC0',
    'CC0 1.0',
    'CC-BY 4.0',
    'CC-BY 3.0',
    'CC-BY-SA 4.0',
    'CC-BY-SA 3.0',
    'MIT',
    'Apache 2.0',
    'OFL',
    'Public Domain',
    'Original',
    'Custom - See URL',
  ]

  for (const entry of parsed.entries) {
    const license = entry.license.toUpperCase().replace(/\s+/g, ' ').trim()
    const isValid = validLicenses.some(
      (valid) => valid.toUpperCase() === license || license.startsWith(valid.toUpperCase())
    )

    if (!isValid) {
      warnings.push(formatWarning(`Unusual license for ${entry.textureKey}: "${entry.license}"`))
    }

    // CC-BY licenses require author
    if (entry.license.includes('CC-BY') && !entry.author) {
      errors.push(formatError(`CC-BY license for ${entry.textureKey} requires author attribution`))
    }
  }

  if (missingCredits.length === 0 && parsed.errors.length === 0) {
    console.log(formatSuccess('All texture keys have valid credits'))
  }

  return { errors, warnings }
}

// =============================================================================
// CLI
// =============================================================================

function printHelp() {
  console.log(`
Usage: npx tsx scripts/check-credits.ts [options]

Options:
  --generate    Generate CREDITS.md template with all required entries
  -h, --help    Show this help message

Examples:
  npx tsx scripts/check-credits.ts            # Check credits
  npx tsx scripts/check-credits.ts --generate # Generate template
`)
}

function generateTemplate(): void {
  const catalogPath = path.join(__dirname, '../src/game/content/catalog.json')
  if (!fs.existsSync(catalogPath)) {
    console.error('catalog.json not found')
    process.exit(1)
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
  const items = catalog.items as Array<{ id: string; textureKey: string; name: string }>

  // Get unique texture keys
  const textureKeys = new Set<string>()
  const keyToName = new Map<string, string>()

  for (const item of items) {
    textureKeys.add(item.textureKey)
    if (!keyToName.has(item.textureKey)) {
      keyToName.set(item.textureKey, item.name)
    }
  }

  let template = `# Asset Credits

This file documents the source and license for all game assets.
Every texture used in the game must have an entry here.

## Legend

- **Source**: Where the asset came from (pack name, "Original", etc.)
- **License**: The license under which the asset is distributed
- **Author**: The creator (required for CC-BY licenses)
- **URL**: Link to the source (optional but recommended)
- **Modifications**: Any changes made (optional)

---

## Catalog Assets

`

  const sorted = Array.from(textureKeys).sort()

  for (const key of sorted) {
    const name = keyToName.get(key) || key
    template += `### ${key}
- **Source**: [TODO]
- **License**: [TODO - e.g., CC0, CC-BY 4.0, MIT]
- **Author**: [TODO - if required by license]
- **URL**: [TODO - optional]

`
  }

  template += `---

## Additional Assets

Add any non-catalog assets here (UI elements, backgrounds, etc.)

`

  const outputPath = path.join(__dirname, '../CREDITS.md')
  fs.writeFileSync(outputPath, template)
  console.log(`Generated CREDITS.md template with ${textureKeys.size} entries`)
  console.log(`Edit ${outputPath} to add asset information`)
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  if (args.includes('--generate')) {
    generateTemplate()
    process.exit(0)
  }

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║              Homestead Credits Check                       ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  const result = checkCredits()

  console.log('\n' + '═'.repeat(60))

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${result.warnings.length}):`)
    for (const warning of result.warnings) {
      console.log(warning)
    }
  }

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`)
    for (const error of result.errors) {
      console.log(error)
    }
    console.log('\n❌ Credits check FAILED')
    process.exit(1)
  }

  console.log('\n✅ Credits check PASSED')
  process.exit(0)
}

main()
