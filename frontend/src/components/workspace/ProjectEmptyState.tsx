import { FolderPlus, SearchX, RotateCcw, Star, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WorkspaceTab } from "./WorkspaceSidebar";

interface ProjectEmptyStateProps {
  isFiltered?: boolean;
  currentTab?: WorkspaceTab;
  onNewProject?: () => void;
  onClearFilters?: () => void;
}

export default function ProjectEmptyState({
  isFiltered = false,
  currentTab = "allProjects",
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

  // Favorites Tab Empty State
  if (currentTab === "favorites") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center shadow-[var(--shadow-card)] transition-colors duration-200">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 shadow-sm border border-amber-400/20">
          <Star size={30} className="fill-amber-400/30" />
        </div>

        <h3 className="mt-5 text-base font-bold text-[var(--color-text-primary)]">
          {t("workspace:states.noFavorites", "Chưa có dự án yêu thích nào")}
        </h3>

        <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
          {t(
            "workspace:states.noFavoritesDesc",
            "Nhấp vào biểu tượng ngôi sao trên bất kỳ dự án nào để thêm vào mục yêu thích và truy cập nhanh chóng."
          )}
        </p>
      </div>
    );
  }

  // Trash Tab Empty State
  if (currentTab === "trash") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center shadow-[var(--shadow-card)] transition-colors duration-200">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 shadow-sm border border-rose-400/20">
          <Trash2 size={30} />
        </div>

        <h3 className="mt-5 text-base font-bold text-[var(--color-text-primary)]">
          {t("workspace:states.noTrash", "Thùng rác trống")}
        </h3>

        <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
          {t(
            "workspace:states.noTrashDesc",
            "Không có dự án nào bị xóa trong thùng rác."
          )}
        </p>
      </div>
    );
  }

  // Default All Projects Empty State
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
