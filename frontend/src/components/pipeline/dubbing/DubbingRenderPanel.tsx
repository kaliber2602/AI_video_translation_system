import {
  Captions,
  Film,
  Loader2,
  Lock,
  Mic,
  ChevronRight,
} from "lucide-react";

interface DubbingRenderPanelProps {
  isDubReady: boolean;
  isGeneratingDub: boolean;
  isTTSReady: boolean;
  isGlobalTaskRunning: boolean;
  burnSubtitles: boolean;
  setBurnSubtitles: (burn: boolean) => void;
  aspectRatio: string;
  generateDubbedVideo: () => void;
  dubProgress: number;
  dubMessage: string;
  onGoToTtsTab: () => void;
  onGoToReviewStep: () => void;
}

export default function DubbingRenderPanel({
  isDubReady,
  isGeneratingDub,
  isTTSReady,
  isGlobalTaskRunning,
  burnSubtitles,
  setBurnSubtitles,
  aspectRatio,
  generateDubbedVideo,
  dubProgress,
  dubMessage,
  onGoToTtsTab,
  onGoToReviewStep,
}: DubbingRenderPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
              2
            </span>
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              Hòa Âm & Render Video
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isDubReady
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : isGeneratingDub
                ? "bg-amber-500/15 text-amber-400 animate-pulse"
                : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
            }`}
          >
            {isDubReady ? "✓ Đã xong" : isGeneratingDub ? "Đang render..." : "Chờ TTS"}
          </span>
        </div>

        {/* Dependency Warning if TTS not ready */}
        {!isTTSReady && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 space-y-2">
            <div className="flex items-start gap-2">
              <Lock size={14} className="shrink-0 mt-0.5" />
              <span>Cần tạo giọng đọc AI (TTS) trước khi kết xuất video hoàn chỉnh.</span>
            </div>
            <button
              type="button"
              onClick={onGoToTtsTab}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 transition"
            >
              <Mic size={12} />
              <span>← Thiết lập Giọng Đọc AI ngay</span>
            </button>
          </div>
        )}

        {/* HARDSUB SWITCH TOGGLE */}
        <div
          onClick={() => setBurnSubtitles(!burnSubtitles)}
          className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] p-2.5 transition hover:border-[var(--color-primary)]/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-primary)]">
              <Captions size={14} className="text-[var(--color-primary)]" />
              <span>Nhúng phụ đề cứng (Hardsub)</span>
            </div>
            <div
              className={`w-8 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${
                burnSubtitles ? "bg-[var(--color-primary)]" : "bg-zinc-600"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  burnSubtitles ? "transform translate-x-4" : ""
                }`}
              />
            </div>
          </div>
          <p className="mt-1 text-[10px] text-[var(--color-text-muted)] leading-normal">
            {burnSubtitles
              ? `✓ Bật: Nung phụ đề chuẩn khung hình ${aspectRatio} đã chọn ở Bước 4`
              : "✗ Tắt: Giữ video sạch không chữ (Clean export)"}
          </p>
        </div>

        {/* GENERATE DUBBED VIDEO BUTTON */}
        <button
          type="button"
          onClick={generateDubbedVideo}
          disabled={isGeneratingDub || !isTTSReady || isGlobalTaskRunning}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
        >
          {isGeneratingDub ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
          <span>
            {isGeneratingDub
              ? `Đang render video...${dubProgress > 0 ? ` (${dubProgress}%)` : ""}`
              : isGlobalTaskRunning
              ? "Tác vụ ngầm đang chạy (Đã khóa)"
              : isDubReady
              ? "Tạo lại Video Lồng Tiếng"
              : "Tạo Video Lồng Tiếng"}
          </span>
        </button>

        {/* Real-time Video Dubbing / Mux Progress Indicator */}
        {isGeneratingDub && (
          <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/20 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-primary)]">
              <span className="flex items-center gap-1.5 truncate max-w-[80%]">
                <Loader2 size={13} className="animate-spin text-[var(--color-primary)] shrink-0" />
                <span className="truncate">
                  {dubMessage || `Đang hòa âm và kết xuất video (${dubProgress}%)...`}
                </span>
              </span>
              <span className="font-mono font-bold text-[var(--color-primary)] shrink-0">{dubProgress}%</span>
            </div>
            <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, Math.min(100, dubProgress))}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Tiến độ encode FFmpeg / hòa âm âm thanh được cập nhật thời gian thực từ worker.
            </p>
          </div>
        )}
      </div>

      {/* QUICK LINK BACK TO PHASE 1 */}
      <button
        type="button"
        onClick={onGoToTtsTab}
        className="w-full flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition group shadow-xs"
      >
        <div className="flex items-center gap-1.5">
          <Mic size={13} />
          <span>← Tùy chỉnh lại Giọng đọc AI</span>
        </div>
      </button>

      {/* PROCEED TO REVIEW (STEP 6) */}
      <button
        type="button"
        onClick={onGoToReviewStep}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition active:scale-98 shadow-xs"
      >
        <span>Tiếp tục: Kiểm duyệt & Xuất (Bước 6)</span>
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
