import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getMe } from "../services/auth.service";
import {
  addProjectTag,
  createProject,
  deleteProject,
  getProjects,
  removeProjectTag,
  updateProject,
} from "../services/project.service";
import { getTags } from "../services/tag.service";
import { toast } from "../lib/toast";

import type { Project, ProjectCreateRequest, ProjectUpdateRequest } from "../types/project";
import type { TagResponse } from "../types/tag";

import WorkspaceTopbar from "../components/workspace/WorkspaceTopbar";
import WorkspaceSidebar from "../components/workspace/WorkspaceSidebar";
import WorkspaceHeader from "../components/workspace/WorkspaceHeader";
import ProjectToolbar, { type SortOption } from "../components/workspace/ProjectToolbar";
import type { ViewMode } from "../components/workspace/ViewSwitcher";
import ProjectGridView from "../components/workspace/ProjectGridView";
import ProjectFreedomView from "../components/workspace/ProjectFreedomView";
import ProjectTable from "../components/workspace/ProjectTable";
import ProjectCardView from "../components/workspace/ProjectCardView";
import ProjectSkeletonLoader from "../components/workspace/ProjectSkeletonLoader";
import ProjectEmptyState from "../components/workspace/ProjectEmptyState";
import ProjectErrorState from "../components/workspace/ProjectErrorState";
import ProjectPagination from "../components/workspace/ProjectPagination";
import ProjectModal from "../components/workspace/ProjectModal";
import DeleteProjectModal from "../components/workspace/DeleteProjectModal";

const VIEW_MODE_STORAGE_KEY = "vidnova_workspace_view_mode";

function getInitialViewMode(): ViewMode {
  const savedMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  if (savedMode === "grid" || savedMode === "freedom" || savedMode === "list" || savedMode === "card") {
    return savedMode as ViewMode;
  }
  return "grid";
}

export default function WorkspaceLayout() {
  const { t } = useTranslation(["workspace", "common"]);
  const location = useLocation();
  const navigate = useNavigate();

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("updated-recent");
  const [viewMode, setViewModeState] = useState<ViewMode>(getInitialViewMode);
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [projectModalMode, setProjectModalMode] = useState<"create" | "edit" | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Change and persist View Mode
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewModeState(newMode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, newMode);
  };

  // Listen for Drag-and-Drop Project to Trash
  useEffect(() => {
    const handleDropToTrash = (e: Event) => {
      const customEvent = e as CustomEvent<{ project: Project }>;
      if (customEvent.detail?.project) {
        setDeletingProject(customEvent.detail.project);
      }
    };

    window.addEventListener("project-dropped-to-trash", handleDropToTrash);
    return () => {
      window.removeEventListener("project-dropped-to-trash", handleDropToTrash);
    };
  }, []);

  // Welcome Toast Check
  useEffect(() => {
    if (!location.state?.showWelcome) return;

    const showWelcomeToast = async () => {
      try {
        const user = await getMe();
        toast.success(
          `Welcome back, ${user.full_name}!`,
          "Glad to see you again."
        );
      } catch (err) {
        console.error("[WorkspaceLayout] Failed to get current user:", err);
      } finally {
        navigate(location.pathname, {
          replace: true,
          state: null,
        });
      }
    };

    showWelcomeToast();
  }, [location, navigate]);

  // Load Tags
  const loadTags = useCallback(async () => {
    try {
      const data = await getTags();
      setTags(data);
    } catch (err) {
      console.error("[WorkspaceLayout] Failed to load tags:", err);
    }
  }, []);

  // Load Projects
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error("[WorkspaceLayout] Failed to load projects:", err);
      setError(t("workspace:loadError"));
      toast.error(t("workspace:loadError"), t("common:tryAgain"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let ignore = false;
    const fetchInitialData = async () => {
      try {
        const [tagsData, projectsData] = await Promise.all([
          getTags().catch(() => []),
          getProjects().catch((err) => {
            throw err;
          }),
        ]);
        if (!ignore) {
          setTags(tagsData);
          setProjects(projectsData);
          setError(null);
        }
      } catch (err) {
        console.error("[WorkspaceLayout] Fetch error:", err);
        if (!ignore) setError(t("workspace:loadError"));
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchInitialData();
    return () => {
      ignore = true;
    };
  }, [t]);

  // Combined Search + Tag Filter + Sort Pipeline
  const processedProjects = useMemo(() => {
    let result = [...projects];

    // 1. Tag filter
    if (selectedTagId !== null) {
      result = result.filter((p) =>
        p.tags?.some((tg) => tg.id === selectedTagId)
      );
    }

    // 2. Search query (matches project name or description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.recent_project?.toLowerCase().includes(query)
      );
    }

    // 3. Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "date-newest":
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        case "date-oldest":
          return (
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
          );
        case "videos-desc":
          return (b.video_count || 0) - (a.video_count || 0);
        case "updated-recent":
        default:
          return (
            new Date(b.updated_at || 0).getTime() -
            new Date(a.updated_at || 0).getTime()
          );
      }
    });

    return result;
  }, [projects, selectedTagId, searchQuery, sortOption]);

  const isFilteringActive = Boolean(searchQuery.trim() || selectedTagId !== null);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTagId(null);
  };

  // Project Modal Actions
  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setProjectModalMode("create");
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setProjectModalMode("edit");
  };

  const handleCloseProjectModal = () => {
    setProjectModalMode(null);
    setEditingProject(null);
  };

  const handleSubmitProjectModal = async (
    data: ProjectCreateRequest | ProjectUpdateRequest,
    selectedTagIds: number[]
  ) => {
    if (projectModalMode === "create") {
      const created = await createProject(data as ProjectCreateRequest);
      toast.success(
        t("workspace:project.createdTitle"),
        t("workspace:project.createdDesc", { name: created.name || data.name })
      );
    } else if (projectModalMode === "edit" && editingProject) {
      const updated = await updateProject(editingProject.id, data as ProjectUpdateRequest);

      // Handle tag diffing for existing project
      const currentTagIds = (editingProject.tags || []).map((tg) => tg.id);
      const tagsToAdd = selectedTagIds.filter((id) => !currentTagIds.includes(id));
      const tagsToRemove = currentTagIds.filter((id) => !selectedTagIds.includes(id));

      for (const tid of tagsToAdd) {
        await addProjectTag(editingProject.id, tid);
      }
      for (const tid of tagsToRemove) {
        await removeProjectTag(editingProject.id, tid);
      }

      toast.success(
        t("workspace:project.updatedTitle"),
        t("workspace:project.updatedDesc", { name: updated.name || editingProject.name })
      );
    }

    await loadProjects();
    await loadTags();
  };

  // Delete Project Actions
  const handleOpenDeleteModal = (project: Project) => {
    setDeletingProject(project);
  };

  const handleCloseDeleteModal = () => {
    setDeletingProject(null);
  };

  const handleConfirmDelete = async (projectId: number) => {
    const deletedName = deletingProject?.name || "";
    await deleteProject(projectId);
    toast.success(
      t("workspace:project.deletedTitle"),
      t("workspace:project.deletedDesc", { name: deletedName })
    );
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  // Navigation to Project Detail
  const handleProjectClick = (projectId: number) => {
    navigate(`/workspace/project/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200 relative">
      {/* Collapsible Topbar */}
      <div
        className={`transition-all duration-350 ease-out overflow-visible relative z-30 ${
          isNavbarCollapsed ? "-mt-[84px] opacity-0 pointer-events-none" : "mt-0 opacity-100"
        }`}
      >
        <WorkspaceTopbar
          isCollapsed={isNavbarCollapsed}
          onToggleCollapse={() => setIsNavbarCollapsed(!isNavbarCollapsed)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
      </div>

      {/* Floating Pull-Down Button when Navbar is Collapsed */}
      {isNavbarCollapsed && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999] animate-fade-down">
          <button
            type="button"
            onClick={() => setIsNavbarCollapsed(false)}
            aria-label={t("workspace:expandNavbar", "Hiện thanh điều hướng")}
            title={t("workspace:expandNavbar", "Hiện thanh điều hướng")}
            className="flex h-7 items-center gap-1.5 rounded-b-xl border-x border-b border-[var(--color-primary)]/40 bg-[var(--color-surface)] px-4 text-xs font-bold text-[var(--color-primary)] shadow-[0_6px_20px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-200 hover:bg-[var(--color-primary)] hover:text-white hover:h-8 group cursor-pointer"
          >
            <ChevronDown size={15} className="transition-transform duration-200 group-hover:translate-y-0.5" />
            <span className="text-[11px] font-bold">Navbar</span>
          </button>
        </div>
      )}

      <div className="flex">
        <WorkspaceSidebar
          selectedTagId={selectedTagId}
          onTagSelect={setSelectedTagId}
          isNavbarCollapsed={isNavbarCollapsed}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1 px-3.5 py-6 sm:px-6 lg:px-8 transition-all duration-300 page-enter">
          <WorkspaceHeader
            totalProjects={projects.length}
            matchingCount={processedProjects.length}
            isFiltered={isFilteringActive}
          />

          <ProjectToolbar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            tags={tags}
            selectedTagId={selectedTagId}
            onTagSelect={setSelectedTagId}
            sortOption={sortOption}
            onSortChange={setSortOption}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onNewProject={handleOpenCreateModal}
          />

          {/* View Content States */}
          {isLoading ? (
            <ProjectSkeletonLoader viewMode={viewMode} />
          ) : error ? (
            <ProjectErrorState onRetry={loadProjects} />
          ) : processedProjects.length === 0 ? (
            <ProjectEmptyState
              isFiltered={isFilteringActive || projects.length > 0}
              onNewProject={handleOpenCreateModal}
              onClearFilters={handleClearFilters}
            />
          ) : (
            <>
              {viewMode === "grid" && (
                <ProjectGridView
                  projects={processedProjects}
                  onProjectClick={handleProjectClick}
                  onEditProject={handleOpenEditModal}
                  onDeleteProject={handleOpenDeleteModal}
                />
              )}

              {viewMode === "freedom" && (
                <ProjectFreedomView
                  projects={processedProjects}
                  onProjectClick={handleProjectClick}
                  onEditProject={handleOpenEditModal}
                  onDeleteProject={handleOpenDeleteModal}
                />
              )}

              {viewMode === "list" && (
                <ProjectTable
                  projects={processedProjects}
                  onProjectClick={handleProjectClick}
                  onEditProject={handleOpenEditModal}
                  onDeleteProject={handleOpenDeleteModal}
                />
              )}

              {viewMode === "card" && (
                <ProjectCardView
                  projects={processedProjects}
                  onProjectClick={handleProjectClick}
                  onEditProject={handleOpenEditModal}
                  onDeleteProject={handleOpenDeleteModal}
                />
              )}

              <ProjectPagination totalItems={processedProjects.length} />
            </>
          )}
        </main>
      </div>

      {/* Create / Edit Project Modal */}
      <ProjectModal
        mode={projectModalMode === "edit" ? "edit" : "create"}
        project={editingProject}
        availableTags={tags}
        isOpen={projectModalMode !== null}
        onClose={handleCloseProjectModal}
        onSubmit={handleSubmitProjectModal}
      />

      {/* Delete Project Confirmation Modal */}
      <DeleteProjectModal
        project={deletingProject}
        isOpen={deletingProject !== null}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}