// frontend/src/components/editor/EditorInspector.tsx
import React from "react";
import {
  Clock,
  Type,
  User,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Scissors,
  Layers,
  Wand2,
} from "lucide-react";
import type { SubtitleSegment } from "../../types/video";

interface EditorInspectorProps {
  segment: SubtitleSegment | null;
  segmentIndex: number | null;
  currentTime?: number;
  onUpdateSegment: (index: number, updated: Partial<SubtitleSegment>) => void;
  onSplitSegment: (index: number, splitTime: number) => void;
  maxLines: number;
}

export const EditorInspector: React.FC<EditorInspectorProps> = ({
  segment,
  segmentIndex,
  currentTime,
  onUpdateSegment,
  onSplitSegment,
  maxLines,
}) => {
  if (!segment || segmentIndex === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-zinc-500 text-xs bg-zinc-900/60 border-l border-zinc-800">
        <Layers className="w-8 h-8 text-zinc-600 mb-2 animate-pulse" />
        <span className="font-medium text-zinc-400">Chưa chọn dòng phụ đề nào</span>
        <span className="text-[11px] mt-1 text-zinc-600">
          Nhấp vào một đoạn phụ đề trên video track, timeline hoặc danh sách để chỉnh sửa hoặc tách câu.
        </span>
      </div>
    );
  }

  const duration = Math.max(0, segment.end - segment.start);
  const textContent = segment.translated_text || segment.text || "";
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;

  // Check line wrapping length (assuming ~38 chars per line is safe)
  const estimatedLines = Math.ceil(charCount / 38) || 1;
  const isLineExceeded = maxLines > 0 && estimatedLines > maxLines;

  // Split at current playhead or midpoint
  const handleSplitAtPlayhead = () => {
    let splitTime = currentTime;
    if (splitTime === undefined || splitTime <= segment.start + 0.2 || splitTime >= segment.end - 0.2) {
      splitTime = segment.start + duration / 2;
    }
    onSplitSegment(segmentIndex, parseFloat(splitTime.toFixed(3)));
  };

  // Split at comma helper
  const handleSplitAtComma = () => {
    const commaIdx = textContent.indexOf(",");
    if (commaIdx !== -1 && duration > 0.8) {
      const halfTime = segment.start + duration / 2;
      onSplitSegment(segmentIndex, halfTime);
    }
  };

  // Split into two halves
  const handleSplitInHalf = () => {
    const halfTime = segment.start + duration / 2;
    onSplitSegment(segmentIndex, parseFloat(halfTime.toFixed(3)));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-zinc-200 text-xs select-none">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">Thuộc tính đoạn #{segmentIndex + 1}</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          {duration.toFixed(2)}s
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4">
        {/* TIMING INPUTS */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Mốc thời gian (Thời lượng)</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono">BẮT ĐẦU</span>
              <input
                type="number"
                step={0.05}
                value={segment.start}
                onChange={(e) =>
                  onUpdateSegment(segmentIndex, { start: parseFloat(e.target.value) || 0 })
                }
                className="bg-transparent text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono">KẾT THÚC</span>
              <input
                type="number"
                step={0.05}
                value={segment.end}
                onChange={(e) =>
                  onUpdateSegment(segmentIndex, { end: parseFloat(e.target.value) || 0 })
                }
                className="bg-transparent text-white font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SPEAKER ASSIGNMENT */}
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>Người nói (Speaker)</span>
          </label>
          <input
            type="text"
            value={segment.speaker || "SPEAKER_00"}
            onChange={(e) => onUpdateSegment(segmentIndex, { speaker: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
            placeholder="Ví dụ: SPEAKER_00, MC, Khách mời..."
          />
        </div>

        {/* TEXT CONTENT & STATS */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nội dung phụ đề</span>
            </label>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <span>{wordCount} từ</span>
              <span>•</span>
              <span>{charCount} ký tự</span>
            </div>
          </div>

          <textarea
            rows={3}
            value={textContent}
            onChange={(e) => onUpdateSegment(segmentIndex, { translated_text: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white text-xs leading-relaxed focus:outline-none focus:border-indigo-500 resize-none font-sans"
            placeholder="Nhập nội dung phụ đề hiển thị..."
          />

          {/* Line Length Validation Notice */}
          <div
            className={`flex flex-col gap-2 p-2.5 rounded-xl text-[11px] border ${
              isLineExceeded
                ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                : "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {isLineExceeded ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>
                    Đoạn văn dài ({estimatedLines} dòng). Khuyên tách thành 2 câu để tránh che màn hình.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Độ dài văn bản tối ưu, vừa vặn trên màn hình.</span>
                </>
              )}
            </div>

            {isLineExceeded && (
              <button
                onClick={handleSplitInHalf}
                className="mt-1 flex items-center justify-center gap-1.5 py-1 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/50 rounded-lg font-medium transition text-[11px] active:scale-95"
              >
                <Scissors className="w-3 h-3 text-amber-400" />
                <span>Tách đoạn này làm 2 câu ngay</span>
              </button>
            )}
          </div>
        </div>

        {/* SUBTITLE SPLIT & EDIT ACTIONS */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
          <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Chia tách phân đoạn</span>
          </label>

          {/* Split at Playhead */}
          <button
            onClick={handleSplitAtPlayhead}
            className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition text-xs group"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition" />
              <span>Tách tại Playhead (Phím S)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {currentTime !== undefined ? `${currentTime.toFixed(2)}s` : "Playhead"}
            </span>
          </button>

          {/* Split in Half */}
          <button
            onClick={handleSplitInHalf}
            className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition text-xs group"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
              <span>Tách đôi phân đoạn</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">50 / 50</span>
          </button>

          {/* Split at Comma if present */}
          {textContent.includes(",") && (
            <button
              onClick={handleSplitAtComma}
              className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition text-xs group"
            >
              <div className="flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
                <span>Tách câu tại dấu phẩy (,)</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Dấu câu</span>
            </button>
          )}
        </div>

        {/* AI QUICK ASSISTANT TOOLS */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
          <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Trợ lý AI nhanh (Miễn phí)</span>
          </label>

          <button
            onClick={() => {
              onUpdateSegment(segmentIndex, {
                translated_text: textContent.toUpperCase(),
              });
            }}
            className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition text-xs"
          >
            <div className="flex items-center gap-2">
              <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Chuyển thành IN HOA (Viral)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">1-Click</span>
          </button>
        </div>
      </div>
    </div>
  );
};
