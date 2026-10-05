import {
  Sparkles,
  Search,
  Play,
  Pause,
  Loader2,
  Zap,
  Trash2,
} from "lucide-react";
import type { RefObject } from "react";
import type { SubtitleSegment } from "../../../types/video";

interface DubbingSegmentListProps {
  segmentAudioRef: RefObject<HTMLAudioElement | null>;
  playingSegmentAudioIdx: number | null;
  setPlayingSegmentAudioIdx: (idx: number | null) => void;
  filteredSegments: Array<{ seg: SubtitleSegment; originalIndex: number }>;
  segments: SubtitleSegment[];
  segmentSearch: string;
  setSegmentSearch: (val: string) => void;
  selectedSegmentIdx: number | null;
  activeSegmentIndex: number;
  setSelectedSegmentIdx: (idx: number) => void;
  handleVideoSeek: (time: number) => void;
  regeneratingSegmentIdx: number | null;
  segmentOverrides: Record<number, { speed?: number; gain?: number; speaker?: string; slip?: number }>;
  setSegmentOverrides: React.Dispatch<
    React.SetStateAction<Record<number, { speed?: number; gain?: number; speaker?: string; slip?: number }>>
  >;
  selectedSpeaker?: number;
  handleUpdateSegmentText: (index: number, text: string) => void;
  handlePlaySegmentChunk: (idx: number) => void;
  handleMicroResynthesize: (idx: number) => void;
  handleSegmentSlip: (idx: number, deltaSec: number) => void;
  formatTime: (seconds: number) => string;
}

export default function DubbingSegmentList({
  segmentAudioRef,
  playingSegmentAudioIdx,
  setPlayingSegmentAudioIdx,
  filteredSegments,
  segments,
  segmentSearch,
  setSegmentSearch,
  selectedSegmentIdx,
  activeSegmentIndex,
  setSelectedSegmentIdx,
  handleVideoSeek,
  regeneratingSegmentIdx,
  segmentOverrides,
  setSegmentOverrides,
  handleUpdateSegmentText,
  handlePlaySegmentChunk,
  handleMicroResynthesize,
  handleSegmentSlip,
  formatTime,
}: DubbingSegmentListProps) {
  return (
    <div className="space-y-3">
      {/* Hidden audio element for segment chunk playback */}
      <audio
        ref={segmentAudioRef}
        onEnded={() => setPlayingSegmentAudioIdx(null)}
        className="hidden"
      />

      {/* Quick summary & Search */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-[var(--color-primary)]" />
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              Bộ Biên Tập Vi Âm Từng Câu
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold">
            {filteredSegments.length} / {segments.length} câu
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Tìm kiếm nội dung câu thoại..."
            value={segmentSearch}
            onChange={(e) => setSegmentSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-muted)]"
          />
        </div>
      </div>

      {/* Segment Cards List */}
      <div className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
        {filteredSegments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-muted)]">
            Không tìm thấy câu thoại phù hợp với từ khóa "{segmentSearch}"
          </div>
        ) : (
          filteredSegments.map(({ seg, originalIndex: idx }) => {
            const isSelected = selectedSegmentIdx === idx || activeSegmentIndex === idx;
            const isPlaying = playingSegmentAudioIdx === idx;
            const isRegenerating = regeneratingSegmentIdx === idx;
            const override = segmentOverrides[idx] || {};
            const currentSpeed = override.speed ?? 1.0;
            const currentSlip = override.slip ?? 0;
            const durationSec = seg.end - seg.start;

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedSegmentIdx(idx);
                  handleVideoSeek(seg.start);
                }}
                className={`rounded-xl border p-3 transition space-y-2.5 cursor-pointer ${
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-surface)] ring-1 ring-[var(--color-primary)]/30 shadow-xs"
                    : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-border)]/80"
                }`}
              >
                {/* Card Header: Index, Timecode, Speaker */}
                <div className="flex items-center justify-between gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-5 min-w-[20px] items-center justify-center rounded-md px-1 text-[10px] font-bold ${
                        isSelected
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                      {formatTime(seg.start)} - {formatTime(seg.end)} ({durationSec.toFixed(1)}s)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {currentSlip !== 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-bold">
                        Slip: {currentSlip > 0 ? `+${currentSlip}` : currentSlip}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Original text preview (Full text, no line-clamp) */}
                {seg.text && seg.text !== seg.translated_text && (
                  <div className="text-[11px] text-[var(--color-text-muted)] italic leading-relaxed border-l-2 border-[var(--color-primary)]/40 pl-2 py-0.5">
                    {seg.text}
                  </div>
                )}

                {/* Editable Translated Text */}
                <textarea
                  value={seg.translated_text || seg.text || ""}
                  onChange={(e) => handleUpdateSegmentText(idx, e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-2 text-xs leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] resize-none"
                  placeholder="Nhập nội dung lời thoại..."
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Streamlined Action Bar: Mini Audio Player, Quick Regenerate, Speed Dropdown */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]/40" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    {/* Mini Audio Player */}
                    <button
                      type="button"
                      onClick={() => handlePlaySegmentChunk(idx)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
                        isPlaying
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-emerald-500/50 hover:text-emerald-400"
                      }`}
                      title="Nghe thử câu thoại này"
                    >
                      {isPlaying ? <Pause size={11} /> : <Play size={11} />}
                      <span>{isPlaying ? "Dừng" : "Nghe câu"}</span>
                    </button>

                    {/* Quick Regenerate TTS */}
                    <button
                      type="button"
                      onClick={() => handleMicroResynthesize(idx)}
                      disabled={isRegenerating}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition disabled:opacity-50"
                      title="Tạo lại giọng câu này (~0.5s)"
                    >
                      {isRegenerating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                      <span>⚡ Tạo lại giọng câu này</span>
                    </button>
                  </div>

                  {/* Speed Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">Tốc độ:</span>
                    <select
                      value={currentSpeed}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSegmentOverrides((prev) => ({
                          ...prev,
                          [idx]: { ...(prev[idx] || {}), speed: val },
                        }));
                      }}
                      className="h-6 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 text-[10px] font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] font-mono"
                    >
                      <option value={0.8}>0.8x (Chậm)</option>
                      <option value={0.9}>0.9x</option>
                      <option value={1.0}>1.0x (Chuẩn)</option>
                      <option value={1.1}>1.1x</option>
                      <option value={1.2}>1.2x (Nhanh)</option>
                    </select>
                  </div>
                </div>

                {/* Slip Timing Nudge buttons (-50ms / +50ms) */}
                <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <span>Đồng bộ khẩu hình (Audio Slip):</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSegmentSlip(idx, -0.05)}
                      className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] active:scale-95 font-mono text-[9px] font-bold"
                      title="Lùi thời điểm phát 50ms"
                    >
                      -50ms
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSegmentSlip(idx, 0.05)}
                      className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] active:scale-95 font-mono text-[9px] font-bold"
                      title="Tiến thời điểm phát 50ms"
                    >
                      +50ms
                    </button>
                    {currentSlip !== 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSegmentOverrides((prev) => {
                            const next = { ...prev };
                            if (next[idx]) {
                              delete next[idx].slip;
                            }
                            return next;
                          });
                        }}
                        className="p-1 text-[var(--color-text-muted)] hover:text-red-400"
                        title="Đặt lại slip về 0"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
