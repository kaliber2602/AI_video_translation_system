import { FolderPlus, SearchX, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProjectEmptyStateProps {
  isFiltered?: boolean;
  onNewProject?: () => void;
  onClearFilters?: () => void;
}

export default function ProjectEmptyState({
  isFiltered = false,
  onNewProject,
  onClearFilters,
}: ProjectEmptyStateProps) {
  const { t } = useTranslation(["workspace"]);

  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-16 text-center transition-colors duration-200">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] shadow-sm">
          <SearchX size={32} />
        </div>

        <h3 className="mt-5 text-base font-bold text-[var(--color-text-primary)]">
          {t("workspace:states.noResults")}
        </h3>

        <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
          {t("workspace:states.noResultsDesc")}
        </p>

        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <RotateCcw size={14} />
            <span>{t("workspace:states.clearSearch")}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center shadow-[var(--shadow-card)] transition-colors duration-200">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm">
        <FolderPlus size={32} />
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--color-text-primary)]">
        {t("workspace:states.noProjects")}
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
        {t("workspace:states.noProjectsDesc")}
      </p>

      {onNewProject && (
        <button
          type="button"
          onClick={onNewProject}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
        >
          <FolderPlus size={15} />
          <span>{t("workspace:newProject")}</span>
        </button>
      )}
    </div>
  );
}
