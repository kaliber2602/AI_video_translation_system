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
  deleted_at?: string | null;
  is_favorite?: boolean;
  is_shared?: boolean;
  my_role?: "owner" | "editor" | "viewer" | "commenter" | "admin";
  owner_name?: string | null;
  owner_email?: string | null;
  tags: TagResponse[];
  video_count: number;
  recent_project: string | null;
  duration: string | null;
  size: string | null;
}

export interface ProjectFavoriteResponse {
  project_id: number;
  is_favorite: boolean;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id?: number | null;
  email: string;
  role: "viewer" | "commenter" | "editor" | "admin";
  status: "pending" | "accepted" | "declined" | "revoked";
  created_at: string;
  full_name?: string | null;
}

export interface ProjectMemberAddRequest {
  email: string;
  role: "viewer" | "commenter" | "editor" | "admin";
}

export interface ProjectMemberUpdateRequest {
  role: "viewer" | "commenter" | "editor" | "admin";
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
