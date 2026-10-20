export type SettingsSection =
  | "general"
  | "billing"
  | "notifications"
  | "security"
  | "privacy";

export interface UserSettingsResponse {
  id: number;
  user_id: number;
  theme: string;
  language: string;
  preferences?: Record<string, any>;
}

export interface UserSettingsUpdate {
  theme?: string;
  language?: string;
  preferences?: Record<string, any>;
}

export interface UserSettingsPatch {
  theme?: string;
  language?: string;
  preferences?: Record<string, any>;
}

export interface StorageFileItem {
  id: string;
  filename: string;
  projectName: string;
  resourceType: "source_video" | "dubbed_video" | "audio_track" | "subtitles_docs" | "pipeline_cache";
  sizeBytes: number;
  sizeFormatted: string;
  specs: string;
  createdAt: string;
  status: "ready" | "processing" | "failed";
}
