import { Skeleton } from "@/components/ui/skeleton"

export function VersionLoadingSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-3">
      {/* Header: breadcrumb + view toggle */}
      <div className="flex items-center justify-between gap-4 shrink-0 pb-3 border-b border-border/25">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 rounded-md opacity-60" />
          <Skeleton className="h-3 w-2 rounded-full opacity-40" />
          <Skeleton className="h-4 w-28 rounded-md opacity-60" />
          <Skeleton className="h-3 w-2 rounded-full opacity-40" />
          <Skeleton className="h-5 w-12 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-full opacity-70" />
        </div>
        <Skeleton className="h-9 w-44 rounded-xl opacity-70" />
      </div>

      {/* Tab list */}
      <div className="flex gap-1">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md opacity-60" />
        <Skeleton className="h-8 w-24 rounded-md opacity-60" />
      </div>

      {/* System prompt label + copy button */}
      <div className="flex items-center justify-between shrink-0">
        <Skeleton className="h-2.5 w-28 rounded opacity-50" />
        <Skeleton className="h-6 w-24 rounded-md opacity-50" />
      </div>

      {/* Content area — staggered text lines */}
      <div className="flex-1 min-h-0 rounded-xl bg-muted/20 border border-border/20 p-4 overflow-hidden">
        <div className="space-y-2.5">
          {[100, 92, 87, 96, 75, 100, 83, 91, 68, 95, 80, 88].map((w, i) => (
            <Skeleton
              key={i}
              className="h-3.5 rounded"
              style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Model config block */}
      <div className="rounded-xl bg-muted/20 border border-border/25 px-4 py-3 shrink-0">
        <Skeleton className="h-2.5 w-36 rounded mb-3 opacity-50" />
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-2 w-10 rounded opacity-40" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-2 w-16 rounded opacity-40" />
            <Skeleton className="h-5 w-10 rounded-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-2 w-10 rounded opacity-40" />
            <Skeleton className="h-5 w-10 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
