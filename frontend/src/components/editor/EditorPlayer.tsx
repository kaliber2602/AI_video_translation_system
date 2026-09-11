// frontend/src/components/editor/EditorPlayer.tsx
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
} from "lucide-react";
import type { SubtitleSegment, SubtitleStyleConfig } from "../../types/video";
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

  // Format timecode (MM:SS.mmm)
  const formatTimecode = (sec: number) => {
    if (isNaN(sec) || sec < 0) return "00:00.000";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const millis = Math.floor((sec % 1) * 1000);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  };

  // Build Subtitle CSS styles and animations based on styleConfig
  const subtitleStyles: React.CSSProperties = {
    fontFamily: styleConfig.fontName || "Montserrat, sans-serif",
    fontSize: `${styleConfig.fontSize}px`,
    color: styleConfig.primaryColor || "#FFFFFF",
    fontWeight: styleConfig.bold ? 700 : 500,
    fontStyle: styleConfig.italic ? "italic" : "normal",
    textTransform: styleConfig.uppercase ? "uppercase" : "none",
    WebkitTextStroke:
      styleConfig.outlineWidth > 0
        ? `${styleConfig.outlineWidth}px ${styleConfig.outlineColor || "#000000"}`
        : "none",
    textShadow:
      styleConfig.outlineWidth > 0
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
        </div>

        <div className="pointer-events-auto flex items-center gap-2 bg-zinc-900/90 px-3 py-1 rounded-lg border border-zinc-700/60 text-xs font-mono text-zinc-300 backdrop-blur-md">
          <span className="text-emerald-400 font-semibold">{formatTimecode(currentTime)}</span>
          <span className="text-zinc-500">/</span>
          <span className="text-zinc-400">{formatTimecode(duration)}</span>
        </div>
      </div>

      {/* Video Container Canvas */}
      <div
        className={`relative flex items-center justify-center overflow-hidden transition-all duration-300 ${
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
            onClick={onTogglePlay}
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

        {/* LIVE SUBTITLE OVERLAY */}
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
