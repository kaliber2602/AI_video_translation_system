// src/pages/ProjectDetail.tsx
import { useEffect, useState } from "react";
import { ArrowLeft, MoreHorizontal, Plus, Search, Upload, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "../components/project/VideoCard";
import FolderIcon from "../components/common/FolderIcon";
import { getProject } from "../services/project.service";
import { videoService } from "../services/video.service";
import type { Project } from "../types/project";

// Video type definition
interface Video {
  id: number;
  title: string;
  filename: string;
  duration: string | null;
  size: string | null;
  updated: string;
  status: "completed" | "processing" | "failed" | "uploaded" | "editing";
  thumbnail?: string;
  progress?: number;
}

export default function ProjectDetail() {
  const { t, i18n } = useTranslation(["project", "navigation", "common", "workspace"]);
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!projectId) return;

    const loadProjectData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load project details
        const projectData = await getProject(projectId);
        setProject(projectData);
        
        // Load videos for this project
        await loadVideos(parseInt(projectId));
        
      } catch (err: any) {
        console.error("[ProjectDetail] Failed to load project:", err);
        setError(t("workspace:loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectData();
  }, [projectId, t]);

  const loadVideos = async (projectIdNum: number) => {
    setIsLoadingVideos(true);
    try {
      // Fetch videos from the backend
      const videoList = await videoService.listVideos({
        project_id: projectIdNum,
        limit: 100,
      });
      
      // Transform backend data to match Video type
      const formattedVideos: Video[] = videoList.map((v: any) => ({
        id: v.id,
        title: v.title || v.original_filename || "Untitled",
        filename: v.original_filename || v.title || "video.mp4",
        duration: v.duration ? formatDuration(v.duration) : null,
        size: v.file_size ? formatFileSize(v.file_size) : null,
        updated: v.updated_at || v.created_at,
        status: mapStatus(v.status),
        thumbnail: v.thumbnail_url,
        progress: v.progress || 0,
      }));
      
      setVideos(formattedVideos);
    } catch (error) {
      console.error("[ProjectDetail] Failed to load videos:", error);
      // If API fails, use empty array or fallback
      setVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const mapStatus = (status: string): Video["status"] => {
    const statusMap: Record<string, Video["status"]> = {
      'completed': 'completed',
      'processing': 'processing',
      'failed': 'failed',
      'uploaded': 'uploaded',
      'editing': 'editing',
      'COMPLETED': 'completed',
      'PROCESSING': 'processing',
      'FAILED': 'failed',
      'UPLOADED': 'uploaded',
      'EDITING': 'editing',
    };
    return statusMap[status] || 'uploaded';
  };

  const handleBackToProjects = () => {
    navigate("/workspace");
  };

  const handleOpenVideo = (videoId: number) => {
    navigate(`/workspace/project/${projectId}/video/${videoId}`);
  };

  const handleUploadVideo = () => {
    navigate(`/workspace/project/${projectId}/video/new`, {
      state: {
        projectId: parseInt(projectId!),
        projectName: project?.name,
        returnPath: `/workspace/project/${projectId}`,
        isNewVideo: true,
      },
    });
  };

  const handleRefresh = async () => {
    if (projectId) {
      await loadVideos(parseInt(projectId));
    }
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

  // Filter videos based on search query
  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] text-[var(--color-text-primary)]">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
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
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Back to Workspace */}
        <button
          type="button"
          onClick={handleBackToProjects}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]"
        >
          <ArrowLeft size={17} />
          {t("navigation:backToProjects")}
        </button>

        {/* Project Header */}
        <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <FolderIcon size="lg" />

              <div>
                <h1 className="text-[28px] font-bold tracking-[-0.6px] text-[var(--color-text-primary)]">
                  {project.name}
                </h1>

                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {videos.length} {t("workspace:videosCount", { count: videos.length })} ·{" "}
                  {t("workspace:columns.updated")} {formatDate(project.updated_at)}
                </p>
              </div>
            </div>

            {project.description && (
              <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                {project.description}
              </p>
            )}

            {project.tags && project.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.5 2.5L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.5-2.5L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>
              Refresh
            </button>

            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <MoreHorizontal size={18} />
              {t("common:more")}
            </button>

            <button
              type="button"
              onClick={handleUploadVideo}
              className="flex h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
            >
              <Upload size={18} />
              {t("project:uploadVideo")}
            </button>
          </div>
        </section>

        {/* Search and Filter Bar */}
        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)] sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />

            <input
              type="text"
              placeholder={t("project:searchVideosPlaceholder") || "Search videos..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            />
          </div>

          <div className="flex gap-2">
            <select
              className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
              defaultValue="all"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="uploaded">Uploaded</option>
              <option value="failed">Failed</option>
            </select>

            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-5 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              <Plus size={17} />
              {t("project:newFolder") || "New Folder"}
            </button>
          </div>
        </section>

        {/* Video List */}
        <section>
          {isLoadingVideos ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
              <span className="ml-3 text-[var(--color-text-muted)]">Loading videos...</span>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] py-16">
              <div className="rounded-full bg-[var(--color-primary-soft)] p-4">
                <Upload size={32} className="text-[var(--color-primary)]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">
                No videos yet
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Upload your first video to get started with the translation pipeline
              </p>
              <button
                type="button"
                onClick={handleUploadVideo}
                className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
              >
                <Upload size={18} />
                Upload Video
              </button>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onOpen={() => handleOpenVideo(video.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}