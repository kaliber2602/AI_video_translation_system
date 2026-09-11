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
  default_separation_model: string | null;
  default_stt_model: string | null;
  default_diarization_model: string | null;
  default_translation_model: string | null;
  default_tts_model: string | null;
  default_llm_model: string | null;
  default_embedding_model: string | null;
  preferences?: Record<string, any>;
}

export interface UserSettingsUpdate {
  theme: string;
  language: string;
  default_target_language?: string | null;
  default_separation_model?: string | null;
  default_stt_model?: string | null;
  default_diarization_model?: string | null;
  default_translation_model?: string | null;
  default_tts_model?: string | null;
  default_llm_model?: string | null;
  default_embedding_model?: string | null;
  preferences?: Record<string, any>;
}

export interface UserSettingsPatch {
  theme?: string;
  language?: string;
  default_target_language?: string | null;
  default_separation_model?: string | null;
  default_stt_model?: string | null;
  default_diarization_model?: string | null;
  default_translation_model?: string | null;
  default_tts_model?: string | null;
  default_llm_model?: string | null;
  default_embedding_model?: string | null;
  preferences?: Record<string, any>;
}
