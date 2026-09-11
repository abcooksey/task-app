interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  )
}

export function TaskCardSkeleton() {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        {/* Checkbox skeleton */}
        <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <Skeleton className="h-5 w-3/4 mb-2" />

          {/* Meta info */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Chevron */}
        <Skeleton className="w-5 h-5 flex-shrink-0" />
      </div>
    </div>
  )
}

export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card p-4">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

export function StatsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Chart section */}
      <div className="card p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}

export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    </div>
  )
}
