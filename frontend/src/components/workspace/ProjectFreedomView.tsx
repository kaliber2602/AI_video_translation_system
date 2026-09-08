import { useState } from "react";
import {
  Edit,
  Layers,
  MoreVertical,
  PlaySquare,
  RotateCcw,
  Share2,
  Sparkles,
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

interface ProjectFreedomViewProps {
  projects: Project[];
  onProjectClick: (projectId: number) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onToggleFavorite?: (project: Project) => void;
  onShareProject?: (project: Project) => void;
  onRestoreProject?: (project: Project) => void;
  isTrashMode?: boolean;
}

export default function ProjectFreedomView({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onToggleFavorite,
  onShareProject,
  onRestoreProject,
  isTrashMode = false,
}: ProjectFreedomViewProps) {

  const { t, i18n } = useTranslation(["workspace", "common"]);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [activeFilterCluster, setActiveFilterCluster] = useState<string>("all");

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

  // Collect all unique tags for cluster grouping
  const allTags = Array.from(
    new Set(
      projects.flatMap((p) => p.tags?.map((t) => t.name) || []).filter(Boolean)
    )
  );

  const filteredProjects =
    activeFilterCluster === "all"
      ? projects
      : projects.filter((p) =>
          p.tags?.some((t) => t.name === activeFilterCluster)
        );

  return (
    <div className="space-y-6">
      {/* Freedom Header & Tag Clusters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-3 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)]">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Sparkles size={14} />
          </div>
          <span>{t("workspace:freedom.badge")}</span>
        </div>

        {/* Tag Clusters Pill bar */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFilterCluster("all")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-out ${
                activeFilterCluster === "all"
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
              }`}
            >
              <Layers size={12} />
              <span>{t("workspace:freedom.allUnsorted")}</span>
              <span className="ml-1 opacity-80">({projects.length})</span>
            </button>

            {allTags.map((tagName) => {
              const count = projects.filter((p) =>
                p.tags?.some((t) => t.name === tagName)
              ).length;
              const isSelected = activeFilterCluster === tagName;

              return (
                <button
                  key={tagName}
                  type="button"
                  onClick={() => setActiveFilterCluster(tagName)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-out ${
                    isSelected
                      ? "bg-[var(--color-primary)] text-white shadow-sm"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <TagIcon size={12} />
                  <span>{tagName}</span>
                  <span className="ml-1 opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bento / Fluid Canvas Card Layout */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project, index) => {
          const isFeatured = index % 5 === 0 && filteredProjects.length > 2;

          return (
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
              className={`group flex flex-col justify-between rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-left shadow-[var(--shadow-card)] transition-all duration-220 ease-out hover:border-[var(--color-primary)]/60 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] animate-fade-up ${
                isTrashMode ? "opacity-90" : ""
              } ${getStaggerClass(index)} ${
                isFeatured
                  ? "md:col-span-2 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-primary-soft)]/20"
                  : ""
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FolderIcon size="lg" />

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-180">
                          {project.name}
                        </h3>
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
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <span>
                          {isTrashMode && project.deleted_at
                            ? t("workspace:trash.deletedAt", { date: formatDate(project.deleted_at) })
                            : formatDate(project.updated_at)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold text-[var(--color-text-secondary)]">
                          <Video size={12} className="text-[var(--color-primary)]" />
                          {project.video_count || 0} videos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Star */}
                  <div className="flex items-center gap-1">
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
                        <Star size={16} className={project.is_favorite ? "fill-amber-500" : ""} />
                      </button>
                    )}

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


                {/* Description */}
                {project.description && (
                  <p className="mt-4 text-xs leading-5 text-[var(--color-text-secondary)] line-clamp-3">
                    {project.description}
                  </p>
                )}

                {/* Recent Video Banner */}
                {project.recent_project && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-2.5">
                    <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#18202A] to-[#526474] text-white">
                      <PlaySquare size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
                        {project.recent_project}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {project.duration || "Ready"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {project.tags && project.tags.length > 0 ? (
                    project.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] shadow-2xs"
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

                {project.size && (
                  <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                    {project.size}
                  </span>
                )}
              </div>
            </ElasticCard>
          );
        })}
      </div>
    </div>
  );
}
