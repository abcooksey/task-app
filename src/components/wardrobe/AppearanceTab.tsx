/**
 * AppearanceTab - Combined tab for skin, eyes, and hair options.
 *
 * Three sections:
 * - Skin tone picker
 * - Eye color picker
 * - Hair (style + color)
 */

import { FREE_SKINS, FREE_EYE_COLORS, FREE_HAIR_COLORS, FREE_HAIR_STYLES } from '@/game/avatar/constants'
import type { Appearance } from '@/game/avatar/types'

interface AppearanceTabProps {
  appearance: Appearance
  ownedHairStyles: string[]
  onChangeSkin: (skinId: string) => void
  onChangeEyes: (eyesId: string) => void
  onChangeHairStyle: (styleId: string) => void
  onChangeHairColor: (colorId: string) => void
}

// Skin tone display colors
const SKIN_COLORS: Record<string, string> = {
  skin_light: '#FFE0BD',
  skin_light_medium: '#F1C27D',
  skin_medium: '#C68642',
  skin_medium_dark: '#8D5524',
  skin_dark: '#5C3D2E',
  skin_deep: '#3B2219',
}

// Eye color display colors
const EYE_COLORS: Record<string, string> = {
  eyes_brown: '#8B4513',
  eyes_blue: '#4169E1',
  eyes_green: '#228B22',
  eyes_hazel: '#C4A35A',
}

// Hair color display colors
const HAIR_COLORS: Record<string, string> = {
  hair_black: '#1A1A1A',
  hair_dark_brown: '#3B2219',
  hair_light_brown: '#8B6914',
  hair_blonde: '#E8C872',
  hair_red: '#C04000',
  hair_auburn: '#922724',
  hair_grey: '#9E9E9E',
  hair_white: '#F5F5F5',
}

// Hair style labels
const HAIR_STYLE_LABELS: Record<string, string> = {
  hair_short: 'Short',
  hair_medium: 'Medium',
  hair_long: 'Long',
}

export function AppearanceTab({
  appearance,
  ownedHairStyles,
  onChangeSkin,
  onChangeEyes,
  onChangeHairStyle,
  onChangeHairColor,
}: AppearanceTabProps) {
  // All free styles plus any owned purchasable ones
  const availableHairStyles = [
    ...FREE_HAIR_STYLES,
    ...ownedHairStyles.filter(id => !FREE_HAIR_STYLES.includes(id as typeof FREE_HAIR_STYLES[number])),
  ]

  return (
    <div className="space-y-6">
      {/* Skin Tone */}
      <section>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Skin Tone
        </h3>
        <div className="flex gap-2 flex-wrap">
          {FREE_SKINS.map(skinId => {
            const isSelected = appearance.skin === skinId

            return (
              <button
                key={skinId}
                onClick={() => onChangeSkin(skinId)}
                className={`
                  w-10 h-10 rounded-full border-2 transition-all touch-target
                  ${
                    isSelected
                      ? 'border-primary-500 ring-2 ring-primary-500/50 scale-110'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }
                `}
                style={{ backgroundColor: SKIN_COLORS[skinId] }}
                aria-label={`${skinId.replace('skin_', '').replace(/_/g, ' ')} skin tone`}
                aria-pressed={isSelected}
              />
            )
          })}
        </div>
      </section>

      {/* Eye Color */}
      <section>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Eye Color
        </h3>
        <div className="flex gap-2 flex-wrap">
          {FREE_EYE_COLORS.map(eyeId => {
            const isSelected = appearance.eyes === eyeId

            return (
              <button
                key={eyeId}
                onClick={() => onChangeEyes(eyeId)}
                className={`
                  w-10 h-10 rounded-full border-2 transition-all touch-target
                  flex items-center justify-center
                  ${
                    isSelected
                      ? 'border-primary-500 ring-2 ring-primary-500/50 scale-110'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }
                `}
                aria-label={`${eyeId.replace('eyes_', '')} eyes`}
                aria-pressed={isSelected}
              >
                <span
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: EYE_COLORS[eyeId] }}
                />
              </button>
            )
          })}
        </div>
      </section>

      {/* Hair Style */}
      <section>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Hair Style
        </h3>
        <div className="flex gap-2 flex-wrap">
          {availableHairStyles.map(styleId => {
            const isSelected = appearance.hair.styleId === styleId
            const isFree = FREE_HAIR_STYLES.includes(styleId as typeof FREE_HAIR_STYLES[number])

            return (
              <button
                key={styleId}
                onClick={() => onChangeHairStyle(styleId)}
                className={`
                  relative px-4 py-2 rounded-lg border-2 transition-all touch-target
                  ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300'
                  }
                `}
                aria-pressed={isSelected}
              >
                <span className="text-2xl mb-1">💇</span>
                <span className="text-sm block">
                  {HAIR_STYLE_LABELS[styleId] || styleId.replace('hair_', '').replace(/_/g, ' ')}
                </span>
                {isFree && (
                  <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium">
                    Free
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Hair Color */}
      <section>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Hair Color
        </h3>
        <div className="flex gap-2 flex-wrap">
          {FREE_HAIR_COLORS.map(colorId => {
            const isSelected = appearance.hair.colorId === colorId

            return (
              <button
                key={colorId}
                onClick={() => onChangeHairColor(colorId)}
                className={`
                  w-10 h-10 rounded-full border-2 transition-all touch-target
                  ${
                    isSelected
                      ? 'border-primary-500 ring-2 ring-primary-500/50 scale-110'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }
                `}
                style={{ backgroundColor: HAIR_COLORS[colorId] }}
                aria-label={`${colorId.replace('hair_', '')} hair color`}
                aria-pressed={isSelected}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}
