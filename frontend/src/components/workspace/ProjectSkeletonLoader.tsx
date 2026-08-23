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

  if (viewMode === "card") {
    return (
      <div className="grid gap-4">
        {items.slice(0, 4).map((n) => (
          <div
            key={n}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-[var(--color-surface-muted)]" />
              <div className="space-y-2.5">
                <div className="h-5 w-48 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                <div className="h-3.5 w-72 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--color-surface-muted)]" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--color-surface-muted)]" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-24 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === "freedom") {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((n) => (
          <div
            key={n}
            className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] ${
              n % 3 === 0 ? "md:col-span-2" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-[var(--color-surface-muted)]" />
                <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--color-surface-muted)]" />
            </div>
            <div className="mt-4 h-12 w-full animate-pulse rounded-xl bg-[var(--color-surface-muted)]" />
            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
              <div className="h-3.5 w-20 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="h-3.5 w-16 animate-pulse rounded bg-[var(--color-surface-muted)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default Grid View Skeleton
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((n) => (
        <div
          key={n}
          className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-[var(--color-surface-muted)]" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--color-surface-muted)]" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-surface-muted)]" />
            </div>
            <div className="mt-4 flex gap-1.5">
              <div className="h-5 w-14 animate-pulse rounded-full bg-[var(--color-surface-muted)]" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--color-surface-muted)]" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
            <div className="h-3.5 w-20 animate-pulse rounded bg-[var(--color-surface-muted)]" />
            <div className="h-7 w-7 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
