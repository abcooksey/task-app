import { useState, useEffect } from 'react'

interface OnboardingModalProps {
  onComplete: () => void
}

interface Slide {
  emoji: string
  title: string
  description: string
  highlight?: string
}

const SLIDES: Slide[] = [
  {
    emoji: '👋',
    title: 'Welcome to Homestead',
    description: 'A task manager that works with your brain, not against it. Designed for people who find traditional to-do apps stressful.',
    highlight: 'No guilt. No shame. Just progress.',
  },
  {
    emoji: '🪙',
    title: 'Earn Coins, Not Judgement',
    description: 'Complete tasks to earn coins. Bigger tasks earn more. There are no penalties for skipping days or not finishing everything.',
    highlight: 'Progress only moves forward.',
  },
  {
    emoji: '🔥',
    title: 'Dread Bonus',
    description: "Been avoiding a task? Defer it to tomorrow and it builds a bonus. When you finally do it, you'll earn extra coins as a reward for facing it.",
    highlight: 'Procrastination becomes a feature.',
  },
  {
    emoji: '🔋',
    title: 'Low Energy Mode',
    description: "Having a rough day? Toggle low energy mode to see only small, quick tasks. It's okay to do less sometimes.",
    highlight: 'Some progress beats no progress.',
  },
  {
    emoji: '📅',
    title: '4am Day Boundary',
    description: "Your day doesn't end at midnight. Tasks stay available until 4am, so late-night productivity still counts for today.",
    highlight: 'Built for night owls.',
  },
  {
    emoji: '✨',
    title: "You're Ready!",
    description: 'Start by adding a small task. Type naturally like "Call mom tomorrow" or "Water plants every 3 days" and we\'ll figure out the rest.',
    highlight: 'Small steps lead to big changes.',
  },
]

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const isLastSlide = currentSlide === SLIDES.length - 1
  const slide = SLIDES[currentSlide]

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onComplete()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onComplete])

  const handleNext = () => {
    if (isLastSlide) {
      onComplete()
    } else {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide
                  ? 'bg-primary-500'
                  : index < currentSlide
                  ? 'bg-primary-300 dark:bg-primary-700'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="p-8 text-center">
          <div className="text-6xl mb-6">{slide.emoji}</div>
          <h2 id="onboarding-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {slide.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            {slide.description}
          </p>
          {slide.highlight && (
            <p className="text-primary-600 dark:text-primary-400 font-medium italic">
              {slide.highlight}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <div>
            {currentSlide > 0 ? (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Back
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Skip
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            {isLastSlide ? "Let's Go!" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
