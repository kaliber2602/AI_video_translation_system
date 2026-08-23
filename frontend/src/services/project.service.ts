import api from "./api/axios";

import type {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
} from "../types/project";
import type { TagResponse } from "../types/tag";


// =========================================================
// Get All Projects for Current User
// GET /api/projects
// =========================================================

export const getProjects = async (params?: {
  tag_id?: number;
  search?: string;
}): Promise<Project[]> => {
  const response = await api.get<Project[]>("/api/projects", {
    params,
  });

  return response.data;
};


// =========================================================
// Get Project By ID
// GET /api/projects/{project_id}
// =========================================================

export const getProject = async (
  projectId: number | string
): Promise<Project> => {
  const response = await api.get<Project>(
    `/api/projects/${projectId}`
  );

  return response.data;
};


// =========================================================
// Create Project
// POST /api/projects
// =========================================================

export const createProject = async (
  data: ProjectCreateRequest
): Promise<Project> => {
  const response = await api.post<Project>(
    "/api/projects",
    data
  );

  return response.data;
};


// =========================================================
// Update Project
// PUT /api/projects/{project_id}
// =========================================================

export const updateProject = async (
  projectId: number | string,
  data: ProjectUpdateRequest
): Promise<Project> => {
  const response = await api.put<Project>(
    `/api/projects/${projectId}`,
    data
  );

  return response.data;
};


// =========================================================
// Delete Project
// DELETE /api/projects/{project_id}
// =========================================================

export const deleteProject = async (
  projectId: number | string
): Promise<void> => {
  await api.delete(`/api/projects/${projectId}`);
};


// =========================================================
// Get Project Tags
// GET /api/projects/{project_id}/tags
// =========================================================

export const getProjectTags = async (
  projectId: number | string
): Promise<TagResponse[]> => {
  const response = await api.get<TagResponse[]>(
    `/api/projects/${projectId}/tags`
  );

  return response.data;
};


// =========================================================
// Add Tag to Project
// POST /api/projects/{project_id}/tags/{tag_id}
// =========================================================

export const addProjectTag = async (
  projectId: number | string,
  tagId: number
): Promise<TagResponse> => {
  const response = await api.post<TagResponse>(
    `/api/projects/${projectId}/tags/${tagId}`
  );

  return response.data;
};


// =========================================================
// Remove Tag from Project
// DELETE /api/projects/{project_id}/tags/{tag_id}
// =========================================================

export const removeProjectTag = async (
  projectId: number | string,
  tagId: number
): Promise<void> => {
  await api.delete(
    `/api/projects/${projectId}/tags/${tagId}`
  );
};
