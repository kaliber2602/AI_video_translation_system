import api from "./api/axios";

import type {
  TagCreateRequest,
  TagResponse,
  TagUpdateRequest,
} from "../types/tag";


// =========================================================
// Get All Tags
// GET /api/tags
// =========================================================

export const getTags = async (): Promise<TagResponse[]> => {
  const response = await api.get<TagResponse[]>(
    "/api/tags"
  );

  return response.data;
};


// =========================================================
// Get Tag By ID
// GET /api/tags/{tag_id}
// =========================================================

export const getTag = async (
  tagId: number
): Promise<TagResponse> => {
  const response = await api.get<TagResponse>(
    `/api/tags/${tagId}`
  );

  return response.data;
};


// =========================================================
// Create Tag
// POST /api/tags
// =========================================================

export const createTag = async (
  data: TagCreateRequest
): Promise<TagResponse> => {
  const response = await api.post<TagResponse>(
    "/api/tags",
    data
  );

  return response.data;
};


// =========================================================
// Update Tag
// PUT /api/tags/{tag_id}
// =========================================================

export const updateTag = async (
  tagId: number,
  data: TagUpdateRequest
): Promise<TagResponse> => {
  const response = await api.put<TagResponse>(
    `/api/tags/${tagId}`,
    data
  );

  return response.data;
};


// =========================================================
// Delete Tag
// DELETE /api/tags/{tag_id}
// =========================================================

export const deleteTag = async (
  tagId: number
): Promise<void> => {
  await api.delete(
    `/api/tags/${tagId}`
  );
};

