import { Skeleton } from "@/components/ui/skeleton"

function LeftPanelSkeleton() {
  return (
    <div className="w-[260px] shrink-0 flex flex-col overflow-hidden rounded-xl border border-[#e0ddd6] bg-[#f5f2ed]">
      {/* Section label */}
      <div className="px-3 py-2 flex items-center gap-2">
        <Skeleton className="size-3.5 rounded-full" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>

      {/* Pipeline items */}
      <div className="flex-1 px-2 pb-2 space-y-1">
        {/* Active label */}
        <div className="px-2.5 py-1 flex items-center gap-1.5">
          <Skeleton className="size-3.5 rounded" />
          <Skeleton className="h-2.5 w-12 rounded" />
        </div>

        {/* Pipeline rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-0.5">
            {/* Pipeline header */}
            <div className="flex items-center gap-2 px-2.5 py-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3.5 flex-1 rounded" style={{ width: `${60 + i * 12}%`, maxWidth: "100%" }} />
              <Skeleton className="h-3 w-10 rounded" />
            </div>
            {/* Prompt rows under pipeline */}
            {i < 3 && (
              <div className="ml-3 pl-2 border-l border-border/30 space-y-0.5">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-2 px-2.5 py-1.5">
                    <Skeleton className="size-3 rounded" />
                    <Skeleton className="h-3 rounded" style={{ width: `${50 + j * 15}%` }} />
                    <Skeleton className="h-3 w-8 rounded ml-auto" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RightPanelSkeleton() {
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-5 rounded-xl bg-white px-5 py-4">
      {/* Chart title + description */}
      <div className="space-y-2 shrink-0">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-3 w-64 rounded opacity-60" />
      </div>

      {/* Chart body — area-chart-like bars */}
      <div className="flex-1 min-h-0 flex flex-col justify-end gap-1 pb-6 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
          {[100, 90, 80, 75].map((v) => (
            <Skeleton key={v} className="h-2.5 w-6 rounded opacity-40" />
          ))}
        </div>

        {/* Chart columns */}
        <div className="ml-10 flex items-end gap-3 h-full">
          {[55, 70, 60, 85, 72, 90, 78, 88, 65, 92, 80, 75].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <Skeleton
                className="w-full rounded-t-sm"
                style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
              />
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="ml-10 flex gap-3 mt-2 shrink-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 h-2.5 rounded opacity-40" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function PageLoadingSkeleton() {
  return (
    <div className="px-4 lg:px-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="h-3.5 w-56 rounded opacity-60" />
        </div>
        <Skeleton className="h-9 w-[220px] rounded-lg shrink-0" />
      </div>

      {/* Main panels */}
      <div className="flex gap-3 h-[calc(100vh-12rem)] min-h-[500px]">
        <LeftPanelSkeleton />
        <RightPanelSkeleton />
      </div>
    </div>
  )
}
