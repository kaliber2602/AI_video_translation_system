import { useState } from "react";
import {
  Edit,
  MoreVertical,
  PlaySquare,
  RotateCcw,
  Share2,
  Star,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import FolderIcon from "../common/FolderIcon";
import ElasticCard from "../common/ElasticCard";
import type { Project } from "../../types/project";

interface ProjectGridViewProps {
  projects: Project[];
  onProjectClick: (projectId: number) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onToggleFavorite?: (project: Project) => void;
  onShareProject?: (project: Project) => void;
  onRestoreProject?: (project: Project) => void;
  isTrashMode?: boolean;
}

export default function ProjectGridView({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onToggleFavorite,
  onShareProject,
  onRestoreProject,
  isTrashMode = false,
}: ProjectGridViewProps) {

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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {projects.map((project, index) => (
        <ElasticCard
          key={project.id}
          project={project}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!isTrashMode) onProjectClick(project.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!isTrashMode) onProjectClick(project.id);
            }
          }}
          elasticity={0.48}
          maxDisplacement={320}
          className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[var(--shadow-card)] transition-all duration-220 ease-out hover:border-[var(--color-primary)]/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] animate-fade-up ${
            isTrashMode ? "opacity-90 hover:border-red-400/40" : ""
          } ${getStaggerClass(index)}`}
        >
          {/* Card Top: Icon, Badges, Star, Action Dropdown */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderIcon size="lg" />
                {project.is_shared && (
                  <span
                    title={t("workspace:share.sharedBy", { name: project.owner_name || "đồng nghiệp" })}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400"
                  >
                    <Users size={11} />
                    <span className="max-w-[70px] truncate">{project.owner_name || t("workspace:share.sharedWithMe")}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Favorite Star Button */}
                {!isTrashMode && onToggleFavorite && (
                  <button
                    type="button"
                    title={project.is_favorite ? t("workspace:favorite.removeFromFavorites") : t("workspace:favorite.addToFavorites")}
                    aria-label={project.is_favorite ? t("workspace:favorite.removeFromFavorites") : t("workspace:favorite.addToFavorites")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(project);
                    }}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      project.is_favorite
                        ? "text-amber-500 fill-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                        : "text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <Star size={15} className={project.is_favorite ? "fill-amber-500" : ""} />
                  </button>
                )}

                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                  <Video size={12} className="text-[var(--color-primary)]" />
                  <span>{project.video_count || 0}</span>
                </span>

                {/* More Action Menu */}
                <div className="relative">
                  <button
                    type="button"
                    aria-label={t("common:more")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownId(
                        activeDropdownId === project.id ? null : project.id
                      );
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    <MoreVertical size={16} />
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
                      <div className="absolute right-0 top-9 z-40 w-40 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)] animate-dropdown-reveal">
                        {isTrashMode ? (
                          <>
                            {onRestoreProject && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                  onRestoreProject(project);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
                              >
                                <RotateCcw size={13} />
                                <span>{t("workspace:trash.restore", "Khôi phục")}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                onDeleteProject(project);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500/10"
                            >
                              <Trash2 size={13} />
                              <span>{t("workspace:trash.permanentDelete", "Xóa vĩnh viễn")}</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {onShareProject && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
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
                              onClick={(e) => {
                                e.stopPropagation();
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                onDeleteProject(project);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-danger)] transition hover:bg-red-500/10"
                            >
                              <Trash2 size={13} />
                              <span>{t("workspace:trash.moveToTrashBtn", "Chuyển vào thùng rác")}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Project Name & Description */}
            <div className="mt-4">
              <h3 className="truncate text-base font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-180">
                {project.name}
              </h3>
              <p className="mt-1 line-clamp-2 min-h-[32px] text-xs text-[var(--color-text-muted)]">
                {project.description || project.recent_project || "—"}
              </p>
            </div>

            {/* Tags Chips */}
            {project.tags && project.tags.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {project.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: tag.color || "var(--color-primary)",
                      }}
                    />
                    <span>{tag.name}</span>
                  </span>
                ))}
                {project.tags.length > 3 && (
                  <span className="inline-flex items-center rounded-md bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
                    +{project.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Trash Mode Quick Action Buttons */}
            {isTrashMode && (
              <div className="mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {onRestoreProject && (
                  <button
                    type="button"
                    onClick={() => onRestoreProject(project)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] py-1.5 text-xs font-bold text-[var(--color-primary)] shadow-2xs hover:bg-[var(--color-primary)] hover:text-white transition"
                  >
                    <RotateCcw size={13} />
                    <span>{t("workspace:trash.restore", "Khôi phục")}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteProject(project)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-500/10 py-1.5 px-3 text-xs font-semibold text-red-600 hover:bg-red-500 hover:text-white transition"
                  title={t("workspace:trash.permanentDelete", "Xóa vĩnh viễn")}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Card Bottom: Recent Activity & Date */}
          <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
            <span className="truncate">
              {isTrashMode && project.deleted_at
                ? t("workspace:trash.deletedAt", { date: formatDate(project.deleted_at) })
                : formatDate(project.updated_at)}
            </span>

            {project.recent_project && !isTrashMode && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                <PlaySquare size={13} className="text-[var(--color-primary)]" />
                <span className="max-w-[100px] truncate">{project.recent_project}</span>
              </span>
            )}
          </div>
        </ElasticCard>

      ))}
    </div>
  );
}
