import { Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ProjectToolbar() {
  const { t } = useTranslation(["workspace"]);

  return (
    <section className="mb-5 flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)] transition-colors duration-200">
      <div className="relative min-w-0 flex-1">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />

        <input
          type="text"
          placeholder={t("workspace:searchPlaceholder")}
          className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
        />
      </div>

      <button className="hidden h-12 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] md:flex">
        {t("workspace:filterAllTypes")}
        <span className="text-[var(--color-text-muted)]">⌄</span>
      </button>

      <button className="hidden h-12 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] lg:flex">
        {t("workspace:filterAllTags")}
        <span className="text-[var(--color-text-muted)]">⌄</span>
      </button>

      <button className="hidden h-12 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] xl:flex">
        {t("workspace:filterDateModified")}
        <span className="text-[var(--color-text-muted)]">⌄</span>
      </button>

      <button
        type="button"
        aria-label="Filter"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      >
        <SlidersHorizontal size={18} />
      </button>

      <div className="hidden h-12 items-center rounded-xl border border-[var(--color-border)] p-1 sm:flex">
        <button
          type="button"
          aria-label="Grid view"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
        >
          <Grid2X2 size={18} />
        </button>

        <button
          type="button"
          aria-label="List view"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
        >
          <List size={18} />
        </button>
      </div>
    </section>
  );
}