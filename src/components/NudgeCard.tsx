import { Link } from 'react-router-dom'

interface NudgeCardProps {
  type: 'store-refresh' | 'repair'
  itemCount?: number
  repairName?: string
  repairCost?: number
}

export default function NudgeCard({
  type,
  itemCount = 8,
  repairName,
  repairCost,
}: NudgeCardProps) {
  if (type === 'store-refresh') {
    return (
      <Link
        to="/store"
        className="block bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white">
              Store refreshed
            </h3>
            <p className="text-sm text-white/80">
              {itemCount} new items this week
            </p>
          </div>

          {/* Arrow */}
          <svg className="w-5 h-5 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    )
  }

  // Repair nudge
  return (
    <Link
      to="/home"
      className="block bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white">
            {repairName || 'Continue repairs'}
          </h3>
          <p className="text-sm text-white/80">
            {repairCost ? `${repairCost} coins to fix` : 'Your homestead needs some love'}
          </p>
        </div>

        {/* Arrow */}
        <svg className="w-5 h-5 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
