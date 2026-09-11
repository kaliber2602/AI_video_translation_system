// frontend/src/types/video.ts

export type VideoStatus =
  | "uploaded"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface Video {
  id: number;
  project_id: number;
  folder_id?: number | null;
  title: string;
  original_filename: string;
  file_size?: number | null;
  status: VideoStatus | string;
  progress: number;
  current_step?: string | null;
  duration?: number | null;
  created_at: string;
  updated_at: string;
  has_hls?: boolean;
}

export interface VideoDetail extends Video {
  original_path?: string | null;
  extracted_vocal_path?: string | null;
  background_music_path?: string | null;
  transcript_path?: string | null;
  subtitle_path?: string | null;
  dubbed_audio_path?: string | null;
  output_path?: string | null;
  fps?: number | null;
  resolution?: string | null;
  error_message?: string | null;
  target_language?: string | null;
  source_language?: string | null;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    translated_text?: string;
    speaker?: string;
  }>;
}

export interface VideoUpdateRequest {
  title?: string;
  folder_id?: number | null;
}

export interface VideoDocument {
  id: number;
  video_id: number;
  doc_type: string;
  title: string;
  file_path?: string | null;
  content_markdown?: string | null;
  file_size_bytes?: number | null;
  created_at?: string;
}

export interface VideoChapter {
  id: number;
  video_id: number;
  sequence: number;
  start_time: number;
  end_time: number;
  title: string;
  summary?: string | null;
  thumbnail_path?: string | null;
  created_at?: string;
}

export type SubtitleEffectType = "none" | "fade" | "pop" | "slide" | "karaoke";

export interface SubtitleSegment {
  id?: string | number;
  start: number;
  end: number;
  text: string;
  translated_text?: string;
  speaker?: string;
}

export interface SubtitleStyleConfig {
  fontName: string;
  fontSize: number;
  primaryColor: string;
  outlineColor: string;
  outlineWidth: number;
  backgroundColor: string;
  position: "bottom" | "middle" | "top";
  maxLines: number;
  effect: SubtitleEffectType;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
}
