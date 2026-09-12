// src/contexts/PipelineContext.tsx
import { createContext, useReducer, type ReactNode } from "react";

// ============================================================
// STATE TYPES
// ============================================================

export interface StepsSummaryData {
  video_id: number;
  overall_status?: string;
  overall_progress?: number;
  current_step?: string;
  active_task?: {
    task_id?: string;
    job_id?: string;
    current_step?: string;
    step?: string;
    status: string;
    progress?: number;
    message?: string;
    error_message?: string;
  } | null;
  steps: {
    audio?: { status: string; has_vocal?: boolean; has_bgm?: boolean; vocal_path?: string; bgm_path?: string };
    transcript?: { status: string; segment_count?: number; language?: string; transcript_path?: string };
    translation?: { status: string; target_language?: string; languages?: string[]; segment_count?: number };
    subtitle?: { status: string; subtitle_path?: string; count?: number; formats?: string[] };
    dubbing?: { status: string; dubbed_audio_path?: string; count?: number; languages?: string[] };
    export?: { status: string; output_path?: string; count?: number; latest_render?: any };
    [key: string]: any;
  };
}

export interface PipelineState {
  step: number;
  video: {
    videoId?: number;
    filename?: string;
    fileSize?: number;
    status?: string;
    duration?: number;
    outputPath?: string;
    dubbedAudioPath?: string;
    subtitlePath?: string;
    transcriptPath?: string;
    extractedVocalPath?: string;
    projectId?: number;
    hasTranslation?: boolean;
    translationPath?: string;
    progress?: number;
    currentStep?: string;
  } | null;
  stepsSummary: StepsSummaryData | null;
  job: {
    jobId?: string;
    status?: string;
    progress?: number;
    currentStep?: string;
    tasks?: any[];
  } | null;
  targetLanguage: string;
  projectId?: number;
  transcript: any;
  translation: any;
  subtitles: any;
  tts: any;
  dubbedVideo: any;
  error: string | null;
}

export type PipelineAction =
  | { type: "SET_STEP"; payload: number }
  | { type: "SET_VIDEO"; payload: any }
  | { type: "SET_STEPS_SUMMARY"; payload: StepsSummaryData | null }
  | { type: "SET_JOB"; payload: any }
  | { type: "UPDATE_JOB_STATUS"; payload: any }
  | { type: "SET_TARGET_LANGUAGE"; payload: string }
  | { type: "SET_PROJECT"; payload: number }
  | { type: "SET_TRANSCRIPT"; payload: any }
  | { type: "SET_TRANSLATION"; payload: any }
  | { type: "SET_SUBTITLES"; payload: any }
  | { type: "SET_TTS"; payload: any }
  | { type: "SET_DUBBED_VIDEO"; payload: any }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" };

// ============================================================
// INITIAL STATE
// ============================================================

export const initialState: PipelineState = {
  step: 1,
  video: null,
  stepsSummary: null,
  job: null,
  targetLanguage: "vi",
  projectId: undefined,
  transcript: null,
  translation: null,
  subtitles: null,
  tts: null,
  dubbedVideo: null,
  error: null,
};

// ============================================================
// REDUCER
// ============================================================

export function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_VIDEO": {
      const isNewVideo = !state.video || state.video.videoId !== action.payload?.videoId;
      return {
        ...state,
        video: action.payload,
        ...(isNewVideo
          ? {
              stepsSummary: null,
              transcript: null,
              translation: null,
              subtitles: null,
              tts: null,
              dubbedVideo: null,
              error: null,
            }
          : {}),
      };
    }
    case "SET_STEPS_SUMMARY":
      return { ...state, stepsSummary: action.payload };
    case "SET_JOB":
      return { ...state, job: action.payload };
    case "UPDATE_JOB_STATUS":
      return { ...state, job: { ...state.job, ...action.payload } };
    case "SET_TARGET_LANGUAGE":
      return { ...state, targetLanguage: action.payload };
    case "SET_PROJECT":
      return { ...state, projectId: action.payload };
    case "SET_TRANSCRIPT":
      return { ...state, transcript: action.payload };
    case "SET_TRANSLATION":
      return { ...state, translation: action.payload };
    case "SET_SUBTITLES":
      return { ...state, subtitles: action.payload };
    case "SET_TTS":
      return { ...state, tts: action.payload };
    case "SET_DUBBED_VIDEO":
      return { ...state, dubbedVideo: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

// ============================================================
// CONTEXT
// ============================================================

export const PipelineContext = createContext<{
  state: PipelineState;
  dispatch: React.Dispatch<PipelineAction>;
} | null>(null);

// ============================================================
// PROVIDER COMPONENT
// ============================================================

interface PipelineProviderProps {
  children: ReactNode;
}

export function PipelineProvider({ children }: PipelineProviderProps) {
  const [state, dispatch] = useReducer(pipelineReducer, initialState);
  return (
    <PipelineContext.Provider value={{ state, dispatch }}>
      {children}
    </PipelineContext.Provider>
  );
}