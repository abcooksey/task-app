/**
 * WardrobePage - Avatar customization and outfit management.
 *
 * Features:
 * - Large avatar preview with flip
 * - Category tabs: Appearance, Tops, Bottoms, Shoes, Accessories, Outfits
 * - Item grids with instant equip
 * - Outfit save/load/rename/delete
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAvatar } from '@/hooks/useAvatar'
import {
  WardrobePreview,
  CategoryTabs,
  ItemGrid,
  AppearanceTab,
  OutfitsTab,
  type WardrobeCategory,
  type ItemGridItem,
} from '@/components/wardrobe'
import { useStore } from '@/hooks/useStore'
import type { Appearance } from '@/game/avatar/types'
import {
  FREE_HAIR_STYLES,
  STARTER_TOPS,
  STARTER_BOTTOMS,
  STARTER_SHOES,
  DEFAULT_APPEARANCE,
} from '@/game/avatar/constants'

export default function WardrobePage() {
  const navigate = useNavigate()
  const {
    appearance: savedAppearance,
    outfits,
    ownedWearables,
    isLoading: avatarLoading,
    isInitialized,
    initializeAvatar,
    saveAppearance,
    isSaving,
    saveOutfit,
    isSavingOutfit,
    updateOutfit,
    deleteOutfit,
    isFree,
  } = useAvatar()

  const { catalog, isLoading: storeLoading } = useStore()

  const [selectedCategory, setSelectedCategory] = useState<WardrobeCategory>('appearance')

  // Local appearance state for preview (optimistic updates)
  const [localAppearance, setLocalAppearance] = useState<Appearance | null>(null)

  // Sync local appearance with saved appearance
  useEffect(() => {
    if (savedAppearance && !localAppearance) {
      setLocalAppearance(savedAppearance)
    }
  }, [savedAppearance, localAppearance])

  // Initialize avatar if not done
  useEffect(() => {
    if (!avatarLoading && !isInitialized) {
      initializeAvatar().catch(console.error)
    }
  }, [avatarLoading, isInitialized, initializeAvatar])

  // Current appearance (local or default)
  const appearance = localAppearance ?? savedAppearance ?? DEFAULT_APPEARANCE

  // Update appearance and save to DB
  const updateAppearance = useCallback(
    async (updates: Partial<Appearance>) => {
      const newAppearance = { ...appearance, ...updates }
      setLocalAppearance(newAppearance)

      try {
        await saveAppearance(newAppearance)
      } catch (err) {
        // Rollback on error
        setLocalAppearance(savedAppearance ?? DEFAULT_APPEARANCE)
        console.error('Failed to save appearance:', err)
      }
    },
    [appearance, savedAppearance, saveAppearance]
  )

  // Update hair specifically (nested object)
  const updateHair = useCallback(
    (hairUpdates: Partial<Appearance['hair']>) => {
      updateAppearance({
        hair: { ...appearance.hair, ...hairUpdates },
      })
    },
    [appearance.hair, updateAppearance]
  )

  // Get owned items for each category
  const ownedItems = useMemo(() => {
    // Get catalog items for owned wearables
    const ownedCatalogItems = catalog.filter(item => ownedWearables.includes(item.id))

    // Tops: starter + owned clothing_top
    const tops: ItemGridItem[] = [
      ...STARTER_TOPS.map(id => ({ id, name: id, isFree: true })),
      ...ownedCatalogItems
        .filter(item => item.category === 'clothing_top')
        .map(item => ({ id: item.id, name: item.name, isFree: false })),
    ]

    // Bottoms: starter + owned clothing_bottom
    const bottoms: ItemGridItem[] = [
      ...STARTER_BOTTOMS.map(id => ({ id, name: id, isFree: true })),
      ...ownedCatalogItems
        .filter(item => item.category === 'clothing_bottom')
        .map(item => ({ id: item.id, name: item.name, isFree: false })),
    ]

    // Shoes: starter + owned clothing_shoes
    const shoes: ItemGridItem[] = [
      ...STARTER_SHOES.map(id => ({ id, name: id, isFree: true })),
      ...ownedCatalogItems
        .filter(item => item.category === 'clothing_shoes')
        .map(item => ({ id: item.id, name: item.name, isFree: false })),
    ]

    // Accessories: owned only (no free accessories)
    const accessories: ItemGridItem[] = ownedCatalogItems
      .filter(item => item.category === 'accessory')
      .map(item => ({ id: item.id, name: item.name, isFree: false }))

    // Hair styles: free + owned
    const hairStyles: ItemGridItem[] = [
      ...FREE_HAIR_STYLES.map(id => ({ id, name: id, isFree: true })),
      ...ownedCatalogItems
        .filter(item => item.category === 'hair')
        .map(item => ({ id: item.id, name: item.name, isFree: false })),
    ]

    return { tops, bottoms, shoes, accessories, hairStyles }
  }, [catalog, ownedWearables])

  // Count owned items per category
  const ownedCounts: Record<WardrobeCategory, number> = useMemo(
    () => ({
      appearance: 0, // Not shown as a count
      tops: ownedItems.tops.length,
      bottoms: ownedItems.bottoms.length,
      shoes: ownedItems.shoes.length,
      accessories: ownedItems.accessories.length,
      outfits: outfits.length,
    }),
    [ownedItems, outfits]
  )

  // Handle outfit operations
  const handleEquipOutfit = useCallback(
    (outfitAppearance: Appearance) => {
      // Validate items are still owned before equipping
      // If not, substitute with starters (silent fallback per spec)
      const validAppearance: Appearance = {
        ...outfitAppearance,
        top: isFree(outfitAppearance.top) || ownedWearables.includes(outfitAppearance.top)
          ? outfitAppearance.top
          : STARTER_TOPS[0],
        bottom: isFree(outfitAppearance.bottom) || ownedWearables.includes(outfitAppearance.bottom)
          ? outfitAppearance.bottom
          : STARTER_BOTTOMS[0],
        shoes: isFree(outfitAppearance.shoes) || ownedWearables.includes(outfitAppearance.shoes)
          ? outfitAppearance.shoes
          : STARTER_SHOES[0],
        accessory: outfitAppearance.accessory && ownedWearables.includes(outfitAppearance.accessory)
          ? outfitAppearance.accessory
          : undefined,
      }

      setLocalAppearance(validAppearance)
      saveAppearance(validAppearance).catch(console.error)
    },
    [isFree, ownedWearables, saveAppearance]
  )

  const handleSaveOutfit = useCallback(
    async (name: string) => {
      await saveOutfit({ name, appearance })
    },
    [saveOutfit, appearance]
  )

  const handleRenameOutfit = useCallback(
    async (id: string, name: string) => {
      const outfit = outfits.find(o => o.id === id)
      if (!outfit) return
      await updateOutfit({ id, name, appearance: outfit.appearance })
    },
    [outfits, updateOutfit]
  )

  const handleDeleteOutfit = useCallback(
    async (id: string) => {
      await deleteOutfit(id)
    },
    [deleteOutfit]
  )

  // Render content for selected category
  const renderCategoryContent = () => {
    const isLoading = avatarLoading || storeLoading

    switch (selectedCategory) {
      case 'appearance':
        return (
          <AppearanceTab
            appearance={appearance}
            ownedHairStyles={ownedItems.hairStyles
              .filter(item => !item.isFree)
              .map(item => item.id)}
            onChangeSkin={skin => updateAppearance({ skin })}
            onChangeEyes={eyes => updateAppearance({ eyes })}
            onChangeHairStyle={styleId => updateHair({ styleId })}
            onChangeHairColor={colorId => updateHair({ colorId })}
          />
        )

      case 'tops':
        return (
          <ItemGrid
            items={ownedItems.tops}
            selectedId={appearance.top}
            onSelect={top => updateAppearance({ top })}
            category="tops"
            isLoading={isLoading}
          />
        )

      case 'bottoms':
        return (
          <ItemGrid
            items={ownedItems.bottoms}
            selectedId={appearance.bottom}
            onSelect={bottom => updateAppearance({ bottom })}
            category="bottoms"
            isLoading={isLoading}
          />
        )

      case 'shoes':
        return (
          <ItemGrid
            items={ownedItems.shoes}
            selectedId={appearance.shoes}
            onSelect={shoes => updateAppearance({ shoes })}
            category="shoes"
            isLoading={isLoading}
          />
        )

      case 'accessories':
        return (
          <ItemGrid
            items={[
              // Add "None" option
              { id: '', name: 'None', isFree: true },
              ...ownedItems.accessories,
            ]}
            selectedId={appearance.accessory ?? ''}
            onSelect={id => updateAppearance({ accessory: id || undefined })}
            category="accessories"
            isLoading={isLoading}
          />
        )

      case 'outfits':
        return (
          <OutfitsTab
            outfits={outfits}
            currentAppearance={appearance}
            ownedWearables={ownedWearables}
            onEquipOutfit={handleEquipOutfit}
            onSaveOutfit={handleSaveOutfit}
            onRenameOutfit={handleRenameOutfit}
            onDeleteOutfit={handleDeleteOutfit}
            isSaving={isSavingOutfit}
          />
        )

      default:
        return null
    }
  }

  if (avatarLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wardrobe</h1>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Avatar preview */}
      <WardrobePreview appearance={appearance} />

      {/* Saving indicator */}
      {isSaving && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Saving...
        </div>
      )}

      {/* Category tabs */}
      <CategoryTabs
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        ownedCounts={ownedCounts}
      />

      {/* Category content */}
      <div className="min-h-[200px]">{renderCategoryContent()}</div>
    </div>
  )
}
