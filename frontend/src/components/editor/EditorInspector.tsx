// frontend/src/components/editor/EditorInspector.tsx
import React from "react";
import {
  Clock,
  Type,
  User,
  AlertTriangle,
  Sparkles,
  Scissors,
  Layers,
  Palette,
  AlignLeft,
  Coins,
  ChevronLeft,
  Check,
} from "lucide-react";
import type { SubtitleSegment, SubtitleStyleConfig, SubtitleEffectType } from "../../types/video";

interface EditorInspectorProps {
  segment: SubtitleSegment | null;
  segmentIndex: number | null;
  currentTime?: number;
  onUpdateSegment: (index: number, updated: Partial<SubtitleSegment>) => void;
  onSplitSegment: (index: number, splitTime: number) => void;
  onClearSelection?: () => void;
  styleConfig: SubtitleStyleConfig;
  onChangeStyle: (updated: Partial<SubtitleStyleConfig>) => void;
}

export const EditorInspector: React.FC<EditorInspectorProps> = ({
  segment,
  segmentIndex,
  currentTime,
  onUpdateSegment,
  onSplitSegment,
  onClearSelection,
  styleConfig,
  onChangeStyle,
}) => {
  // Available font families
  const fontFamilies = [
    { id: "Montserrat", label: "Montserrat (Điện ảnh)" },
    { id: "Roboto", label: "Roboto (Cân đối)" },
    { id: "Be Vietnam Pro", label: "Be Vietnam Pro (Tiếng Việt)" },
    { id: "Inter", label: "Inter (Sắc nét UI)" },
    { id: "Impact", label: "Impact (Viral Shorts)" },
    { id: "Arial", label: "Arial (Cổ điển)" },
  ];

  // 5 Animation Effects
  const effectOptions: Array<{
    id: SubtitleEffectType;
    name: string;
    icon: string;
  }> = [
    { id: "none", name: "Tiêu chuẩn", icon: "⚡" },
    { id: "pop", name: "Pop Bật nảy", icon: "💥" },
    { id: "fade", name: "Fade Mờ dần", icon: "✨" },
    { id: "slide", name: "Trượt lên", icon: "🚀" },
    { id: "karaoke", name: "Karaoke Vàng", icon: "🎤" },
  ];

  // Preset Colors
  const textPresetColors = [
    { label: "Trắng", hex: "#FFFFFF" },
    { label: "Vàng Gold", hex: "#FFE600" },
    { label: "Cyan", hex: "#00F2FE" },
    { label: "Xanh lá", hex: "#10B981" },
    { label: "Hồng", hex: "#FF3366" },
  ];

  const outlinePresetColors = [
    { label: "Đen", hex: "#000000" },
    { label: "Slate", hex: "#1E293B" },
    { label: "Đêm", hex: "#0F172A" },
    { label: "Tím", hex: "#4C1D95" },
    { label: "Không", hex: "transparent" },
  ];

  // =========================================================================
  // STATE A: NO SEGMENT SELECTED -> RENDER GLOBAL THEME & STYLES (NO DEAD SPACE!)
  // =========================================================================
  if (!segment || segmentIndex === null) {
    return (
      <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-zinc-200 text-xs select-none">
        {/* Header */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-white">Kiểu dáng Toàn cục</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
            <Coins className="w-3 h-3" />
            <span>0 Credits</span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4">
          
          {/* Typography */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-indigo-400" />
              <span>Phông chữ (Font Family)</span>
            </label>
            <select
              value={styleConfig.fontName}
              onChange={(e) => onChangeStyle({ fontName: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              {fontFamilies.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Size & Position */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-zinc-300 text-[11px]">Cỡ chữ (px)</label>
              <select
                value={styleConfig.fontSize}
                onChange={(e) => onChangeStyle({ fontSize: parseInt(e.target.value, 10) || 22 })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="16">16px (Nhỏ)</option>
                <option value="20">20px (Vừa)</option>
                <option value="22">22px (Chuẩn)</option>
                <option value="26">26px (Lớn)</option>
                <option value="30">30px (Shorts)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-zinc-300 text-[11px]">Vị trí</label>
              <select
                value={styleConfig.position || "bottom"}
                onChange={(e) => onChangeStyle({ position: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="bottom">Dưới đáy</option>
                <option value="middle">Ở giữa</option>
                <option value="top">Trên đỉnh</option>
              </select>
            </div>
          </div>

          {/* Animation Effects */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Hiệu ứng hiển thị
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">5 kiểu</span>
            </label>

            <div className="grid grid-cols-1 gap-1.5">
              {effectOptions.map((opt) => {
                const isSelected = styleConfig.effect === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeStyle({ effect: opt.id })}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left transition ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/40 text-white font-semibold"
                        : "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{opt.icon}</span>
                      <span className="text-xs">{opt.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Color */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              <span>Màu chữ chính</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styleConfig.primaryColor || "#FFFFFF"}
                onChange={(e) => onChangeStyle({ primaryColor: e.target.value })}
                className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer p-0.5"
              />
              <div className="flex items-center gap-1 flex-wrap">
                {textPresetColors.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => onChangeStyle({ primaryColor: p.hex })}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition ${
                      (styleConfig.primaryColor || "").toLowerCase() === p.hex.toLowerCase()
                        ? "border-indigo-400 scale-110 shadow-sm"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: p.hex }}
                    title={p.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Outline Color */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>Màu viền (Stroke)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styleConfig.outlineColor === "transparent" ? "#000000" : styleConfig.outlineColor || "#000000"}
                onChange={(e) => onChangeStyle({ outlineColor: e.target.value })}
                className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer p-0.5"
              />
              <div className="flex items-center gap-1 flex-wrap">
                {outlinePresetColors.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => onChangeStyle({ outlineColor: p.hex })}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition ${
                      (styleConfig.outlineColor || "").toLowerCase() === p.hex.toLowerCase()
                        ? "border-indigo-400 scale-110 shadow-sm"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: p.hex === "transparent" ? "#555" : p.hex }}
                    title={p.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Max Lines */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>Số dòng tối đa</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { val: 1, label: "1 dòng" },
                { val: 2, label: "2 dòng" },
                { val: 0, label: "Tự động" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => onChangeStyle({ maxLines: opt.val })}
                  className={`py-1.5 px-2 rounded-lg border text-center text-xs transition ${
                    styleConfig.maxLines === opt.val
                      ? "border-indigo-500 bg-indigo-950/40 text-white font-bold"
                      : "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 text-[11px] leading-relaxed">
            <p className="text-zinc-300 font-semibold mb-1">Mẹo NLE:</p>
            Nhấp vào bất kỳ đoạn phụ đề nào trên Timeline hoặc Danh sách để xem và chỉnh sửa thuộc tính riêng của câu đó.
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE B: SEGMENT SELECTED -> RENDER SEGMENT PROPERTY INSPECTOR
  // =========================================================================
  const duration = Math.max(0, segment.end - segment.start);
  const textContent = segment.translated_text || segment.text || "";
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;

  const estimatedLines = Math.ceil(charCount / 38) || 1;
  const isLineExceeded = (styleConfig.maxLines || 2) > 0 && estimatedLines > (styleConfig.maxLines || 2);

  // Split at current playhead or midpoint
  const handleSplitAtPlayhead = () => {
    let splitTime = currentTime;
    if (splitTime === undefined || splitTime <= segment.start + 0.2 || splitTime >= segment.end - 0.2) {
      splitTime = segment.start + duration / 2;
    }
    onSplitSegment(segmentIndex, parseFloat(splitTime.toFixed(3)));
  };

  // Split into two halves
  const handleSplitInHalf = () => {
    const halfTime = segment.start + duration / 2;
    onSplitSegment(segmentIndex, parseFloat(halfTime.toFixed(3)));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-zinc-200 text-xs select-none">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {onClearSelection && (
            <button
              onClick={onClearSelection}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              title="Quay lại cài đặt kiểu dáng toàn cục"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="font-semibold text-white">Đoạn #{segmentIndex + 1}</span>
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
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
            placeholder="SPEAKER_00"
          />
        </div>

        {/* TEXT CONTENT & STATS */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nội dung câu phụ đề</span>
            </label>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <span>{wordCount} từ</span>
              <span>•</span>
              <span>{charCount} ký tự</span>
            </div>
          </div>

          <textarea
            rows={4}
            value={segment.translated_text || segment.text || ""}
            onChange={(e) => onUpdateSegment(segmentIndex, { translated_text: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 leading-relaxed resize-none font-sans"
            placeholder="Nhập nội dung phụ đề..."
          />

          {isLineExceeded && (
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Câu này có thể hiển thị vượt quá {styleConfig.maxLines} dòng trên màn hình.</span>
            </div>
          )}
        </div>

        {/* QUICK SPLIT ACTIONS */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Thao tác phân đoạn</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSplitAtPlayhead}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
              title="Tách tại Playhead"
            >
              <Scissors className="w-3 h-3 text-amber-400" />
              <span>Tách tại con trỏ</span>
            </button>

            <button
              type="button"
              onClick={handleSplitInHalf}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
              title="Chia đôi mốc thời gian"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Chia đôi câu</span>
            </button>
          </div>
        </div>

        {/* SWITCH TO GLOBAL THEME BUTTON */}
        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="mt-2 w-full flex items-center justify-center gap-1.5 p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition text-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mở Kiểu dáng Toàn cục</span>
          </button>
        )}
      </div>
    </div>
  );
};
