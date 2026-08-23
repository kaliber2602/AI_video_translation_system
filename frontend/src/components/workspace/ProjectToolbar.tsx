import { FolderPlus, Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TagResponse } from "../../types/tag";

interface ProjectToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  tags?: TagResponse[];
  selectedTagId?: number | null;
  onTagSelect?: (tagId: number | null) => void;
  onNewProject?: () => void;
}

export default function ProjectToolbar({
  search,
  onSearchChange,
  tags = [],
  selectedTagId = null,
  onTagSelect,
  onNewProject,
}: ProjectToolbarProps) {
  const { t } = useTranslation(["workspace"]);

  return (
    <section className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)] transition-colors duration-200">
      {/* Search Input */}
      <div className="relative min-w-[220px] flex-1">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("workspace:searchPlaceholder")}
          className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
        />
      </div>

      {/* Filter Tag Dropdown */}
      <div className="hidden lg:block">
        <select
          value={selectedTagId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onTagSelect?.(val === "" ? null : Number(val));
          }}
          className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-secondary)] outline-none transition hover:border-[var(--color-primary)] focus:border-[var(--color-primary)]"
        >
          <option value="">{t("workspace:filterAllTags")}</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>

      {/* New Project Button */}
      {onNewProject && (
        <button
          type="button"
          onClick={onNewProject}
          className="flex h-12 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
        >
          <FolderPlus size={18} />
          <span>{t("workspace:newProject")}</span>
        </button>
      )}

      {/* Filter Icon */}
      <button
        type="button"
        aria-label="Filter"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      >
        <SlidersHorizontal size={18} />
      </button>

      {/* Grid / List view toggle */}
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