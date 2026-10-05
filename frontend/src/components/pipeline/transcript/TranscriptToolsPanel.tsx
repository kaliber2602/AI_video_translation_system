import {
  Download,
  Loader2,
  Sparkles,
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface TranscriptToolsPanelProps {
  whisperModel: string;
  setWhisperModel: (model: string) => void;
  updateTranscriptionConfig: (updates: any) => void;
  isGenerating: boolean;
  isGlobalTaskRunning: boolean;
  transcriptionNotice: string | null;
  transcriptionError: string | null;
  totalSegments: number;
  sourceLang?: string;
  taskMessage: string | null;
  taskProgress: number;
  onGenerateTranscript: () => void;
  onContinue: () => void;
  onExportFormat: (fmt: "srt" | "vtt" | "json" | "csv" | "txt" | "txt-time") => void;
}

export default function TranscriptToolsPanel({
  whisperModel,
  setWhisperModel,
  updateTranscriptionConfig,
  isGenerating,
  isGlobalTaskRunning,
  transcriptionNotice,
  transcriptionError,
  totalSegments,
  sourceLang,
  taskMessage,
  taskProgress,
  onGenerateTranscript,
  onContinue,
  onExportFormat,
}: TranscriptToolsPanelProps) {
  const { t } = useTranslation(["pipeline", "common"]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
          {t("pipeline:steps.transcript.modelSelectLabel", "Mô hình nhận dạng:")}
        </label>
        <select
          value={whisperModel}
          onChange={(e) => {
            setWhisperModel(e.target.value);
            updateTranscriptionConfig({ model_size: e.target.value });
          }}
          disabled={isGenerating}
          className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
        >
          <option value="whisper-base">OpenAI Whisper Base (Free)</option>
          <option value="whisper-small">OpenAI Whisper Small (Free)</option>
          <option value="whisper-medium">OpenAI Whisper Medium (Free)</option>
          <option value="whisperx-large-v3">WhisperX Large v3 (Free)</option>
          <option value="whisper-large-v3">OpenAI Whisper Large v3 (Pro)</option>
        </select>
      </div>

      {transcriptionNotice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
          <span className="font-bold shrink-0">ℹ️ Lưu ý:</span>
          <span>{transcriptionNotice}</span>
        </div>
      )}

      {transcriptionError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
          <span className="font-bold shrink-0">⚠️ Lỗi:</span>
          <span className="break-words flex-1">{transcriptionError}</span>
        </div>
      )}

      {/* Live Stats */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">
              {t("pipeline:steps.transcript.totalSegments", "Tổng số câu:")}
            </span>
            <p className="font-bold text-[var(--color-text-primary)] font-mono text-sm mt-0.5">
              {totalSegments} câu
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">
              {t("pipeline:steps.transcript.sourceLang", "Ngôn ngữ gốc:")}
            </span>
            <p className="font-bold text-[var(--color-text-primary)] font-mono text-sm mt-0.5 uppercase">
              {sourceLang || "Tự động"}
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Format Transcript Export */}
      {totalSegments > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">
            Xuất dữ liệu phụ đề & văn bản:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onExportFormat("txt")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
              title="Xuất văn bản thuần .TXT"
            >
              <Download size={12} />
              <span>TXT (Plain)</span>
            </button>
            <button
              type="button"
              onClick={() => onExportFormat("txt-time")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
              title="Xuất văn bản kèm mốc thời gian"
            >
              <Download size={12} />
              <span>TXT (Timestamp)</span>
            </button>
            <button
              type="button"
              onClick={() => onExportFormat("srt")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
            >
              <Download size={12} />
              <span>SubRip (.SRT)</span>
            </button>
            <button
              type="button"
              onClick={() => onExportFormat("vtt")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
            >
              <Download size={12} />
              <span>WebVTT (.VTT)</span>
            </button>
            <button
              type="button"
              onClick={() => onExportFormat("json")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
            >
              <Download size={12} />
              <span>JSON Data</span>
            </button>
            <button
              type="button"
              onClick={() => onExportFormat("csv")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
            >
              <Download size={12} />
              <span>Bảng CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Celery Async Progress Indicator */}
      {isGenerating && (
        <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/20 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-primary)]">
            <span className="flex items-center gap-1.5 truncate max-w-[80%]">
              <Loader2 size={13} className="animate-spin text-[var(--color-primary)] shrink-0" />
              <span className="truncate">
                {taskMessage
                  ? taskMessage
                  : taskProgress < 15
                  ? "Đang khởi động Whisper model..."
                  : taskProgress < 75
                  ? `Đang nhận diện giọng nói (${taskProgress}%)...`
                  : taskProgress < 95
                  ? "Đang phân tách người nói (Diarization)..."
                  : "Đang lưu trữ dữ liệu bản bóc băng..."}
              </span>
            </span>
            <span className="font-mono font-bold text-[var(--color-primary)] shrink-0">{taskProgress}%</span>
          </div>
          <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(8, taskProgress)}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Tiến độ được cập nhật trực tiếp theo thời gian thực từ GPU/Celery worker.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={onGenerateTranscript}
          disabled={isGenerating || isGlobalTaskRunning}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-2.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50 active:scale-98 shadow-xs"
        >
          {isGenerating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Sparkles size={15} />
          )}
          <span>
            {isGenerating
              ? t("pipeline:steps.transcript.extracting", "Đang trích xuất lời thoại...")
              : isGlobalTaskRunning
              ? "Tác vụ ngầm đang chạy (Đã khóa)"
              : totalSegments > 0
              ? t("pipeline:steps.transcript.retranscribe", "Bóc băng lại Whisper")
              : t("pipeline:steps.transcript.startTranscribe", "Bắt đầu bóc băng Whisper")}
          </span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={totalSegments === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(24,195,170,0.25)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
        >
          <span>{t("pipeline:steps.transcript.continueTranslation", "Tiếp tục: Dịch thuật (Translation)")}</span>
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] pt-1">
        <span className="flex items-center gap-1">
          <Check size={12} className="text-emerald-400" />
          <span>{t("pipeline:steps.transcript.permanentStorage", "Lưu trữ vĩnh viễn")}</span>
        </span>
        <span className="font-semibold text-emerald-400">{t("pipeline:steps.transcript.synced", "Đã đồng bộ")}</span>
      </div>
    </div>
  );
}
