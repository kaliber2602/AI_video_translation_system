import { Play, Pause } from "lucide-react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";

interface TranscriptPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string | null;
  filename?: string;
  isPlaying: boolean;
  segmentCount: number;
  language?: string;
  onTimeUpdate: () => void;
  onPlay: () => void;
  onPause: () => void;
}

export default function TranscriptPlayer({
  videoRef,
  videoUrl,
  filename,
  isPlaying,
  segmentCount,
  language,
  onTimeUpdate,
  onPlay,
  onPause,
}: TranscriptPlayerProps) {
  const { t } = useTranslation(["pipeline", "common"]);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[#101920] p-4 sm:p-6 shadow-[var(--shadow-card)] flex flex-col justify-center">
      {/* Video Player */}
      <div className="relative flex min-h-[300px] sm:min-h-[400px] max-h-[580px] w-full items-center justify-center overflow-hidden rounded-xl bg-black">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
            className="max-h-[580px] w-full object-contain"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-xl">
            <Play size={24} fill="currentColor" />
          </div>
        )}
      </div>

      {/* Video Player Footer Bar */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate max-w-md flex items-center gap-2">
            <span>{filename || "Video"}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded bg-zinc-800/80">
              {isPlaying ? <Pause size={10} className="text-emerald-400" /> : <Play size={10} />}
              {isPlaying
                ? t("pipeline:steps.transcript.playing", "Đang phát")
                : t("pipeline:steps.transcript.paused", "Tạm dừng")}
            </span>
          </p>
          <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
            {segmentCount} {t("pipeline:steps.reviewExport.segmentCount", "câu thoại")} • {language?.toUpperCase() || "AUTO"}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${
            segmentCount > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {segmentCount > 0 ? "✓ Đã bóc băng" : "Chưa bóc băng"}
        </span>
      </div>
    </div>
  );
}
