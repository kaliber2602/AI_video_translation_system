import {
  Search,
  Plus,
  Eye,
  Trash2,
  Volume2,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { MutableRefObject } from "react";
import type { SubtitleSegment } from "../../../types/video";

interface SubtitleSegmentListProps {
  segments: SubtitleSegment[];
  filteredSegments: SubtitleSegment[];
  segmentSearch: string;
  setSegmentSearch: (val: string) => void;
  handleAddSegment: () => void;
  handleDeleteSegment: (index: number) => void;
  handleUpdateSegmentText: (index: number, text: string) => void;
  handleUpdateSegmentTime: (index: number, field: "start" | "end", val: number) => void;
  handleSeekToSegment: (index: number) => void;
  activeSegmentIndex: number;
  previewSegmentIndex: number;
  segmentRefs: MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  rewritingIndex: number | null;
  handleRewriteSegment: (index: number, mode: "shorter" | "casual" | "catchy") => void;
  playingChunkIndex: number | null;
  handlePlayChunk: (index: number) => void;
  resynthesizingIndex: number | null;
  handleMicroTTS: (index: number) => void;
}

export default function SubtitleSegmentList({
  segments,
  filteredSegments,
  segmentSearch,
  setSegmentSearch,
  handleAddSegment,
  handleDeleteSegment,
  handleUpdateSegmentText,
  handleUpdateSegmentTime,
  handleSeekToSegment,
  activeSegmentIndex,
  previewSegmentIndex,
  segmentRefs,
  rewritingIndex,
  handleRewriteSegment,
  playingChunkIndex,
  handlePlayChunk,
  resynthesizingIndex,
  handleMicroTTS,
}: SubtitleSegmentListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={segmentSearch}
            onChange={(e) => setSegmentSearch(e.target.value)}
            placeholder="Tìm câu thoại..."
            className="h-7 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] pl-7 pr-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <button
          type="button"
          onClick={handleAddSegment}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold shadow-xs hover:bg-[var(--color-primary-hover)] transition"
        >
          <Plus size={13} />
          <span>Thêm</span>
        </button>
      </div>

      <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {filteredSegments.map((seg) => {
          const originalIndex = segments.indexOf(seg);
          const isCurrentSpoken = activeSegmentIndex === originalIndex;
          const isPreviewing = previewSegmentIndex === originalIndex;

          return (
            <div
              key={originalIndex}
              ref={(el) => {
                segmentRefs.current[originalIndex] = el;
              }}
              onClick={() => handleSeekToSegment(originalIndex)}
              className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                isCurrentSpoken
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 ring-2 ring-[var(--color-primary)]/50 shadow-md"
                  : isPreviewing
                  ? "border-[var(--color-primary)]/70 bg-[var(--color-primary-soft)]/10 ring-1 ring-[var(--color-primary)]/30"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40"
              }`}
            >
              <div className="flex items-center justify-between gap-1 pb-1 border-b border-[var(--color-border)]/50 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[var(--color-primary)]">#{originalIndex + 1}</span>
                  {isCurrentSpoken && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Đang phát</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    step="0.1"
                    value={seg.start}
                    onChange={(e) =>
                      handleUpdateSegmentTime(originalIndex, "start", parseFloat(e.target.value) || 0)
                    }
                    className="w-10 text-center rounded border border-[var(--color-border)] bg-[var(--color-input-background)] py-0.5 text-[10px]"
                  />
                  <span>→</span>
                  <input
                    type="number"
                    step="0.1"
                    value={seg.end}
                    onChange={(e) =>
                      handleUpdateSegmentTime(originalIndex, "end", parseFloat(e.target.value) || 0)
                    }
                    className="w-10 text-center rounded border border-[var(--color-border)] bg-[var(--color-input-background)] py-0.5 text-[10px]"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSeekToSegment(originalIndex);
                    }}
                    className={`p-1 rounded text-[10px] font-semibold transition ${
                      isCurrentSpoken || isPreviewing
                        ? "text-[var(--color-primary)] font-bold"
                        : "text-[var(--color-text-muted)]"
                    }`}
                    title="Tua video đến câu này"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSegment(originalIndex);
                    }}
                    className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                    title="Xóa câu này"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <textarea
                value={seg.translated_text || seg.text || ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleUpdateSegmentText(originalIndex, e.target.value)}
                rows={2}
                placeholder="Nội dung phụ đề..."
                className="mt-1.5 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-1.5 text-xs leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
              />

              {/* Micro-TTS & AI Rewrite Action Toolbar */}
              <div
                className="mt-2 pt-1.5 border-t border-[var(--color-border)]/40 flex items-center justify-between gap-1 text-[10px]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* AI Rewrite Quick Action */}
                <div className="flex items-center gap-1">
                  <span className="text-[var(--color-text-muted)] text-[9px]">AI:</span>
                  <button
                    type="button"
                    disabled={rewritingIndex === originalIndex}
                    onClick={() => handleRewriteSegment(originalIndex, "shorter")}
                    className="px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition disabled:opacity-50"
                    title="Viết lại ngắn gọn hơn"
                  >
                    {rewritingIndex === originalIndex ? "..." : "Ngắn hơn"}
                  </button>
                  <button
                    type="button"
                    disabled={rewritingIndex === originalIndex}
                    onClick={() => handleRewriteSegment(originalIndex, "casual")}
                    className="px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition disabled:opacity-50"
                    title="Viết lại tự nhiên hơn"
                  >
                    Tự nhiên
                  </button>
                </div>

                {/* Micro-TTS Resynthesize & Play Chunk */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePlayChunk(originalIndex)}
                    className={`p-1 rounded border transition ${
                      playingChunkIndex === originalIndex
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                    }`}
                    title="Nghe thử file âm thanh TTS câu này"
                  >
                    <Volume2 size={11} />
                  </button>

                  <button
                    type="button"
                    disabled={resynthesizingIndex === originalIndex}
                    onClick={() => handleMicroTTS(originalIndex)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-white border border-[var(--color-primary)]/40 text-[9px] font-bold transition disabled:opacity-50"
                    title="Đọc lại ngay duy nhất câu này trong 0.37s mà không cần chạy lại toàn bộ"
                  >
                    {resynthesizingIndex === originalIndex ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Sparkles size={10} className="text-amber-400" />
                    )}
                    <span>Đọc lại câu này</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
