import { useState } from "react";
import {
  ArrowUpDown,
  Check,
  FolderPlus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TagResponse } from "../../types/tag";
import ViewSwitcher, { type ViewMode } from "./ViewSwitcher";

export type SortOption =
  | "updated-recent"
  | "name-asc"
  | "name-desc"
  | "date-newest"
  | "date-oldest"
  | "videos-desc";

interface ProjectToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  tags?: TagResponse[];
  selectedTagId?: number | null;
  onTagSelect?: (tagId: number | null) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewProject?: () => void;
  isTrashMode?: boolean;
  onEmptyTrash?: () => void;
  trashCount?: number;
}

export default function ProjectToolbar({
  search,
  onSearchChange,
  tags = [],
  selectedTagId = null,
  onTagSelect,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  onNewProject,
  isTrashMode = false,
  onEmptyTrash,
  trashCount = 0,
}: ProjectToolbarProps) {

  const { t } = useTranslation(["workspace", "common"]);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const sortOptionsList: { value: SortOption; label: string }[] = [
    { value: "updated-recent", label: t("workspace:sort.recentlyUpdated") },
    { value: "name-asc", label: t("workspace:sort.nameAsc") },
    { value: "name-desc", label: t("workspace:sort.nameDesc") },
    { value: "date-newest", label: t("workspace:sort.newest") },
    { value: "date-oldest", label: t("workspace:sort.oldest") },
    { value: "videos-desc", label: t("workspace:sort.mostVideos") },
  ];

  const currentSortLabel =
    sortOptionsList.find((s) => s.value === sortOption)?.label ||
    t("workspace:sort.sortBy");

  const selectedTag = tags.find((tg) => tg.id === selectedTagId);

  return (
    <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)] transition-colors duration-200 lg:flex-row lg:items-center">
      {/* Search Input */}
      <div className="relative min-w-[220px] flex-1">
        <Search
          size={17}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("workspace:searchPlaceholder")}
          className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-9 text-xs text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
        />

        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Tag Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterMenuOpen((prev) => !prev)}
            className={`flex h-11 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${
              selectedTagId !== null
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>
              {selectedTag ? selectedTag.name : t("workspace:filters.allTags")}
            </span>
            {selectedTagId !== null && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onTagSelect?.(null);
                }}
                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--color-primary)]/20"
              >
                <X size={10} />
              </span>
            )}
          </button>

          {filterMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setFilterMenuOpen(false)}
              />
              <div className="absolute left-0 top-12 z-40 max-h-64 w-56 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-card)] animate-dropdown-reveal">
                <button
                  type="button"
                  onClick={() => {
                    onTagSelect?.(null);
                    setFilterMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                    selectedTagId === null
                      ? "bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <span>{t("workspace:filters.allTags")}</span>
                  {selectedTagId === null && <Check size={14} />}
                </button>

                {tags.map((tag) => {
                  const isSelected = selectedTagId === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        onTagSelect?.(tag.id);
                        setFilterMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                        isSelected
                          ? "bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: tag.color || "var(--color-primary)",
                          }}
                        />
                        <span className="truncate">{tag.name}</span>
                      </div>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Sort Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortMenuOpen((prev) => !prev)}
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline-block text-[var(--color-text-muted)]">
              {t("workspace:sort.sortBy")}:
            </span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {currentSortLabel}
            </span>
          </button>

          {sortMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setSortMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-40 w-52 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-card)] animate-dropdown-reveal">
                {sortOptionsList.map((option) => {
                  const isSelected = sortOption === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onSortChange(option.value);
                        setSortMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                        isSelected
                          ? "bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* View Switcher (4 Modes) */}
        <ViewSwitcher
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />

        {/* Empty Trash Button in Trash mode */}
        {isTrashMode && onEmptyTrash && (
          <button
            type="button"
            onClick={onEmptyTrash}
            disabled={trashCount === 0}
            className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">{t("workspace:trash.emptyTrashButton", "Dọn sạch thùng rác")}</span>
          </button>
        )}

        {/* New Project CTA Button in normal modes */}
        {!isTrashMode && onNewProject && (
          <button
            type="button"
            onClick={onNewProject}
            className="flex h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] hover:shadow-md"
          >
            <FolderPlus size={16} />
            <span className="hidden md:inline">{t("workspace:newProject")}</span>
          </button>
        )}
      </div>
    </section>
  );
}