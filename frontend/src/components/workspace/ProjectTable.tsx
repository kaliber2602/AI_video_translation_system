import { useState } from "react";
import {
  Edit,
  MoreHorizontal,
  PlaySquare,
  RotateCcw,
  Share2,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import FolderIcon from "../common/FolderIcon";
import type { Project } from "../../types/project";

interface ProjectTableProps {
  projects: Project[];
  onProjectClick: (projectId: number) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onToggleFavorite?: (project: Project) => void;
  onShareProject?: (project: Project) => void;
  onRestoreProject?: (project: Project) => void;
  isTrashMode?: boolean;
}

export default function ProjectTable({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onToggleFavorite,
  onShareProject,
  onRestoreProject,
  isTrashMode = false,
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

  const getStaggerClass = (index: number) => {
    const staggerIndex = (index % 6) + 1;
    return `stagger-${staggerIndex}`;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-colors duration-200">
      <div className="min-w-[840px]">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1.4fr_1.5fr_100px_140px_100px_180px_40px] items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-5 py-3.5 text-xs font-bold text-[var(--color-text-muted)]">
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

        {/* Project Rows */}
        <div className="divide-y divide-[var(--color-border)]">
          {projects.map((project, index) => (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!isTrashMode) onProjectClick(project.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!isTrashMode) onProjectClick(project.id);
                }
              }}
              className={`group relative grid w-full cursor-pointer grid-cols-[56px_1.4fr_1.5fr_100px_140px_100px_180px_60px] items-center gap-4 px-5 py-4 text-left transition-colors duration-180 hover:bg-[var(--color-surface-muted)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] animate-fade-up ${
                isTrashMode ? "opacity-90" : ""
              } ${getStaggerClass(index)}`}
            >
              {/* Checkbox + Star */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                  aria-label={`Select ${project.name}`}
                />
                {!isTrashMode && onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(project)}
                    title={project.is_favorite ? t("workspace:favorite.removeFromFavorites") : t("workspace:favorite.addToFavorites")}
                    className={`flex h-6 w-6 items-center justify-center rounded transition ${
                      project.is_favorite
                        ? "text-amber-500 fill-amber-500"
                        : "text-[var(--color-text-muted)] hover:text-amber-500"
                    }`}
                  >
                    <Star size={14} className={project.is_favorite ? "fill-amber-500" : ""} />
                  </button>
                )}
              </div>

              {/* Project Name */}
              <div className="flex min-w-0 items-center gap-3.5">
                <FolderIcon size="md" />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-180">
                      {project.name}
                    </span>
                    {project.is_shared && (
                      <span
                        title={t("workspace:share.sharedBy", { name: project.owner_name || "đồng nghiệp" })}
                        className="inline-flex shrink-0 items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400"
                      >
                        <Users size={10} />
                        <span className="max-w-[60px] truncate">{project.owner_name || t("workspace:share.sharedWithMe")}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {project.video_count || 0} {t("workspace:columns.videos").toLowerCase()}
                  </div>
                </div>
              </div>

              {/* Recent Video */}
              <div className="min-w-0">
                {project.recent_project && !isTrashMode ? (
                  <div className="flex items-center gap-2">
                    <PlaySquare size={15} className="shrink-0 text-[var(--color-primary)]" />
                    <span className="truncate text-xs font-semibold text-[var(--color-text-secondary)]">
                      {project.recent_project}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">—</span>
                )}
              </div>

              {/* Videos Count */}
              <div>
                <span className="inline-flex items-center rounded-lg bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  {project.video_count || 0}
                </span>
              </div>

              {/* Updated At / Deleted At */}
              <div className="text-xs text-[var(--color-text-muted)]">
                {isTrashMode && project.deleted_at
                  ? t("workspace:trash.deletedAt", { date: formatDate(project.deleted_at) })
                  : formatDate(project.updated_at)}
              </div>

              {/* Size */}
              <div className="text-xs font-medium text-[var(--color-text-muted)]">
                {project.size || "—"}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                {project.tags && project.tags.length > 0 ? (
                  project.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: tag.color || "var(--color-primary)",
                        }}
                      />
                      <span className="truncate max-w-[80px]">{tag.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">—</span>
                )}
                {project.tags && project.tags.length > 2 && (
                  <span className="rounded-md bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
                    +{project.tags.length - 2}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="relative text-right" onClick={(e) => e.stopPropagation()}>
                {isTrashMode ? (
                  <div className="flex items-center justify-end gap-1.5">
                    {onRestoreProject && (
                      <button
                        type="button"
                        onClick={() => onRestoreProject(project)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition"
                        title={t("workspace:trash.restore", "Khôi phục")}
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteProject(project)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition"
                      title={t("workspace:trash.permanentDelete", "Xóa vĩnh viễn")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(
                          activeDropdownId === project.id ? null : project.id
                        );
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                      aria-label="More options"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {activeDropdownId === project.id && (
                      <>
                        <div
                          className="fixed inset-0 z-30 cursor-default"
                          onClick={() => {
                            setActiveDropdownId(null);
                          }}
                        />
                        <div className="absolute right-0 top-9 z-40 w-40 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)] animate-dropdown-reveal">
                          {onShareProject && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                onShareProject(project);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
                            >
                              <Share2 size={13} />
                              <span>{t("workspace:share.action", "Chia sẻ")}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownId(null);
                              onEditProject(project);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
                          >
                            <Edit size={13} />
                            <span>{t("common:edit")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownId(null);
                              onDeleteProject(project);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-danger)] transition hover:bg-red-500/10"
                          >
                            <Trash2 size={13} />
                            <span>{t("workspace:trash.moveToTrashBtn", "Chuyển vào thùng rác")}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}