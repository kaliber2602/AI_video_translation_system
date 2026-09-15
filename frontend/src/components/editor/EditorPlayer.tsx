import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Smartphone,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Crop,
  X,
} from "lucide-react";

import type { SubtitleSegment, SubtitleStyleConfig, SubtitleMaskConfig, OverlayConfig } from "../../types/video";
import { formatSubtitleLines } from "../../utils/subtitleUtils";

interface EditorPlayerProps {
  videoUrl: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  segments: SubtitleSegment[];
  styleConfig: SubtitleStyleConfig;
  activeSegmentIndex: number | null;
  aspectRatio: "16:9" | "9:16";
  onToggleAspectRatio: () => void;
  subtitleMask?: SubtitleMaskConfig;
  onUpdateSubtitleMask?: (mask: SubtitleMaskConfig) => void;
  isMaskingMode?: boolean;
  onToggleMaskingMode?: () => void;
  overlayConfig?: OverlayConfig;
}

export const EditorPlayer: React.FC<EditorPlayerProps> = ({
  videoUrl,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onTogglePlay,
  onSeek,
  segments,
  styleConfig,
  activeSegmentIndex,
  aspectRatio,
  onToggleAspectRatio,
  subtitleMask,
  onUpdateSubtitleMask,
  isMaskingMode = false,
  onToggleMaskingMode,
  overlayConfig,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  // Synchronize play/pause state with parent
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  // Synchronize seek from parent when divergence > 0.3s
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - currentTime) > 0.35) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Find currently active subtitle text
  const currentSubtitle = useMemo(() => {
    // If activeSegmentIndex is provided and matches time or forced, prioritize
    if (
      activeSegmentIndex !== null &&
      segments[activeSegmentIndex] &&
      currentTime >= segments[activeSegmentIndex].start &&
      currentTime <= segments[activeSegmentIndex].end
    ) {
      return segments[activeSegmentIndex];
    }
    return segments.find((seg) => currentTime >= seg.start && currentTime <= seg.end) || null;
  }, [segments, currentTime, activeSegmentIndex]);

  // Video Native Dimensions and True WYSIWYG Resolution Scaling
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });
  const [playerDisplayWidth, setPlayerDisplayWidth] = useState<number>(800);

  // Drag selection state for Subtitle Eraser Mask
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDimensions({
        width: videoRef.current.videoWidth || 1920,
        height: videoRef.current.videoHeight || 1080,
      });
      setPlayerDisplayWidth(videoRef.current.clientWidth || 800);
    }
  };

  useEffect(() => {
    const updateDisplayWidth = () => {
      if (videoRef.current) {
        setPlayerDisplayWidth(videoRef.current.clientWidth || 800);
      }
    };
    updateDisplayWidth();
    window.addEventListener("resize", updateDisplayWidth);
    return () => window.removeEventListener("resize", updateDisplayWidth);
  }, []);

  // Scale factor: aligns web player preview exactly with 1920x1080 ASS video buffer
  const scaleFactor = useMemo(() => {
    const native = videoDimensions.width || 1920;
    return playerDisplayWidth > 0 ? playerDisplayWidth / native : 1;
  }, [playerDisplayWidth, videoDimensions.width]);

  // Format timecode (MM:SS.mmm)
  const formatTimecode = (sec: number) => {
    if (isNaN(sec) || sec < 0) return "00:00.000";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const millis = Math.floor((sec % 1) * 1000);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  };

  // Scaled font size & stroke matching 1920x1080 ASS PlayRes
  const scaledFontSize = Math.max(12, Math.round(styleConfig.fontSize * (scaleFactor > 0 ? scaleFactor * 1.5 : 1)));
  const scaledOutline =
    styleConfig.outlineWidth > 0
      ? Math.max(1, Math.round(styleConfig.outlineWidth * (scaleFactor > 0 ? scaleFactor * 1.5 : 1)))
      : 0;

  // Build Subtitle CSS styles and animations based on styleConfig (True WYSIWYG)
  const subtitleStyles: React.CSSProperties = {
    fontFamily: styleConfig.fontName || "Montserrat, sans-serif",
    fontSize: `${scaledFontSize}px`,
    color: styleConfig.primaryColor || "#FFFFFF",
    fontWeight: styleConfig.bold ? 700 : 500,
    fontStyle: styleConfig.italic ? "italic" : "normal",
    textTransform: styleConfig.uppercase ? "uppercase" : "none",
    WebkitTextStroke:
      scaledOutline > 0
        ? `${scaledOutline}px ${styleConfig.outlineColor || "#000000"}`
        : "none",
    textShadow:
      scaledOutline > 0
        ? `0 2px 4px ${styleConfig.outlineColor || "#000000"}CC`
        : "0 2px 8px rgba(0,0,0,0.8)",
    backgroundColor: styleConfig.backgroundColor || "transparent",
    wordBreak: "keep-all",
    overflowWrap: "break-word",
    whiteSpace: "normal",
    textAlign: "center",
  };

  // Vertical position
  const getPositionClass = () => {
    if (styleConfig.position === "top") return "top-6";
    if (styleConfig.position === "middle") return "top-1/2 -translate-y-1/2";
    // bottom position: on 9:16 portrait Shorts, push up above TikTok like/comment UI
    return aspectRatio === "9:16" ? "bottom-24" : "bottom-10";
  };

  // Effect animation class
  const getEffectClass = () => {
    switch (styleConfig.effect) {
      case "fade":
        return "animate-sub-fade";
      case "pop":
        return "animate-sub-pop";
      case "slide":
        return "animate-sub-slide";
      case "karaoke":
        return "animate-sub-karaoke";
      default:
        return "";
    }
  };

  // Mouse handlers for drawing Subtitle Eraser Bounding Box
  const handleMouseDownOnVideo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMaskingMode) return;
    e.preventDefault();
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragCurrent({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMoveOnVideo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMaskingMode || !dragStart) return;
    setDragCurrent({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUpOnVideo = () => {
    if (!isMaskingMode || !dragStart || !dragCurrent || !videoRef.current) {

      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const vRect = videoRef.current.getBoundingClientRect();
    const nativeW = videoRef.current.videoWidth || 1920;
    const nativeH = videoRef.current.videoHeight || 1080;
    const scaleX = vRect.width / nativeW;
    const scaleY = vRect.height / nativeH;

    const minX = Math.min(dragStart.x, dragCurrent.x) - vRect.left;
    const minY = Math.min(dragStart.y, dragCurrent.y) - vRect.top;
    const dragW = Math.abs(dragCurrent.x - dragStart.x);
    const dragH = Math.abs(dragCurrent.y - dragStart.y);

    if (dragW > 15 && dragH > 15) {
      const nativeX = Math.max(0, Math.round(minX / scaleX));
      const nativeY = Math.max(0, Math.round(minY / scaleY));
      const nativeBoxW = Math.min(nativeW - nativeX, Math.round(dragW / scaleX));
      const nativeBoxH = Math.min(nativeH - nativeY, Math.round(dragH / scaleY));

      onUpdateSubtitleMask?.({
        enabled: true,
        x: nativeX,
        y: nativeY,
        width: nativeBoxW,
        height: nativeBoxH,
        mask_type: subtitleMask?.mask_type || "blur",
        opacity: subtitleMask?.opacity ?? 0.85,
        color: subtitleMask?.color || "black",
      });
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center bg-zinc-950/90 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl select-none w-full h-full min-h-[300px]"
    >
      {/* Aspect Ratio & Safe Guide Badge Header */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleAspectRatio}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-700/60 text-xs font-medium backdrop-blur-md transition-all shadow"
            title="Toggle Aspect Ratio (16:9 vs 9:16)"
          >
            {aspectRatio === "16:9" ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                <span>16:9 Ngang</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                <span>9:16 Shorts/Reels</span>
              </>
            )}
          </button>

          {/* Subtitle Mask Mode Button */}
          {onToggleMaskingMode && (
            <button
              onClick={onToggleMaskingMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium backdrop-blur-md transition-all shadow ${
                isMaskingMode
                  ? "bg-rose-500/25 border-rose-500 text-rose-300 ring-2 ring-rose-500/40"
                  : subtitleMask?.enabled
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700/60"
              }`}
              title="Vẽ vùng che phụ đề cũ (Blur hoặc Banner)"
            >
              <Crop className="w-3.5 h-3.5" />
              <span>
                {isMaskingMode
                  ? "Đang vẽ vùng che..."
                  : subtitleMask?.enabled
                  ? "Đã bật che phụ đề cũ"
                  : "Che phụ đề cũ"}
              </span>
            </button>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2 bg-zinc-900/90 px-3 py-1 rounded-lg border border-zinc-700/60 text-xs font-mono text-zinc-300 backdrop-blur-md">
          <span className="text-emerald-400 font-semibold">{formatTimecode(currentTime)}</span>
          <span className="text-zinc-500">/</span>
          <span className="text-zinc-400">{formatTimecode(duration)}</span>
        </div>
      </div>

      {/* Video Container Canvas */}
      <div
        onMouseDown={handleMouseDownOnVideo}
        onMouseMove={handleMouseMoveOnVideo}
        onMouseUp={handleMouseUpOnVideo}
        className={`relative flex items-center justify-center overflow-hidden transition-all duration-300 ${
          isMaskingMode ? "cursor-crosshair" : "cursor-default"
        } ${
          aspectRatio === "16:9"
            ? "w-full aspect-video max-h-[75vh]"
            : "h-[85%] aspect-[9/16] rounded-xl border border-zinc-700/50 shadow-2xl"
        }`}
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={isMaskingMode ? undefined : onTogglePlay}
            playsInline
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-900/60 text-zinc-500 text-sm gap-2">
            <Monitor className="w-10 h-10 text-zinc-600 animate-pulse" />
            <span>Đang tải video preview...</span>
          </div>
        )}

        {/* 9:16 Safe Zone Overlay Indicator */}
        {aspectRatio === "9:16" && (
          <div className="absolute inset-0 pointer-events-none border border-dashed border-pink-500/20 rounded-xl">
            {/* Safe zone indicators: TikTok right action buttons */}
            <div className="absolute right-2 bottom-16 flex flex-col gap-2 items-center opacity-30">
              <div className="w-7 h-7 rounded-full bg-white/40" />
              <div className="w-7 h-7 rounded-full bg-white/40" />
              <div className="w-7 h-7 rounded-full bg-white/40" />
            </div>
            {/* TikTok bottom caption guide */}
            <div className="absolute left-3 right-12 bottom-6 h-6 rounded bg-white/10 opacity-20" />
          </div>
        )}

        {/* 1. SUBTITLE BLUR / BANNER MASK OVERLAY */}
        {subtitleMask?.enabled && subtitleMask.width > 0 && subtitleMask.height > 0 && (
          <div
            style={{
              position: "absolute",
              left: `${(subtitleMask.x / (videoDimensions.width || 1920)) * 100}%`,
              top: `${(subtitleMask.y / (videoDimensions.height || 1080)) * 100}%`,
              width: `${(subtitleMask.width / (videoDimensions.width || 1920)) * 100}%`,
              height: `${(subtitleMask.height / (videoDimensions.height || 1080)) * 100}%`,
              ...(subtitleMask.mask_type === "banner"
                ? {
                    backgroundColor: subtitleMask.color || "black",
                    opacity: subtitleMask.opacity ?? 0.85,
                  }
                : {
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    backgroundColor: "rgba(0,0,0,0.35)",
                    boxShadow: "inset 0 0 10px rgba(0,0,0,0.6)",
                  }),
            }}
            className="pointer-events-none rounded transition-all duration-150 z-15"
          >
            {isMaskingMode && (
              <div className="absolute -top-5 left-0 flex items-center gap-1 bg-rose-600 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-auto">
                <span>Vùng che: {subtitleMask.width}x{subtitleMask.height}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateSubtitleMask?.({ ...subtitleMask, enabled: false });
                  }}
                  className="hover:bg-rose-700 rounded px-0.5"
                  title="Xóa vùng che"
                >
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active drag bounding box preview */}
        {dragStart && dragCurrent && videoRef.current && (
          <div
            style={{
              position: "absolute",
              left: `${Math.min(dragStart.x, dragCurrent.x) - (videoRef.current?.getBoundingClientRect().left || 0)}px`,
              top: `${Math.min(dragStart.y, dragCurrent.y) - (videoRef.current?.getBoundingClientRect().top || 0)}px`,
              width: `${Math.abs(dragCurrent.x - dragStart.x)}px`,
              height: `${Math.abs(dragCurrent.y - dragStart.y)}px`,
            }}
            className="border-2 border-dashed border-rose-500 bg-rose-500/20 pointer-events-none z-30 rounded"
          />
        )}

        {/* 2. LOGO WATERMARK OVERLAY */}
        {overlayConfig?.logo_url && (
          <div
            style={{
              position: "absolute",
              left: `${(overlayConfig.logo_x / (videoDimensions.width || 1920)) * 100}%`,
              top: `${(overlayConfig.logo_y / (videoDimensions.height || 1080)) * 100}%`,
              opacity: overlayConfig.logo_opacity ?? 1,
              transform: `scale(${overlayConfig.logo_scale ?? 1})`,
              transformOrigin: "top left",
            }}
            className="pointer-events-none z-18"
          >
            <img
              src={overlayConfig.logo_url}
              alt="Watermark Logo"
              className="max-h-14 object-contain drop-shadow"
            />
          </div>
        )}

        {/* 3. LOWER-THIRD TICKER MARQUEE OVERLAY */}
        {overlayConfig?.ticker_text && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: aspectRatio === "9:16" ? "4.5rem" : "1.2rem",
              backgroundColor: overlayConfig.ticker_bg_color || "rgba(0,0,0,0.6)",
              color: overlayConfig.ticker_color || "white",
              fontSize: `${Math.max(11, Math.round((overlayConfig.ticker_font_size || 20) * scaleFactor))}px`,
            }}
            className="z-19 overflow-hidden whitespace-nowrap py-1 font-medium pointer-events-none border-y border-white/10"
          >
            <div className="inline-block animate-pulse whitespace-nowrap px-4">
              {overlayConfig.ticker_text}
            </div>
          </div>
        )}

        {/* 4. LIVE SUBTITLE OVERLAY (Rendered on top of mask) */}
        {currentSubtitle && (
          <div
            className={`absolute left-4 right-4 z-20 flex justify-center pointer-events-none transition-all duration-150 ${getPositionClass()}`}
          >
            <div
              key={`${currentSubtitle.start}-${styleConfig.effect}`}
              style={subtitleStyles}
              className={`px-4 py-1.5 rounded-lg max-w-[min(90%,840px)] text-center leading-snug tracking-wide select-none whitespace-normal break-words ${getEffectClass()}`}
            >
              {formatSubtitleLines(
                currentSubtitle.translated_text || currentSubtitle.text || "",
                styleConfig.maxLines || 2,
                aspectRatio === "9:16" ? 26 : 38
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Modern Player Control Bar */}
      <div className="w-full px-4 py-2.5 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent flex items-center justify-between gap-3 text-zinc-300 text-sm z-30">
        {/* Left: Playback & Step Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            title="Tua lùi 5 giây (←)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md shadow-indigo-600/30 active:scale-95"
            title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 5))}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            title="Tua tới 5 giây (→)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Frame Step Backward / Forward */}
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 0.04))}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition text-xs"
            title="Lùi 1 khung hình"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 0.04))}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition text-xs"
            title="Tới 1 khung hình"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Playhead Progress Bar Slider */}
        <div className="flex-1 mx-3 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.01}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
          />
        </div>

        {/* Right: Volume, Speed & Fullscreen */}
        <div className="flex items-center gap-3">
          {/* Volume Slider */}
          <div className="flex items-center gap-1.5 group">
            <button
              onClick={toggleMute}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
              title={isMuted ? "Bật âm thanh" : "Tắt âm"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-400 hover:accent-white transition"
            />
          </div>

          {/* Speed Selector */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg text-xs font-medium text-zinc-300 hover:text-white transition"
            >
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-9 right-0 bg-zinc-900 border border-zinc-700 rounded-xl p-1.5 shadow-xl flex flex-col gap-1 z-50 min-w-[70px]">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`px-2.5 py-1 text-xs rounded-md text-left transition ${
                      playbackRate === rate
                        ? "bg-indigo-600 text-white font-semibold"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
