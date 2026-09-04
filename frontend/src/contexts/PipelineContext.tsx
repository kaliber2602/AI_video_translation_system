// src/contexts/PipelineContext.tsx
import { createContext, useReducer, ReactNode } from "react";

// ============================================================
// STATE TYPES
// ============================================================

export interface PipelineState {
  step: number;
  video: {
    videoId?: number;
    filename?: string;
    fileSize?: number;
    status?: string;
  } | null;
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
  error: string | null;
}

export type PipelineAction =
  | { type: "SET_STEP"; payload: number }
  | { type: "SET_VIDEO"; payload: any }
  | { type: "SET_JOB"; payload: any }
  | { type: "UPDATE_JOB_STATUS"; payload: any }
  | { type: "SET_TARGET_LANGUAGE"; payload: string }
  | { type: "SET_PROJECT"; payload: number }
  | { type: "SET_TRANSCRIPT"; payload: any }
  | { type: "SET_TRANSLATION"; payload: any }
  | { type: "SET_SUBTITLES"; payload: any }
  | { type: "SET_TTS"; payload: any }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" };

// ============================================================
// INITIAL STATE
// ============================================================

export const initialState: PipelineState = {
  step: 1,
  video: null,
  job: null,
  targetLanguage: "vi",
  projectId: undefined,
  transcript: null,
  translation: null,
  subtitles: null,
  tts: null,
  error: null,
};

// ============================================================
// REDUCER
// ============================================================

export function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_VIDEO":
      return { ...state, video: action.payload };
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