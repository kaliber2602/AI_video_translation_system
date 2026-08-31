import { useEffect, useState } from "react";
import { ArrowLeft, MoreHorizontal, Plus, Search, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "../components/project/VideoCard";
import FolderIcon from "../components/common/FolderIcon";
import { getProject } from "../services/project.service";
import type { Project } from "../types/project";

const fallbackVideos = [
  {
    id: 1,
    title: "NLP Introduction",
    filename: "nlp-introduction.mp4",
    duration: "12:15",
    size: "820 MB",
    updated: "May 25, 2024",
    status: "completed" as const,
  },
  {
    id: 2,
    title: "What is Natural Language Processing?",
    filename: "what-is-nlp.mp4",
    duration: "18:42",
    size: "1.2 GB",
    updated: "May 23, 2024",
    status: "editing" as const,
  },
];

export default function ProjectDetail() {
  const { t, i18n } = useTranslation(["project", "navigation", "common", "workspace"]);
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getProject(projectId);
        setProject(data);
      } catch (err: any) {
        console.error("[ProjectDetail] Failed to load project:", err);
        setError(t("workspace:loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId, t]);

  const handleBackToProjects = () => {
    navigate("/workspace");
  };

  const handleOpenVideo = (videoId: number) => {
    navigate(`/workspace/project/${projectId}/video/${videoId}`);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] text-[var(--color-text-primary)]">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          <span className="text-sm text-[var(--color-text-muted)]">{t("common:loading")}</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] px-8 py-16 text-[var(--color-text-primary)]">
        <div className="mx-auto max-w-md text-center">
          <h2 className="text-xl font-bold text-[var(--color-danger)]">
            {error || t("workspace:loadError")}
          </h2>
          <button
            type="button"
            onClick={handleBackToProjects}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
          >
            <ArrowLeft size={16} />
            {t("navigation:backToProjects")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200 page-enter">
      <main className="mx-auto w-full max-w-[1600px] px-3.5 py-6 sm:px-6 lg:px-8">
        {/* Back to Workspace */}
        <button
          type="button"
          onClick={handleBackToProjects}
          className="mb-5 flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]"
        >
          <ArrowLeft size={16} />
          {t("navigation:backToProjects")}
        </button>

        {/* Project Header */}
        <section className="mb-6 sm:mb-8 flex flex-col justify-between gap-4 sm:gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 sm:mb-3 flex items-center gap-3">
              <FolderIcon size="lg" />

              <div>
                <h1 className="text-xl sm:text-[28px] font-bold tracking-tight text-[var(--color-text-primary)]">
                  {project.name}
                </h1>

                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
                  {t("workspace:videosCount", { count: project.video_count || 0 })} · {t("workspace:columns.updated")} {formatDate(project.updated_at)}
                </p>
              </div>
            </div>

            {project.description && (
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {project.description}
              </p>
            )}

            {project.tags && project.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color || "var(--color-primary)" }}
                    />
                    <span>{tag.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Project Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              className="flex h-10 sm:h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <MoreHorizontal size={17} />
              {t("common:more")}
            </button>

            <button
              type="button"
              className="flex h-10 sm:h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 sm:px-5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
            >
              <Upload size={17} />
              {t("project:uploadVideo")}
            </button>
          </div>
        </section>

        {/* Search and Folder Toolbar */}
        <section className="mb-6 flex flex-col gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 shadow-[var(--shadow-card)] sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />

            <input
              type="text"
              placeholder={t("project:searchVideosPlaceholder")}
              className="h-10 sm:h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-4 text-xs sm:text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
            />
          </div>

          <button
            type="button"
            className="flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
          >
            <Plus size={16} />
            {t("project:newFolder")}
          </button>
        </section>

        {/* Video List */}
        <section className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-2">
          {fallbackVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onOpen={() => handleOpenVideo(video.id)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}