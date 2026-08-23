import { useState } from "react";
import {
  Clock,
  Edit,
  ExternalLink,
  HardDrive,
  MoreVertical,
  PlaySquare,
  Tag as TagIcon,
  Trash2,
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
}

export default function ProjectCardView({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
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
          onClick={() => onProjectClick(project.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onProjectClick(project.id);
            }
          }}
          elasticity={0.48}
          maxDisplacement={320}
          className={`group flex flex-col justify-between gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[var(--shadow-card)] transition-all duration-220 ease-out hover:border-[var(--color-primary)]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] lg:flex-row lg:items-center animate-fade-up ${getStaggerClass(
            index
          )}`}
        >
          {/* Left section: Icon + Project Details + Tags */}
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <FolderIcon size="xl" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="truncate text-base font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-180">
                  {project.name}
                </h3>

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

                {project.recent_project && (
                  <span className="inline-flex items-center gap-1.5">
                    <PlaySquare size={13} className="text-[var(--color-primary)]" />
                    <span className="truncate max-w-[140px]">{project.recent_project}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>{formatDate(project.updated_at)}</span>
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
                  <div className="absolute right-0 top-10 z-40 w-36 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)] animate-dropdown-reveal">
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
                      <span>{t("common:delete")}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </ElasticCard>
      ))}
    </div>
  );
}
