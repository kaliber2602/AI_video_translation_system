// src/pages/ProjectDetail.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Upload,
  Loader2,
  Folder as FolderIconLucide,
  ChevronRight,
  Pencil,
  Trash2,
  FileText,
  Sparkles,
  RefreshCw,
  Clock,
  BookOpen,
  Layers,
  HardDrive,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard, { type Video } from "../components/project/VideoCard";
import ThumbnailModal from "../components/project/ThumbnailModal";
import ProjectAssetExplorer from "../components/project/ProjectAssetExplorer";
import FolderIcon from "../components/common/FolderIcon";
import Dialog from "../components/common/Dialog";
import ConfirmationDialog from "../components/common/ConfirmationDialog";
import Button from "../components/common/Button";
import { toast } from "../lib/toast";
import {
  getProject,
  getProjectFolders,
  createProjectFolder,
  updateProjectFolder,
  deleteProjectFolder,
} from "../services/project.service";
import { videoService } from "../services/video.service";
import type { Project, ProjectFolder } from "../types/project";
import type { VideoDocument, VideoChapter } from "../types/video";

export default function ProjectDetail() {
  const { t, i18n } = useTranslation(["project", "navigation", "common", "workspace"]);
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"progress" | "assets">("progress");

  const isViewOnly = project?.my_role === "viewer" || project?.my_role === "commenter";

  // Folder Modals State
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isFolderSubmitting, setIsFolderSubmitting] = useState(false);

  const [editingFolder, setEditingFolder] = useState<ProjectFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  const [folderToDelete, setFolderToDelete] = useState<ProjectFolder | null>(null);
  const [isFolderDeleting, setIsFolderDeleting] = useState(false);

  // Video Actions Modals State
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const [isVideoRenaming, setIsVideoRenaming] = useState(false);

  const [movingVideo, setMovingVideo] = useState<Video | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<number>(0);
  const [isVideoMoving, setIsVideoMoving] = useState(false);

  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [isVideoDeleting, setIsVideoDeleting] = useState(false);

  // Thumbnail Manager Modal State
  const [managingThumbnailVideo, setManagingThumbnailVideo] = useState<Video | null>(null);

  const handleThumbnailUpdated = (videoId: number, newThumbnailUrl: string) => {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId ? { ...v, thumbnail: newThumbnailUrl } : v
      )
    );
    setManagingThumbnailVideo((prev) =>
      prev && prev.id === videoId
        ? { ...prev, thumbnail: newThumbnailUrl }
        : prev
    );
  };

  // Documents & Chapters Viewer Modal State
  const [viewingDocsVideo, setViewingDocsVideo] = useState<Video | null>(null);
  const [videoDocs, setVideoDocs] = useState<VideoDocument[]>([]);
  const [videoChapters, setVideoChapters] = useState<VideoChapter[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<"chapters" | "documents">("chapters");
  const [selectedDoc, setSelectedDoc] = useState<VideoDocument | null>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  const pollingTimerRef = useRef<any>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  const mapStatus = (status: string): Video["status"] => {
    const statusMap: Record<string, Video["status"]> = {
      completed: "completed",
      processing: "processing",
      failed: "failed",
      uploaded: "uploaded",
      editing: "editing",
      draft: "draft",
      COMPLETED: "completed",
      PROCESSING: "processing",
      FAILED: "failed",
      UPLOADED: "uploaded",
      EDITING: "editing",
      DRAFT: "draft",
    };
    return statusMap[status] || "uploaded";
  };

  const loadFolders = useCallback(async (projectIdNum: number) => {
    try {
      const folderList = await getProjectFolders(projectIdNum);
      setFolders(folderList || []);
    } catch (err) {
      console.error("[ProjectDetail] Failed to load folders:", err);
      setFolders([]);
    }
  }, []);

  const loadVideos = useCallback(async (projectIdNum: number, silent = false, folderIdFilter: number | null = activeFolderId) => {
    if (!silent) setIsLoadingVideos(true);
    try {
      const videoList = await videoService.listVideos({
        project_id: projectIdNum,
        folder_id: folderIdFilter !== null ? folderIdFilter : undefined,
        root_only: folderIdFilter === null,
        limit: 100,
      });

      const formattedVideos: Video[] = videoList.map((v: any) => ({
        id: v.id,
        title: v.title || v.original_filename || "Untitled",
        filename: v.original_filename || v.title || "video.mp4",
        duration: v.duration ? formatDuration(v.duration) : "--:--",
        size: v.file_size ? formatFileSize(v.file_size) : "--",
        updated: v.updated_at || v.created_at,
        status: mapStatus(v.status),
        thumbnail: v.thumbnail_url,
        progress: v.progress || 0,
        folder_id: v.folder_id ?? null,
      }));

      setVideos(formattedVideos);
    } catch (error) {
      console.error("[ProjectDetail] Failed to load videos:", error);
      if (!silent) setVideos([]);
    } finally {
      if (!silent) setIsLoadingVideos(false);
    }
  }, [activeFolderId]);

  // Reload videos when switching active folder
  useEffect(() => {
    if (projectId) {
      loadVideos(parseInt(projectId), true, activeFolderId);
    }
  }, [activeFolderId, projectId, loadVideos]);

  // Initial load
  useEffect(() => {
    if (!projectId) return;
    const pId = parseInt(projectId);

    const loadProjectData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const projectData = await getProject(pId);
        setProject(projectData);

        await Promise.all([loadFolders(pId), loadVideos(pId)]);
      } catch (err: any) {
        console.error("[ProjectDetail] Failed to load project data:", err);
        setError(t("workspace:loadError") || "Failed to load project details");
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectData();
  }, [projectId, loadFolders, loadVideos, t]);

  // Polling for processing videos
  useEffect(() => {
    if (!projectId) return;
    const pId = parseInt(projectId);

    const hasActiveJobs = videos.some(
      (v) => v.status === "processing" || v.status === "uploaded"
    );

    if (hasActiveJobs) {
      pollingTimerRef.current = setInterval(() => {
        loadVideos(pId, true);
      }, 4000);
    } else if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [videos, projectId, loadVideos]);

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
        folderId: activeFolderId,
        returnPath: `/workspace/project/${projectId}`,
        isNewVideo: true,
      },
    });
  };

  const handleRefresh = async () => {
    if (projectId) {
      const pId = parseInt(projectId);
      await Promise.all([loadFolders(pId), loadVideos(pId)]);
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

  // -------------------------------------------------------------
  // Folder Operations
  // -------------------------------------------------------------
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newFolderName.trim()) return;

    try {
      setIsFolderSubmitting(true);
      await createProjectFolder(parseInt(projectId), {
        name: newFolderName.trim(),
        parent_id: activeFolderId,
      });
      setNewFolderName("");
      setIsCreateFolderOpen(false);
      await loadFolders(parseInt(projectId));
    } catch (err: any) {
      console.error("[ProjectDetail] Create folder failed:", err);
      toast.error(err?.response?.data?.detail || t("project:errors.createFolderFailed", "Không thể tạo thư mục"));
    } finally {
      setIsFolderSubmitting(false);
    }
  };

  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !editingFolder || !editFolderName.trim()) return;

    try {
      setIsFolderSubmitting(true);
      await updateProjectFolder(parseInt(projectId), editingFolder.id, {
        name: editFolderName.trim(),
      });
      setEditingFolder(null);
      setEditFolderName("");
      await loadFolders(parseInt(projectId));
      toast.success(t("common:success", "Thành công"), t("project:folderUpdated", "Đã cập nhật thư mục"));
    } catch (err: any) {
      console.error("[ProjectDetail] Update folder failed:", err);
      toast.error(err?.response?.data?.detail || t("project:errors.updateFolderFailed", "Không thể cập nhật thư mục"));
    } finally {
      setIsFolderSubmitting(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!projectId || !folderToDelete) return;

    try {
      setIsFolderDeleting(true);
      await deleteProjectFolder(parseInt(projectId), folderToDelete.id);
      if (activeFolderId === folderToDelete.id) {
        setActiveFolderId(null);
      }
      setFolderToDelete(null);
      await Promise.all([loadFolders(parseInt(projectId)), loadVideos(parseInt(projectId))]);
      toast.success(t("common:success", "Thành công"), t("project:folderDeleted", "Đã xóa thư mục"));
    } catch (err: any) {
      console.error("[ProjectDetail] Delete folder failed:", err);
      toast.error(err?.response?.data?.detail || t("project:errors.deleteFolderFailed", "Không thể xóa thư mục"));
    } finally {
      setIsFolderDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // Video Operations (Rename, Move, Download, Delete, Documents)
  // -------------------------------------------------------------
  const handleRenameVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo || !editVideoTitle.trim()) return;

    try {
      setIsVideoRenaming(true);
      await videoService.updateVideo(editingVideo.id, {
        title: editVideoTitle.trim(),
      });
      setEditingVideo(null);
      setEditVideoTitle("");
      if (projectId) await loadVideos(parseInt(projectId), true);
      toast.success(t("common:success", "Thành công"), t("project:videoRenamed", "Đã đổi tên video thành công"));
    } catch (err: any) {
      console.error("[ProjectDetail] Rename video failed:", err);
      toast.error(err?.response?.data?.detail || t("project:errors.renameVideoFailed", "Không thể đổi tên video"));
    } finally {
      setIsVideoRenaming(false);
    }
  };

  const handleMoveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingVideo) return;

    try {
      setIsVideoMoving(true);
      await videoService.updateVideo(movingVideo.id, {
        folder_id: targetFolderId === 0 ? null : targetFolderId,
      });
      setMovingVideo(null);
      if (projectId) await loadVideos(parseInt(projectId), true);
      toast.success(t("common:success", "Thành công"), t("project:videoMoved", "Đã di chuyển video"));
    } catch (err: any) {
      console.error("[ProjectDetail] Move video failed:", err);
      toast.error(err?.response?.data?.detail || t("project:errors.moveVideoFailed", "Không thể di chuyển video"));
    } finally {
      setIsVideoMoving(false);
    }
  };

  const handleDownloadVideo = async (video: Video) => {
    try {
      const blob = await videoService.downloadVideo(video.id, "output");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = video.filename || `video_${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("[ProjectDetail] Download failed:", err);
      toast.error(err?.response?.data?.detail || t("project:errors.downloadFailed", "Không thể tải video file"));
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete || !projectId) return;

    try {
      setIsVideoDeleting(true);
      await videoService.deleteVideo(videoToDelete.id);
      setVideoToDelete(null);
      await loadVideos(parseInt(projectId), true);
      toast.success(t("common:success", "Thành công"), t("project:videoDeleted", "Đã xóa video"));
    } catch (err: any) {
      console.error("[ProjectDetail] Delete video failed:", err);
      toast.error(err?.response?.data?.detail || t("project:errors.deleteVideoFailed", "Không thể xóa video"));
    } finally {
      setIsVideoDeleting(false);
    }
  };

  const handleViewDocuments = async (video: Video) => {
    setViewingDocsVideo(video);
    setIsLoadingDocs(true);
    setActiveDocTab("chapters");
    setSelectedDoc(null);

    try {
      const [docs, chapters] = await Promise.all([
        videoService.getVideoDocuments(video.id).catch(() => []),
        videoService.getVideoChapters(video.id).catch(() => []),
      ]);
      setVideoDocs(docs || []);
      setVideoChapters(chapters || []);
      if (docs && docs.length > 0) {
        setSelectedDoc(docs[0]);
      }
    } catch (err) {
      console.error("[ProjectDetail] Load docs/chapters failed:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleGenerateDocument = async (docType: "markdown" | "summary" | "timeline") => {
    if (!viewingDocsVideo) return;
    try {
      setIsGeneratingDoc(true);
      const newDoc = await videoService.generateVideoDocument(viewingDocsVideo.id, docType);
      const refreshedDocs = await videoService.getVideoDocuments(viewingDocsVideo.id);
      setVideoDocs(refreshedDocs);
      setSelectedDoc(newDoc);
      toast.success(t("common:success", "Thành công"), t("project:docGenerated", "Đã tạo tài liệu tóm tắt"));
    } catch (err: any) {
      console.error("[ProjectDetail] Generate doc failed:", err);
      toast.error(err?.response?.data?.detail || t("project:errors.docGenerateFailed", "Không thể tạo tài liệu"));
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // -------------------------------------------------------------
  // Filtered Content
  // -------------------------------------------------------------
  // Visible subfolders in active view
  const currentLevelFolders = folders.filter((f) =>
    activeFolderId === null ? !f.parent_id : f.parent_id === activeFolderId
  );

  // Active folder object if navigated inside one
  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;

  // Filter videos based on folder, status, and search query
  const filteredVideos = videos.filter((video) => {
    // Folder filter: if in folder, must match; if root, must have null/undefined folder_id
    if (activeFolderId === null) {
      if (video.folder_id) return false;
    } else {
      if (video.folder_id !== activeFolderId) return false;
    }

    // Status filter
    if (statusFilter !== "all" && video.status !== statusFilter) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        video.title.toLowerCase().includes(q) ||
        video.filename.toLowerCase().includes(q)
      );
    }

    return true;
  });

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
          {t("navigation:backToProjects") || "Back to Workspace"}
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
                  {folders.length} folders ·{" "}
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
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            {!isViewOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(true)}
                  className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer"
                >
                  <Plus size={17} />
                  {t("project:newFolder") || "New Folder"}
                </button>

                <button
                  type="button"
                  onClick={handleUploadVideo}
                  className="flex h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
                >
                  <Upload size={18} />
                  {t("project:uploadVideo") || "Upload Video"}
                </button>
              </>
            )}
          </div>
        </section>

        {/* Navigation & Mode Switcher Bar */}
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] pb-4">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <button
              type="button"
              onClick={() => setActiveFolderId(null)}
              className={`font-semibold transition hover:text-[var(--color-primary)] ${
                activeFolderId === null
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              Project Root
            </button>
            {activeFolder && (
              <>
                <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {activeFolder.name}
                </span>
              </>
            )}
          </div>

          {/* Dual-Mode View Switcher */}
          <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1 self-start sm:self-auto shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("progress")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "progress"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Layers size={14} />
              <span>Pipeline Progress</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("assets")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "assets"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <HardDrive size={14} />
              <span>Project Files & Storage</span>
            </button>
          </div>
        </section>

        {viewMode === "assets" ? (
          <ProjectAssetExplorer
            projectId={parseInt(projectId!)}
            projectName={project.name}
            folders={folders}
            activeFolderId={activeFolderId}
            onSelectFolder={(fId) => setActiveFolderId(fId)}
          />
        ) : (
          <>


        {/* Search and Filter Bar */}
        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)] sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />

            <input
              type="text"
              placeholder={t("project:searchVideosPlaceholder") || "Search videos in current folder..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="all">Tất cả trạng thái (All)</option>
              <option value="completed">Completed (Đã xong)</option>
              <option value="processing">Processing (Đang xử lý)</option>
              <option value="editing">Editing (Đang biên tập)</option>
              <option value="draft">Draft (Bản nháp)</option>
              <option value="uploaded">Uploaded (Đã tải lên)</option>
              <option value="failed">Failed (Thất bại)</option>
            </select>
          </div>
        </section>

        {/* Folders List (if any at current level) */}
        {currentLevelFolders.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Folders ({currentLevelFolders.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {currentLevelFolders.map((folder) => {
                const folderVideosCount = videos.filter((v) => v.folder_id === folder.id).length;
                return (
                  <div
                    key={folder.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Mở thư mục ${folder.name}`}
                    onClick={() => setActiveFolderId(folder.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveFolderId(folder.id);
                      }
                    }}
                    className="group relative flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-primary)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FolderIconLucide className="text-[var(--color-primary)] shrink-0" size={24} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                          {folder.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {folderVideosCount} {folderVideosCount === 1 ? "video" : "videos"}
                        </p>
                      </div>
                    </div>

                    {!isViewOnly && (
                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFolder(folder);
                            setEditFolderName(folder.name);
                          }}
                          title="Rename Folder"
                          aria-label="Rename Folder"
                          className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFolderToDelete(folder)}
                          title="Delete Folder"
                          aria-label="Delete Folder"
                          className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Video List */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Videos ({filteredVideos.length})
            </h2>
          </div>

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
                {searchQuery || statusFilter !== "all"
                  ? "No matching videos found"
                  : "No videos in this location yet"}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Upload your video to start AI translation, subtitles, and chapter summaries
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
                  onOpenEditor={() => navigate(`/workspace/project/${projectId}/video/${video.id}/editor`)}
                  onRename={(v) => {
                    setEditingVideo(v);
                    setEditVideoTitle(v.title);
                  }}
                  onMove={(v) => {
                    setMovingVideo(v);
                    setTargetFolderId(v.folder_id || 0);
                  }}
                  onDownload={(v) => handleDownloadVideo(v)}
                  onDelete={(v) => setVideoToDelete(v)}
                  onViewDocuments={(v) => handleViewDocuments(v)}
                  onManageThumbnail={(v) => setManagingThumbnailVideo(v)}
                />
              ))}
            </div>
          )}
        </section>
        </>
        )}


        {/* -------------------------------------------------------- */}
        {/* Create Folder Modal */}
        {/* -------------------------------------------------------- */}
        <Dialog
          isOpen={isCreateFolderOpen}
          onClose={() => setIsCreateFolderOpen(false)}
          title="Create New Folder"
          description="Organize your project videos with structured folders."
          maxWidth="sm"
        >
          <form onSubmit={handleCreateFolder} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Folder Name
              </label>
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Marketing Videos"
                className="mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreateFolderOpen(false)}
                disabled={isFolderSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isFolderSubmitting}>
                Create Folder
              </Button>
            </div>
          </form>
        </Dialog>

        {/* -------------------------------------------------------- */}
        {/* Rename Folder Modal */}
        {/* -------------------------------------------------------- */}
        <Dialog
          isOpen={!!editingFolder}
          onClose={() => setEditingFolder(null)}
          title="Rename Folder"
          maxWidth="sm"
        >
          <form onSubmit={handleUpdateFolder} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                New Folder Name
              </label>
              <input
                type="text"
                autoFocus
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingFolder(null)}
                disabled={isFolderSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isFolderSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Dialog>

        {/* -------------------------------------------------------- */}
        {/* Delete Folder Confirmation */}
        {/* -------------------------------------------------------- */}
        <ConfirmationDialog
          isOpen={!!folderToDelete}
          onClose={() => setFolderToDelete(null)}
          onConfirm={handleDeleteFolder}
          title="Delete Folder"
          message={`Are you sure you want to delete folder "${folderToDelete?.name}"? Any videos currently in this folder will be safely kept and returned to the project root.`}
          confirmLabel="Delete Folder"
          isDestructive
          isLoading={isFolderDeleting}
        />

        {/* -------------------------------------------------------- */}
        {/* Rename Video Modal */}
        {/* -------------------------------------------------------- */}
        <Dialog
          isOpen={!!editingVideo}
          onClose={() => setEditingVideo(null)}
          title="Rename Video"
          maxWidth="sm"
        >
          <form onSubmit={handleRenameVideo} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Video Title
              </label>
              <input
                type="text"
                autoFocus
                value={editVideoTitle}
                onChange={(e) => setEditVideoTitle(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingVideo(null)}
                disabled={isVideoRenaming}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isVideoRenaming}>
                Save Title
              </Button>
            </div>
          </form>
        </Dialog>

        {/* -------------------------------------------------------- */}
        {/* Move Video to Folder Modal */}
        {/* -------------------------------------------------------- */}
        <Dialog
          isOpen={!!movingVideo}
          onClose={() => setMovingVideo(null)}
          title="Move Video to Folder"
          description={`Select the destination folder for "${movingVideo?.title}".`}
          maxWidth="sm"
        >
          <form onSubmit={handleMoveVideo} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Destination
              </label>
              <select
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(Number(e.target.value))}
                className="mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
              >
                <option value={0}>Project Root (No folder)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMovingVideo(null)}
                disabled={isVideoMoving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isVideoMoving}>
                Move Video
              </Button>
            </div>
          </form>
        </Dialog>

        {/* -------------------------------------------------------- */}
        {/* Delete Video Confirmation */}
        {/* -------------------------------------------------------- */}
        <ConfirmationDialog
          isOpen={!!videoToDelete}
          onClose={() => setVideoToDelete(null)}
          onConfirm={handleDeleteVideo}
          title="Delete Video"
          message={`Are you sure you want to delete "${videoToDelete?.title}"? All processed media, audio tracks, and translated subtitles will be deleted.`}
          confirmLabel="Delete Video"
          isDestructive
          isLoading={isVideoDeleting}
        />

        {/* -------------------------------------------------------- */}
        {/* Documents & Chapters Viewer Modal */}
        {/* -------------------------------------------------------- */}
        <Dialog
          isOpen={!!viewingDocsVideo}
          onClose={() => setViewingDocsVideo(null)}
          title={
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-[var(--color-primary)]" />
              <span>Video Intelligence & Documents: {viewingDocsVideo?.title}</span>
            </div>
          }
          maxWidth="xl"
        >
          <div className="mt-4">
            {/* Tabs */}
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
              <button
                type="button"
                onClick={() => setActiveDocTab("chapters")}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeDocTab === "chapters"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Clock size={15} />
                Timeline Chapters ({videoChapters.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveDocTab("documents")}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeDocTab === "documents"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <BookOpen size={15} />
                Documents & Summaries ({videoDocs.length})
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={isGeneratingDoc}
                  onClick={() => handleGenerateDocument("summary")}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                >
                  <Sparkles size={13} />
                  {isGeneratingDoc ? "Generating..." : "Generate AI Summary"}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-4 min-h-[320px] max-h-[500px] overflow-y-auto">
              {isLoadingDocs ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
                  <span className="ml-2 text-xs text-[var(--color-text-muted)]">Loading data...</span>
                </div>
              ) : activeDocTab === "chapters" ? (
                videoChapters.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                    No timeline chapters generated yet for this video.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {videoChapters.map((ch) => (
                      <div
                        key={ch.id}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--color-primary)]">
                            {formatDuration(ch.start_time)} - {formatDuration(ch.end_time)}
                          </span>
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            Chapter #{ch.sequence}
                          </span>
                        </div>
                        <h4 className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                          {ch.title}
                        </h4>
                        {ch.summary && (
                          <p className="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                            {ch.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : videoDocs.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                  No documents found. Click "Generate AI Summary" above to create structured documentation.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Docs List */}
                  <div className="space-y-2 border-r border-[var(--color-border)] pr-3">
                    {videoDocs.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDoc(doc)}
                        className={`w-full text-left rounded-lg p-2.5 text-xs transition ${
                          selectedDoc?.id === doc.id
                            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold"
                            : "hover:bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <p className="truncate font-semibold">{doc.title}</p>
                        <p className="mt-0.5 text-[10px] uppercase opacity-75">{doc.doc_type}</p>
                      </button>
                    ))}
                  </div>

                  {/* Doc Preview */}
                  <div className="md:col-span-2 pl-2">
                    {selectedDoc ? (
                      <div>
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                          {selectedDoc.title}
                        </h3>
                        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto">
                          {selectedDoc.content_markdown || "No markdown content available."}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                        Select a document to preview
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog>

        {/* -------------------------------------------------------- */}
        {/* Video Thumbnail Management Modal */}
        {/* -------------------------------------------------------- */}
        <ThumbnailModal
          isOpen={!!managingThumbnailVideo}
          video={managingThumbnailVideo}
          onClose={() => setManagingThumbnailVideo(null)}
          onThumbnailUpdated={handleThumbnailUpdated}
        />
      </main>
    </div>
  );
}