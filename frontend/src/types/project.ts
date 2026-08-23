import type { TagResponse } from "./tag";

export interface Project {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  cover_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  tags: TagResponse[];
  video_count: number;
  recent_project: string | null;
  duration: string | null;
  size: string | null;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string | null;
  cover_path?: string | null;
  tag_ids?: number[] | null;
}

export interface ProjectUpdateRequest {
  name?: string | null;
  description?: string | null;
  cover_path?: string | null;
  status?: string | null;
}
