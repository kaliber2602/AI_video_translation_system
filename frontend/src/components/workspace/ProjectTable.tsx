import { useState } from "react";
import {
  Edit,
  Folder,
  FolderPlus,
  MoreHorizontal,
  PlaySquare,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Project } from "../../types/project";

interface ProjectTableProps {
  projects: Project[];
  isLoading: boolean;
  onProjectClick: (projectId: number) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onNewProject: () => void;
}

export default function ProjectTable({
  projects,
  isLoading,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onNewProject,
}: ProjectTableProps) {
  const { t, i18n } = useTranslation(["workspace", "common"]);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-colors duration-200">
      {/* Table Header */}
      <div className="grid grid-cols-[40px_1.4fr_1.5fr_100px_140px_100px_180px_40px] items-center gap-4 border-b border-[var(--color-border)] px-5 py-4 text-xs font-semibold text-[var(--color-text-muted)]">
        <div>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
            aria-label="Select all"
          />
        </div>

        <div>{t("workspace:columns.name")}</div>
        <div>{t("workspace:columns.recentProject")}</div>
        <div>{t("workspace:columns.videos")}</div>
        <div>{t("workspace:columns.updated")}</div>
        <div>{t("workspace:columns.size")}</div>
        <div>{t("workspace:columns.tags")}</div>
        <div />
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="divide-y divide-[var(--color-border)]">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="grid grid-cols-[40px_1.4fr_1.5fr_100px_140px_100px_180px_40px] items-center gap-4 px-5 py-5"
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
                <div className="h-11 w-16 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" />
                <div className="space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                  <div className="h-3 w-12 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                </div>
              </div>
              <div className="h-4 w-8 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="h-4 w-20 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="h-4 w-12 animate-pulse rounded bg-[var(--color-surface-muted)]" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--color-surface-muted)]" />
              <div className="h-8 w-8 animate-pulse rounded bg-[var(--color-surface-muted)]" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <FolderPlus size={28} />
          </div>
          <h3 className="mt-4 text-base font-bold text-[var(--color-text-primary)]">
            {t("workspace:empty")}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">
            {t("workspace:emptyDesc")}
          </p>
          <button
            type="button"
            onClick={onNewProject}
            className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
          >
            <FolderPlus size={15} />
            {t("workspace:newProject")}
          </button>
        </div>
      ) : (
        /* Real Project Rows */
        projects.map((project) => (
          <div
            key={project.id}
            role="button"
            tabIndex={0}
            onClick={() => onProjectClick(project.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                onProjectClick(project.id);
              }
            }}
            className="group relative grid w-full cursor-pointer grid-cols-[40px_1.4fr_1.5fr_100px_140px_100px_180px_40px] items-center gap-4 border-b border-[var(--color-border)] px-5 py-5 text-left transition hover:bg-[var(--color-surface-muted)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] last:border-b-0"
          >
            {/* Checkbox */}
            <div>
              <input
                type="checkbox"
                onClick={(event) => event.stopPropagation()}
                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                aria-label={`Select ${project.name}`}
              />
            </div>

            {/* Project Name */}
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF5D8] text-[#E9A927] dark:bg-[#2F291B] dark:text-[#F3C158]">
                <Folder size={21} fill="currentColor" />
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {project.name}
                </div>

                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {t("workspace:videosCount", { count: project.video_count || 0 })}
                </div>
              </div>
            </div>

            {/* Recent Video */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#18202A] to-[#526474]">
                <PlaySquare size={18} className="text-white/80" />
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {project.recent_project || "—"}
                </div>

                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {project.duration || "—"}
                </div>
              </div>
            </div>

            {/* Videos */}
            <div className="text-sm text-[var(--color-text-secondary)]">
              {project.video_count || 0}
            </div>

            {/* Updated */}
            <div className="text-sm text-[var(--color-text-secondary)]">
              {formatDate(project.updated_at)}
            </div>

            {/* Size */}
            <div className="text-sm text-[var(--color-text-secondary)]">
              {project.size || "—"}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {project.tags && project.tags.length > 0 ? (
                project.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: tag.color || "var(--color-primary)",
                      }}
                    />
                    <span>{tag.name}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">—</span>
              )}
            </div>

            {/* Actions Menu */}
            <div className="relative flex justify-end">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveDropdownId(
                    activeDropdownId === project.id ? null : project.id
                  );
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                aria-label="More options"
              >
                <MoreHorizontal size={19} />
              </button>

              {activeDropdownId === project.id && (
                <>
                  <div
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownId(null);
                    }}
                  />
                  <div className="absolute right-0 top-9 z-40 w-36 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(null);
                        onEditProject(project);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
                    >
                      <Edit size={14} />
                      {t("common:edit")}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(null);
                        onDeleteProject(project);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-danger)] transition hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                      {t("common:delete")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </section>
  );
}