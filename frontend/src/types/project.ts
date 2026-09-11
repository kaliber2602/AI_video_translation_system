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

export interface ProjectFolder {
  id: number;
  project_id: number;
  parent_id?: number | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FolderCreateRequest {
  name: string;
  parent_id?: number | null;
}

export interface FolderUpdateRequest {
  name?: string;
  parent_id?: number | null;
}

export type AssetCategory =
  | "all"
  | "video"
  | "audio"
  | "subtitle"
  | "transcript"
  | "document"
  | "speaker_voice";

export interface ProjectAssetItem {
  id: string;
  name: string;
  category: "video" | "audio" | "subtitle" | "transcript" | "document" | "speaker_voice" | string;
  format?: string;
  size_bytes?: number;
  size_display?: string;
  storage_location?: string;
  storage_type?: string;
  path_or_key: string;
  download_url?: string | null;
  preview_url?: string | null;
  created_at?: string | null;
  folder_id?: number | null;
  folder_name?: string | null;
  video_id?: number | string | null;
  video_title?: string | null;
}

export interface ProjectAssetsResponse {
  project_id: number;
  total_files: number;
  total_size_bytes: number;
  category_counts: Record<string, number>;
  assets: ProjectAssetItem[];
}

