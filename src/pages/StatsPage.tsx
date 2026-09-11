import { useState } from 'react'
import { useStats, formatDate, formatDateFull } from '@/hooks/useStats'
import { StatsPageSkeleton } from '@/components/Skeleton'

type TimeRange = '7' | '30'

export default function StatsPage() {
  const { data: stats, isLoading, error } = useStats()
  const [timeRange, setTimeRange] = useState<TimeRange>('7')

  if (isLoading) {
    return <StatsPageSkeleton />
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 text-red-500">
        Error loading statistics. Please refresh.
      </div>
    )
  }

  const displayDays = timeRange === '7' ? stats.dailyStats.slice(-7) : stats.dailyStats
  const maxCompletions = Math.max(...displayDays.map(d => d.completions), 1)
  const maxCoins = Math.max(...displayDays.map(d => d.coins), 1)

  // Week comparison
  const weekDiff = stats.thisWeekCompletions - stats.lastWeekCompletions
  const weekDiffPercent = stats.lastWeekCompletions > 0
    ? Math.round((weekDiff / stats.lastWeekCompletions) * 100)
    : stats.thisWeekCompletions > 0 ? 100 : 0

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Statistics
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalCompletions.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Tasks completed
          </div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-coin flex items-center gap-1">
            <span>🪙</span>
            {stats.totalCoins.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total coins earned
          </div>
        </div>
      </div>

      {/* Streaks - positive framing */}
      {(stats.currentStreak > 0 || stats.longestStreak > 0) && (
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            Consistency
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {stats.currentStreak > 0 && (
              <div>
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Current streak 🔥
                </div>
              </div>
            )}
            {stats.longestStreak > 0 && (
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.longestStreak} day{stats.longestStreak !== 1 ? 's' : ''}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Longest streak
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly comparison */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          This Week
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.thisWeekCompletions}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Completions
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-medium ${
                weekDiff > 0
                  ? 'text-green-600 dark:text-green-400'
                  : weekDiff < 0
                  ? 'text-orange-500 dark:text-orange-400'
                  : 'text-gray-500'
              }`}>
                {weekDiff > 0 ? '+' : ''}{weekDiff}
              </span>
              {weekDiff !== 0 && (
                <span className={`text-sm ${
                  weekDiff > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-orange-500 dark:text-orange-400'
                }`}>
                  ({weekDiff > 0 ? '+' : ''}{weekDiffPercent}%)
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              vs last week
            </div>
          </div>
        </div>
      </div>

      {/* Best days */}
      {(stats.bestDay || stats.bestCoinDay) && (
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            Personal Bests
          </h3>
          <div className="space-y-3">
            {stats.bestDay && (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Most productive day
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateFull(stats.bestDay.date)}
                  </div>
                </div>
                <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {stats.bestDay.completions} tasks
                </div>
              </div>
            )}
            {stats.bestCoinDay && (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Best coin day
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateFull(stats.bestCoinDay.date)}
                  </div>
                </div>
                <div className="text-lg font-bold text-coin flex items-center gap-1">
                  <span>🪙</span>
                  {stats.bestCoinDay.coins}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily chart */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Daily Activity
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setTimeRange('7')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeRange === '7'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setTimeRange('30')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeRange === '30'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              30 days
            </button>
          </div>
        </div>

        {/* Completions chart */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tasks completed</div>
          <div className="flex items-end gap-1 h-24">
            {displayDays.map((day, i) => {
              const height = day.completions > 0
                ? Math.max((day.completions / maxCompletions) * 100, 8)
                : 0
              const isToday = i === displayDays.length - 1
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center group relative"
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      isToday
                        ? 'bg-primary-500'
                        : day.completions > 0
                        ? 'bg-primary-300 dark:bg-primary-600'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                    style={{ height: `${height}%`, minHeight: day.completions > 0 ? '4px' : '2px' }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {formatDate(day.date)}: {day.completions} tasks
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* X-axis labels */}
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>{formatDate(displayDays[0]?.date || '')}</span>
            <span>Today</span>
          </div>
        </div>

        {/* Coins chart */}
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Coins earned</div>
          <div className="flex items-end gap-1 h-24">
            {displayDays.map((day, i) => {
              const height = day.coins > 0
                ? Math.max((day.coins / maxCoins) * 100, 8)
                : 0
              const isToday = i === displayDays.length - 1
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center group relative"
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      isToday
                        ? 'bg-amber-500'
                        : day.coins > 0
                        ? 'bg-amber-300 dark:bg-amber-600'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                    style={{ height: `${height}%`, minHeight: day.coins > 0 ? '4px' : '2px' }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {formatDate(day.date)}: {day.coins} coins
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* X-axis labels */}
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>{formatDate(displayDays[0]?.date || '')}</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Averages */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          Averages
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.avgCompletionsPerDay.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Tasks per active day
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-coin flex items-center gap-1">
              <span>🪙</span>
              {Math.round(stats.avgCoinsPerDay)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Coins per active day
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
