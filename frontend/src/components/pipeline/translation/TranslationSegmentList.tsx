import {
  Search,
  Loader2,
  Languages,
  SlidersHorizontal,
  Play,
  Scissors,
  Merge,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import UniversalSplitModal from "../common/UniversalSplitModal";

export interface TranslationSegment {
  start: number;
  end: number;
  text: string;
  translated_text: string;
}

interface TranslationSegmentRowProps {
  seg: TranslationSegment;
  originalIndex: number;
  isActive: boolean;
  totalSegments: number;
  segmentRef: (el: HTMLDivElement | null) => void;
  onSeek: (time: number) => void;
  onOpenSplit: (index: number) => void;
  onMergeWithPrev: (index: number) => void;
  onMergeWithNext: (index: number) => void;
  onUpdateSegment: (index: number, newText: string) => void;
  getCpsInfo: (text: string, start: number, end: number) => {
    cps: number;
    label: string;
    color: string;
    tooltip: string;
  };
  formatTime: (seconds: number) => string;
}

function TranslationSegmentRow({
  seg,
  originalIndex,
  isActive,
  totalSegments,
  segmentRef,
  onSeek,
  onOpenSplit,
  onMergeWithPrev,
  onMergeWithNext,
  onUpdateSegment,
  getCpsInfo,
  formatTime,
}: TranslationSegmentRowProps) {
  const { t } = useTranslation(["pipeline", "common"]);
  const [localText, setLocalText] = useState(seg.translated_text || seg.text || "");

  // Always sync localText when seg changes (from Split, Merge, or parent translation reload)
  useEffect(() => {
    setLocalText(seg.translated_text || seg.text || "");
  }, [seg.translated_text, seg.text, seg.start, seg.end]);

  const cpsInfo = getCpsInfo(localText, seg.start, seg.end);

  return (
    <div
      ref={segmentRef}
      onClick={() => onSeek(seg.start)}
      className={`rounded-xl border px-3.5 py-2.5 transition-all duration-200 cursor-pointer ${
        isActive
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/25 ring-2 ring-[var(--color-primary)]/70 shadow-md border-l-4 border-l-[var(--color-primary)] scale-[1.01]"
          : "border-[var(--color-border-muted)] bg-[var(--color-surface-muted)]/50 hover:border-zinc-700 hover:bg-[var(--color-surface-muted)]"
      }`}
    >
      {/* Header: Time + Segment Index + CPS Gauge */}
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--color-text-muted)] gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSeek(seg.start);
          }}
          className={`flex items-center gap-1 font-mono font-medium transition ${
            isActive ? "text-[var(--color-primary)] font-bold" : "hover:text-[var(--color-primary)] text-[var(--color-text-secondary)]"
          }`}
          title={t("pipeline:steps.translation.seekTooltip", "Nhấp để tua video")}
        >
          <Play size={10} className={isActive ? "fill-current text-[var(--color-primary)]" : ""} />
          <span className="text-[11px]">
            {formatTime(seg.start)} → {formatTime(seg.end)}
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* CPS Badge */}
          <span
            className={`px-1.5 py-0.2 rounded border text-[10px] font-mono ${cpsInfo.color}`}
            title={cpsInfo.tooltip}
          >
            {cpsInfo.label}
          </span>

          {/* Split & Merge Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSplit(originalIndex);
              }}
              disabled={seg.end - seg.start < 2.0}
              className="p-1 text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-[var(--color-surface)] rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
              title={seg.end - seg.start < 2.0 ? "Đoạn quá ngắn (< 2.0s) để chia đôi thành 2 đoạn >= 1.0s" : "Chia câu thoại (Split)"}
            >
              <Scissors size={12} />
            </button>

            {originalIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMergeWithPrev(originalIndex);
                }}
                className="p-1 text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-[var(--color-surface)] rounded transition"
                title="Gộp với câu phía trên (Merge Up)"
              >
                <Merge size={12} className="rotate-180" />
              </button>
            )}

            {originalIndex < totalSegments - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMergeWithNext(originalIndex);
                }}
                className="p-1 text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-[var(--color-surface)] rounded transition"
                title="Gộp với câu tiếp theo (Merge Down)"
              >
                <Merge size={12} />
              </button>
            )}
          </div>

          <span
            className={`font-mono text-[10px] ${
              isActive ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-text-muted)]"
            }`}
          >
            #{originalIndex + 1}
          </span>
        </div>
      </div>

      {/* Line 1: Original text (Source) */}
      <p className="text-xs text-[var(--color-text-secondary)] leading-snug break-words select-text">
        {seg.text}
      </p>

      {/* Line 2: Translated text (Target) - Controlled editable */}
      <div onClick={(e) => e.stopPropagation()} className="mt-0.5">
        <textarea
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          placeholder={t("pipeline:steps.translation.enterTranslation", "Nhập bản dịch...")}
          rows={Math.max(1, Math.ceil(localText.length / 45))}
          className="w-full bg-transparent border-0 rounded px-1 py-0.5 text-xs font-medium text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] leading-snug resize-none outline-none focus:bg-[var(--color-input-background)] focus:ring-1 focus:ring-[var(--color-primary)]/60 transition"
          onFocus={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onInput={(e: any) => {
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onBlur={() => {
            if (localText !== (seg.translated_text || seg.text)) {
              onUpdateSegment(originalIndex, localText);
            }
          }}
        />
      </div>
    </div>
  );
}

interface TranslationSegmentListProps {
  translation: {
    segments: TranslationSegment[];
    source_language: string;
    target_language: string;
  } | null;
  filteredSegments: TranslationSegment[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSaving: boolean;
  isTranslating: boolean;
  taskProgress: number;
  activeSegmentIndex: number;
  segmentRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  currentTime?: number;
  onSeek: (time: number) => void;
  onConfirmSplit: (
    index: number,
    splitTime: number,
    part1: { text: string; translated_text?: string },
    part2: { text: string; translated_text?: string }
  ) => void;
  onMergeWithPrev: (index: number) => void;
  onMergeWithNext: (index: number) => void;
  onUpdateSegment: (index: number, newText: string) => void;
  onOpenTools: () => void;
  getCpsInfo: (text: string, start: number, end: number) => {
    cps: number;
    label: string;
    color: string;
    tooltip: string;
  };
}

export default function TranslationSegmentList({
  translation,
  filteredSegments,
  searchQuery,
  setSearchQuery,
  isSaving,
  isTranslating,
  taskProgress,
  activeSegmentIndex,
  segmentRefs,
  currentTime,
  onSeek,
  onConfirmSplit,
  onMergeWithPrev,
  onMergeWithNext,
  onUpdateSegment,
  onOpenTools,
  getCpsInfo,
}: TranslationSegmentListProps) {
  const { t } = useTranslation(["pipeline", "common"]);
  const [splittingIndex, setSplittingIndex] = useState<number | null>(null);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      {/* Search & Saving status */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("pipeline:steps.translation.searchPlaceholder", "Tìm kiếm câu gốc hoặc câu dịch...")}
            className="w-full h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
          />
        </div>
        {isSaving && (
          <span className="text-[11px] text-amber-400 animate-pulse font-medium shrink-0 flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" />
            <span>{t("pipeline:steps.translation.saving", "Đang lưu...")}</span>
          </span>
        )}
      </div>

      {/* Segments list or empty state */}
      {!translation || !translation.segments || translation.segments.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] mb-3">
            <Languages size={24} />
          </div>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            {isTranslating ? (
              <span>Đang tiến hành dịch thuật... Vui lòng chờ ({taskProgress}%)</span>
            ) : (
              t(
                "pipeline:steps.translation.noTranslation",
                `Chưa có bản dịch. Chọn thẻ 'Tùy chọn dịch thuật' và nhấn 'Bắt đầu dịch' để khởi chạy.`
              )
            )}
          </p>
          {!isTranslating && (
            <button
              type="button"
              onClick={onOpenTools}
              className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] transition"
            >
              <SlidersHorizontal size={13} />
              <span>{t("pipeline:steps.translation.openTools", "Mở tùy chọn")}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar">
          {filteredSegments.length > 0 ? (
            filteredSegments.map((seg) => {
              const originalIndex = translation.segments.indexOf(seg);
              const isActive = activeSegmentIndex === originalIndex;

              return (
                <TranslationSegmentRow
                  key={`seg-${originalIndex}-${seg.start}-${seg.end}-${(seg.translated_text || "").length}`}
                  seg={seg}
                  originalIndex={originalIndex}
                  isActive={isActive}
                  totalSegments={translation.segments.length}
                  segmentRef={(el) => {
                    segmentRefs.current[originalIndex] = el;
                  }}
                  onSeek={onSeek}
                  onOpenSplit={(idx) => setSplittingIndex(idx)}
                  onMergeWithPrev={onMergeWithPrev}
                  onMergeWithNext={onMergeWithNext}
                  onUpdateSegment={onUpdateSegment}
                  getCpsInfo={getCpsInfo}
                  formatTime={formatTime}
                />
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
              Không tìm thấy câu nào phù hợp với từ khóa tìm kiếm
            </div>
          )}
        </div>
      )}

      {/* Universal Word Split Modal for Translation Step */}
      {splittingIndex !== null && translation?.segments?.[splittingIndex] && (
        <UniversalSplitModal
          isOpen={true}
          segment={translation.segments[splittingIndex]}
          segmentIndex={splittingIndex}
          currentTime={currentTime}
          mode="translation"
          onClose={() => setSplittingIndex(null)}
          onConfirmSplit={onConfirmSplit}
        />
      )}
    </div>
  );
}
