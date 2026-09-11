// frontend/src/components/editor/EditorTimeline.tsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Scissors,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Magnet,
  Video,
  FileText,
  Volume2,
} from "lucide-react";
import type { SubtitleSegment } from "../../types/video";

interface EditorTimelineProps {
  duration: number;
  currentTime: number;
  segments: SubtitleSegment[];
  activeSegmentIndex: number | null;
  onSelectSegment: (index: number) => void;
  onSeek: (time: number) => void;
  onUpdateSegment: (index: number, updated: Partial<SubtitleSegment>) => void;
  onSplitSegment: (index: number, splitTime: number) => void;
  onDeleteSegment: (index: number) => void;
  onAddSegment: (time: number) => void;
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
  onAddSegment,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Zoom level: pixels per second
  const [zoom, setZoom] = useState<number>(30); // default 30px per second
  const [isSnapEnabled, setIsSnapEnabled] = useState<boolean>(true);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);

  // Dragging / Trimming Segment State
  const [dragInfo, setDragInfo] = useState<{
    segmentIndex: number;
    type: "move" | "trim-start" | "trim-end";
    startX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const totalWidth = Math.max(800, (duration || 60) * zoom);

  // Convert pixel position to time (seconds)
  const pxToTime = useCallback(
    (px: number) => {
      const t = px / zoom;
      return Math.max(0, Math.min(duration || 60, t));
    },
    [zoom, duration]
  );

  // Convert time to pixels
  const timeToPx = useCallback(
    (t: number) => {
      return t * zoom;
    },
    [zoom]
  );

  // Handle Timeline Click / Scrub
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = pxToTime(clickX);
    onSeek(seekTime);
    // Auto-select the segment at this position if any
    const targetIdx = segments.findIndex((s) => seekTime >= s.start && seekTime <= s.end);
    if (targetIdx !== -1) {
      onSelectSegment(targetIdx);
    }
  };

  // Dragging Playhead
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = pxToTime(clickX);
        onSeek(newTime);
      } else if (dragInfo && timelineRef.current) {
        const deltaPx = e.clientX - dragInfo.startX;
        // Require at least 4px drag movement to distinguish drag from click
        if (Math.abs(deltaPx) < 4) return;

        const deltaTime = deltaPx / zoom;
        const seg = segments[dragInfo.segmentIndex];
        if (!seg) return;

        if (dragInfo.type === "trim-start") {
          let newStart = Math.max(0, dragInfo.initialStart + deltaTime);
          if (newStart < dragInfo.initialEnd - 0.2) {
            onUpdateSegment(dragInfo.segmentIndex, { start: parseFloat(newStart.toFixed(3)) });
          }
        } else if (dragInfo.type === "trim-end") {
          let newEnd = Math.min(duration || 9999, dragInfo.initialEnd + deltaTime);
          if (newEnd > dragInfo.initialStart + 0.2) {
            onUpdateSegment(dragInfo.segmentIndex, { end: parseFloat(newEnd.toFixed(3)) });
          }
        } else if (dragInfo.type === "move") {
          const segDuration = dragInfo.initialEnd - dragInfo.initialStart;
          let newStart = Math.max(0, dragInfo.initialStart + deltaTime);
          let newEnd = newStart + segDuration;
          if (newEnd <= (duration || 9999)) {
            onUpdateSegment(dragInfo.segmentIndex, {
              start: parseFloat(newStart.toFixed(3)),
              end: parseFloat(newEnd.toFixed(3)),
            });
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      setDragInfo(null);
    };

    if (isDraggingPlayhead || dragInfo) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPlayhead, dragInfo, zoom, pxToTime, segments, duration, onSeek, onUpdateSegment]);

  // Handle Timeline Mouse Wheel Rolling & Ctrl-Zoom
  const handleTimelineWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 5 : -5;
      setZoom((z) => Math.max(10, Math.min(100, z + delta)));
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY || e.deltaX;
    }
  };

  // Keep playhead in view during playback
  useEffect(() => {
    if (scrollContainerRef.current && !isDraggingPlayhead) {
      const container = scrollContainerRef.current;
      const playheadPx = timeToPx(currentTime);
      const scrollLeft = container.scrollLeft;
      const visibleWidth = container.clientWidth;

      if (playheadPx > scrollLeft + visibleWidth - 100) {
        container.scrollLeft = playheadPx - 100;
      } else if (playheadPx < scrollLeft) {
        container.scrollLeft = Math.max(0, playheadPx - 50);
      }
    }
  }, [currentTime, timeToPx, isDraggingPlayhead]);

  // Handle Split current active segment at playhead (or under playhead)
  const handleSplitAtPlayhead = () => {
    let targetIdx = activeSegmentIndex;
    if (
      targetIdx === null ||
      !segments[targetIdx] ||
      currentTime < segments[targetIdx].start - 0.05 ||
      currentTime > segments[targetIdx].end + 0.05
    ) {
      targetIdx = segments.findIndex((s) => currentTime >= s.start && currentTime <= s.end);
    }

    if (targetIdx !== -1 && segments[targetIdx]) {
      const activeSeg = segments[targetIdx];
      let splitTime = currentTime;
      // If playhead is right at start or end or outside, split cleanly at midpoint
      if (splitTime <= activeSeg.start + 0.2 || splitTime >= activeSeg.end - 0.2) {
        splitTime = parseFloat(((activeSeg.start + activeSeg.end) / 2).toFixed(3));
      }
      onSplitSegment(targetIdx, splitTime);
    }
  };

  // Keyboard shortcut listener: S for split, Delete for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (activeSegmentIndex !== null) {
          e.preventDefault();
          onDeleteSegment(activeSegmentIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSegmentIndex, currentTime, segments]);

  // Generate ruler markers
  const rulerInterval = zoom < 20 ? 10 : zoom < 45 ? 5 : 1;
  const numMarkers = Math.ceil((duration || 60) / rulerInterval);
  const markers = Array.from({ length: numMarkers + 1 }, (_, i) => i * rulerInterval);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-t border-zinc-800/90 select-none">
      {/* TIMELINE TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-zinc-800 text-zinc-300 text-xs">
        {/* Left: Editing Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSplitAtPlayhead}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg border border-zinc-700/60 font-medium transition active:scale-95 shadow"
            title="Chia tách phụ đề tại Playhead (Phím S)"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Tách (S)</span>
          </button>

          <button
            onClick={() => onAddSegment(currentTime)}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg border border-zinc-700/60 font-medium transition active:scale-95 shadow"
            title="Thêm phụ đề mới tại vị trí này"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Thêm</span>
          </button>

          <button
            onClick={() => {
              if (activeSegmentIndex !== null) onDeleteSegment(activeSegmentIndex);
            }}
            disabled={activeSegmentIndex === null}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium transition ${
              activeSegmentIndex !== null
                ? "bg-zinc-800 hover:bg-red-950/40 text-red-400 border-red-500/30 hover:border-red-500/60"
                : "bg-zinc-900/50 text-zinc-600 border-zinc-800 cursor-not-allowed"
            }`}
            title="Xóa phụ đề đã chọn (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa</span>
          </button>

          <div className="h-4 w-px bg-zinc-700/80 mx-1" />

          {/* Snap toggle */}
          <button
            onClick={() => setIsSnapEnabled(!isSnapEnabled)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition ${
              isSnapEnabled
                ? "bg-indigo-950/60 text-indigo-300 border-indigo-500/40"
                : "bg-zinc-800/60 text-zinc-400 border-zinc-700"
            }`}
            title="Bắt dính điểm đầu/cuối (Snap)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Bắt dính</span>
          </button>
        </div>

        {/* Right: Zoom Level Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(10, z - 10))}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
            title="Thu nhỏ timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <button
            onClick={() => setZoom((z) => Math.min(100, z + 10))}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
            title="Phóng to timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-zinc-500 font-mono text-[11px] min-w-[32px] text-right">
            {zoom}px/s
          </span>
        </div>
      </div>

      {/* TRACK HEADER + SCROLLABLE TIMELINE BODY */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Track Headers (Fixed on left) */}
        <div className="w-32 bg-zinc-900 border-r border-zinc-800 flex flex-col z-20 shadow-md">
          {/* Ruler spacer */}
          <div className="h-6 border-b border-zinc-800/80 bg-zinc-900/90" />

          {/* Video Track Header */}
          <div className="h-12 border-b border-zinc-800 flex items-center px-3 gap-2 text-zinc-400 text-xs font-medium">
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span>Video</span>
          </div>

          {/* Audio Track Header */}
          <div className="h-12 border-b border-zinc-800 flex items-center px-3 gap-2 text-zinc-400 text-xs font-medium">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Âm thanh</span>
          </div>

          {/* Subtitle Track Header */}
          <div className="h-16 flex items-center px-3 gap-2 text-zinc-300 text-xs font-semibold bg-indigo-950/20">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Phụ đề</span>
          </div>
        </div>

        {/* Scrollable Timeline Grid */}
        <div
          ref={scrollContainerRef}
          onWheel={handleTimelineWheel}
          className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-zinc-950"
        >
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            style={{ width: `${totalWidth}px` }}
            className="relative h-full cursor-pointer"
          >
            {/* TIME RULER */}
            <div className="h-6 bg-zinc-900/60 border-b border-zinc-800 flex items-center relative text-[10px] font-mono text-zinc-500">
              {markers.map((sec) => {
                const leftPx = timeToPx(sec);
                const mins = Math.floor(sec / 60);
                const remainderSec = Math.floor(sec % 60);
                const timeLabel = `${mins}:${String(remainderSec).padStart(2, "0")}`;
                return (
                  <div
                    key={sec}
                    style={{ left: `${leftPx}px` }}
                    className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                  >
                    <div className="h-2 w-px bg-zinc-600" />
                    <span className="mt-0.5 ml-1 select-none">{timeLabel}</span>
                  </div>
                );
              })}
            </div>

            {/* TRACK 1: INTERACTIVE VIDEO TRACK (FILMSTRIP / VIDEO TAMP) */}
            <div
              onClick={(e) => {
                if (!timelineRef.current) return;
                const rect = timelineRef.current.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const seekTime = pxToTime(clickX);
                onSeek(seekTime);
                const targetIdx = segments.findIndex((s) => seekTime >= s.start && seekTime <= s.end);
                if (targetIdx !== -1) {
                  onSelectSegment(targetIdx);
                }
              }}
              className="h-12 border-b border-zinc-900/80 bg-zinc-900/30 relative flex items-center px-1 cursor-pointer hover:bg-zinc-900/50 transition-colors"
              title="Nhấp để định vị video và chọn phân đoạn tương ứng"
            >
              <div
                style={{ width: `${timeToPx(duration || 60)}px` }}
                className="h-9 bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-blue-950/70 border border-blue-800/40 rounded-lg flex items-center px-3 gap-2 text-blue-300 text-xs overflow-hidden shadow-inner relative"
              >
                {/* Filmstrip perforations visual indicator */}
                <div className="absolute top-0 left-0 right-0 h-1 flex justify-between px-1 opacity-25 pointer-events-none">
                  {Array.from({ length: Math.min(60, Math.floor(totalWidth / 24)) }).map((_, i) => (
                    <div key={i} className="w-2 h-0.5 bg-white rounded-xs" />
                  ))}
                </div>
                <div className="flex items-center gap-2 z-10 pointer-events-none">
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-mono truncate font-medium text-[11px]">
                    Video Track ({Math.round(duration || 0)}s) • Nhấp để định vị
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 flex justify-between px-1 opacity-25 pointer-events-none">
                  {Array.from({ length: Math.min(60, Math.floor(totalWidth / 24)) }).map((_, i) => (
                    <div key={i} className="w-2 h-0.5 bg-white rounded-xs" />
                  ))}
                </div>
              </div>
            </div>

            {/* TRACK 2: AUDIO WAVEFORM TRACK */}
            <div className="h-12 border-b border-zinc-900/80 bg-zinc-900/20 relative flex items-center px-2">
              <div
                style={{ width: `${timeToPx(duration || 60)}px` }}
                className="h-9 bg-amber-950/30 border border-amber-800/30 rounded-lg flex items-center px-2 gap-1 overflow-hidden"
              >
                {/* Simulated Waveform Bars */}
                {Array.from({ length: Math.min(120, Math.floor(totalWidth / 8)) }).map((_, idx) => {
                  const heights = [30, 50, 80, 40, 95, 65, 35, 75, 55, 90];
                  const barHeight = heights[idx % heights.length];
                  return (
                    <div
                      key={idx}
                      style={{ height: `${barHeight}%` }}
                      className="w-1 bg-amber-500/40 rounded-full flex-shrink-0"
                    />
                  );
                })}
              </div>
            </div>

            {/* TRACK 3: SUBTITLE SEGMENT CLIPS */}
            <div className="h-16 bg-zinc-950/40 relative flex items-center py-1">
              {segments.map((seg, idx) => {
                const segLeft = timeToPx(seg.start);
                const segWidth = Math.max(24, timeToPx(seg.end - seg.start));
                const isSelected = activeSegmentIndex === idx;

                return (
                  <div
                    key={seg.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSegment(idx);
                      if (timelineRef.current) {
                        const rect = timelineRef.current.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const clickTime = pxToTime(clickX);
                        const clamped = Math.max(seg.start, Math.min(seg.end, clickTime));
                        onSeek(clamped);
                      } else {
                        onSeek(seg.start);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragInfo({
                        segmentIndex: idx,
                        type: "move",
                        startX: e.clientX,
                        initialStart: seg.start,
                        initialEnd: seg.end,
                      });
                    }}
                    style={{
                      left: `${segLeft}px`,
                      width: `${segWidth}px`,
                    }}
                    className={`absolute top-2 bottom-2 rounded-lg border flex items-center justify-between px-2 cursor-grab active:cursor-grabbing transition-all group overflow-hidden ${
                      isSelected
                        ? "bg-indigo-600/40 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 z-10"
                        : "bg-zinc-800/90 hover:bg-zinc-800 border-zinc-700/80 text-zinc-300"
                    }`}
                  >
                    {/* Trim Left Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragInfo({
                          segmentIndex: idx,
                          type: "trim-start",
                          startX: e.clientX,
                          initialStart: seg.start,
                          initialEnd: seg.end,
                        });
                      }}
                      className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-indigo-400/60 transition"
                      title="Kéo để chỉnh thời gian bắt đầu"
                    />

                    {/* Clip Content Preview */}
                    <div className="flex items-center gap-1.5 mx-2 min-w-0 overflow-hidden pointer-events-none">
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-900/80 text-zinc-400 border border-zinc-700/50 flex-shrink-0">
                        #{(idx + 1).toString().padStart(2, "0")}
                      </span>
                      <span className="text-xs font-medium truncate">
                        {seg.translated_text || seg.text}
                      </span>
                    </div>

                    {/* Trim Right Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragInfo({
                          segmentIndex: idx,
                          type: "trim-end",
                          startX: e.clientX,
                          initialStart: seg.start,
                          initialEnd: seg.end,
                        });
                      }}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-indigo-400/60 transition"
                      title="Kéo để chỉnh thời gian kết thúc"
                    />
                  </div>
                );
              })}
            </div>

            {/* PLAYHEAD SCRUBBER */}
            <div
              style={{ left: `${timeToPx(currentTime)}px` }}
              className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
            >
              {/* Playhead Flag Handle */}
              <div
                onMouseDown={handlePlayheadMouseDown}
                className="w-4 h-4 bg-indigo-500 rotate-45 -mt-1.5 rounded-sm shadow-md pointer-events-auto cursor-ew-resize border border-white/60 hover:scale-110 transition-transform"
              />
              {/* Playhead Line */}
              <div className="w-0.5 flex-1 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
