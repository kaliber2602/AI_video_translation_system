export interface TagResponse {
  id: number;
  user_id: number;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagCreateRequest {
  name: string;
  color: string | null;
}

export interface TagUpdateRequest {
  name: string;
  color: string | null;
}

