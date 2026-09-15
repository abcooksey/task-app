#!/usr/bin/env npx tsx

/**
 * Copies and renames Kenney assets to match Homestead catalog textureKeys.
 *
 * Run: npx tsx scripts/copy-kenney-assets.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.join(__dirname, '..')
const kenneyDir = path.join(projectRoot, 'kenney')
const outputDir = path.join(projectRoot, 'public/assets/sprites')

// Kenney source directories
const furnitureIsometric = path.join(kenneyDir, 'furniture-kit/Isometric')
const holidayPreviews = path.join(kenneyDir, 'holiday-kit/Previews')
const graveyardPreviews = path.join(kenneyDir, 'graveyard-kit/Previews')
const miniDungeonPreviews = path.join(kenneyDir, 'mini-dungeon/Previews')
const fantasyTownPreviews = path.join(kenneyDir, 'fantasy-town-kit/Previews')
const miniForestPreviews = path.join(kenneyDir, 'mini-forest/Previews')
const natureKitIsometric = path.join(kenneyDir, 'nature-kit/Isometric')

// Asset mapping: textureKey -> { source, sourceFile }
// Using _SE suffix for isometric southeast view (default viewing angle)
const assetMapping: Record<string, { source: string; file: string }> = {
  // ============ FURNITURE (20/20) ============
  furniture_sofa_blue: { source: furnitureIsometric, file: 'loungeSofa_SE.png' },
  furniture_sofa_cream: { source: furnitureIsometric, file: 'loungeSofaLong_SE.png' },
  furniture_armchair_plush: { source: furnitureIsometric, file: 'loungeChair_SE.png' },
  furniture_bed_single: { source: furnitureIsometric, file: 'bedSingle_SE.png' },
  furniture_bed_double: { source: furnitureIsometric, file: 'bedDouble_SE.png' },
  furniture_desk_wooden: { source: furnitureIsometric, file: 'desk_SE.png' },
  furniture_desk_modern: { source: furnitureIsometric, file: 'deskCorner_SE.png' },
  furniture_table_coffee: { source: furnitureIsometric, file: 'tableCoffee_SE.png' },
  furniture_table_side: { source: furnitureIsometric, file: 'sideTable_SE.png' },
  furniture_bookshelf_tall: { source: furnitureIsometric, file: 'bookcaseOpen_SE.png' },
  furniture_bookshelf_short: { source: furnitureIsometric, file: 'bookcaseOpenLow_SE.png' },
  furniture_wardrobe: { source: furnitureIsometric, file: 'bookcaseClosedDoors_SE.png' },
  furniture_dresser: { source: furnitureIsometric, file: 'cabinetBedDrawer_SE.png' },
  furniture_chair_dining: { source: furnitureIsometric, file: 'chair_SE.png' },
  furniture_stool: { source: furnitureIsometric, file: 'stoolBar_SE.png' },
  furniture_plant_stand: { source: furnitureIsometric, file: 'sideTableDrawers_SE.png' },
  furniture_reading_chair: { source: furnitureIsometric, file: 'loungeChairRelax_SE.png' },
  furniture_tv_stand: { source: furnitureIsometric, file: 'cabinetTelevision_SE.png' },
  furniture_cabinet: { source: furnitureIsometric, file: 'bookcaseClosed_SE.png' },
  furniture_nightstand: { source: furnitureIsometric, file: 'cabinetBed_SE.png' },

  // ============ DECOR (18/18) ============
  decor_plant_fern: { source: furnitureIsometric, file: 'pottedPlant_SE.png' },
  decor_plant_monstera: { source: furnitureIsometric, file: 'pottedPlant_SE.png' },
  decor_plant_small: { source: furnitureIsometric, file: 'plantSmall1_SE.png' },
  decor_lamp_floor: { source: furnitureIsometric, file: 'lampRoundFloor_SE.png' },
  decor_lamp_floor_arc: { source: furnitureIsometric, file: 'lampSquareFloor_SE.png' },
  decor_vase_tall: { source: furnitureIsometric, file: 'plantSmall2_SE.png' },
  decor_plant_cactus: { source: furnitureIsometric, file: 'plantSmall3_SE.png' },
  decor_basket_woven: { source: furnitureIsometric, file: 'cardboardBoxOpen_SE.png' },
  decor_pumpkin_small: { source: graveyardPreviews, file: 'pumpkin.png' },
  decor_pumpkin_large: { source: graveyardPreviews, file: 'pumpkin-tall.png' },
  decor_jack_o_lantern: { source: graveyardPreviews, file: 'pumpkin-carved.png' },
  decor_candelabra: { source: graveyardPreviews, file: 'candle-multiple.png' },
  decor_blanket_knit: { source: furnitureIsometric, file: 'pillowBlueLong_SE.png' }, // cozy blanket/throw
  decor_string_lights: { source: holidayPreviews, file: 'lights-colored.png' },
  decor_tree_holiday: { source: holidayPreviews, file: 'tree-decorated.png' },
  decor_wreath_door: { source: holidayPreviews, file: 'wreath-decorated.png' },
  decor_cocoa_station: { source: furnitureIsometric, file: 'kitchenCoffeeMachine_SE.png' },

  // ============ RUGS (9/9) ============
  rug_basic: { source: furnitureIsometric, file: 'rugRectangle_SE.png' },
  rug_round_cream: { source: furnitureIsometric, file: 'rugRound_SE.png' },
  rug_circular_soft: { source: furnitureIsometric, file: 'rugRounded_SE.png' },
  rug_modern_geo: { source: furnitureIsometric, file: 'rugSquare_SE.png' },
  rug_vintage_persian: { source: furnitureIsometric, file: 'rugRectangle_SE.png' }, // recolor later
  rug_sheepskin: { source: furnitureIsometric, file: 'rugRounded_SE.png' }, // recolor later
  rug_autumn_leaves: { source: furnitureIsometric, file: 'rugRound_SE.png' }, // autumn colored
  rug_spiderweb: { source: graveyardPreviews, file: 'debris.png' }, // spooky debris as spiderweb rug
  rug_winter_pattern: { source: furnitureIsometric, file: 'rugRectangle_SE.png' }, // recolor later

  // ============ WALL ITEMS (10/10) ============
  wall_poster_simple: { source: fantasyTownPreviews, file: 'banner-red.png' },
  wall_art_abstract: { source: fantasyTownPreviews, file: 'banner-green.png' },
  wall_clock_round: { source: furnitureIsometric, file: 'lampWall_SE.png' }, // placeholder - clock
  wall_mirror_oval: { source: furnitureIsometric, file: 'bathroomMirror_SE.png' },
  wall_shelf_floating: { source: furnitureIsometric, file: 'bookcaseOpenLow_SE.png' },
  wall_photo_frame: { source: furnitureIsometric, file: 'computerScreen_SE.png' }, // placeholder
  wall_tapestry: { source: furnitureIsometric, file: 'rugRectangle_SE.png' }, // placeholder
  wall_autumn_wreath: { source: holidayPreviews, file: 'wreath.png' },
  wall_bat_garland: { source: graveyardPreviews, file: 'iron-fence.png' }, // spooky fence as garland
  wall_stockings: { source: holidayPreviews, file: 'sock-red.png' },

  // ============ SURFACE DECOR (12/12) ============
  surface_mug_coffee: { source: graveyardPreviews, file: 'detail-chalice.png' }, // chalice as mug
  surface_mug_cocoa: { source: graveyardPreviews, file: 'detail-bowl.png' }, // bowl as mug
  surface_book_stack: { source: furnitureIsometric, file: 'books_SE.png' },
  surface_book_open: { source: furnitureIsometric, file: 'books_SE.png' },
  surface_candle_small: { source: graveyardPreviews, file: 'candle.png' },
  surface_plant_tiny: { source: furnitureIsometric, file: 'plantSmall1_SE.png' },
  surface_photo_frame: { source: furnitureIsometric, file: 'computerScreen_SE.png' }, // placeholder
  surface_lamp_small: { source: furnitureIsometric, file: 'lampRoundTable_SE.png' },
  surface_skull_candle: { source: graveyardPreviews, file: 'lantern-candle.png' }, // spooky lantern
  surface_potion_bottles: { source: miniDungeonPreviews, file: 'potion.png' },
  surface_snow_globe: { source: holidayPreviews, file: 'snowflake-a.png' },
  surface_gingerbread: { source: holidayPreviews, file: 'gingerbread-man.png' },

  // ============ OUTDOOR (14/14) ============
  outdoor_bench_wooden: { source: graveyardPreviews, file: 'bench.png' },
  outdoor_table_bistro: { source: furnitureIsometric, file: 'tableRound_SE.png' },
  outdoor_planter_large: { source: furnitureIsometric, file: 'pottedPlant_SE.png' },
  outdoor_flower_bed: { source: furnitureIsometric, file: 'plantSmall2_SE.png' },
  outdoor_bird_bath: { source: fantasyTownPreviews, file: 'fountain-round.png' },
  outdoor_lantern_tall: { source: graveyardPreviews, file: 'lightpost-single.png' },
  outdoor_path_stones: { source: graveyardPreviews, file: 'rocks.png' },
  outdoor_hay_bale: { source: graveyardPreviews, file: 'hay-bale.png' },
  outdoor_scarecrow: { source: graveyardPreviews, file: 'cross-wood.png' }, // wooden cross as scarecrow
  outdoor_tombstone: { source: graveyardPreviews, file: 'gravestone-round.png' },
  outdoor_ghost_sheet: { source: graveyardPreviews, file: 'character-ghost.png' },
  outdoor_snowman: { source: holidayPreviews, file: 'snowman.png' },
  outdoor_fire_pit: { source: graveyardPreviews, file: 'fire-basket.png' },
  outdoor_string_lights: { source: holidayPreviews, file: 'lights-colored.png' },

  // ============ WALL FINISHES (5/5) ============
  // These will be solid color PNGs - generate separately
  wall_finish_cream: { source: holidayPreviews, file: 'cabin-wall.png' },
  wall_finish_sage: { source: holidayPreviews, file: 'cabin-wall.png' },
  wall_finish_burnt_orange: { source: holidayPreviews, file: 'cabin-wall.png' },
  wall_finish_navy: { source: holidayPreviews, file: 'cabin-wall.png' },
  wall_finish_white: { source: holidayPreviews, file: 'cabin-wall.png' },

  // ============ FLOOR FINISHES (5/5) ============
  floor_finish_warm_wood: { source: holidayPreviews, file: 'floor-wood.png' },
  floor_finish_light_wood: { source: holidayPreviews, file: 'floor-wood.png' },
  floor_finish_tile_white: { source: holidayPreviews, file: 'floor-stone.png' },
  floor_finish_carpet_grey: { source: holidayPreviews, file: 'floor-wood.png' },
  floor_finish_stone: { source: holidayPreviews, file: 'floor-stone.png' },

  // ============ NEW CORE POOL ITEMS (14) ============
  furniture_sofa_basic: { source: furnitureIsometric, file: 'loungeDesignSofa_SE.png' },
  furniture_desk_simple: { source: furnitureIsometric, file: 'desk_SE.png' },
  furniture_table_dining: { source: furnitureIsometric, file: 'tableRound_SE.png' },
  furniture_chair_wooden: { source: furnitureIsometric, file: 'chairModernFrameCushion_SE.png' },
  decor_plant_medium: { source: furnitureIsometric, file: 'pottedPlant_SE.png' },
  decor_lamp_table: { source: furnitureIsometric, file: 'lampRoundTable_SE.png' },
  rug_rectangular: { source: furnitureIsometric, file: 'rugRectangle_SE.png' },
  wall_clock_basic: { source: furnitureIsometric, file: 'lampWall_SE.png' }, // placeholder
  surface_mug: { source: graveyardPreviews, file: 'detail-chalice.png' },
  surface_books: { source: furnitureIsometric, file: 'books_SE.png' },
  surface_vase_small: { source: furnitureIsometric, file: 'plantSmall2_SE.png' },
  outdoor_planter_small: { source: furnitureIsometric, file: 'plantSmall1_SE.png' },
  outdoor_chair_basic: { source: furnitureIsometric, file: 'chairModernCushion_SE.png' },
  outdoor_table_small: { source: furnitureIsometric, file: 'tableCoffee_SE.png' },

  // ============ NEW COZY POOL ITEMS (5) ============
  furniture_sofa_cozy: { source: furnitureIsometric, file: 'loungeDesignSofaCorner_SE.png' },
  decor_cushion_set: { source: furnitureIsometric, file: 'pillowBlue_SE.png' }, // cushion set
  decor_lamp_warm: { source: furnitureIsometric, file: 'lampSquareFloor_SE.png' },
  rug_soft_square: { source: furnitureIsometric, file: 'rugSquare_SE.png' },
  surface_candle_set: { source: graveyardPreviews, file: 'candle-multiple.png' },

  // ============ NEW PLANTS POOL ITEMS (4) ============
  decor_plant_large: { source: furnitureIsometric, file: 'pottedPlant_SE.png' },
  decor_plant_hanging: { source: furnitureIsometric, file: 'plantSmall3_SE.png' },
  decor_plant_succulent: { source: furnitureIsometric, file: 'plantSmall1_SE.png' },
  outdoor_tree_small: { source: miniForestPreviews, file: 'tree.png' },

  // ============ NEW MODERN POOL ITEMS (5) ============
  furniture_sofa_modern: { source: furnitureIsometric, file: 'loungeSofaCorner_SE.png' },
  furniture_chair_modern: { source: furnitureIsometric, file: 'loungeChairRelax_SE.png' },
  furniture_table_glass: { source: furnitureIsometric, file: 'tableCoffee_SE.png' },
  decor_lamp_modern: { source: furnitureIsometric, file: 'lampSquareFloor_SE.png' },
  surface_sculpture: { source: graveyardPreviews, file: 'detail-plate.png' },

  // ============ NEW VINTAGE POOL ITEMS (7) ============
  furniture_armchair_vintage: { source: furnitureIsometric, file: 'loungeChair_SE.png' },
  furniture_desk_vintage: { source: furnitureIsometric, file: 'deskCorner_SE.png' },
  furniture_bookshelf_antique: { source: furnitureIsometric, file: 'bookcaseOpen_SE.png' },
  furniture_dresser_vintage: { source: furnitureIsometric, file: 'cabinetBedDrawer_SE.png' },
  decor_lamp_antique: { source: furnitureIsometric, file: 'lampRoundFloor_SE.png' },
  wall_frame_ornate: { source: fantasyTownPreviews, file: 'banner-red.png' },
  surface_typewriter: { source: furnitureIsometric, file: 'computerKeyboard_SE.png' },

  // ============ NEW OUTDOOR ITEM (1) ============
  outdoor_lights_path: { source: graveyardPreviews, file: 'lightpost-single.png' },

  // ============ ADDITIONAL COZY ITEMS ============
  // Teddy bear - perfect cozy item
  decor_teddy_bear: { source: furnitureIsometric, file: 'bear_SE.png' },
  // Ottoman/footrest
  furniture_ottoman: { source: furnitureIsometric, file: 'loungeSofaOttoman_SE.png' },
  // Vintage radio
  decor_radio_vintage: { source: furnitureIsometric, file: 'radio_SE.png' },
  // Vintage TV
  furniture_tv_vintage: { source: furnitureIsometric, file: 'televisionVintage_SE.png' },
  // Cushioned bench
  furniture_bench_cushion: { source: furnitureIsometric, file: 'benchCushion_SE.png' },
  // Coat rack
  decor_coat_rack: { source: furnitureIsometric, file: 'coatRackStanding_SE.png' },
  // Kitchen items
  surface_toaster: { source: furnitureIsometric, file: 'toaster_SE.png' },
  surface_blender: { source: furnitureIsometric, file: 'kitchenBlender_SE.png' },
  furniture_mini_fridge: { source: furnitureIsometric, file: 'kitchenFridgeSmall_SE.png' },
  furniture_microwave: { source: furnitureIsometric, file: 'kitchenMicrowave_SE.png' },
  // Laptop
  surface_laptop: { source: furnitureIsometric, file: 'laptop_SE.png' },
  // Speakers
  decor_speaker: { source: furnitureIsometric, file: 'speaker_SE.png' },
  // Ceiling fan (for later)
  decor_ceiling_fan: { source: furnitureIsometric, file: 'ceilingFan_SE.png' },
  // Glass coffee table
  furniture_table_coffee_glass: { source: furnitureIsometric, file: 'tableCoffeeGlass_SE.png' },
  // Pillows (for cozy vibes)
  decor_pillow: { source: furnitureIsometric, file: 'pillow_SE.png' },
  decor_pillow_long: { source: furnitureIsometric, file: 'pillowLong_SE.png' },

  // ============ BATHROOM SET (8) ============
  furniture_bathtub: { source: furnitureIsometric, file: 'bathtub_SE.png' },
  furniture_shower: { source: furnitureIsometric, file: 'shower_SE.png' },
  furniture_shower_round: { source: furnitureIsometric, file: 'showerRound_SE.png' },
  furniture_sink_bathroom: { source: furnitureIsometric, file: 'bathroomSink_SE.png' },
  furniture_sink_square: { source: furnitureIsometric, file: 'bathroomSinkSquare_SE.png' },
  furniture_cabinet_bathroom: { source: furnitureIsometric, file: 'bathroomCabinet_SE.png' },
  furniture_cabinet_bathroom_drawer: { source: furnitureIsometric, file: 'bathroomCabinetDrawer_SE.png' },
  furniture_toilet: { source: furnitureIsometric, file: 'toilet_SE.png' },

  // ============ KITCHEN SET (11) ============
  furniture_cabinet_kitchen: { source: furnitureIsometric, file: 'kitchenCabinet_SE.png' },
  furniture_cabinet_kitchen_drawer: { source: furnitureIsometric, file: 'kitchenCabinetDrawer_SE.png' },
  furniture_cabinet_upper: { source: furnitureIsometric, file: 'kitchenCabinetUpper_SE.png' },
  furniture_cabinet_upper_double: { source: furnitureIsometric, file: 'kitchenCabinetUpperDouble_SE.png' },
  furniture_sink_kitchen: { source: furnitureIsometric, file: 'kitchenSink_SE.png' },
  furniture_stove: { source: furnitureIsometric, file: 'kitchenStove_SE.png' },
  furniture_stove_electric: { source: furnitureIsometric, file: 'kitchenStoveElectric_SE.png' },
  furniture_fridge: { source: furnitureIsometric, file: 'kitchenFridge_SE.png' },
  furniture_fridge_large: { source: furnitureIsometric, file: 'kitchenFridgeLarge_SE.png' },
  furniture_kitchen_bar: { source: furnitureIsometric, file: 'kitchenBar_SE.png' },
  furniture_range_hood: { source: furnitureIsometric, file: 'hoodModern_SE.png' },

  // ============ MORE SEATING (6) ============
  furniture_chair_cushion: { source: furnitureIsometric, file: 'chairCushion_SE.png' },
  furniture_chair_rounded: { source: furnitureIsometric, file: 'chairRounded_SE.png' },
  furniture_chair_desk: { source: furnitureIsometric, file: 'chairDesk_SE.png' },
  furniture_chair_accent: { source: furnitureIsometric, file: 'loungeDesignChair_SE.png' },
  furniture_bench_low: { source: furnitureIsometric, file: 'benchCushionLow_SE.png' },
  furniture_stool_square: { source: furnitureIsometric, file: 'stoolBarSquare_SE.png' },

  // ============ MORE TABLES (4) ============
  furniture_table_basic: { source: furnitureIsometric, file: 'table_SE.png' },
  furniture_table_cloth: { source: furnitureIsometric, file: 'tableCloth_SE.png' },
  furniture_table_coffee_square: { source: furnitureIsometric, file: 'tableCoffeeSquare_SE.png' },
  furniture_table_cross: { source: furnitureIsometric, file: 'tableCross_SE.png' },

  // ============ LAUNDRY (3) ============
  furniture_washer: { source: furnitureIsometric, file: 'washer_SE.png' },
  furniture_dryer: { source: furnitureIsometric, file: 'dryer_SE.png' },
  furniture_washer_dryer_stacked: { source: furnitureIsometric, file: 'washerDryerStacked_SE.png' },
}

// Track statistics
let copied = 0
let skipped = 0
let missing = 0

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║           Homestead Kenney Asset Copier                    ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

// Process each mapping
for (const [textureKey, { source, file }] of Object.entries(assetMapping)) {
  const sourcePath = path.join(source, file)

  // Determine output category from textureKey prefix
  const category = textureKey.split('_')[0]
  let outputCategory = category
  if (category === 'surface') outputCategory = 'surface_decor'
  if (category === 'wall' && textureKey.includes('finish')) outputCategory = 'wall_finish'
  if (category === 'floor' && textureKey.includes('finish')) outputCategory = 'floor_finish'

  const outputPath = path.join(outputDir, outputCategory, `${textureKey}.png`)

  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  Missing: ${file} for ${textureKey}`)
    missing++
    continue
  }

  // Ensure output directory exists
  const outputDirPath = path.dirname(outputPath)
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true })
  }

  // Copy file
  fs.copyFileSync(sourcePath, outputPath)
  console.log(`✅ ${textureKey} <- ${file}`)
  copied++
}

console.log('\n' + '─'.repeat(60))
console.log(`✅ Copied: ${copied}`)
console.log(`⚠️  Missing source: ${missing}`)
console.log(`📦 Total mapped: ${Object.keys(assetMapping).length}`)
console.log(`📋 Catalog items: 129`)
console.log(`\n💡 Remaining items need manual creation or different sources.`)
