import { useState, useMemo } from "react";
import { Scissors, AlertCircle, X, Check, Clock, Sparkles } from "lucide-react";

export interface SplitSegmentData {
  start: number;
  end: number;
  text: string;
  translated_text?: string;
  speaker?: string;
}

interface UniversalSplitModalProps {
  segment: SplitSegmentData;
  segmentIndex: number;
  currentTime?: number;
  isOpen: boolean;
  onClose: () => void;
  // If translated_text exists (Step 3), we split both or let user adjust both
  onConfirmSplit: (
    index: number,
    splitTime: number,
    part1: { text: string; translated_text?: string },
    part2: { text: string; translated_text?: string }
  ) => void;
  mode?: "transcript" | "translation";
}

export default function UniversalSplitModal({
  segment,
  segmentIndex,
  currentTime,
  isOpen,
  onClose,
  onConfirmSplit,
  mode = "transcript",
}: UniversalSplitModalProps) {
  if (!isOpen) return null;

  const duration = segment.end - segment.start;
  const isTranslation = mode === "translation" || Boolean(segment.translated_text);

  // Source text words
  const sourceWords = useMemo(() => (segment.text || "").trim().split(/\s+/).filter(Boolean), [segment.text]);
  // Target translation words (if in translation mode)
  const transWords = useMemo(() => (segment.translated_text || "").trim().split(/\s+/).filter(Boolean), [segment.translated_text]);

  // Which stream the user is currently clicking to split: 'translation' (default in step 3) or 'source'
  const [splitStream, setSplitStream] = useState<"source" | "translation">(
    isTranslation && transWords.length > 0 ? "translation" : "source"
  );

  const activeWords = splitStream === "translation" && transWords.length > 0 ? transWords : sourceWords;

  // Selected word index in activeWords
  const [selectedWordIdx, setSelectedWordIdx] = useState<number>(() => {
    return Math.max(1, Math.floor((activeWords.length || 2) / 2));
  });

  const [splitTime, setSplitTime] = useState<number>(() => {
    if (
      currentTime &&
      currentTime >= segment.start + 1.0 &&
      currentTime <= segment.end - 1.0
    ) {
      return parseFloat(currentTime.toFixed(2));
    }
    const initialRatio = activeWords.length > 1 ? Math.floor(activeWords.length / 2) / activeWords.length : 0.5;
    return parseFloat((segment.start + duration * initialRatio).toFixed(2));
  });

  // Calculate text slices whenever splitTime or selectedWordIdx changes
  const initialParts = useMemo(() => {
    const ratio = duration > 0 ? (splitTime - segment.start) / duration : 0.5;
    const transCut = Math.max(1, Math.min(transWords.length - 1, Math.round(transWords.length * ratio)));
    const srcCut = Math.max(1, Math.min(sourceWords.length - 1, Math.round(sourceWords.length * ratio)));

    return {
      src1: sourceWords.slice(0, srcCut).join(" "),
      src2: sourceWords.slice(srcCut).join(" "),
      trans1: transWords.slice(0, transCut).join(" "),
      trans2: transWords.slice(transCut).join(" "),
    };
  }, [segment.start, duration, splitTime, sourceWords, transWords]);

  const [customPart1Text, setCustomPart1Text] = useState(initialParts.src1);
  const [customPart2Text, setCustomPart2Text] = useState(initialParts.src2);
  const [customPart1Trans, setCustomPart1Trans] = useState(initialParts.trans1);
  const [customPart2Trans, setCustomPart2Trans] = useState(initialParts.trans2);

  const part1Duration = Math.max(0, splitTime - segment.start);
  const part2Duration = Math.max(0, segment.end - splitTime);
  const isSafe = part1Duration >= 1.0 && part2Duration >= 1.0;

  const handleSelectWord = (idx: number) => {
    setSelectedWordIdx(idx);
    const count = activeWords.length;
    const ratio = count > 1 ? idx / count : 0.5;
    const newTime = parseFloat((segment.start + duration * ratio).toFixed(2));
    setSplitTime(newTime);

    if (splitStream === "translation") {
      const p1 = transWords.slice(0, idx).join(" ");
      const p2 = transWords.slice(idx).join(" ");
      setCustomPart1Trans(p1);
      setCustomPart2Trans(p2);

      const sCut = Math.max(1, Math.min(sourceWords.length - 1, Math.round(sourceWords.length * ratio)));
      setCustomPart1Text(sourceWords.slice(0, sCut).join(" "));
      setCustomPart2Text(sourceWords.slice(sCut).join(" "));
    } else {
      const p1 = sourceWords.slice(0, idx).join(" ");
      const p2 = sourceWords.slice(idx).join(" ");
      setCustomPart1Text(p1);
      setCustomPart2Text(p2);

      if (transWords.length > 0) {
        const tCut = Math.max(1, Math.min(transWords.length - 1, Math.round(transWords.length * ratio)));
        setCustomPart1Trans(transWords.slice(0, tCut).join(" "));
        setCustomPart2Trans(transWords.slice(tCut).join(" "));
      }
    }
  };

  const handleSliderChange = (newTime: number) => {
    setSplitTime(newTime);
    const ratio = duration > 0 ? (newTime - segment.start) / duration : 0.5;

    const count = activeWords.length;
    const pIdx = Math.max(1, Math.min(count - 1, Math.round(count * ratio)));
    setSelectedWordIdx(pIdx);

    const sCut = Math.max(1, Math.min(sourceWords.length - 1, Math.round(sourceWords.length * ratio)));
    setCustomPart1Text(sourceWords.slice(0, sCut).join(" "));
    setCustomPart2Text(sourceWords.slice(sCut).join(" "));

    if (transWords.length > 0) {
      const tCut = Math.max(1, Math.min(transWords.length - 1, Math.round(transWords.length * ratio)));
      setCustomPart1Trans(transWords.slice(0, tCut).join(" "));
      setCustomPart2Trans(transWords.slice(tCut).join(" "));
    }
  };

  const handleSwitchStream = (stream: "source" | "translation") => {
    setSplitStream(stream);
    const targetWords = stream === "translation" && transWords.length > 0 ? transWords : sourceWords;
    const ratio = duration > 0 ? (splitTime - segment.start) / duration : 0.5;
    const newIdx = Math.max(1, Math.min(targetWords.length - 1, Math.round(targetWords.length * ratio)));
    setSelectedWordIdx(newIdx);
  };

  const handleConfirm = () => {
    if (!isSafe) return;
    onConfirmSplit(
      segmentIndex,
      splitTime,
      {
        text: customPart1Text.trim(),
        translated_text: isTranslation ? customPart1Trans.trim() : undefined,
      },
      {
        text: customPart2Text.trim(),
        translated_text: isTranslation ? customPart2Trans.trim() : undefined,
      }
    );
    onClose();
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(2);
    return `${m.toString().padStart(2, "0")}:${sec.padStart(5, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 bg-[var(--color-surface-muted)]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/20">
              <Scissors size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Tách câu thoại #{segmentIndex + 1}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {duration.toFixed(2)}s
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Nhấp chuột giữa các từ hoặc kéo thanh trượt để chia đôi câu thoại chính xác
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto custom-scrollbar">
          {/* Timeline Range Indicator */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-mono">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-[var(--color-primary)]" />
                <span>Bắt đầu: {formatSec(segment.start)}</span>
              </span>
              <span className="font-bold text-amber-500">
                Điểm cắt: {formatSec(splitTime)}
              </span>
              <span>Kết thúc: {formatSec(segment.end)}</span>
            </div>

            {/* Slider */}
            <div className="relative pt-1">
              <input
                type="range"
                min={segment.start}
                max={segment.end}
                step={0.05}
                value={splitTime}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                <span>0.00s</span>
                <span>{(duration / 2).toFixed(2)}s (Giữa)</span>
                <span>{duration.toFixed(2)}s</span>
              </div>
            </div>
          </div>

          {/* Interactive Word Tap Boundary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Điểm ngắt câu theo từ:
              </label>

              {isTranslation && transWords.length > 0 && (
                <div className="flex items-center gap-1 bg-[var(--color-surface-muted)] p-0.5 rounded-lg border border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => handleSwitchStream("translation")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      splitStream === "translation"
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    Bản dịch ({transWords.length} từ)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchStream("source")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      splitStream === "source"
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    Lời thoại gốc ({sourceWords.length} từ)
                  </button>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center gap-y-2 gap-x-1 leading-relaxed">
              {activeWords.map((word, idx) => {
                const isBeforeCut = idx < selectedWordIdx;
                const isCutPoint = idx === selectedWordIdx;
                return (
                  <div key={idx} className="inline-flex items-center">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectWord(idx)}
                        className={`group relative mx-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-all flex items-center gap-0.5 ${
                          isCutPoint
                            ? "bg-amber-500 text-white font-bold shadow-md ring-2 ring-amber-500/30 scale-105 z-10"
                            : "text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10"
                        }`}
                        title={`Tách tại đây: ${(segment.start + (duration * idx) / activeWords.length).toFixed(2)}s`}
                      >
                        {isCutPoint ? (
                          <>
                            <Scissors size={10} className="stroke-[2.5]" />
                            <span>CẮT</span>
                          </>
                        ) : (
                          <span className="opacity-40 group-hover:opacity-100 font-bold">|</span>
                        )}
                      </button>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                        isBeforeCut
                          ? "bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)] font-semibold"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-300 font-semibold"
                      }`}
                    >
                      {word}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Result Cards Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Part 1 Card */}
            <div className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-surface-muted)] p-3 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1">
                  <span>Phần 1</span>
                  <span className="font-mono text-zinc-400">({part1Duration.toFixed(2)}s)</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {formatSec(segment.start)} → {formatSec(splitTime)}
                </span>
              </div>

              {isTranslation && (
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block">Lời thoại gốc:</span>
                  <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 italic">
                    {customPart1Text || "(Trống)"}
                  </p>
                </div>
              )}

              <div>
                {isTranslation && (
                  <span className="text-[9px] uppercase font-bold text-[var(--color-primary)] block">Bản dịch:</span>
                )}
                <textarea
                  value={isTranslation ? customPart1Trans : customPart1Text}
                  onChange={(e) =>
                    isTranslation ? setCustomPart1Trans(e.target.value) : setCustomPart1Text(e.target.value)
                  }
                  rows={2}
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Part 2 Card */}
            <div className="rounded-xl border border-amber-500/40 bg-[var(--color-surface-muted)] p-3 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <span>Phần 2</span>
                  <span className="font-mono text-zinc-400">({part2Duration.toFixed(2)}s)</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {formatSec(splitTime)} → {formatSec(segment.end)}
                </span>
              </div>

              {isTranslation && (
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block">Lời thoại gốc:</span>
                  <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 italic">
                    {customPart2Text || "(Trống)"}
                  </p>
                </div>
              )}

              <div>
                {isTranslation && (
                  <span className="text-[9px] uppercase font-bold text-amber-500 block">Bản dịch:</span>
                )}
                <textarea
                  value={isTranslation ? customPart2Trans : customPart2Text}
                  onChange={(e) =>
                    isTranslation ? setCustomPart2Trans(e.target.value) : setCustomPart2Text(e.target.value)
                  }
                  rows={2}
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Safety Warning */}
          {!isSafe && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <div className="space-y-0.5">
                <p className="font-bold">Quy tắc kiểm soát thời lượng tối thiểu (tối thiểu 1.0 giây):</p>
                <p className="text-[11px] leading-relaxed text-red-500/90">
                  Mỗi đoạn sau khi tách phải dài ít nhất 1.0 giây để bảo toàn chất lượng âm thanh khi lồng tiếng TTS và hiển thị phụ đề. Hiện tại: Phần 1 ({part1Duration.toFixed(2)}s), Phần 2 ({part2Duration.toFixed(2)}s).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3.5 bg-[var(--color-surface-muted)]/30">
          <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-500" />
            <span>Đồng bộ tự động thời lượng & vị trí từ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)] transition"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isSafe}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-98"
            >
              <Check size={14} />
              <span>Xác nhận chia câu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
