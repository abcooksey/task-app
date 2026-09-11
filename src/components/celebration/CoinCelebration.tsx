import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAffordabilityHint } from '@/hooks/useAffordabilityHint'
import type { CompletionResult } from '@/hooks/useCompletions'

interface CoinCelebrationProps {
  result: CompletionResult | null
  onComplete: () => void
}

export default function CoinCelebration({ result, onComplete }: CoinCelebrationProps) {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)
  const [showBonuses, setShowBonuses] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Check if any recently tried items are now affordable
  const affordableItem = useAffordabilityHint(result?.totalPayout ?? 0)

  useEffect(() => {
    if (result) {
      setIsVisible(true)

      // Shorter timings when reduced motion is preferred
      // Extend time when there's an affordability hint
      const bonusDelay = prefersReducedMotion ? 0 : 300
      const hasHint = affordableItem !== null
      const baseDelay = result.variableBonusType === 'jackpot' ? 3000 : 1500
      const dismissDelay = prefersReducedMotion ? 800 : (hasHint ? baseDelay + 1000 : baseDelay)
      const fadeDelay = prefersReducedMotion ? 0 : 300

      // With reduced motion, show bonuses immediately
      if (prefersReducedMotion) {
        setShowBonuses(true)
      } else {
        setShowBonuses(false)
      }

      const bonusTimer = setTimeout(() => setShowBonuses(true), bonusDelay)

      // Auto dismiss after animation completes
      const dismissTimer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onComplete, fadeDelay) // Wait for fade out
      }, dismissDelay)

      return () => {
        clearTimeout(bonusTimer)
        clearTimeout(dismissTimer)
      }
    }
  }, [result, onComplete, prefersReducedMotion, affordableItem])

  if (!result) return null

  const isJackpot = result.variableBonusType === 'jackpot'

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-50 flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop for jackpot */}
      {isJackpot && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-purple-500/20 animate-pulse" />
      )}

      {/* Main celebration card */}
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'
        } ${isJackpot ? 'ring-4 ring-amber-400 ring-opacity-75' : ''}`}
      >
        {/* Jackpot banner */}
        {isJackpot && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 px-4 py-1 rounded-full text-sm font-bold animate-bounce">
            JACKPOT!
          </div>
        )}

        {/* Coin icon with animation */}
        <div className="text-center mb-4">
          <div
            className={`inline-block text-5xl ${
              isJackpot ? 'animate-spin' : 'animate-bounce'
            }`}
            style={{ animationDuration: isJackpot ? '1s' : '0.5s' }}
          >
            🪙
          </div>
        </div>

        {/* Total coins */}
        <div className="text-center mb-3">
          <span
            className={`text-4xl font-bold ${
              isJackpot
                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent'
                : 'text-primary-600 dark:text-primary-400'
            }`}
          >
            +{result.totalPayout}
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-2">coins</span>
        </div>

        {/* Breakdown */}
        {showBonuses && (
          <div className="space-y-1 text-sm animate-fade-in">
            {/* Base payout */}
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Base</span>
              <span>+{result.basePayout}</span>
            </div>

            {/* Dread bonus */}
            {result.dreadBonus > 0 && (
              <div className="flex justify-between text-orange-600 dark:text-orange-400">
                <span>Dread bonus</span>
                <span>+{result.dreadBonus}</span>
              </div>
            )}

            {/* Variable bonus */}
            {result.variableBonus > 0 && (
              <div
                className={`flex justify-between ${
                  isJackpot
                    ? 'text-amber-500 font-bold'
                    : 'text-purple-600 dark:text-purple-400'
                }`}
              >
                <span>{isJackpot ? 'Jackpot!' : 'Bonus!'}</span>
                <span>+{result.variableBonus}</span>
              </div>
            )}

            {/* First of day */}
            {result.firstOfDayBonus > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>First today</span>
                <span>+{result.firstOfDayBonus}</span>
              </div>
            )}

            {/* Affordability hint */}
            {affordableItem && (
              <button
                onClick={() => {
                  onComplete()
                  navigate('/store?section=clothing')
                }}
                className="w-full mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-primary-600 dark:text-primary-400 hover:underline pointer-events-auto"
              >
                You can now buy {affordableItem.name}!
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating coins animation for jackpot - skip when reduced motion preferred */}
      {isJackpot && !prefersReducedMotion && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random()}s`,
              }}
            >
              🪙
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
