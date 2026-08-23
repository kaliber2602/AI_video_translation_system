import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ProjectPagination() {
  const { t } = useTranslation(["common"]);

  return (
    <div className="mt-5 flex flex-col gap-4 px-1 text-sm text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
      <span>
        {t("common:showingItems", { start: 1, end: 7, total: 7 })}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50 transition"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-sm font-semibold text-white shadow-sm"
        >
          1
        </button>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <span>{t("common:itemsPerPage")}</span>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
        >
          10
          <ChevronRight size={14} className="rotate-90" />
        </button>
      </div>
    </div>
  );
}