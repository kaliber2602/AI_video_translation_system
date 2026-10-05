import {
  Download,
  Loader2,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface SupportedLanguage {
  code: string;
  label: string;
}

interface SupportedModel {
  code: string;
  label: string;
  requiredPlan: string;
}

interface TranslationToolsPanelProps {
  selectedTargetLang: string;
  supportedTargetLanguages: SupportedLanguage[];
  onLanguageSelect: (lang: string) => void;
  translationModel: string;
  setTranslationModel: (model: string) => void;
  supportedTranslationModels: SupportedModel[];
  updateTranslationConfig: (updates: any) => void;
  isTranslating: boolean;
  isGlobalTaskRunning: boolean;
  translationError: string | null;
  totalSegments: number;
  sourceLang?: string;
  targetLang?: string;
  taskMessage: string;
  taskProgress: number;
  hasTranslation: boolean;
  onConfirmRetranslate: () => void;
  onGenerateTranslation: () => void;
  onContinue: () => void;
  onExportFormat: (fmt: "srt" | "vtt" | "json" | "csv" | "txt") => void;
}

export default function TranslationToolsPanel({
  selectedTargetLang,
  supportedTargetLanguages,
  onLanguageSelect,
  translationModel,
  setTranslationModel,
  supportedTranslationModels,
  updateTranslationConfig,
  isTranslating,
  isGlobalTaskRunning,
  translationError,
  totalSegments,
  sourceLang,
  targetLang,
  taskMessage,
  taskProgress,
  hasTranslation,
  onConfirmRetranslate,
  onGenerateTranslation,
  onContinue,
  onExportFormat,
}: TranslationToolsPanelProps) {
  const { t } = useTranslation(["pipeline", "common"]);

  return (
    <div className="space-y-4">
      {/* Target Language Selector */}
      <div>
        <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
          {t("pipeline:steps.translation.targetLangLabel", "Ngôn ngữ đích (Target Language):")}
        </label>
        <select
          value={selectedTargetLang}
          onChange={(e) => onLanguageSelect(e.target.value)}
          disabled={isTranslating}
          className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
        >
          {supportedTargetLanguages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Translation Model Selector */}
      <div>
        <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
          {t("pipeline:steps.translation.modelSelectLabel", "Mô hình dịch thuật (Translation Model):")}
        </label>
        <select
          value={translationModel}
          onChange={(e) => {
            setTranslationModel(e.target.value);
            updateTranslationConfig({ model_name: e.target.value });
          }}
          disabled={isTranslating}
          className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
        >
          {supportedTranslationModels.map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {translationError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
          <span className="font-bold shrink-0"> Lỗi:</span>
          <span className="break-words flex-1">{translationError}</span>
        </div>
      )}

      {/* Live Stats */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">
              {t("pipeline:steps.translation.totalSegments", "Tổng số câu:")}
            </span>
            <p className="font-bold text-[var(--color-text-primary)] font-mono text-sm mt-0.5">
              {totalSegments} câu
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">
              Cặp ngôn ngữ:
            </span>
            <p className="font-bold text-[var(--color-text-primary)] font-mono text-xs mt-0.5 uppercase truncate">
              {sourceLang || "AUTO"} → {targetLang || selectedTargetLang}
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Format Subtitle Export */}
      {totalSegments > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">
            Xuất dữ liệu phụ đề bản dịch:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
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
      {isTranslating && (
        <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/20 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-primary)]">
            <span className="flex items-center gap-1.5 truncate max-w-[80%]">
              <Loader2 size={13} className="animate-spin text-[var(--color-primary)] shrink-0" />
              <span className="truncate">
                {taskMessage
                  ? taskMessage
                  : taskProgress < 15
                  ? "Đang khởi động mô hình dịch..."
                  : taskProgress < 85
                  ? `Đang dịch thuật văn bản (${taskProgress}%)...`
                  : "Đang kiểm tra và căn chỉnh ngữ cảnh..."}
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
            Tiến độ dịch thuật được truyền trực tiếp qua Celery worker / GPU pipeline.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={() => {
            if (hasTranslation) {
              onConfirmRetranslate();
            } else {
              onGenerateTranslation();
            }
          }}
          disabled={isTranslating || isGlobalTaskRunning}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-2.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50 active:scale-98 shadow-xs"
        >
          {isTranslating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Sparkles size={15} />
          )}
          <span>
            {isTranslating
              ? t("pipeline:steps.translation.translating", "Đang dịch lời thoại...")
              : isGlobalTaskRunning
              ? "Tác vụ ngầm đang chạy (Đã khóa)"
              : hasTranslation
              ? t("pipeline:steps.translation.retranslate", "Dịch lại toàn bộ (AI)")
              : t("pipeline:steps.translation.startTranslate", "Bắt đầu dịch thuật")}
          </span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={!hasTranslation}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(24,195,170,0.25)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
        >
          <span>{t("pipeline:steps.translation.continueSubtitles", "Tiếp tục: Phụ đề (Subtitles)")}</span>
          <ArrowRight size={15} />
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
