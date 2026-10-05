import { Activity, Loader2 } from "lucide-react";
import type { MediaInfo } from "../../../services/video.service";

interface MediaInspectorCardProps {
  mediaInfo: MediaInfo | null;
  isLoading: boolean;
}

export default function MediaInspectorCard({
  mediaInfo,
  isLoading,
}: MediaInspectorCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[var(--color-primary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
            Media Inspector (Thông số kỹ thuật tệp)
          </h4>
        </div>
        {isLoading && (
          <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            <Loader2 size={12} className="animate-spin text-[var(--color-primary)]" />
            <span>Đang phân tích ffprobe...</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] p-3">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] block">
            Độ phân giải & FPS
          </span>
          <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] mt-0.5 block">
            {mediaInfo?.video?.width && mediaInfo?.video?.height
              ? `${mediaInfo.video.width}x${mediaInfo.video.height} (${mediaInfo.video.fps || 30} fps)`
              : "1920x1080 (30 fps)"}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] p-3">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] block">
            Video Codec
          </span>
          <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] mt-0.5 block uppercase">
            {mediaInfo?.video?.codec || "H.264 (AVC)"}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] p-3">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] block">
            Audio Codec & Rate
          </span>
          <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] mt-0.5 block">
            {mediaInfo?.audio?.codec ? mediaInfo.audio.codec.toUpperCase() : "AAC"} •{" "}
            {mediaInfo?.audio?.sample_rate ? `${mediaInfo.audio.sample_rate} Hz` : "44100 Hz"}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] p-3">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] block">
            Kênh âm thanh (Channels)
          </span>
          <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] mt-0.5 block">
            {mediaInfo?.audio?.channels === 1
              ? "1 Kênh (Mono)"
              : mediaInfo?.audio?.channels === 2
              ? "2 Kênh (Stereo)"
              : "2 Kênh (Stereo)"}
          </span>
        </div>
      </div>
    </div>
  );
}
