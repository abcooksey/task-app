import { useState, useCallback, useEffect, useRef } from 'react'
import type { CatalogItem } from '@/types/database'
import type { RegionId } from '@/game/placement/types'
import roomsData from '@/game/content/rooms.json'

interface CellPickerProps {
  catalogItem: CatalogItem
  validationCheck: (region: RegionId, x: number, y: number) => { valid: boolean; reason?: string }
  onConfirm: (region: RegionId, x: number, y: number) => void
  onCancel: () => void
}

interface Region {
  id: RegionId
  name: string
  gridWidth: number
  gridHeight: number
  description?: string
}

const REGIONS: Region[] = [
  {
    id: 'floor',
    name: 'Floor',
    gridWidth: roomsData.rooms.main.regions.floor?.gridWidth ?? 16,
    gridHeight: roomsData.rooms.main.regions.floor?.gridHeight ?? 10,
    description: 'Main floor area',
  },
  {
    id: 'wall',
    name: 'Wall',
    gridWidth: roomsData.rooms.main.regions.wall?.gridWidth ?? 16,
    gridHeight: roomsData.rooms.main.regions.wall?.gridHeight ?? 6,
    description: 'Back wall',
  },
  {
    id: 'yard',
    name: 'Yard',
    gridWidth: roomsData.rooms.main.regions.yard?.gridWidth ?? 16,
    gridHeight: roomsData.rooms.main.regions.yard?.gridHeight ?? 2,
    description: 'Outdoor area',
  },
]

const REGION_FOR_PLACEMENT: Record<string, RegionId> = {
  floor: 'floor',
  rug: 'floor',
  furniture: 'floor',
  decor: 'floor',
  wall: 'wall',
  wall_decor: 'wall',
  outdoor: 'yard',
  wall_finish: 'wall',
  floor_finish: 'floor',
}

/**
 * Keyboard-accessible cell picker for placing items.
 * Step 1: Select region (if multiple valid regions)
 * Step 2: Navigate grid with arrow keys and confirm with Enter
 */
export default function CellPicker({
  catalogItem,
  validationCheck,
  onConfirm,
  onCancel,
}: CellPickerProps) {
  // Determine initial region based on item placement type
  const initialRegion = REGION_FOR_PLACEMENT[catalogItem.placement] ?? 'floor'
  const [selectedRegion, setSelectedRegion] = useState<RegionId>(initialRegion)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [validation, setValidation] = useState<{ valid: boolean; reason?: string }>({ valid: true })
  const containerRef = useRef<HTMLDivElement>(null)

  const region = REGIONS.find(r => r.id === selectedRegion) ?? REGIONS[0]
  const itemWidth = catalogItem.footprint_w
  const itemHeight = catalogItem.footprint_h
  const maxX = region.gridWidth - itemWidth
  const maxY = region.gridHeight - itemHeight

  // Run validation when position or region changes
  useEffect(() => {
    const result = validationCheck(selectedRegion, position.x, position.y)
    setValidation(result)
  }, [selectedRegion, position, validationCheck])

  // Focus container on mount
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        setPosition(prev => ({ ...prev, y: Math.max(0, prev.y - 1) }))
        break
      case 'ArrowDown':
        e.preventDefault()
        setPosition(prev => ({ ...prev, y: Math.min(maxY, prev.y + 1) }))
        break
      case 'ArrowLeft':
        e.preventDefault()
        setPosition(prev => ({ ...prev, x: Math.max(0, prev.x - 1) }))
        break
      case 'ArrowRight':
        e.preventDefault()
        setPosition(prev => ({ ...prev, x: Math.min(maxX, prev.x + 1) }))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (validation.valid) {
          onConfirm(selectedRegion, position.x, position.y)
        }
        break
      case 'Escape':
        e.preventDefault()
        onCancel()
        break
      case 'Tab':
        // Allow tab to move between region buttons and grid
        break
      default:
        break
    }
  }, [maxX, maxY, validation.valid, selectedRegion, position, onConfirm, onCancel])

  const handleCellClick = useCallback((x: number, y: number) => {
    setPosition({ x, y })
  }, [])

  const handleCellDoubleClick = useCallback((x: number, y: number) => {
    const result = validationCheck(selectedRegion, x, y)
    if (result.valid) {
      onConfirm(selectedRegion, x, y)
    }
  }, [selectedRegion, validationCheck, onConfirm])

  // Check if a cell would be valid
  const getCellState = useCallback((cellX: number, cellY: number) => {
    // Check if this cell is within the item's footprint at current position
    const isWithinItem =
      cellX >= position.x &&
      cellX < position.x + itemWidth &&
      cellY >= position.y &&
      cellY < position.y + itemHeight

    return {
      isWithinItem,
      isOrigin: cellX === position.x && cellY === position.y,
    }
  }, [position, itemWidth, itemHeight])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={`Place ${catalogItem.name}`}
    >
      <div
        ref={containerRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-4 focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Place {catalogItem.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {catalogItem.footprint_w}×{catalogItem.footprint_h} cells
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-ring rounded"
            aria-label="Cancel placement"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Region selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Region
          </label>
          <div className="flex gap-2" role="radiogroup" aria-label="Select region">
            {REGIONS.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRegion(r.id)
                  setPosition({ x: 0, y: 0 })
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-ring ${
                  selectedRegion === r.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                role="radio"
                aria-checked={selectedRegion === r.id}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Position: ({position.x}, {position.y})
            </label>
            <span
              className={`text-sm font-medium ${
                validation.valid
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
              role="status"
              aria-live="polite"
            >
              {validation.valid ? 'Valid position' : validation.reason || 'Invalid position'}
            </span>
          </div>

          <div
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            role="grid"
            aria-label={`${region.name} grid, ${region.gridWidth} columns by ${region.gridHeight} rows`}
          >
            <div className="overflow-auto max-h-48">
              <div
                className="grid gap-px bg-gray-200 dark:bg-gray-700 p-px"
                style={{
                  gridTemplateColumns: `repeat(${region.gridWidth}, minmax(20px, 1fr))`,
                }}
              >
                {Array.from({ length: region.gridHeight }).map((_, y) =>
                  Array.from({ length: region.gridWidth }).map((_, x) => {
                    const { isWithinItem, isOrigin } = getCellState(x, y)

                    return (
                      <button
                        key={`${x}-${y}`}
                        onClick={() => handleCellClick(x, y)}
                        onDoubleClick={() => handleCellDoubleClick(x, y)}
                        className={`w-full aspect-square transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
                          isOrigin
                            ? validation.valid
                              ? 'bg-green-500'
                              : 'bg-red-500'
                            : isWithinItem
                            ? validation.valid
                              ? 'bg-green-300 dark:bg-green-700'
                              : 'bg-red-300 dark:bg-red-700'
                            : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        role="gridcell"
                        aria-label={`Cell ${x}, ${y}${isWithinItem ? ', selected' : ''}`}
                        tabIndex={-1}
                      />
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus-ring"
          >
            Cancel
          </button>
          <button
            onClick={() => validation.valid && onConfirm(selectedRegion, position.x, position.y)}
            disabled={!validation.valid}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-colors focus-ring ${
              validation.valid
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            Place Here
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓←→</kbd> Move
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> Confirm
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> Cancel
        </div>
      </div>
    </div>
  )
}
