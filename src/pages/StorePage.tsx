import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/hooks/useStore'
import { useBalance } from '@/hooks/useBalance'
import { useTryOn } from '@/hooks/useTryOn'
import { ItemCard, ItemDetailSheet, MysteryBox, TryOnPreview, WearableCard } from '@/components/store'
import Toast from '@/components/Toast'
import { formatTimeUntilRefresh } from '@/lib/rotation'
import type { CatalogItem } from '@/types/database'
import calendarData from '@/game/content/calendar.json'

type Category = 'all' | 'furniture' | 'decor' | 'rug' | 'wall_decor' | 'surface_decor' | 'outdoor' | 'wall_finish' | 'floor_finish'

type StoreSection = 'decor' | 'clothing'

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  furniture: 'Furniture',
  decor: 'Decor',
  rug: 'Rugs',
  wall_decor: 'Wall',
  surface_decor: 'Surface',
  outdoor: 'Outdoor',
  wall_finish: 'Wallpaper',
  floor_finish: 'Flooring',
}

type ClothingCategory = 'all' | 'clothing_top' | 'clothing_bottom' | 'clothing_shoes' | 'accessory' | 'hair'

const CLOTHING_CATEGORY_LABELS: Record<ClothingCategory, string> = {
  all: 'All',
  clothing_top: 'Tops',
  clothing_bottom: 'Bottoms',
  clothing_shoes: 'Shoes',
  accessory: 'Accessories',
  hair: 'Hair',
}

export default function StorePage() {
  const navigate = useNavigate()
  const { balance } = useBalance()
  const {
    catalog,
    isLoading,
    error,
    canOpenMysteryBox,
    hasClaimedStarterKit,
    nextRefresh,
    buyItem,
    isBuying,
    openMysteryBox,
    claimStarterKit,
    getOwnedCount,
    isOwned,
    categorizedItems,
  } = useStore()

  const {
    previewAppearance,
    unownedTryOnCount,
    hasTryOns,
    tryOn,
    resetTryOn,
    isTryingOn,
    equipTryOn,
  } = useTryOn()

  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [selectedClothingCategory, setSelectedClothingCategory] = useState<ClothingCategory>('all')
  const [selectedSection, setSelectedSection] = useState<StoreSection>('decor')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastAction, setToastAction] = useState<{ label: string; onClick: () => void } | null>(null)
  const hasAttemptedClaim = useRef(false)

  // Auto-claim starter kit on first store visit
  useEffect(() => {
    if (isLoading || hasClaimedStarterKit || hasAttemptedClaim.current) return

    hasAttemptedClaim.current = true

    claimStarterKit()
      .then((result) => {
        if (!result.already_claimed) {
          setToastMessage('Welcome! You received 3 starter items.')
        }
      })
      .catch((err) => {
        console.error('Failed to claim starter kit:', err)
      })
  }, [isLoading, hasClaimedStarterKit, claimStarterKit])

  const { rotation, seasonal, always, wearables } = categorizedItems()

  // Filter always-available items by category
  const filteredAlways = useMemo(() => {
    if (selectedCategory === 'all') return always
    return always.filter(item => item.category === selectedCategory)
  }, [always, selectedCategory])

  // Filter wearables by category
  const filteredWearables = useMemo(() => {
    if (selectedClothingCategory === 'all') return wearables
    return wearables.filter(item => item.category === selectedClothingCategory)
  }, [wearables, selectedClothingCategory])

  // Get available categories
  const availableCategories = useMemo(() => {
    const cats = new Set<Category>(['all'])
    always.forEach(item => cats.add(item.category as Category))
    return cats
  }, [always])

  // Get available clothing categories
  const availableClothingCategories = useMemo(() => {
    const cats = new Set<ClothingCategory>(['all'])
    wearables.forEach(item => cats.add(item.category as ClothingCategory))
    return cats
  }, [wearables])

  const handleBuy = useCallback(async (item: CatalogItem) => {
    try {
      await buyItem(item.id)
      // Show toast with "Wear it" action for wearables
      const isWearable = ['clothing_top', 'clothing_bottom', 'clothing_shoes', 'accessory', 'hair'].includes(item.category)
      if (isWearable) {
        setToastMessage(`${item.name} purchased`)
        setToastAction({
          label: 'Wear it',
          onClick: () => {
            tryOn(item)
            equipTryOn()
            navigate('/wardrobe')
          },
        })
      } else {
        setToastMessage(`${item.name} added to inventory`)
        setToastAction(null)
      }
    } catch (err) {
      console.error('Failed to buy:', err)
      setToastMessage('Purchase failed. Please try again.')
      setToastAction(null)
    }
  }, [buyItem, tryOn, equipTryOn, navigate])

  const handleOpenMysteryBox = async (): Promise<CatalogItem | null> => {
    try {
      const result = await openMysteryBox()
      const item = catalog.find(c => c.id === result.item_id)
      return item || null
    } catch (err) {
      console.error('Failed to open mystery box:', err)
      return null
    }
  }

  const handlePlace = (item: CatalogItem) => {
    // Navigate to home page and trigger decorate mode with the item
    sessionStorage.setItem('placeItem', JSON.stringify(item))
    navigate('/home?decorate=true')
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">Failed to load store</p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary-600 dark:text-primary-400 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store</h1>
        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7 4a5 5 0 008 0H7z" />
          </svg>
          <span className="font-semibold">{balance}</span>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedSection('decor')}
          className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${
            selectedSection === 'decor'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Decor
        </button>
        <button
          onClick={() => setSelectedSection('clothing')}
          className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${
            selectedSection === 'clothing'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Clothing
        </button>
      </div>

      {/* Decor section */}
      {selectedSection === 'decor' && (
        <>
          {/* Mystery Box */}
          <MysteryBox
            price={calendarData.mysteryBox.baseCost}
            balance={balance}
            canOpenToday={canOpenMysteryBox}
            onOpen={handleOpenMysteryBox}
            onViewItem={setSelectedItem}
          />

          {/* New This Week */}
          {rotation.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  New This Week
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Refreshes in {formatTimeUntilRefresh(nextRefresh)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {rotation.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    owned={isOwned(item.id)}
                    ownedCount={getOwnedCount(item.id)}
                    balance={balance}
                    onBuy={handleBuy}
                    onViewDetails={setSelectedItem}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Seasonal */}
          {seasonal.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Seasonal
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {seasonal.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    owned={isOwned(item.id)}
                    ownedCount={getOwnedCount(item.id)}
                    balance={balance}
                    onBuy={handleBuy}
                    onViewDetails={setSelectedItem}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Always Available */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Always Available
            </h2>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-3">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => {
                if (!availableCategories.has(cat) && cat !== 'all') return null
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAlways.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  owned={isOwned(item.id)}
                  ownedCount={getOwnedCount(item.id)}
                  balance={balance}
                  onBuy={handleBuy}
                  onViewDetails={setSelectedItem}
                />
              ))}
            </div>

            {filteredAlways.length === 0 && (
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                No items in this category
              </p>
            )}
          </section>
        </>
      )}

      {/* Clothing section */}
      {selectedSection === 'clothing' && (
        <>
          {/* Try-on preview */}
          <TryOnPreview
            appearance={previewAppearance}
            tryOnCount={unownedTryOnCount}
            onReset={resetTryOn}
          />

          {/* Category chips for clothing */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(Object.keys(CLOTHING_CATEGORY_LABELS) as ClothingCategory[]).map(cat => {
              if (!availableClothingCategories.has(cat) && cat !== 'all') return null
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedClothingCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedClothingCategory === cat
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {CLOTHING_CATEGORY_LABELS[cat]}
                </button>
              )
            })}
          </div>

          {/* Wearables grid */}
          <section>
            {filteredWearables.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredWearables.map(item => (
                  <WearableCard
                    key={item.id}
                    item={item}
                    owned={isOwned(item.id)}
                    balance={balance}
                    isTryingOn={isTryingOn(item.id)}
                    onTryOn={tryOn}
                    onBuy={handleBuy}
                    onViewDetails={setSelectedItem}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p className="mb-2">No clothing items available yet</p>
                <p className="text-sm">Check back when the store refreshes</p>
              </div>
            )}
          </section>

          {/* Equip try-on button */}
          {hasTryOns && (
            <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-gray-900 via-white dark:via-gray-900">
              <button
                onClick={() => {
                  equipTryOn()
                  navigate('/wardrobe')
                }}
                className="w-full py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                Equip & Go to Wardrobe
              </button>
            </div>
          )}
        </>
      )}

      {/* Item detail sheet */}
      {selectedItem && (
        <ItemDetailSheet
          item={selectedItem}
          owned={isOwned(selectedItem.id)}
          ownedCount={getOwnedCount(selectedItem.id)}
          balance={balance}
          onBuy={async () => {
            await handleBuy(selectedItem)
          }}
          onPlace={() => handlePlace(selectedItem)}
          onClose={() => setSelectedItem(null)}
          buying={isBuying}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => {
            setToastMessage(null)
            setToastAction(null)
          }}
          action={toastAction ?? undefined}
        />
      )}
    </div>
  )
}
