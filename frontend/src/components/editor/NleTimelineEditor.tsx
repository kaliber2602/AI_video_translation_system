// frontend/src/components/editor/NleTimelineEditor.tsx
import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Timeline } from "@xzdarcy/react-timeline-editor";
import type { TimelineState } from "@xzdarcy/react-timeline-editor";
import type { TimelineRow, TimelineAction } from "@xzdarcy/timeline-engine";
import "@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css";
import WaveSurfer from "wavesurfer.js";
import {
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Magnet,
  Volume2,
  Film,
  Waves,
  Mic,
  Sparkles,
  Music,
} from "lucide-react";
import type { SubtitleSegment } from "../../types/video";

export interface CustomTimelineAction extends TimelineAction {
  data?: {
    index?: number;
    segment?: SubtitleSegment;
    slip?: number;
    label?: string;
  };
}

export interface NleTimelineEditorProps {
  duration: number;
  currentTime: number;
  segments?: SubtitleSegment[];
  activeSegmentIndex?: number | null;
  onSelectSegment?: (index: number) => void;
  onSeek: (time: number) => void;
  onUpdateSegment?: (index: number, updated: Partial<SubtitleSegment>) => void;
  onSplitSegment?: (index: number, splitTime: number) => void;
  onDeleteSegment?: (index: number) => void;
  audioUrl?: string | null;
  // Multi-track options (used in Step 5 Dubbing Studio)
  isMultiTrack?: boolean;
  tracksConfig?: {
    videoDuration?: number;
    bgmVolume?: number;
    isBgmMuted?: boolean;
    onToggleBgmMute?: () => void;
    vocalVolume?: number;
    isVocalMuted?: boolean;
    onToggleVocalMute?: () => void;
    segmentOverrides?: Record<
      number,
      { speed?: number; gain?: number; speaker?: string; slip?: number }
    >;
  };
}

export const NleTimelineEditor: React.FC<NleTimelineEditorProps> = ({
  duration,
  currentTime,
  segments = [],
  activeSegmentIndex = null,
  onSelectSegment,
  onSeek,
  onUpdateSegment,
  onSplitSegment,
  onDeleteSegment,
  audioUrl,
  isMultiTrack = false,
  tracksConfig,
}) => {
  const timelineStateRef = useRef<TimelineState>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  // Zoom & Timeline Scale (seconds per major unit & width per unit)
  const [scale] = useState<number>(5); // 5s per major tick
  const [scaleWidth, setScaleWidth] = useState<number>(140); // 140px per scale
  const [isGridSnap, setIsGridSnap] = useState<boolean>(true);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const safeDuration = useMemo(() => {
    const lastSeg = segments.length > 0 ? segments[segments.length - 1].end : 0;
    return Math.max(duration || 0, lastSeg, 30);
  }, [duration, segments]);

  // Format seconds to mm:ss.ms
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00.0";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  // 1. Initialize WaveSurfer for audio stem visualization if audioUrl provided
  useEffect(() => {
    if (!waveformContainerRef.current || !audioUrl) {
      if (waveSurferRef.current) {
        waveSurferRef.current.destroy();
        waveSurferRef.current = null;
      }
      return;
    }

    const ws = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: "#6366f1",
      progressColor: "#a855f7",
      cursorColor: "transparent",
      height: 32,
      normalize: true,
      url: audioUrl,
      interact: false, // Seeking handled by Timeline
    });

    waveSurferRef.current = ws;

    return () => {
      ws.destroy();
      waveSurferRef.current = null;
    };
  }, [audioUrl]);

  // Synchronize WaveSurfer playback with currentTime
  useEffect(() => {
    if (waveSurferRef.current && duration > 0) {
      const progress = Math.min(1, Math.max(0, currentTime / duration));
      waveSurferRef.current.seekTo(progress);
    }
  }, [currentTime, duration]);

  // 2. Synchronize timeline playhead with external currentTime
  useEffect(() => {
    if (timelineStateRef.current) {
      const state = timelineStateRef.current;
      const currentTimelineTime = state.getTime ? state.getTime() : 0;
      // Only set time if significantly different to avoid feedback loop
      if (Math.abs(currentTimelineTime - currentTime) > 0.05) {
        state.setTime(currentTime);
      }
    }
  }, [currentTime]);

  // 3. Effects Definition required by @xzdarcy/react-timeline-editor
  const effects = useMemo(() => {
    return {
      subtitleEffect: {
        id: "subtitleEffect",
        name: "Phụ đề",
      },
      videoEffect: {
        id: "videoEffect",
        name: "Video Stream",
      },
      bgmEffect: {
        id: "bgmEffect",
        name: "Nhạc nền BGM",
      },
      vocalsEffect: {
        id: "vocalsEffect",
        name: "Giọng nói gốc",
      },
      dubbingEffect: {
        id: "dubbingEffect",
        name: "Lồng tiếng AI",
      },
    };
  }, []);

  // 4. Map SubtitleSegments & Tracks to TimelineRow[]
  const editorData = useMemo<TimelineRow[]>(() => {
    if (!isMultiTrack) {
      // Step 4 Mode: Single Track for Subtitle Segments
      const actions: TimelineAction[] = segments.map((seg, idx) => ({
        id: `seg_${idx}`,
        start: seg.start,
        end: seg.end,
        effectId: "subtitleEffect",
        data: {
          index: idx,
          segment: seg,
        },
      }));

      return [
        {
          id: "subtitles_row",
          actions,
        },
      ];
    } else {
      // Step 5 Mode: Multi-Track (Video, BGM, Vocals, Dubbing Chunks)
      const dubbingActions: TimelineAction[] = segments.map((seg, idx) => {
        const slip = tracksConfig?.segmentOverrides?.[idx]?.slip || 0;
        return {
          id: `dub_seg_${idx}`,
          start: Math.max(0, seg.start + slip),
          end: Math.max(seg.start + slip + 0.2, seg.end + slip),
          effectId: "dubbingEffect",
          data: {
            index: idx,
            segment: seg,
            slip,
          },
        };
      });

      return [
        {
          id: "track_video",
          actions: [
            {
              id: "video_stream",
              start: 0,
              end: tracksConfig?.videoDuration || safeDuration,
              effectId: "videoEffect",
              data: { label: "1080p Video Stream" },
            },
          ],
        },
        {
          id: "track_bgm",
          actions: [
            {
              id: "bgm_stream",
              start: 0,
              end: safeDuration,
              effectId: "bgmEffect",
              data: { label: "Nhạc nền (BGM Stem)" },
            },
          ],
        },
        {
          id: "track_vocals",
          actions: [
            {
              id: "vocals_stream",
              start: 0,
              end: safeDuration,
              effectId: "vocalsEffect",
              data: { label: "Giọng gốc (Vocals Stem)" },
            },
          ],
        },
        {
          id: "track_dubbing",
          actions: dubbingActions,
        },
      ];
    }
  }, [segments, isMultiTrack, tracksConfig, safeDuration]);

  // 5. Custom Action Renderers for Clips
  const customActionRender = useCallback(
    (rawAction: TimelineAction) => {
      const action = rawAction as CustomTimelineAction;
      if (action.effectId === "subtitleEffect" || action.effectId === "dubbingEffect") {
        const idx = action.data?.index ?? 0;
        const seg = action.data?.segment;
        const slip = action.data?.slip;
        const isSelected =
          selectedActionId === action.id ||
          activeSegmentIndex === idx;

        const textPreview = seg?.translated_text || seg?.text || "";

        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSelectedActionId(action.id);
              if (onSelectSegment) onSelectSegment(idx);
              onSeek(action.start);
            }}
            className={`w-full h-full rounded-md px-1.5 py-0.5 flex flex-col justify-between overflow-hidden cursor-pointer transition select-none border ${
              isSelected
                ? "bg-[var(--color-primary)]/30 border-[var(--color-primary)] text-white shadow-xs ring-1 ring-[var(--color-primary)]"
                : action.effectId === "dubbingEffect"
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 hover:border-emerald-400"
                : "bg-zinc-800/80 border-zinc-600/70 text-zinc-200 hover:border-zinc-400"
            }`}
            title={`#${idx + 1}: ${textPreview}`}
          >
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono leading-tight">
              <span className="font-bold">#{idx + 1}</span>
              {slip !== undefined && slip !== 0 && (
                <span className="text-[8px] px-1 rounded bg-amber-500/25 text-amber-300 font-bold">
                  {slip > 0 ? `+${slip}` : slip}s
                </span>
              )}
            </div>
            <span className="truncate text-[9px] font-medium leading-normal text-left">
              {textPreview || "(Trống)"}
            </span>
          </div>
        );
      }

      if (action.effectId === "videoEffect") {
        return (
          <div className="w-full h-full rounded bg-blue-950/40 border border-blue-800/40 flex items-center px-2 text-[10px] font-mono text-blue-300">
            <Film size={11} className="mr-1.5 shrink-0" />
            <span className="truncate">1080p Video Stream ({formatTime(action.end - action.start)})</span>
          </div>
        );
      }

      if (action.effectId === "bgmEffect") {
        const isMuted = tracksConfig?.isBgmMuted;
        return (
          <div
            className={`w-full h-full rounded border flex items-center px-2 text-[10px] font-mono transition-opacity ${
              isMuted
                ? "opacity-30 border-zinc-700 bg-zinc-900 text-zinc-500"
                : "border-indigo-800/40 bg-indigo-950/30 text-indigo-300"
            }`}
          >
            <Waves size={11} className="mr-1.5 shrink-0" />
            <span className="truncate">Nhạc nền BGM {isMuted ? "(Muted)" : `(${tracksConfig?.bgmVolume ?? 70}%)`}</span>
          </div>
        );
      }

      if (action.effectId === "vocalsEffect") {
        const isMuted = tracksConfig?.isVocalMuted;
        return (
          <div
            className={`w-full h-full rounded border flex items-center px-2 text-[10px] font-mono transition-opacity ${
              isMuted
                ? "opacity-30 border-zinc-700 bg-zinc-900 text-zinc-500"
                : "border-amber-800/40 bg-amber-950/30 text-amber-300"
            }`}
          >
            <Mic size={11} className="mr-1.5 shrink-0" />
            <span className="truncate">Giọng gốc Vocals {isMuted ? "(Muted)" : `(${tracksConfig?.vocalVolume ?? 100}%)`}</span>
          </div>
        );
      }

      return <div>{action.id}</div>;
    },
    [selectedActionId, activeSegmentIndex, onSelectSegment, onSeek, tracksConfig]
  );

  // 6. Handle Action Move End (Draggable clip repositioning)
  const handleActionMoveEnd = useCallback(
    ({
      action,
      start,
      end,
    }: {
      action: TimelineAction;
      start: number;
      end: number;
    }) => {
      const act = action as CustomTimelineAction;
      const idx = act.data?.index;
      if (typeof idx === "number" && onUpdateSegment) {
        onUpdateSegment(idx, {
          start: Number(start.toFixed(2)),
          end: Number(end.toFixed(2)),
        });
      }
    },
    [onUpdateSegment]
  );

  // 7. Handle Action Resize End (Trimming start / end)
  const handleActionResizeEnd = useCallback(
    ({
      action,
      start,
      end,
    }: {
      action: TimelineAction;
      start: number;
      end: number;
      dir: "left" | "right";
    }) => {
      const act = action as CustomTimelineAction;
      const idx = act.data?.index;
      if (typeof idx === "number" && onUpdateSegment) {
        onUpdateSegment(idx, {
          start: Number(start.toFixed(2)),
          end: Number(end.toFixed(2)),
        });
      }
    },
    [onUpdateSegment]
  );

  // 8. Handle Click on Timeline / Cursor Seek
  const handleClickTimeArea = useCallback(
    (time: number) => {
      onSeek(Number(time.toFixed(2)));
      return true;
    },
    [onSeek]
  );

  const handleCursorDragEnd = useCallback(
    (time: number) => {
      onSeek(Number(time.toFixed(2)));
    },
    [onSeek]
  );

  // 9. Split Segment at Current Playhead Cursor
  const handleSplitAtPlayhead = useCallback(() => {
    if (!onSplitSegment) return;
    const targetIdx = segments.findIndex(
      (s) => currentTime > s.start + 0.3 && currentTime < s.end - 0.3
    );
    if (targetIdx !== -1) {
      onSplitSegment(targetIdx, Number(currentTime.toFixed(2)));
    }
  }, [segments, currentTime, onSplitSegment]);

  // 10. Zoom In / Zoom Out Controls
  const handleZoomIn = () => {
    setScaleWidth((prev) => Math.min(260, prev + 25));
  };

  const handleZoomOut = () => {
    setScaleWidth((prev) => Math.max(70, prev - 25));
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[#070b0e] p-3 sm:p-4 shadow-[var(--shadow-card)] space-y-3">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isMultiTrack ? (
            <Music size={15} className="text-[var(--color-primary)]" />
          ) : (
            <Sparkles size={15} className="text-[var(--color-primary)]" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            {isMultiTrack
              ? "Multi-Track NLE Studio Timeline"
              : "Thước Đo Thời Gian Phụ Đề (NLE Timeline)"}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {isMultiTrack ? "4 Rãnh Âm Thanh" : `${segments.length} Câu Thoại`}
          </span>
        </div>

        {/* Center & Right Transport / Editing Controls */}
        <div className="flex items-center gap-2">
          {/* Split at playhead button */}
          {onSplitSegment && !isMultiTrack && (
            <button
              type="button"
              onClick={handleSplitAtPlayhead}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-[var(--color-primary)] text-xs font-semibold transition active:scale-95 shadow-xs"
              title="Cắt đôi câu thoại tại vị trí con trỏ (Split Segment)"
            >
              <Scissors size={12} className="text-[var(--color-primary)]" />
              <span>Cắt câu</span>
            </button>
          )}

          {/* Delete active segment button */}
          {onDeleteSegment && activeSegmentIndex !== null && !isMultiTrack && (
            <button
              type="button"
              onClick={() => onDeleteSegment(activeSegmentIndex)}
              className="p-1 rounded-lg border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 transition"
              title="Xóa câu thoại được chọn"
            >
              <Trash2 size={13} />
            </button>
          )}

          {/* Magnet / Snap toggle */}
          <button
            type="button"
            onClick={() => setIsGridSnap(!isGridSnap)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition ${
              isGridSnap
                ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
            title={isGridSnap ? "Bật hút dính nam châm (Grid Snap)" : "Tắt hút dính nam châm"}
          >
            <Magnet size={12} />
            <span>Snap</span>
          </button>

          {/* Timecode display */}
          <div className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="text-[var(--color-primary)] font-bold">{formatTime(currentTime)}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{formatTime(safeDuration)}</span>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-zinc-400 hover:text-white transition rounded hover:bg-zinc-800"
              title="Thu nhỏ timeline"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono text-zinc-400 px-1 select-none">
              {Math.round(scaleWidth / scale)}px/s
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-zinc-400 hover:text-white transition rounded hover:bg-zinc-800"
              title="Phóng to timeline"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>


      {/* Embedded WaveSurfer audio track if audioUrl provided in single-track mode */}
      {!isMultiTrack && audioUrl && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-1.5 overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 px-1">
            <div className="flex items-center gap-1">
              <Volume2 size={12} className="text-[var(--color-primary)]" />
              <span className="font-semibold">Sóng Âm Thanh Gốc (WaveSurfer.js HD)</span>
            </div>
            <span className="font-mono text-[9px] text-zinc-500">Audio Stem Stream</span>
          </div>
          <div ref={waveformContainerRef} className="w-full" />
        </div>
      )}

      {/* Main Timeline Engine Component from @xzdarcy/react-timeline-editor */}
      <div className="rounded-xl border border-zinc-800 bg-black/60 overflow-hidden relative">
        <style>{`
          .timeline-editor-engine {
            background-color: transparent !important;
            color: #d4d4d8 !important;
            font-family: inherit !important;
          }
          .timeline-editor-engine .timeline-time-area {
            background-color: #09090b !important;
            border-bottom: 1px solid #27272a !important;
          }
          .timeline-editor-engine .timeline-time-area .time-unit {
            color: #a1a1aa !important;
            font-size: 10px !important;
            font-family: monospace !important;
          }
          .timeline-editor-engine .timeline-edit-area {
            background-color: #030712 !important;
          }
          .timeline-editor-engine .timeline-edit-row {
            border-bottom: 1px solid #18181b !important;
          }
          .timeline-editor-engine .timeline-cursor-area .cursor {
            background-color: #ef4444 !important;
            width: 2px !important;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.8) !important;
          }
          .timeline-editor-engine .timeline-cursor-area .cursor-top {
            border-top-color: #ef4444 !important;
          }
        `}</style>

        <div className="timeline-editor-engine w-full overflow-hidden">
          <Timeline
            ref={timelineStateRef}
            scale={scale}
            scaleWidth={scaleWidth}
            scaleSplitCount={10}
            startLeft={20}
            minScaleCount={Math.ceil(safeDuration / scale) + 2}
            rowHeight={isMultiTrack ? 42 : 52}
            gridSnap={isGridSnap}
            dragLine={true}
            autoScroll={true}
            editorData={editorData}
            effects={effects}
            getActionRender={customActionRender}
            onActionMoveEnd={handleActionMoveEnd}
            onActionResizeEnd={handleActionResizeEnd}
            onClickTimeArea={handleClickTimeArea}
            onCursorDragEnd={handleCursorDragEnd}
            style={{ width: "100%", height: isMultiTrack ? 220 : 130 }}
          />
        </div>
      </div>
    </div>
  );
};

export default NleTimelineEditor;
