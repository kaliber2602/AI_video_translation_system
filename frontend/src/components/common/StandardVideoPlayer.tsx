// frontend/src/components/common/StandardVideoPlayer.tsx
import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Subtitles,
  Loader2,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { formatSubtitleLines } from "../../utils/subtitleUtils";

export interface StandardVideoPlayerProps {
  src: string | null;
  selectedQuality?: string;
  availableQualities?: string[];
  onQualityChange?: (quality: string) => void;
  isSwitchingQuality?: boolean;
  hasBurnedSubtitles?: boolean;
  subtitleSegments?: Array<{
    start: number;
    end: number;
    text?: string;
    translated_text?: string;
  }>;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "auto";
  className?: string;
  onDurationChange?: (duration: number) => void;
}

export const StandardVideoPlayer: React.FC<StandardVideoPlayerProps> = ({
  src,
  selectedQuality = "1080p",
  availableQualities = ["360p", "720p", "1080p", "2k", "4k"],
  onQualityChange,
  isSwitchingQuality = false,
  hasBurnedSubtitles = true,
  subtitleSegments = [],
  aspectRatio = "auto",
  className = "",
  onDurationChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const [detectedRatio, setDetectedRatio] = useState<"16:9" | "9:16" | "1:1" | "4:3">("16:9");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCaptionsOn, setIsCaptionsOn] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Auto-hide controls timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2800);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControlsTimer();
    }
  }, [isPlaying, resetControlsTimer]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Play / Pause toggle
  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) {
        await video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  // Mute toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !isMuted;
    video.muted = next;
    setIsMuted(next);
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  // Seek bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  // Skip relative
  const skipTime = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(duration || 9999, video.currentTime + delta));
    video.currentTime = next;
    setCurrentTime(next);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return "0:00";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Resolve effective aspect ratio
  const effectiveRatio = useMemo(() => {
    if (aspectRatio === "auto") {
      return detectedRatio;
    }
    return aspectRatio || "16:9";
  }, [aspectRatio, detectedRatio]);

  // Synchronized active subtitle (when softsub)
  const activeSubtitle = useMemo(() => {
    if (hasBurnedSubtitles || !isCaptionsOn || subtitleSegments.length === 0) {
      return null;
    }
    const current = subtitleSegments.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    );
    if (!current) return null;
    const raw = current.translated_text || current.text || "";
    const maxChars = effectiveRatio === "9:16" ? 22 : (effectiveRatio === "1:1" ? 26 : (effectiveRatio === "4:3" ? 32 : 38));
    return formatSubtitleLines(raw, 2, maxChars);
  }, [hasBurnedSubtitles, isCaptionsOn, subtitleSegments, currentTime, effectiveRatio]);

  const aspectClass = useMemo(() => {
    switch (effectiveRatio) {
      case "9:16":
        return "max-h-[70vh] max-w-[340px] aspect-[9/16]";
      case "1:1":
        return "max-h-[500px] max-w-[500px] aspect-square";
      case "4:3":
        return "max-h-[520px] max-w-[690px] aspect-[4/3]";
      default:
        return "max-h-[540px] w-full aspect-video";
    }
  }, [effectiveRatio]);

  const handleMetadataLoaded = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    onDurationChange?.(video.duration);

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      const r = video.videoWidth / video.videoHeight;
      if (r >= 0.9 && r <= 1.1) {
        setDetectedRatio("1:1");
      } else if (r <= 0.65) {
        setDetectedRatio("9:16");
      } else if (r >= 1.25 && r <= 1.45) {
        setDetectedRatio("4:3");
      } else {
        setDetectedRatio("16:9");
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-black select-none border border-[var(--color-border)] shadow-2xl ${className}`}
    >
      {/* Video element wrapper */}
      <div className={`relative flex w-full items-center justify-center ${aspectClass}`}>
        {src ? (
          <video
            ref={videoRef}
            src={src}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            onTimeUpdate={() => {
              if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
            }}
            onLoadedMetadata={handleMetadataLoaded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="h-full w-full object-contain cursor-pointer"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--color-text-muted)]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mb-2" />
            <span className="text-xs">Đang nạp video phát...</span>
          </div>
        )}

        {/* Quality Switching Overlay */}
        {isSwitchingQuality && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
            <Loader2 className="h-9 w-9 animate-spin text-[var(--color-primary)]" />
            <p className="mt-3 text-xs font-semibold text-white">
              Đang chuyển sang độ phân giải {selectedQuality}...
            </p>
          </div>
        )}

        {/* Softsub Synced Subtitle Overlay */}
        {activeSubtitle && (
          <div
            className={`pointer-events-none absolute left-4 right-4 z-20 flex justify-center text-center transition-all duration-200 ${
              showControls || !isPlaying ? "bottom-20" : "bottom-6"
            }`}
          >
            <div className="inline-block max-w-xl rounded-xl bg-black/85 px-5 py-2 backdrop-blur-md border border-white/20 shadow-[0_6px_24px_rgba(0,0,0,0.85)]">
              <p className="font-bold text-white text-base sm:text-lg leading-snug tracking-wide drop-shadow-md whitespace-pre-line">
                {activeSubtitle}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Unified Video Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
          showControls || !isPlaying
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Seek Bar */}
        <div className="flex items-center gap-3 mb-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek video position"
            className="w-full h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-white">
          {/* Left Controls: Play, Step, Time */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition active:scale-95"
              title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => skipTime(-5)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition"
              title="Lùi 5 giây"
            >
              <RotateCcw size={15} />
            </button>

            <button
              type="button"
              onClick={() => skipTime(5)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition"
              title="Tua 5 giây"
            >
              <RotateCw size={15} />
            </button>

            <div className="flex items-center gap-1 font-mono text-xs text-white/80 ml-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/40">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Quality, CC, Volume, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Resolution Selector */}
            {onQualityChange && availableQualities.length > 0 && (
              <div className="relative">
                <select
                  value={selectedQuality}
                  onChange={(e) => onQualityChange(e.target.value)}
                  disabled={isSwitchingQuality}
                  aria-label="Độ phân giải video"
                  className="cursor-pointer appearance-none rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md outline-none transition hover:bg-white/20 disabled:opacity-50"
                >
                  {availableQualities.map((q) => (
                    <option key={q} value={q} className="bg-neutral-900 text-white">
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subtitle / CC Indicator */}
            {hasBurnedSubtitles ? (
              <div
                className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md select-none"
                title="Phụ đề đã được ghép trực tiếp vào video (Hardsub)"
              >
                <Subtitles size={14} />
                <span className="hidden sm:inline">Hardsub</span>
              </div>
            ) : subtitleSegments.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsCaptionsOn(!isCaptionsOn)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  isCaptionsOn
                    ? "bg-[var(--color-primary)] text-white shadow"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                title={isCaptionsOn ? "Tắt phụ đề (CC)" : "Bật phụ đề (CC)"}
              >
                <Subtitles size={16} />
              </button>
            ) : null}

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition"
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Điều chỉnh âm lượng"
                className="w-16 h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] hidden sm:inline-block"
              />
            </div>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandardVideoPlayer;
