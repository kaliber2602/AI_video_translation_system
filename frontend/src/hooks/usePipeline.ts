// src/hooks/usePipeline.ts
import { useContext } from "react";
import { PipelineContext } from "../contexts/PipelineContext";

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error("usePipeline must be used within a PipelineProvider");
  }
  return context;
}

// Re-export types from the context
export type { PipelineState, PipelineAction } from "../contexts/PipelineContext";
export { initialState, pipelineReducer } from "../contexts/PipelineContext";