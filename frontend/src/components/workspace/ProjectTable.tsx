import { useState } from "react";
import {
  Edit,
  HardDrive,
  MoreHorizontal,
  PlaySquare,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import FolderIcon from "../common/FolderIcon";
import type { Project } from "../../types/project";

interface ProjectTableProps {
  projects: Project[];
  onProjectClick: (projectId: number) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onBatchDeleteProjects?: (projects: Project[]) => void;
  onBatchRestoreProjects?: (projects: Project[]) => void;
  onToggleFavorite?: (project: Project) => void;
  onRestoreProject?: (project: Project) => void;
  isTrashMode?: boolean;
}

export default function ProjectTable({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onBatchDeleteProjects,
  onBatchRestoreProjects,
  onToggleFavorite,
  onRestoreProject,
  isTrashMode = false,
}: ProjectTableProps) {
  const { t, i18n } = useTranslation(["workspace", "common"]);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);

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

  // Selection handlers
  const isAllSelected = projects.length > 0 && selectedProjectIds.length === projects.length;
  const isIndeterminate = selectedProjectIds.length > 0 && selectedProjectIds.length < projects.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProjectIds(projects.map((p) => p.id));
    } else {
      setSelectedProjectIds([]);
    }
  };

  const handleToggleSelectRow = (projectId: number, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const selectedProjects = projects.filter((p) => selectedProjectIds.includes(p.id));

  return (
    <div className="flex flex-col gap-2.5">
      {/* Floating Action Bar when 1 or more projects are selected */}
      {selectedProjectIds.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-surface)] px-4 py-2.5 shadow-md backdrop-blur-md animate-fade-in transition-all">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--color-text-primary)]">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[11px] font-bold text-white">
              {selectedProjectIds.length}
            </span>
            <span>
              {t("workspace:trash.batchSelected", {
                count: selectedProjectIds.length,
                defaultValue: `Đã chọn ${selectedProjectIds.length} dự án`,
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Batch Restore button if in Trash mode */}
            {isTrashMode && onBatchRestoreProjects && (
              <button
                type="button"
                onClick={() => {
                  onBatchRestoreProjects(selectedProjects);
                  setSelectedProjectIds([]);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>{t("workspace:trash.batchRestore", { count: selectedProjectIds.length, defaultValue: "Khôi phục" })}</span>
              </button>
            )}

            {/* Batch Delete button */}
            <button
              type="button"
              onClick={() => {
                if (onBatchDeleteProjects) {
                  onBatchDeleteProjects(selectedProjects);
                } else if (selectedProjects.length === 1) {
                  onDeleteProject(selectedProjects[0]);
                }
                setSelectedProjectIds([]);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-500/10 px-3.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-500 hover:text-white cursor-pointer"
            >
              <Trash2 size={14} />
              <span>
                {isTrashMode
                  ? t("workspace:trash.batchPermanentDelete", { count: selectedProjectIds.length, defaultValue: `Xóa vĩnh viễn (${selectedProjectIds.length})` })
                  : t("workspace:trash.batchMoveToTrash", { count: selectedProjectIds.length, defaultValue: `Chuyển vào thùng rác (${selectedProjectIds.length})` })}
              </span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedProjectIds([])}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition cursor-pointer"
            >
              {t("common:cancel", "Hủy chọn")}
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-colors duration-200">
        <div className="min-w-[840px]">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1.4fr_1.5fr_100px_140px_100px_180px_40px] items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-5 py-3.5 text-xs font-bold text-[var(--color-text-muted)]">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer"
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
            {projects.map((project, index) => {
              const isSelected = selectedProjectIds.includes(project.id);
              return (
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
                    isSelected ? "bg-[var(--color-primary-soft)]/50" : ""
                  } ${isTrashMode ? "opacity-90" : ""} ${getStaggerClass(index)}`}
                >
                  {/* Checkbox + Star */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleToggleSelectRow(project.id, e)}
                      className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer"
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
                  <div className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    {project.size && project.size !== "0 B" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface-muted)]/80 px-2 py-0.5 font-mono text-[11px] text-[var(--color-text-primary)]">
                        <HardDrive size={12} className="text-[var(--color-primary)]" />
                        <span>{project.size}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)] italic">0 B</span>
                    )}
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}