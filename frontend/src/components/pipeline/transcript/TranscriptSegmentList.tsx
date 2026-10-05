import {
  Search,
  Loader2,
  Cpu,
  SlidersHorizontal,
  Play,
  User,
  Scissors,
  Merge,
} from "lucide-react";
import { useState } from "react";
import type { MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import UniversalSplitModal from "../common/UniversalSplitModal";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

interface TranscriptSegmentListProps {
  transcript: {
    segments: TranscriptSegment[];
    language: string;
  } | null;
  filteredSegments: TranscriptSegment[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSaving: boolean;
  isGenerating: boolean;
  taskProgress: number;
  activeSegmentIndex: number;
  segmentRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  editingSegment: number | null;
  editingText: string;
  setEditingText: (text: string) => void;
  setEditingSegment: (idx: number | null) => void;
  editingSpeakerIdx: number | null;
  editingSpeakerText: string;
  setEditingSpeakerText: (text: string) => void;
  setEditingSpeakerIdx: (idx: number | null) => void;
  currentTime?: number;
  onSeek: (time: number) => void;
  onSaveSpeaker: (index: number, newSpeaker: string) => void;
  onConfirmSplit: (index: number, splitTime: number, textPart1: string, textPart2: string) => void;
  onMergeWithPrev: (index: number) => void;
  onMergeWithNext: (index: number) => void;
  onUpdateSegment: (index: number, newText: string) => void;
  onOpenTools: () => void;
}

export default function TranscriptSegmentList({
  transcript,
  filteredSegments,
  searchQuery,
  setSearchQuery,
  isSaving,
  isGenerating,
  taskProgress,
  activeSegmentIndex,
  segmentRefs,
  editingSegment,
  editingText,
  setEditingText,
  setEditingSegment,
  editingSpeakerIdx,
  editingSpeakerText,
  setEditingSpeakerText,
  setEditingSpeakerIdx,
  currentTime,
  onSeek,
  onSaveSpeaker,
  onConfirmSplit,
  onMergeWithPrev,
  onMergeWithNext,
  onUpdateSegment,
  onOpenTools,
}: TranscriptSegmentListProps) {
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
            placeholder={t("pipeline:steps.transcript.searchPlaceholder", "Tìm kiếm lời thoại...")}
            className="w-full h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
          />
        </div>
        {isSaving && (
          <span className="text-[11px] text-amber-400 animate-pulse font-medium shrink-0 flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" />
            <span>{t("pipeline:steps.transcript.saving", "Đang lưu...")}</span>
          </span>
        )}
      </div>

      {/* Segments list or empty state */}
      {!transcript || !transcript.segments || transcript.segments.length === 0 ? (
        isGenerating ? (
          <div className="py-10 flex flex-col items-center justify-center text-center px-4 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Loader2 size={24} className="animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-[var(--color-text-primary)]">
                Đang bóc băng và nhận dạng giọng nói...
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] font-mono">
                Tiến trình Celery Worker: {taskProgress}%
              </p>
            </div>
            <div className="w-48 bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(8, taskProgress)}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] max-w-xs">
              Tác vụ đang chạy nền trên Celery worker. Bạn có thể tải lại trang (F5) mà không làm gián đoạn tiến trình.
            </p>
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] mb-3">
              <Cpu size={24} />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {t(
                "pipeline:steps.transcript.emptyTranscript",
                "Chưa có bản bóc băng cho video này. Chọn thẻ 'Tùy chọn Whisper' và nhấn 'Bắt đầu bóc băng Whisper' để khởi chạy."
              )}
            </p>
            <button
              type="button"
              onClick={onOpenTools}
              className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] transition"
            >
              <SlidersHorizontal size={13} />
              <span>{t("pipeline:steps.transcript.openTools", "Mở tùy chọn")}</span>
            </button>
          </div>
        )
      ) : (
        <div className="space-y-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar">
          {filteredSegments.map((seg) => {
            const index = transcript.segments.indexOf(seg);
            const isActive = activeSegmentIndex === index;
            return (
              <div
                key={index}
                ref={(el) => {
                  segmentRefs.current[index] = el;
                }}
                className={`rounded-xl border p-3 transition-all duration-200 ${
                  isActive
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/25 ring-2 ring-[var(--color-primary)]/70 shadow-md border-l-4 border-l-[var(--color-primary)] scale-[1.01]"
                    : "border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)]/40"
                }`}
              >
                <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <button
                    type="button"
                    onClick={() => onSeek(seg.start)}
                    className={`flex items-center gap-1 font-mono font-medium transition ${
                      isActive
                        ? "text-[var(--color-primary)] font-bold"
                        : "hover:text-[var(--color-primary)] text-[var(--color-text-secondary)]"
                    }`}
                    title={t("pipeline:steps.transcript.seekTooltip", "Nhấp để tua video")}
                  >
                    <Play size={10} className={isActive ? "fill-current text-[var(--color-primary)]" : ""} />
                    <span className="text-[11px]">
                      {formatTime(seg.start)} → {formatTime(seg.end)}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {editingSpeakerIdx === index ? (
                      <input
                        type="text"
                        value={editingSpeakerText}
                        onChange={(e) => setEditingSpeakerText(e.target.value)}
                        className="h-5 w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 text-[11px] text-[var(--color-text-primary)] font-medium outline-none focus:border-[var(--color-primary)]"
                        autoFocus
                        onBlur={() => onSaveSpeaker(index, editingSpeakerText)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSaveSpeaker(index, editingSpeakerText);
                          if (e.key === "Escape") setEditingSpeakerIdx(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSpeakerIdx(index);
                          setEditingSpeakerText(seg.speaker || "Speaker");
                        }}
                        className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                        title={t("pipeline:steps.transcript.renameSpeakerTooltip", "Nhấp để đổi tên người nói")}
                      >
                        <User size={11} />
                        <span className="truncate max-w-[80px]">{seg.speaker || "Speaker"}</span>
                      </button>
                    )}

                    <div className="h-3 w-px bg-[var(--color-border)] mx-0.5" />

                    <button
                      type="button"
                      onClick={() => setSplittingIndex(index)}
                      disabled={seg.end - seg.start < 2.0}
                      className="p-1 text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-[var(--color-surface)] rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                      title={seg.end - seg.start < 2.0 ? "Đoạn quá ngắn (< 2.0s) để chia đôi thành 2 đoạn >= 1.0s" : "Chia câu thoại (Split)"}
                    >
                      <Scissors size={12} />
                    </button>

                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => onMergeWithPrev(index)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-[var(--color-surface)] rounded transition"
                        title="Gộp với câu phía trên (Merge Up)"
                      >
                        <Merge size={12} className="rotate-180" />
                      </button>
                    )}

                    {index < transcript.segments.length - 1 && (
                      <button
                        type="button"
                        onClick={() => onMergeWithNext(index)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-[var(--color-surface)] rounded transition"
                        title="Gộp với câu tiếp theo (Merge Down)"
                      >
                        <Merge size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {editingSegment === index ? (
                  <div>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="min-h-[60px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingSegment(null);
                      }}
                    />
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateSegment(index, editingText)}
                        disabled={isSaving}
                        className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
                      >
                        {isSaving ? <Loader2 size={11} className="animate-spin" /> : t("pipeline:steps.transcript.save", "Lưu")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSegment(null)}
                        className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
                      >
                        {t("pipeline:steps.transcript.cancel", "Hủy")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="cursor-pointer text-xs leading-relaxed text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
                    onClick={() => {
                      setEditingSegment(index);
                      setEditingText(seg.text);
                    }}
                    title={t("pipeline:steps.transcript.editTextTooltip", "Nhấp để chỉnh sửa nội dung")}
                  >
                    {seg.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Word Split Modal */}
      {splittingIndex !== null && transcript?.segments?.[splittingIndex] && (
        <UniversalSplitModal
          isOpen={true}
          segment={transcript.segments[splittingIndex]}
          segmentIndex={splittingIndex}
          currentTime={currentTime}
          onClose={() => setSplittingIndex(null)}
          onConfirmSplit={(idx, time, part1, part2) => {
            onConfirmSplit(idx, time, part1.text, part2.text);
          }}
          mode="transcript"
        />
      )}
    </div>
  );
}
