/**
 * CategoryTabs - Tab navigation for wardrobe categories.
 *
 * Categories:
 * - Appearance (combines Hair + Skin & Eyes)
 * - Tops
 * - Bottoms
 * - Shoes
 * - Accessories
 * - Outfits
 */

export type WardrobeCategory =
  | 'appearance'
  | 'tops'
  | 'bottoms'
  | 'shoes'
  | 'accessories'
  | 'outfits'

interface CategoryTabsProps {
  selected: WardrobeCategory
  onSelect: (category: WardrobeCategory) => void
  ownedCounts: Record<WardrobeCategory, number>
}

const CATEGORY_CONFIG: { id: WardrobeCategory; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: '👤' },
  { id: 'tops', label: 'Tops', icon: '👕' },
  { id: 'bottoms', label: 'Bottoms', icon: '👖' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'accessories', label: 'Accessories', icon: '🎀' },
  { id: 'outfits', label: 'Outfits', icon: '✨' },
]

export function CategoryTabs({ selected, onSelect, ownedCounts }: CategoryTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {CATEGORY_CONFIG.map(({ id, label, icon }) => {
        const isSelected = selected === id
        const count = ownedCounts[id]

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap
              transition-colors touch-target focus-ring
              ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            aria-pressed={isSelected}
          >
            <span className="text-base" aria-hidden="true">
              {icon}
            </span>
            <span>{label}</span>
            {count > 0 && id !== 'outfits' && (
              <span
                className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isSelected ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'}
                `}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
