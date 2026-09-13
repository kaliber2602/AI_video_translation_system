import api from "./api/axios";

export interface AudioSeparationConfig {
  demucs_model?: string;
  vocal_volume?: number;
  bgm_volume?: number;
  enable_ducking?: boolean;
  ducking_level?: number;
  ducking_threshold?: number;
  ducking_attack?: number;
  ducking_release?: number;
}

export interface TranscriptionConfig {
  model_size?: string;
  diarization?: boolean;
  min_speakers?: number;
  max_speakers?: number;
  filter_fillers?: boolean;
  temperature?: number;
}

export interface TranslationConfig {
  model_name?: string;
  source_language?: string;
  target_language?: string;
  apply_glossary?: boolean;
  preserve_tone?: string;
}

export interface TTSDubbingConfig {
  engine?: string;
  default_voice_id?: string;
  speaker_voice_mapping?: Record<string, string>;
  speed_rate?: number;
  pitch_shift?: number;
}

export interface SubtitleStyleConfig {
  font_name?: string;
  font_size?: number;
  primary_color?: string;
  outline_color?: string;
  margin_v?: number;
  max_chars_per_line?: number;
  karaoke_effect?: boolean;
  highlight_color?: string;
}

export interface SubtitlesConfig {
  format?: string;
  burn_mode?: "hardcode" | "hardsub" | "soft" | "none";
  style?: SubtitleStyleConfig;
}

export interface ExportMuxingConfig {
  resolution?: string;
  encoder?: string;
  bitrate?: string;
  preset_speed?: string;
  container?: string;
}

export interface PresetConfigData {
  audio_separation?: AudioSeparationConfig;
  transcription?: TranscriptionConfig;
  translation?: TranslationConfig;
  tts_dubbing?: TTSDubbingConfig;
  subtitles?: SubtitlesConfig;
  export_muxing?: ExportMuxingConfig;
}

export interface PipelinePreset {
  id: number;
  user_id?: number | null;
  name: string;
  description?: string;
  is_system: boolean;
  is_default: boolean;
  target_language: string;
  source_language: string;
  stt_model: string;
  enable_diarization: boolean;
  translation_model: string;
  tts_model: string;
  voice_id?: string;
  voice_speed: number;
  subtitle_format: string;
  burn_subtitles: boolean;
  video_quality: string;
  video_format: string;
  config_data?: PresetConfigData;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePresetPayload {
  name: string;
  description?: string;
  target_language?: string;
  source_language?: string;
  stt_model?: string;
  enable_diarization?: boolean;
  translation_model?: string;
  tts_model?: string;
  voice_id?: string;
  voice_speed?: number;
  subtitle_format?: string;
  burn_subtitles?: boolean;
  video_quality?: string;
  video_format?: string;
  config_data?: PresetConfigData;
}

export type UpdatePresetPayload = Partial<CreatePresetPayload>;

export async function getPresets(): Promise<PipelinePreset[]> {
  const response = await api.get<PipelinePreset[]>("/api/presets");
  return response.data;
}

export async function createPreset(payload: CreatePresetPayload): Promise<PipelinePreset> {
  const response = await api.post<PipelinePreset>("/api/presets", payload);
  return response.data;
}

export async function updatePreset(presetId: number, payload: UpdatePresetPayload): Promise<PipelinePreset> {
  const response = await api.put<PipelinePreset>(`/api/presets/${presetId}`, payload);
  return response.data;
}

export async function deletePreset(presetId: number): Promise<void> {
  await api.delete(`/api/presets/${presetId}`);
}
