import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import {
  FileVideo,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface DubbingPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string | null;
  isVideoPlaying: boolean;
  videoDuration: number;
  videoCurrentTime: number;
  isMuted: boolean;
  isDubbed: boolean;
  showSubtitleOverlay: boolean;
  setShowSubtitleOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  displayedSubtitleText?: string;
  activeSegmentIndex: number;
  regeneratingSegmentIdx: number | null;
  toggleVideoPlay: () => void;
  handleVideoSeek: (time: number) => void;
  toggleMute: () => void;
  handleRegenerateSegmentTTS: (idx: number, text: string) => void;
  formatTime: (seconds: number) => string;
  // Subtitle styling props
  positionY: number;
  alignment: string;
  effect: string;
  fontName: string;
  fontSize: string;
  primaryColor: string;
  outlineColor: string;
  lineSpacing: number;
  isGeneratingDub: boolean;
  isTTSReady: boolean;
  generateDubbedVideo: () => void;
  onTimeUpdate?: () => void;
  onLoadedMetadata?: () => void;
  onEnded?: () => void;
  // 3-Track Mixer Props for Real-time Audio Preview
  vocalTrackUrl?: string | null;
  bgmTrackUrl?: string | null;
  ttsTrackUrl?: string | null;
  vocalVolume?: number;
  bgmVolume?: number;
  dubVolume?: number;
  isVocalMuted?: boolean;
  isBgmMuted?: boolean;
  isDubMuted?: boolean;
}

export default function DubbingPlayer({
  videoRef,
  videoUrl,
  isVideoPlaying,
  videoDuration,
  videoCurrentTime,
  isMuted,
  isDubbed,
  showSubtitleOverlay,
  setShowSubtitleOverlay,
  displayedSubtitleText,
  activeSegmentIndex,
  regeneratingSegmentIdx,
  toggleVideoPlay,
  handleVideoSeek,
  toggleMute,
  handleRegenerateSegmentTTS,
  formatTime,
  positionY,
  alignment,
  effect,
  fontName,
  fontSize,
  primaryColor,
  outlineColor,
  lineSpacing,
  isGeneratingDub,
  isTTSReady,
  generateDubbedVideo,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  vocalTrackUrl,
  bgmTrackUrl,
  ttsTrackUrl,
  vocalVolume = 100,
  bgmVolume = 70,
  dubVolume = 100,
  isVocalMuted = false,
  isBgmMuted = false,
  isDubMuted = false,
}: DubbingPlayerProps) {
  // Stem audio elements for real-time 3-track mixing
  const vocalAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // When not dubbed (previewing multi-track stems), video element audio is muted so stems are heard
  const isMultiTrackActive = !isDubbed && (Boolean(vocalTrackUrl) || Boolean(bgmTrackUrl) || Boolean(ttsTrackUrl));

  useEffect(() => {
    if (videoRef.current) {
      if (isMultiTrackActive) {
        videoRef.current.muted = true;
      } else {
        videoRef.current.muted = isMuted;
      }
    }
  }, [isMultiTrackActive, isMuted]);

  // Dynamically update audio stem volumes and mute states in real-time
  useEffect(() => {
    if (vocalAudioRef.current) {
      const vol = isMuted || isVocalMuted ? 0 : Math.max(0, Math.min(1, vocalVolume / 100));
      vocalAudioRef.current.volume = vol;
    }
  }, [vocalVolume, isVocalMuted, isMuted]);

  useEffect(() => {
    if (bgmAudioRef.current) {
      const vol = isMuted || isBgmMuted ? 0 : Math.max(0, Math.min(1, bgmVolume / 100));
      bgmAudioRef.current.volume = vol;
    }
  }, [bgmVolume, isBgmMuted, isMuted]);

  useEffect(() => {
    if (ttsAudioRef.current) {
      const vol = isMuted || isDubMuted ? 0 : Math.max(0, Math.min(1, dubVolume / 100));
      ttsAudioRef.current.volume = vol;
    }
  }, [dubVolume, isDubMuted, isMuted]);

  // Synchronize playback state (play / pause)
  useEffect(() => {
    if (!isMultiTrackActive) return;

    const syncPlay = (audio: HTMLAudioElement | null) => {
      if (!audio || !audio.src) return;
      if (isVideoPlaying) {
        if (videoRef.current) {
          if (Math.abs(audio.currentTime - videoRef.current.currentTime) > 0.15) {
            audio.currentTime = videoRef.current.currentTime;
          }
        }
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    };

    syncPlay(vocalAudioRef.current);
    syncPlay(bgmAudioRef.current);
    syncPlay(ttsAudioRef.current);
  }, [isVideoPlaying, isMultiTrackActive]);

  // Handle seeking sync
  const onSeekSync = (targetTime: number) => {
    handleVideoSeek(targetTime);
    if (!isMultiTrackActive) return;
    [vocalAudioRef.current, bgmAudioRef.current, ttsAudioRef.current].forEach((audio) => {
      if (audio && audio.src) {
        audio.currentTime = targetTime;
      }
    });
  };

  // Keep audio stems in tight sync with video time updates
  const handlePlayerTimeUpdate = () => {
    if (onTimeUpdate) onTimeUpdate();
    if (!isMultiTrackActive || !videoRef.current) return;
    const vTime = videoRef.current.currentTime;
    [vocalAudioRef.current, bgmAudioRef.current, ttsAudioRef.current].forEach((audio) => {
      if (audio && audio.src && Math.abs(audio.currentTime - vTime) > 0.25) {
        audio.currentTime = vTime;
      }
    });
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[#101920] p-3 sm:p-5 shadow-[var(--shadow-card)]">
      {/* Hidden Synchronized Multi-Track Audio Stems */}
      {isMultiTrackActive && (
        <>
          {vocalTrackUrl && (
            <audio
              ref={vocalAudioRef}
              src={vocalTrackUrl}
              preload="auto"
              style={{ display: "none" }}
            />
          )}
          {bgmTrackUrl && (
            <audio
              ref={bgmAudioRef}
              src={bgmTrackUrl}
              preload="auto"
              style={{ display: "none" }}
            />
          )}
          {ttsTrackUrl && (
            <audio
              ref={ttsAudioRef}
              src={ttsTrackUrl}
              preload="auto"
              style={{ display: "none" }}
            />
          )}
        </>
      )}

      <div className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-black">
        <div className="relative aspect-video max-h-[500px] w-full flex items-center justify-center">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              className="max-h-[500px] w-full object-contain cursor-pointer"
              onClick={toggleVideoPlay}
              onTimeUpdate={handlePlayerTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onEnded={() => {
                [vocalAudioRef.current, bgmAudioRef.current, ttsAudioRef.current].forEach((a) => {
                  if (a) a.pause();
                });
                if (onEnded) onEnded();
              }}
            />
          ) : isDubbed ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Video đã được lồng tiếng thành công</p>
                <p className="text-xs text-zinc-400 mt-0.5">Nhấn để tải lại luồng phát video</p>
              </div>
              <button
                type="button"
                onClick={generateDubbedVideo}
                disabled={isGeneratingDub || !isTTSReady}
                className="mt-1 flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
              >
                <RefreshCw size={12} />
                <span>Thử lại ngay</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-zinc-400 text-center z-10">
              <FileVideo size={40} className="text-zinc-600" />
              <p className="text-xs font-medium text-zinc-300">Không thể tải luồng video xem trước</p>
            </div>
          )}

          {/* Subtitle Overlay tracking spoken dialogue */}
          {!isDubbed && showSubtitleOverlay && displayedSubtitleText && (
            <div
              style={{
                top: `${positionY}%`,
                transform: "translateY(-50%)",
              }}
              className={`absolute left-3 right-3 z-30 flex flex-col select-none pointer-events-none transition-all duration-100 ${
                alignment === "left"
                  ? "items-start text-left"
                  : alignment === "right"
                  ? "items-end text-right"
                  : alignment === "justify"
                  ? "items-center text-justify"
                  : "items-center text-center"
              }`}
            >
              <div
                key={`${effect}-${activeSegmentIndex}-${videoCurrentTime < 0.2 ? "init" : "play"}`}
                className={`px-2.5 py-1 rounded max-w-[94%] ${
                  effect === "pop"
                    ? "sub-anim-pop"
                    : effect === "fade"
                    ? "sub-anim-fade"
                    : effect === "slide"
                    ? "sub-anim-slide"
                    : effect === "karaoke"
                    ? "sub-anim-karaoke"
                    : ""
                }`}
                style={{
                  fontFamily: `"${fontName}", sans-serif`,
                  fontSize: `${parseInt(fontSize, 10)}px`,
                  color: primaryColor,
                  WebkitTextStroke:
                    outlineColor && outlineColor !== "transparent"
                      ? `2px ${outlineColor}`
                      : "none",
                  textShadow:
                    outlineColor && outlineColor !== "transparent"
                      ? `0 2px 4px ${outlineColor}`
                      : "none",
                  lineHeight: lineSpacing,
                }}
              >
                <span className="break-words drop-shadow-md font-bold">
                  {displayedSubtitleText}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clean Player Transport Control Bar */}
      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 sm:p-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Play / Pause */}
          <button
            type="button"
            onClick={toggleVideoPlay}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-md hover:bg-[var(--color-primary-hover)] transition active:scale-95"
          >
            {isVideoPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          {/* Progress Timeline Scrubber */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
              <span className="text-white font-semibold">{formatTime(videoCurrentTime)}</span>
              <span>{formatTime(videoDuration)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={videoDuration || 100}
              step={0.1}
              value={videoCurrentTime}
              onChange={(e) => onSeekSync(parseFloat(e.target.value))}
              className="w-full accent-[var(--color-primary)] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Volume & Mute */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-2 text-zinc-400 hover:text-white transition rounded-lg hover:bg-zinc-800/60"
            title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
          >
            {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Quick Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
          {/* Subtitle toggle */}
          <div className="flex items-center gap-1.5">
            {!isDubbed ? (
              <button
                type="button"
                onClick={() => setShowSubtitleOverlay((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition border ${
                  showSubtitleOverlay
                    ? "border-amber-400/50 bg-amber-500/15 text-amber-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
                title="Bật/Tắt xem trước phụ đề"
              >
                {showSubtitleOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>{showSubtitleOverlay ? "Phụ đề: Bật" : "Phụ đề: Tắt"}</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={11} />
                <span>Video đã render hoàn chỉnh</span>
              </span>
            )}

            {/* Current Active Spoken Dialogue Segment Indicator & Regenerate TTS */}
            {!isDubbed && displayedSubtitleText && (
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline-block max-w-[280px] truncate text-[10px] text-zinc-400 italic">
                  "{displayedSubtitleText}"
                </span>
                {activeSegmentIndex !== -1 && (
                  <button
                    type="button"
                    onClick={() => handleRegenerateSegmentTTS(activeSegmentIndex, displayedSubtitleText)}
                    disabled={regeneratingSegmentIdx === activeSegmentIndex}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-surface-muted)] text-[10px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition border border-[var(--color-border)] cursor-pointer"
                    title="Sinh lại giọng đọc TTS cho riêng câu thoại này"
                  >
                    {regeneratingSegmentIdx === activeSegmentIndex ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <RefreshCw size={10} />
                    )}
                    <span>TTS Câu #{activeSegmentIndex + 1}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Status note */}
          <div className="text-[10px] text-zinc-500">
            {!isDubbed ? "Đang phát video với âm thanh gốc" : "Đang phát video lồng tiếng đã kết xuất"}
          </div>
        </div>
      </div>
    </div>
  );
}
