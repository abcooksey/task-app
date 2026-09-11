/**
 * OutfitsTab - Saved outfits management.
 *
 * Features:
 * - Grid of saved outfit cards with mini preview
 * - Tap to equip all (with silent correction for unowned items)
 * - Long-press/menu for rename/delete
 * - "Save current look" button
 * - Cap at 12 with neutral message
 */

import { useState, useRef } from 'react'
import { AvatarPreview } from '@/components/avatar'
import { correctAppearance } from '@/game/avatar/validateAppearance'
import { useAnnounce } from '@/hooks/useAnnounce'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { Appearance, Outfit } from '@/game/avatar/types'

interface OutfitsTabProps {
  outfits: Outfit[]
  currentAppearance: Appearance // Prop kept for future use (e.g., showing current vs saved diff)
  ownedWearables: string[]
  onEquipOutfit: (appearance: Appearance) => void
  onSaveOutfit: (name: string) => Promise<void>
  onRenameOutfit: (id: string, name: string) => Promise<void>
  onDeleteOutfit: (id: string) => Promise<void>
  isSaving: boolean
}

const MAX_OUTFITS = 12
const DEFAULT_NAME_PATTERN = /^Outfit \d+$/

/**
 * Check if an outfit name is a default name (e.g., "Outfit 1", "Outfit 2")
 */
export function isDefaultOutfitName(name: string): boolean {
  return DEFAULT_NAME_PATTERN.test(name)
}

/**
 * Generate the next default outfit name
 */
function getNextDefaultName(existingOutfits: Outfit[]): string {
  // Find all existing "Outfit N" numbers
  const usedNumbers = new Set<number>()
  for (const outfit of existingOutfits) {
    const match = outfit.name.match(/^Outfit (\d+)$/)
    if (match) {
      usedNumbers.add(parseInt(match[1], 10))
    }
  }

  // Find the next available number
  let num = 1
  while (usedNumbers.has(num)) {
    num++
  }

  return `Outfit ${num}`
}

export function OutfitsTab({
  outfits,
  currentAppearance: _currentAppearance, // Prefixed - appearance is passed via onSaveOutfit callback
  ownedWearables,
  onEquipOutfit,
  onSaveOutfit,
  onRenameOutfit,
  onDeleteOutfit,
  isSaving,
}: OutfitsTabProps) {
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const announce = useAnnounce()
  const confirmDialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap for delete confirmation dialog
  useFocusTrap(confirmDialogRef, confirmDeleteId !== null, cancelButtonRef)

  const canAddMore = outfits.length < MAX_OUTFITS

  // Create owned set for validation
  const ownedSet = new Set(ownedWearables)

  // Handle outfit equip with silent correction
  const handleEquipOutfit = (outfit: Outfit) => {
    // Correct any unowned items silently
    const correctedAppearance = correctAppearance(outfit.appearance, ownedSet)
    onEquipOutfit(correctedAppearance)
    announce(`Equipped ${outfit.name}`)
  }

  // Save with auto-generated default name
  const handleSaveOutfit = async () => {
    const defaultName = getNextDefaultName(outfits)
    try {
      await onSaveOutfit(defaultName)
      announce(`Saved outfit ${defaultName}`)
    } catch (err) {
      console.error('Failed to save outfit:', err)
    }
  }

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return

    try {
      await onRenameOutfit(id, editingName.trim())
      setEditingOutfitId(null)
      setEditingName('')
    } catch (err) {
      console.error('Failed to rename outfit:', err)
    }
  }

  // Initiate delete - shows confirmation for custom-named outfits
  const handleDeleteClick = (outfit: Outfit) => {
    setMenuOpenId(null)

    // If it's a default name, delete immediately (reversible within session)
    if (isDefaultOutfitName(outfit.name)) {
      performDelete(outfit.id)
    } else {
      // Show confirmation for custom-named outfits
      setConfirmDeleteId(outfit.id)
    }
  }

  const performDelete = async (id: string) => {
    const outfit = outfits.find(o => o.id === id)
    setConfirmDeleteId(null)
    try {
      await onDeleteOutfit(id)
      if (outfit) {
        announce(`Deleted outfit ${outfit.name}`)
      }
    } catch (err) {
      console.error('Failed to delete outfit:', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Save current look button */}
      {canAddMore ? (
        <button
          onClick={handleSaveOutfit}
          disabled={isSaving}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600
                     hover:border-primary-400 dark:hover:border-primary-500 transition-colors
                     text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400
                     flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Save current look
            </>
          )}
        </button>
      ) : (
        <p className="text-center py-3 text-gray-500 dark:text-gray-400 text-sm">
          You've saved all 12 outfit slots
        </p>
      )}

      {/* Outfits grid */}
      {outfits.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No saved outfits yet</p>
          <p className="text-sm mt-1">Save your current look to quickly switch between styles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {outfits.map(outfit => (
            <div
              key={outfit.id}
              className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Outfit preview */}
              <button
                onClick={() => handleEquipOutfit(outfit)}
                className="w-full p-3 flex flex-col items-center touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                aria-label={`Equip ${outfit.name}`}
              >
                <div className="w-16 h-16 mb-2">
                  <AvatarPreview
                    appearance={outfit.appearance}
                    size="medium"
                    animate={false}
                    usePlaceholderArt={true}
                  />
                </div>

                {/* Name (editable) */}
                {editingOutfitId === outfit.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value.slice(0, 24))}
                    className="w-full px-2 py-1 text-sm text-center rounded border border-primary-500
                               bg-white dark:bg-gray-700 focus:outline-none"
                    maxLength={24}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      e.stopPropagation()
                      if (e.key === 'Enter') handleRename(outfit.id)
                      if (e.key === 'Escape') setEditingOutfitId(null)
                    }}
                    onBlur={() => handleRename(outfit.id)}
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate w-full text-center">
                    {outfit.name}
                  </span>
                )}
              </button>

              {/* Menu button */}
              <button
                onClick={e => {
                  e.stopPropagation()
                  setMenuOpenId(menuOpenId === outfit.id ? null : outfit.id)
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Outfit options"
              >
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {menuOpenId === outfit.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpenId(null)}
                  />
                  <div className="absolute top-8 right-2 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[120px]">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setEditingOutfitId(outfit.id)
                        setEditingName(outfit.name)
                        setMenuOpenId(null)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Rename
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteClick(outfit)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog (only for custom-named outfits) */}
      {confirmDeleteId && (() => {
        const outfit = outfits.find(o => o.id === confirmDeleteId)
        if (!outfit) return null
        return (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setConfirmDeleteId(null)}
              aria-hidden="true"
            />
            <div
              ref={confirmDialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              aria-describedby="delete-dialog-description"
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setConfirmDeleteId(null)
                }
              }}
            >
              <h3
                id="delete-dialog-title"
                className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
              >
                Delete "{outfit.name}"?
              </h3>
              <p
                id="delete-dialog-description"
                className="text-sm text-gray-500 dark:text-gray-400 mb-4"
              >
                This outfit will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  ref={cancelButtonRef}
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => performDelete(confirmDeleteId)}
                  className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
