export type SettingsSection =
  | "account"
  | "general"
  | "workspace"
  | "ai"
  | "translation"
  | "billing"
  | "notifications"
  | "integrations"
  | "security"
  | "privacy";

export interface UserSettingsResponse {
  id: number;
  user_id: number;
  theme: string;
  language: string;
  default_target_language: string | null;
  default_translation_model: string | null;
  default_tts_model: string | null;
}

export interface UserSettingsUpdate {
  theme: string;
  language: string;
  default_target_language?: string | null;
  default_translation_model?: string | null;
  default_tts_model?: string | null;
}

export interface UserSettingsPatch {
  theme?: string;
  language?: string;
  default_target_language?: string | null;
  default_translation_model?: string | null;
  default_tts_model?: string | null;
}
