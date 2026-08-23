import { useState } from "react";
import {
  Edit,
  MoreVertical,
  PlaySquare,
  Trash2,
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
}

export default function ProjectGridView({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
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
          onClick={() => onProjectClick(project.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onProjectClick(project.id);
            }
          }}
          elasticity={0.48}
          maxDisplacement={320}
          className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[var(--shadow-card)] transition-all duration-220 ease-out hover:border-[var(--color-primary)]/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] animate-fade-up ${getStaggerClass(
            index
          )}`}
        >
          {/* Card Top: Icon, Tags, Action Dropdown */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <FolderIcon size="lg" />

              <div className="flex items-center gap-1.5">
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
                      <div className="absolute right-0 top-9 z-40 w-36 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)] animate-dropdown-reveal">
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
          </div>

          {/* Card Bottom: Recent Activity & Date */}
          <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
            <span className="truncate">
              {formatDate(project.updated_at)}
            </span>

            {project.recent_project && (
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
