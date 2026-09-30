import type { ViewMode } from "./ViewSwitcher";

interface ProjectSkeletonLoaderProps {
  viewMode: ViewMode;
  count?: number;
}

export default function ProjectSkeletonLoader({
  viewMode,
  count = 6,
}: ProjectSkeletonLoaderProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (viewMode === "list") {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="divide-y divide-[var(--color-border)]">
          {items.slice(0, 5).map((n) => (
            <div
              key={n}
              className="grid grid-cols-[40px_1.4fr_1.5fr_100px_140px_100px_180px_40px] items-center gap-4 px-5 py-4"
            >
              <div className="h-4 w-4 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-[var(--color-surface-muted)]" />
                <div className="space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                  <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-14 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" />
                <div className="space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                  <div className="h-3 w-12 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                </div>
              </div>
              <div className="h-4 w-8 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="h-4 w-20 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="h-4 w-12 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="flex gap-1.5">
                <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--color-surface-muted)]" />
                <div className="h-6 w-12 animate-pulse rounded-full bg-[var(--color-surface-muted)]" />
              </div>
              <div className="h-8 w-8 animate-pulse rounded bg-[var(--color-surface-muted)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default Card View Skeleton
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((n) => (
        <div
          key={n}
          className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
        >
          <div className="space-y-3">
            {/* Carousel Thumbnail placeholder */}
            <div className="aspect-video w-full animate-pulse rounded-xl bg-[var(--color-surface-muted)]" />

            <div className="flex items-center justify-between pt-1">
              <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="h-6 w-6 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" />
            </div>
            <div className="h-3 w-48 animate-pulse rounded bg-[var(--color-surface-muted)]" />

            <div className="flex gap-1.5 pt-1">
              <div className="h-5 w-14 animate-pulse rounded-md bg-[var(--color-surface-muted)]" />
              <div className="h-5 w-16 animate-pulse rounded-md bg-[var(--color-surface-muted)]" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)]/60 pt-2.5">
            <div className="h-3.5 w-16 animate-pulse rounded bg-[var(--color-surface-muted)]" />
            <div className="h-3.5 w-20 animate-pulse rounded bg-[var(--color-surface-muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
