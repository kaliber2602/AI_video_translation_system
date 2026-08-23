import { useCallback, useEffect, useState } from "react";
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
import ProjectToolbar from "../components/workspace/ProjectToolbar";
import ProjectTable from "../components/workspace/ProjectTable";
import ProjectPagination from "../components/workspace/ProjectPagination";
import ProjectModal from "../components/workspace/ProjectModal";
import DeleteProjectModal from "../components/workspace/DeleteProjectModal";

export default function WorkspaceLayout() {
  const { t } = useTranslation(["workspace", "common"]);
  const location = useLocation();
  const navigate = useNavigate();

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  // Modals
  const [projectModalMode, setProjectModalMode] = useState<"create" | "edit" | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

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
      } catch (error) {
        console.error("[WorkspaceLayout] Failed to get current user:", error);
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
      const data = await getProjects({
        tag_id: selectedTagId ?? undefined,
        search: searchQuery.trim() || undefined,
      });
      setProjects(data);
    } catch (err) {
      console.error("[WorkspaceLayout] Failed to load projects:", err);
      toast.error(t("workspace:loadError"), t("common:tryAgain"));
    } finally {
      setIsLoading(false);
    }
  }, [selectedTagId, searchQuery, t]);

  useEffect(() => {
    let ignore = false;
    const fetchInitialData = async () => {
      try {
        const tagsData = await getTags();
        if (!ignore) setTags(tagsData);

        const projectsData = await getProjects({
          tag_id: selectedTagId ?? undefined,
          search: searchQuery.trim() || undefined,
        });
        if (!ignore) setProjects(projectsData);
      } catch (err) {
        console.error("[WorkspaceLayout] Fetch error:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchInitialData();
    return () => {
      ignore = true;
    };
  }, [selectedTagId, searchQuery]);

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
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200">
      <WorkspaceTopbar />

      <div className="flex">
        <WorkspaceSidebar
          selectedTagId={selectedTagId}
          onTagSelect={setSelectedTagId}
        />

        <main className="min-w-0 flex-1 px-8 py-10">
          <WorkspaceHeader />

          <ProjectToolbar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            tags={tags}
            selectedTagId={selectedTagId}
            onTagSelect={setSelectedTagId}
            onNewProject={handleOpenCreateModal}
          />

          <ProjectTable
            projects={projects}
            isLoading={isLoading}
            onProjectClick={handleProjectClick}
            onEditProject={handleOpenEditModal}
            onDeleteProject={handleOpenDeleteModal}
            onNewProject={handleOpenCreateModal}
          />

          <ProjectPagination totalItems={projects.length} />
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