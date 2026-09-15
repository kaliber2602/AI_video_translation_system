// frontend/src/components/editor/EditorTimeline.tsx
import React from "react";
import type { SubtitleSegment } from "../../types/video";
import { NleTimelineEditor } from "./NleTimelineEditor";

export interface EditorTimelineProps {
  duration: number;
  currentTime: number;
  segments: SubtitleSegment[];
  activeSegmentIndex: number | null;
  onSelectSegment: (index: number) => void;
  onSeek: (time: number) => void;
  onUpdateSegment: (index: number, updated: Partial<SubtitleSegment>) => void;
  onSplitSegment: (index: number, splitTime: number) => void;
  onDeleteSegment: (index: number) => void;
  onAddSegment?: (time: number) => void;
  audioUrl?: string | null;
}

export const EditorTimeline: React.FC<EditorTimelineProps> = ({
  duration,
  currentTime,
  segments,
  activeSegmentIndex,
  onSelectSegment,
  onSeek,
  onUpdateSegment,
  onSplitSegment,
  onDeleteSegment,
  audioUrl,
}) => {
  return (
    <NleTimelineEditor
      duration={duration}
      currentTime={currentTime}
      segments={segments}
      activeSegmentIndex={activeSegmentIndex}
      onSelectSegment={onSelectSegment}
      onSeek={onSeek}
      onUpdateSegment={onUpdateSegment}
      onSplitSegment={onSplitSegment}
      onDeleteSegment={onDeleteSegment}
      audioUrl={audioUrl}
      isMultiTrack={false}
    />
  );
};

export default EditorTimeline;
