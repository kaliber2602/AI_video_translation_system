import {
  ShieldCheck,
  Undo,
  Redo,
  RefreshCw,
  MoveVertical,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { RefObject } from "react";
import type { SubtitleSegment } from "../../../types/video";

interface SubtitlePreviewPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoContainerRef: RefObject<HTMLDivElement | null>;
  videoPreviewUrl: string | null;
  selectedFormat: string;
  isPlaying: boolean;
  togglePlayPause: () => void;
  handleTimeUpdate: () => void;
  handleLoadedMetadata: () => void;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  duration: number;
  handleSeek: (time: number) => void;
  isMuted: boolean;
  handleToggleMute: () => void;
  historyStack: any[];
  redoStack: any[];
  handleUndo: () => void;
  handleRedo: () => void;
  showSafeArea: boolean;
  setShowSafeArea: React.Dispatch<React.SetStateAction<boolean>>;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3";
  setAspectRatio: (ratio: "16:9" | "9:16" | "1:1" | "4:3") => void;
  isSubtitleEnabled?: boolean;
  zoomLevel: "fit" | "75" | "100";
  setZoomLevel: (zoom: "fit" | "75" | "100") => void;
  replayAnimation: () => void;
  snapActive: "center" | "bottom" | "top" | "centerX" | null;
  positionX: number;
  positionY: number;
  displayedPreviewText: string;
  isDragging: boolean;
  handleDragStart: (clientX: number, clientY: number) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  isEditingInline: boolean;
  setIsEditingInline: (editing: boolean) => void;
  inlineEditText: string;
  setInlineEditText: (text: string) => void;
  activeSegmentIndex: number;
  previewSegmentIndex: number;
  segments: SubtitleSegment[];
  handleUpdateSegmentText: (index: number, text: string) => void;
  handleSeekToSegment: (index: number) => void;
  animKey: number;
  effectAnimationClass: string;
  isBilingual: boolean;
  fontName: string;
  fontSizePx: number;
  lineSpacing: number;
  primaryColor: string;
  alignment: "left" | "center" | "right" | "justify";
  outlineColor: string;
  currentSegment: SubtitleSegment | null;
  chunkAudioRef: RefObject<HTMLAudioElement | null>;
  setPlayingChunkIndex: (idx: number | null) => void;
  formatSeconds: (sec: number) => string;
}

export default function SubtitlePreviewPlayer({
  videoRef,
  videoContainerRef,
  videoPreviewUrl,
  selectedFormat,
  isPlaying,
  togglePlayPause,
  handleTimeUpdate,
  handleLoadedMetadata,
  setIsPlaying,
  currentTime,
  duration,
  handleSeek,
  isMuted,
  handleToggleMute,
  historyStack,
  redoStack,
  handleUndo,
  handleRedo,
  showSafeArea,
  setShowSafeArea,
  aspectRatio,
  setAspectRatio,
  isSubtitleEnabled = true,
  zoomLevel,
  setZoomLevel,
  replayAnimation,
  snapActive,
  positionX,
  positionY,
  displayedPreviewText,
  isDragging,
  handleDragStart,
  fontSize,
  setFontSize,
  isEditingInline,
  setIsEditingInline,
  inlineEditText,
  setInlineEditText,
  activeSegmentIndex,
  previewSegmentIndex,
  segments,
  handleUpdateSegmentText,
  handleSeekToSegment,
  animKey,
  effectAnimationClass,
  isBilingual,
  fontName,
  fontSizePx,
  lineSpacing,
  primaryColor,
  alignment,
  outlineColor,
  currentSegment,
  chunkAudioRef,
  setPlayingChunkIndex,
  formatSeconds,
}: SubtitlePreviewPlayerProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-card)]">
      {/* Canvas Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isPlaying ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
            }`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
            Xem Trước
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)] text-[var(--color-primary)] border border-[var(--color-border)] uppercase">
            .{selectedFormat}
          </span>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo / Redo Buttons */}
          <div className="flex items-center gap-0.5 bg-[var(--color-surface-muted)] p-0.5 rounded-lg border border-[var(--color-border)]">
            <button
              type="button"
              disabled={historyStack.length === 0}
              onClick={handleUndo}
              className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo size={12} />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Làm lại (Ctrl+Y)"
            >
              <Redo size={12} />
            </button>
          </div>

          {/* Safe Area Toggle */}
          <button
            type="button"
            onClick={() => setShowSafeArea((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
              showSafeArea
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
            title="Hiển thị vùng an toàn giao diện TikTok / Reels tránh che chữ"
          >
            <ShieldCheck size={12} />
            <span>Vùng an toàn</span>
          </button>

          {/* Aspect Ratio Switcher */}
          <div className="flex items-center gap-0.5 bg-[var(--color-surface-muted)] p-0.5 rounded-xl border border-[var(--color-border)]">
            {(["16:9", "9:16", "1:1", "4:3"] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => {
                  setAspectRatio(ratio);
                  if (ratio === "9:16") setShowSafeArea(true);
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                  aspectRatio === ratio
                    ? "bg-[var(--color-primary)] text-white shadow-xs"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-0.5 bg-[var(--color-surface-muted)] p-0.5 rounded-lg border border-[var(--color-border)] text-[10px]">
            <button
              type="button"
              onClick={() => setZoomLevel("fit")}
              className={`px-1.5 py-0.5 rounded font-semibold transition ${
                zoomLevel === "fit" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]"
              }`}
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel("75")}
              className={`px-1.5 py-0.5 rounded font-semibold transition ${
                zoomLevel === "75" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]"
              }`}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel("100")}
              className={`px-1.5 py-0.5 rounded font-semibold transition ${
                zoomLevel === "100" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]"
              }`}
            >
              100%
            </button>
          </div>

          {/* Replay Motion Button */}
          <button
            type="button"
            onClick={replayAnimation}
            className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
            title="Chạy lại hiệu ứng chuyển động"
          >
            <RefreshCw size={11} />
            <span>Thử hiệu ứng</span>
          </button>
        </div>
      </div>

      {/* Clean Cinema Player Stage - Sleek modern frame */}
      <div className="mt-3 flex justify-center items-center bg-black rounded-xl overflow-hidden min-h-[400px] max-h-[580px] p-2 sm:p-3 border border-zinc-800 shadow-inner relative select-none">
        {/* Actual Video Frame Boundary (The Editable Canvas) */}
        <div
          ref={videoContainerRef}
          style={{
            transform: zoomLevel === "75" ? "scale(0.75)" : zoomLevel === "100" ? "scale(1)" : "none",
            transformOrigin: "center center",
          }}
          className={`relative flex w-full justify-center overflow-hidden transition-all duration-300 rounded-lg bg-black cursor-default ${
            aspectRatio === "9:16"
              ? "aspect-[9/16] max-h-[520px] max-w-[292px]"
              : aspectRatio === "1:1"
              ? "aspect-square max-h-[460px] max-w-[460px]"
              : aspectRatio === "4:3"
              ? "aspect-[4/3] max-h-[460px] max-w-[610px]"
              : "aspect-video max-h-[460px] max-w-[800px]"
          }`}
        >
          {/* Aspect Ratio & Resolution Badge */}
          <div className="absolute top-2 left-2 z-30 pointer-events-none flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-mono font-bold text-white/90 border border-white/15">
              {aspectRatio === "16:9"
                ? "1920×1080 (16:9)"
                : aspectRatio === "9:16"
                ? "1080×1920 (9:16)"
                : aspectRatio === "1:1"
                ? "1080×1080 (1:1)"
                : "1440×1080 (4:3)"}
            </span>
            {isPlaying && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/80 backdrop-blur-md text-[9px] font-mono font-bold text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{formatSeconds(currentTime)}</span>
              </span>
            )}
          </div>

          {/* Video Preview Element (Click to Play/Pause) */}
          {videoPreviewUrl ? (
            <video
              ref={videoRef}
              src={videoPreviewUrl}
              className="absolute inset-0 h-full w-full object-contain opacity-90 cursor-pointer"
              onClick={togglePlayPause}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              playsInline
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0d161d] to-zinc-950" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50 pointer-events-none" />

          {/* Magnetic Snap Guidelines */}
          {snapActive === "centerX" && (
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-cyan-400 z-30 pointer-events-none flex items-center justify-center">
              <span className="bg-cyan-500 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow">
                Tâm dọc (X: 50%)
              </span>
            </div>
          )}
          {snapActive === "center" && (
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-cyan-400 z-30 pointer-events-none flex items-center justify-center">
              <span className="bg-cyan-500 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow">
                Tâm ngang (Y: 50%)
              </span>
            </div>
          )}
          {snapActive === "bottom" && (
            <div className="absolute left-0 right-0 top-[84%] -translate-y-1/2 border-t-2 border-dashed border-emerald-400 z-30 pointer-events-none flex items-center justify-center">
              <span className="bg-emerald-600 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow">
                Lề an toàn dưới (84%)
              </span>
            </div>
          )}
          {snapActive === "top" && (
            <div className="absolute left-0 right-0 top-[14%] -translate-y-1/2 border-t-2 border-dashed border-amber-400 z-30 pointer-events-none flex items-center justify-center">
              <span className="bg-amber-600 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow">
                Lề an toàn trên (14%)
              </span>
            </div>
          )}

          {/* Safe Area Overlay (Shorts / Reels: 9:16) */}
          {showSafeArea && aspectRatio === "9:16" && (
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3">
              <div className="h-10 w-full border-b border-dashed border-red-400/40 bg-red-500/10 rounded-t flex items-center justify-center">
                <span className="text-[9px] font-mono text-red-300 font-semibold">
                  Khu vực Status / Search (Tránh che)
                </span>
              </div>

              <div className="flex-1 flex justify-end items-center my-1">
                <div className="w-12 h-44 border-l border-dashed border-red-400/40 bg-red-500/10 rounded-r flex flex-col items-center justify-around py-1">
                  <span className="text-[8px] font-mono text-red-300 transform -rotate-90 whitespace-nowrap">
                    Nút Like / Share
                  </span>
                </div>
              </div>

              <div className="h-20 w-full border-t border-dashed border-red-400/40 bg-red-500/10 rounded-b flex flex-col items-center justify-center">
                <span className="text-[9px] font-mono text-red-300 font-semibold">
                  Khu vực Caption / Âm thanh TikTok
                </span>
                <span className="text-[8px] text-emerald-400 font-bold mt-0.5">
                  ✓ Đặt phụ đề ngay trên vùng này
                </span>
              </div>
            </div>
          )}

          {/* Safe Area Overlay (YouTube / Landscape: 16:9 & 4:3) */}
          {showSafeArea && (aspectRatio === "16:9" || aspectRatio === "4:3") && (
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
              <div className="h-6 w-full border-b border-dashed border-cyan-400/30 flex items-center justify-between px-2">
                <span className="text-[8px] font-mono text-cyan-300">Safe Margin Top (10%)</span>
                <span className="text-[8px] font-mono text-cyan-300">Title Bar</span>
              </div>

              <div className="h-10 w-full border-t border-dashed border-cyan-400/30 flex items-center justify-between px-2">
                <span className="text-[8px] font-mono text-cyan-300">Safe Margin Bottom (Progress Bar)</span>
                <span className="text-[8px] text-emerald-400 font-bold">✓ Vùng phụ đề chuẩn 84%</span>
              </div>
            </div>
          )}

          {/* Interactive Draggable Subtitle Box */}
          <div
            style={{
              left: `${positionX}%`,
              top: `${positionY}%`,
              transform: "translate(-50%, -50%)",
            }}
            className={`absolute z-30 flex flex-col select-none ${
              isDragging ? "transition-none" : "transition-all duration-75"
            } ${
              !isSubtitleEnabled
                ? "opacity-0 pointer-events-none"
                : displayedPreviewText
                ? "opacity-100"
                : isDragging
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            } ${
              alignment === "left"
                ? "items-start text-left"
                : alignment === "right"
                ? "items-end text-right"
                : alignment === "justify"
                ? "items-center text-justify"
                : "items-center text-center"
            }`}
          >
            {/* Drag Handle & Bounding Box */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                handleDragStart(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (e.touches[0]) handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
              }}
              className={`group relative max-w-[95%] cursor-grab active:cursor-grabbing rounded-xl p-1.5 transition-all ${
                isDragging
                  ? "ring-2 ring-emerald-400 bg-emerald-500/15 shadow-xl"
                  : "hover:ring-1 hover:ring-white/40 hover:bg-white/5"
              }`}
            >
              {/* Floating Drag Indicator Badge */}
              <div
                className={`absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono shadow-md backdrop-blur-md transition-opacity pointer-events-none whitespace-nowrap ${
                  isDragging
                    ? "bg-emerald-500 text-white opacity-100 ring-1 ring-emerald-300"
                    : "bg-black/80 text-white/90 opacity-0 group-hover:opacity-100 border border-white/20"
                }`}
              >
                <MoveVertical size={10} />
                <span>X: {Math.round(positionX)}% · Y: {Math.round(positionY)}%</span>
              </div>

              {/* Corner Marker Dots with resize handles */}
              <span
                title="Kéo góc để chỉnh cỡ chữ"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startY = e.clientY;
                  const startSize = parseInt(fontSize, 10) || 22;
                  const onMove = (ev: MouseEvent) => {
                    const diff = (startY - ev.clientY) / 3;
                    const nextSize = Math.max(12, Math.min(54, Math.round(startSize + diff)));
                    setFontSize(String(nextSize));
                  };
                  const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (!e.touches[0]) return;
                  const startY = e.touches[0].clientY;
                  const startSize = parseInt(fontSize, 10) || 22;
                  const onTouchMove = (ev: TouchEvent) => {
                    if (!ev.touches[0]) return;
                    const diff = (startY - ev.touches[0].clientY) / 3;
                    const nextSize = Math.max(12, Math.min(54, Math.round(startSize + diff)));
                    setFontSize(String(nextSize));
                  };
                  const onTouchEnd = () => {
                    window.removeEventListener("touchmove", onTouchMove);
                    window.removeEventListener("touchend", onTouchEnd);
                  };
                  window.addEventListener("touchmove", onTouchMove, { passive: true });
                  window.addEventListener("touchend", onTouchEnd);
                }}
                className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize hover:scale-125 z-40 border border-black shadow"
              />
              <span
                title="Kéo góc để chỉnh cỡ chữ"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startY = e.clientY;
                  const startSize = parseInt(fontSize, 10) || 22;
                  const onMove = (ev: MouseEvent) => {
                    const diff = (startY - ev.clientY) / 3;
                    const nextSize = Math.max(12, Math.min(54, Math.round(startSize + diff)));
                    setFontSize(String(nextSize));
                  };
                  const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (!e.touches[0]) return;
                  const startY = e.touches[0].clientY;
                  const startSize = parseInt(fontSize, 10) || 22;
                  const onTouchMove = (ev: TouchEvent) => {
                    if (!ev.touches[0]) return;
                    const diff = (startY - ev.touches[0].clientY) / 3;
                    const nextSize = Math.max(12, Math.min(54, Math.round(startSize + diff)));
                    setFontSize(String(nextSize));
                  };
                  const onTouchEnd = () => {
                    window.removeEventListener("touchmove", onTouchMove);
                    window.removeEventListener("touchend", onTouchEnd);
                  };
                  window.addEventListener("touchmove", onTouchMove, { passive: true });
                  window.addEventListener("touchend", onTouchEnd);
                }}
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-nesw-resize hover:scale-125 z-40 border border-black shadow"
              />
              <span
                title="Kéo góc để chỉnh cỡ chữ"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startY = e.clientY;
                  const startSize = parseInt(fontSize, 10) || 22;
                  const onMove = (ev: MouseEvent) => {
                    const diff = (ev.clientY - startY) / 3;
                    const nextSize = Math.max(12, Math.min(54, Math.round(startSize + diff)));
                    setFontSize(String(nextSize));
                  };
                  const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (!e.touches[0]) return;
                  const startY = e.touches[0].clientY;
                  const startSize = parseInt(fontSize, 10) || 22;
                  const onTouchMove = (ev: TouchEvent) => {
                    if (!ev.touches[0]) return;
                    const diff = (ev.touches[0].clientY - startY) / 3;
                    const nextSize = Math.max(12, Math.min(54, Math.round(startSize + diff)));
                    setFontSize(String(nextSize));
                  };
                  const onTouchEnd = () => {
                    window.removeEventListener("touchmove", onTouchMove);
                    window.removeEventListener("touchend", onTouchEnd);
                  };
                  window.addEventListener("touchmove", onTouchMove, { passive: true });
                  window.addEventListener("touchend", onTouchEnd);
                }}
                className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-nesw-resize hover:scale-125 z-40 border border-black shadow"
              />
              <span
                title="Kéo góc để chỉnh cỡ chữ"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startY = e.clientY;
                  const startSize = parseInt(fontSize, 10) || 22;
                  const onMove = (ev: MouseEvent) => {
                    const diff = (ev.clientY - startY) / 3;
                    const nextSize = Math.max(12, Math.min(54, Math.round(startSize + diff)));
                    setFontSize(String(nextSize));
                  };
                  const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (!e.touches[0]) return;
                  const startY = e.touches[0].clientY;
                  const startSize = parseInt(fontSize, 10) || 22;
                  const onTouchMove = (ev: TouchEvent) => {
                    if (!ev.touches[0]) return;
                    const diff = (ev.touches[0].clientY - startY) / 3;
                    const nextSize = Math.max(12, Math.min(54, Math.round(startSize + diff)));
                    setFontSize(String(nextSize));
                  };
                  const onTouchEnd = () => {
                    window.removeEventListener("touchmove", onTouchMove);
                    window.removeEventListener("touchend", onTouchEnd);
                  };
                  window.addEventListener("touchmove", onTouchMove, { passive: true });
                  window.addEventListener("touchend", onTouchEnd);
                }}
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize hover:scale-125 z-40 border border-black shadow"
              />

              {/* Subtitle Text Content / Direct Inline Canvas Editing */}
              {isEditingInline ? (
                <div
                  className="rounded-lg p-2 bg-black/90 border border-emerald-400 shadow-2xl z-50 min-w-[280px]"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <textarea
                    autoFocus
                    value={inlineEditText}
                    onChange={(e) => setInlineEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const idx = activeSegmentIndex !== -1 ? activeSegmentIndex : previewSegmentIndex;
                        if (idx !== -1 && segments[idx]) {
                          handleUpdateSegmentText(idx, inlineEditText);
                        }
                        setIsEditingInline(false);
                      } else if (e.key === "Escape") {
                        setIsEditingInline(false);
                      }
                    }}
                    className="w-full bg-transparent text-white font-medium text-xs outline-none resize-none p-1 border border-zinc-700 rounded"
                    rows={2}
                  />
                  <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-400">
                    <span>Nhấn Enter để lưu · Esc để hủy</span>
                    <button
                      type="button"
                      onClick={() => {
                        const idx = activeSegmentIndex !== -1 ? activeSegmentIndex : previewSegmentIndex;
                        if (idx !== -1 && segments[idx]) {
                          handleUpdateSegmentText(idx, inlineEditText);
                        }
                        setIsEditingInline(false);
                      }}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const idx = activeSegmentIndex !== -1 ? activeSegmentIndex : previewSegmentIndex;
                    const currentSeg = segments[idx];
                    setInlineEditText(currentSeg?.translated_text || displayedPreviewText);
                    setIsEditingInline(true);
                  }}
                  title="Nhấp đúp chuột để chỉnh sửa văn bản trực tiếp trên khung hình"
                >
                  {/* Rendered Subtitle Text */}
                  <div
                    key={`${animKey}-${activeSegmentIndex}`}
                    className={`rounded-lg px-3 py-1.5 transition-all ${effectAnimationClass}`}
                    style={{
                      backgroundColor:
                        selectedFormat === "vtt" ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.35)",
                      backdropFilter: "blur(3px)",
                    }}
                  >
                    {isBilingual && displayedPreviewText.includes("\n") ? (
                      <div className="flex flex-col gap-0.5" style={{ textAlign: alignment }}>
                        {/* Original Language Line */}
                        <p
                          className="font-normal tracking-wide opacity-80"
                          style={{
                            fontFamily: `${fontName}, sans-serif`,
                            fontSize: `${Math.round(fontSizePx * 0.78)}px`,
                            lineHeight: lineSpacing,
                            color: "#D0D0D0",
                            textAlign: alignment,
                            WebkitTextStroke:
                              outlineColor !== "transparent" ? `0.8px ${outlineColor}` : "none",
                            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                          }}
                        >
                          {displayedPreviewText.split("\n")[0]}
                        </p>
                        {/* Translated Language Line */}
                        <p
                          className="font-bold tracking-wide"
                          style={{
                            fontFamily: `${fontName}, sans-serif`,
                            fontSize: `${fontSizePx}px`,
                            lineHeight: lineSpacing,
                            color: primaryColor,
                            textAlign: alignment,
                            WebkitTextStroke:
                              outlineColor !== "transparent" ? `1.2px ${outlineColor}` : "none",
                            textShadow:
                              outlineColor !== "transparent"
                                ? `0 2px 4px ${outlineColor}, 0 0 8px ${outlineColor}`
                                : "0 2px 8px rgba(0,0,0,0.8)",
                          }}
                        >
                          {displayedPreviewText.split("\n").slice(1).join("\n")}
                        </p>
                      </div>
                    ) : (
                      <p
                        className="font-bold whitespace-pre-line tracking-wide"
                        style={{
                          fontFamily: `${fontName}, sans-serif`,
                          fontSize: `${fontSizePx}px`,
                          lineHeight: lineSpacing,
                          color: primaryColor,
                          textAlign: alignment,
                          WebkitTextStroke:
                            outlineColor !== "transparent" ? `1.2px ${outlineColor}` : "none",
                          textShadow:
                            outlineColor !== "transparent"
                              ? `0 2px 4px ${outlineColor}, 0 0 8px ${outlineColor}`
                              : "0 2px 8px rgba(0,0,0,0.8)",
                        }}
                      >
                        {displayedPreviewText || (isDragging ? "Kéo phụ đề đến vị trí mong muốn" : "")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Segment Indicator */}
          {currentSegment && (
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-white/75 pointer-events-none z-20 font-mono">
              <span className="flex items-center gap-1.5">
                {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                <span>
                  Đoạn #{segments.indexOf(currentSegment) + 1}/{segments.length}:{" "}
                  {formatSeconds(currentSegment.start)} → {formatSeconds(currentSegment.end)}
                </span>
              </span>
              <span className="capitalize">{alignment} · {Math.round(positionY)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Player Transport & Scrubbing Controls Bar */}
      <div className="mt-3 flex flex-col gap-2 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
        {/* Scrubber Timeline */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] min-w-[36px]">
            {formatSeconds(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
          />
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] min-w-[36px] text-right">
            {formatSeconds(duration)}
          </span>
        </div>

        {/* Controls Action Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlayPause}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold shadow-xs hover:bg-[var(--color-primary-hover)] active:scale-95 transition"
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span>{isPlaying ? "Tạm dừng" : "Phát video"}</span>
            </button>

            {/* Mute/Unmute */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-1.5 rounded-lg border text-xs transition ${
                isMuted
                  ? "border-red-400/50 bg-red-500/10 text-red-400"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>

            {/* Active Spoken Segment Badge */}
            {activeSegmentIndex !== -1 && segments[activeSegmentIndex] && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[10px] text-[var(--color-primary)] font-mono border border-[var(--color-border)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Câu #{activeSegmentIndex + 1}/{segments.length}</span>
              </span>
            )}
          </div>

          {/* Quick Segment Jump Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const prevIdx = Math.max(
                  0,
                  (activeSegmentIndex !== -1 ? activeSegmentIndex : previewSegmentIndex) - 1
                );
                handleSeekToSegment(prevIdx);
              }}
              disabled={segments.length === 0}
              className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[11px] font-semibold text-[var(--color-text-secondary)] disabled:opacity-30 transition"
              title="Nhảy đến câu thoại trước"
            >
              ← Câu trước
            </button>

            <button
              type="button"
              onClick={() => {
                const nextIdx = Math.min(
                  segments.length - 1,
                  (activeSegmentIndex !== -1 ? activeSegmentIndex : previewSegmentIndex) + 1
                );
                handleSeekToSegment(nextIdx);
              }}
              disabled={segments.length === 0}
              className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[11px] font-semibold text-[var(--color-text-secondary)] disabled:opacity-30 transition"
              title="Nhảy đến câu thoại kế tiếp"
            >
              Câu sau →
            </button>
          </div>
        </div>

        <audio
          ref={chunkAudioRef}
          onEnded={() => setPlayingChunkIndex(null)}
          onPause={() => setPlayingChunkIndex(null)}
          className="hidden"
        />
      </div>
    </div>
  );
}
