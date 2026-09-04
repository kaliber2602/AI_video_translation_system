import { useState } from "react";
import {
  Clock,
  Edit,
  ExternalLink,
  HardDrive,
  MoreVertical,
  PlaySquare,
  RotateCcw,
  Share2,
  Star,
  Tag as TagIcon,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import FolderIcon from "../common/FolderIcon";
import ElasticCard from "../common/ElasticCard";
import type { Project } from "../../types/project";

interface ProjectCardViewProps {
  projects: Project[];
  onProjectClick: (projectId: number) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onToggleFavorite?: (project: Project) => void;
  onShareProject?: (project: Project) => void;
  onRestoreProject?: (project: Project) => void;
  isTrashMode?: boolean;
}

export default function ProjectCardView({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onToggleFavorite,
  onShareProject,
  onRestoreProject,
  isTrashMode = false,
}: ProjectCardViewProps) {

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
    <div className="grid gap-4">
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
          className={`group flex flex-col justify-between gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[var(--shadow-card)] transition-all duration-220 ease-out hover:border-[var(--color-primary)]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] lg:flex-row lg:items-center animate-fade-up ${
            isTrashMode ? "opacity-90 hover:border-red-400/40" : ""
          } ${getStaggerClass(index)}`}
        >
          {/* Left section: Icon + Project Details + Tags */}
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <FolderIcon size="xl" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="truncate text-base font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-180">
                  {project.name}
                </h3>

                {project.is_shared && (
                  <span
                    title={t("workspace:share.sharedBy", { name: project.owner_name || "đồng nghiệp" })}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400"
                  >
                    <Users size={11} />
                    <span>{project.owner_name ? t("workspace:share.sharedBy", { name: project.owner_name }) : t("workspace:share.sharedWithMe")}</span>
                  </span>
                )}

                {project.status && (
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary)] uppercase tracking-wider">
                    {project.status}
                  </span>
                )}
              </div>

              {project.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                  {project.description}
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--color-text-muted)] italic">
                  —
                </p>
              )}

              {/* Metadata Badges */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-secondary)]">
                  <Video size={13} className="text-[var(--color-primary)]" />
                  <span>{project.video_count || 0} videos</span>
                </span>

                {project.recent_project && !isTrashMode && (
                  <span className="inline-flex items-center gap-1.5">
                    <PlaySquare size={13} className="text-[var(--color-primary)]" />
                    <span className="truncate max-w-[140px]">{project.recent_project}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>
                    {isTrashMode && project.deleted_at
                      ? t("workspace:trash.deletedAt", { date: formatDate(project.deleted_at) })
                      : formatDate(project.updated_at)}
                  </span>
                </span>

                {project.size && (
                  <span className="inline-flex items-center gap-1.5">
                    <HardDrive size={13} />
                    <span>{project.size}</span>
                  </span>
                )}
              </div>

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <TagIcon size={12} className="text-[var(--color-text-muted)]" />
                  {project.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]"
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
                </div>
              )}
            </div>
          </div>

          {/* Right section: Action Buttons */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3 lg:border-t-0 lg:pt-0">
            {isTrashMode ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {onRestoreProject && (
                  <button
                    type="button"
                    onClick={() => onRestoreProject(project)}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3.5 py-2 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition"
                  >
                    <RotateCcw size={13} />
                    <span>{t("workspace:trash.restore", "Khôi phục")}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteProject(project)}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-500 hover:text-white transition"
                >
                  <Trash2 size={13} />
                  <span>{t("workspace:trash.permanentDelete", "Xóa vĩnh viễn")}</span>
                </button>
              </div>
            ) : (
              <>
                {/* Favorite Star */}
                {onToggleFavorite && (
                  <button
                    type="button"
                    title={project.is_favorite ? t("workspace:favorite.removeFromFavorites") : t("workspace:favorite.addToFavorites")}
                    aria-label={project.is_favorite ? t("workspace:favorite.removeFromFavorites") : t("workspace:favorite.addToFavorites")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(project);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] transition ${
                      project.is_favorite
                        ? "text-amber-500 fill-amber-500 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                        : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-amber-500"
                    }`}
                  >
                    <Star size={16} className={project.is_favorite ? "fill-amber-500" : ""} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectClick(project.id);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Open</span>
                </button>

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
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
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
                      <div className="absolute right-0 top-10 z-40 w-40 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)] animate-dropdown-reveal">
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
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </ElasticCard>

      ))}
    </div>
  );
}
