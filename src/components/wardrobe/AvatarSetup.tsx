/**
 * AvatarSetup - First-run avatar setup flow.
 *
 * 3 steps:
 * 1. Skin tone selection
 * 2. Hair (style + color)
 * 3. Eye color
 *
 * Features:
 * - Defaults pre-filled so "Done" works immediately
 * - Skippable
 * - Compact, under 30 seconds to complete
 */

import { useState, useCallback } from 'react'
import { AvatarPreview } from '@/components/avatar'
import type { Appearance } from '@/game/avatar/types'
import {
  FREE_SKINS,
  FREE_EYE_COLORS,
  FREE_HAIR_COLORS,
  FREE_HAIR_STYLES,
  DEFAULT_APPEARANCE,
} from '@/game/avatar/constants'

interface AvatarSetupProps {
  onComplete: (appearance: Appearance) => void
  onSkip: () => void
}

type SetupStep = 'skin' | 'hair' | 'eyes'

const STEPS: SetupStep[] = ['skin', 'hair', 'eyes']

const STEP_TITLES: Record<SetupStep, string> = {
  skin: 'Choose your skin tone',
  hair: 'Pick your hairstyle',
  eyes: 'Select your eye color',
}

// Display colors
const SKIN_COLORS: Record<string, string> = {
  skin_light: '#FFE0BD',
  skin_light_medium: '#F1C27D',
  skin_medium: '#C68642',
  skin_medium_dark: '#8D5524',
  skin_dark: '#5C3D2E',
  skin_deep: '#3B2219',
}

const EYE_COLORS: Record<string, string> = {
  eyes_brown: '#8B4513',
  eyes_blue: '#4169E1',
  eyes_green: '#228B22',
  eyes_hazel: '#C4A35A',
}

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

const HAIR_STYLE_LABELS: Record<string, string> = {
  hair_short: 'Short',
  hair_medium: 'Medium',
  hair_long: 'Long',
}

export function AvatarSetup({ onComplete, onSkip }: AvatarSetupProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('skin')
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE)

  const currentStepIndex = STEPS.indexOf(currentStep)
  const isLastStep = currentStepIndex === STEPS.length - 1
  const isFirstStep = currentStepIndex === 0

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete(appearance)
    } else {
      setCurrentStep(STEPS[currentStepIndex + 1])
    }
  }, [isLastStep, currentStepIndex, appearance, onComplete])

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1])
    }
  }, [isFirstStep, currentStepIndex])

  const updateAppearance = useCallback((updates: Partial<Appearance>) => {
    setAppearance(prev => ({ ...prev, ...updates }))
  }, [])

  const updateHair = useCallback((hairUpdates: Partial<Appearance['hair']>) => {
    setAppearance(prev => ({
      ...prev,
      hair: { ...prev.hair, ...hairUpdates },
    }))
  }, [])

  const renderStepContent = () => {
    switch (currentStep) {
      case 'skin':
        return (
          <div className="flex gap-3 flex-wrap justify-center">
            {FREE_SKINS.map(skinId => {
              const isSelected = appearance.skin === skinId

              return (
                <button
                  key={skinId}
                  onClick={() => updateAppearance({ skin: skinId })}
                  className={`
                    w-14 h-14 rounded-full border-3 transition-all touch-target
                    ${
                      isSelected
                        ? 'border-primary-500 ring-4 ring-primary-500/30 scale-110'
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
        )

      case 'hair':
        return (
          <div className="space-y-6">
            {/* Hair styles */}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">Style</p>
              <div className="flex gap-3 justify-center">
                {FREE_HAIR_STYLES.map(styleId => {
                  const isSelected = appearance.hair.styleId === styleId

                  return (
                    <button
                      key={styleId}
                      onClick={() => updateHair({ styleId })}
                      className={`
                        px-4 py-3 rounded-xl border-2 transition-all touch-target min-w-[80px]
                        ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300'
                        }
                      `}
                      aria-pressed={isSelected}
                    >
                      <span className="text-2xl block mb-1">💇</span>
                      <span className="text-sm">{HAIR_STYLE_LABELS[styleId]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Hair colors */}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">Color</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {FREE_HAIR_COLORS.map(colorId => {
                  const isSelected = appearance.hair.colorId === colorId

                  return (
                    <button
                      key={colorId}
                      onClick={() => updateHair({ colorId })}
                      className={`
                        w-10 h-10 rounded-full border-2 transition-all touch-target
                        ${
                          isSelected
                            ? 'border-primary-500 ring-2 ring-primary-500/50 scale-110'
                            : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                        }
                      `}
                      style={{ backgroundColor: HAIR_COLORS[colorId] }}
                      aria-label={`${colorId.replace('hair_', '')} hair`}
                      aria-pressed={isSelected}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )

      case 'eyes':
        return (
          <div className="flex gap-4 flex-wrap justify-center">
            {FREE_EYE_COLORS.map(eyeId => {
              const isSelected = appearance.eyes === eyeId

              return (
                <button
                  key={eyeId}
                  onClick={() => updateAppearance({ eyes: eyeId })}
                  className={`
                    w-16 h-16 rounded-full border-3 transition-all touch-target
                    flex items-center justify-center bg-white dark:bg-gray-800
                    ${
                      isSelected
                        ? 'border-primary-500 ring-4 ring-primary-500/30 scale-110'
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    }
                  `}
                  aria-label={`${eyeId.replace('eyes_', '')} eyes`}
                  aria-pressed={isSelected}
                >
                  <span
                    className="w-10 h-10 rounded-full"
                    style={{ backgroundColor: EYE_COLORS[eyeId] }}
                  />
                </button>
              )
            })}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Your Avatar
          </h2>
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Skip
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-3">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStepIndex
                  ? 'bg-primary-500'
                  : i < currentStepIndex
                    ? 'bg-primary-300'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Avatar preview */}
        <div className="px-4 py-2 flex justify-center">
          <div className="w-24 h-24">
            <AvatarPreview
              appearance={appearance}
              size="large"
              animate={false}
              usePlaceholderArt={true}
            />
          </div>
        </div>

        {/* Step title */}
        <h3 className="text-center text-gray-900 dark:text-white font-medium px-4 mb-4">
          {STEP_TITLES[currentStep]}
        </h3>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          {!isFirstStep && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 font-medium
                         hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-medium
                       hover:bg-primary-700 transition-colors"
          >
            {isLastStep ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
