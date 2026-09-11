import React, { useState, useMemo } from "react";
import {
  List,
  Type,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Scissors,
} from "lucide-react";
import type { SubtitleSegment, SubtitleStyleConfig, SubtitleEffectType } from "../../types/video";

interface EditorSidebarProps {
  segments: SubtitleSegment[];
  activeSegmentIndex: number | null;
  onSelectSegment: (index: number) => void;
  onUpdateSegment: (index: number, updated: Partial<SubtitleSegment>) => void;
  onDeleteSegment: (index: number) => void;
  onAddSegment: (time: number) => void;
  onSplitSegment?: (index: number, splitTime: number) => void;
  onSeek?: (time: number) => void;
  styleConfig: SubtitleStyleConfig;
  onChangeStyle: (updated: Partial<SubtitleStyleConfig>) => void;
  currentTime: number;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  segments,
  activeSegmentIndex,
  onSelectSegment,
  onUpdateSegment,
  onDeleteSegment,
  onAddSegment,
  onSplitSegment,
  onSeek,
  styleConfig,
  onChangeStyle,
  currentTime,
}) => {
  const [activeTab, setActiveTab] = useState<"segments" | "styles" | "effects" | "audio">("segments");
  const [searchQuery, setSearchQuery] = useState("");

  // Curated Typography Fonts
  const fontFamilies = [
    { id: "Montserrat", label: "Montserrat (Điện ảnh & Hiện đại)" },
    { id: "Roboto", label: "Roboto (Cân đối & Dễ đọc)" },
    { id: "Inter", label: "Inter (Sắc nét UI/UX)" },
    { id: "Impact", label: "Impact (Đậm nét Shorts/TikTok)" },
    { id: "Be Vietnam Pro", label: "Be Vietnam Pro (Chuẩn tiếng Việt)" },
    { id: "Arial", label: "Arial (Cổ điển & Tương thích)" },
  ];

  // 5 Animation Effects
  const effectOptions: Array<{
    id: SubtitleEffectType;
    name: string;
    badge: string;
    desc: string;
    icon: string;
  }> = [
    {
      id: "none",
      name: "Tiêu chuẩn",
      badge: "Standard",
      desc: "Phụ đề tĩnh cổ điển, hiển thị tức thì, sắc nét và rõ ràng.",
      icon: "⚡",
    },
    {
      id: "pop",
      name: "Pop / Bật nảy",
      badge: "Viral Shorts",
      desc: "Phóng to nhẹ rồi nảy về kích thước chuẩn, thu hút ánh nhìn tức thì.",
      icon: "💥",
    },
    {
      id: "fade",
      name: "Fade In-Out",
      badge: "Mượt mà",
      desc: "Hiệu ứng mờ dần khi xuất hiện và biến mất êm ái.",
      icon: "✨",
    },
    {
      id: "slide",
      name: "Trượt lên (Slide)",
      badge: "Slide Up",
      desc: "Trượt nhẹ từ dưới lên trên kết hợp dãn khoảng cách chữ sang trọng.",
      icon: "🚀",
    },
    {
      id: "karaoke",
      name: "Karaoke / Nổi bật",
      badge: "Highlight",
      desc: "Chữ phát sáng rực rỡ và nảy từng nhịp nhịp nhàng theo lời nói.",
      icon: "🎤",
    },
  ];

  // Preset Colors
  const textPresetColors = [
    { label: "Trắng", hex: "#FFFFFF" },
    { label: "Vàng Gold", hex: "#FFE600" },
    { label: "Cyan Neon", hex: "#00F2FE" },
    { label: "Xanh lá", hex: "#10B981" },
    { label: "Hồng Neon", hex: "#FF3366" },
  ];

  const outlinePresetColors = [
    { label: "Đen", hex: "#000000" },
    { label: "Xám Slate", hex: "#1E293B" },
    { label: "Xanh đậm", hex: "#0F172A" },
    { label: "Tím than", hex: "#4C1D95" },
    { label: "Không viền", hex: "transparent" },
  ];

  // Filter segments
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const query = searchQuery.toLowerCase();
    return segments.filter(
      (s) =>
        (s.translated_text && s.translated_text.toLowerCase().includes(query)) ||
        (s.text && s.text.toLowerCase().includes(query)) ||
        (s.speaker && s.speaker.toLowerCase().includes(query))
    );
  }, [segments, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-zinc-200 select-none">
      {/* SIDEBAR TABS */}
      <div className="flex items-center border-b border-zinc-800 p-1.5 gap-1 bg-zinc-950/40">
        <button
          onClick={() => setActiveTab("segments")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition ${
            activeTab === "segments"
              ? "bg-zinc-800 text-white shadow"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Dòng phụ đề</span>
        </button>

        <button
          onClick={() => setActiveTab("styles")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition ${
            activeTab === "styles"
              ? "bg-zinc-800 text-white shadow"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Font & Kiểu</span>
        </button>

        <button
          onClick={() => setActiveTab("effects")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition ${
            activeTab === "effects"
              ? "bg-zinc-800 text-white shadow"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Hiệu ứng</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {/* ==================== TAB 1: SEGMENTS ==================== */}
        {activeTab === "segments" && (
          <div className="flex flex-col gap-3">
            {/* Search & Add Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm phụ đề..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <button
                onClick={() => onAddSegment(currentTime)}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition active:scale-95"
                title="Thêm phụ đề mới tại vị trí hiện tại"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Segments List */}
            <div className="flex flex-col gap-2">
              {filteredSegments.map((seg) => {
                const originalIdx = segments.indexOf(seg);
                const isSelected = activeSegmentIndex === originalIdx;

                return (
                  <div
                    key={seg.id || originalIdx}
                    onClick={() => {
                      onSelectSegment(originalIdx);
                      if (onSeek) onSeek(seg.start);
                    }}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500/70 shadow-md ring-1 ring-indigo-500/30"
                        : "bg-zinc-950/50 hover:bg-zinc-950 border-zinc-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                          #{(originalIdx + 1).toString().padStart(2, "0")}
                        </span>
                        <span>
                          {seg.start.toFixed(2)}s → {seg.end.toFixed(2)}s
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onSplitSegment && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const midTime = (seg.start + seg.end) / 2;
                              onSplitSegment(originalIdx, midTime);
                            }}
                            className="p-1 hover:bg-amber-950/50 text-zinc-500 hover:text-amber-400 rounded transition"
                            title="Tách phân đoạn này làm đôi"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSegment(originalIdx);
                          }}
                          className="p-1 hover:bg-red-950/50 text-zinc-500 hover:text-red-400 rounded transition"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={seg.translated_text || seg.text || ""}
                      onChange={(e) => {
                        onUpdateSegment(originalIdx, { translated_text: e.target.value });
                      }}
                      className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                      placeholder="Nội dung phụ đề..."
                    />
                  </div>
                );
              })}

              {filteredSegments.length === 0 && (
                <div className="py-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-2.5">
                  <p>Không tìm thấy phụ đề nào.</p>
                  <button
                    type="button"
                    onClick={() => onAddSegment(currentTime)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm phụ đề tại {currentTime.toFixed(1)}s</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: STYLES & FONTS ==================== */}
        {activeTab === "styles" && (
          <div className="flex flex-col gap-4 text-xs">
            {/* Font Family */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-zinc-300">Phông chữ (Font Family)</label>
              <select
                value={styleConfig.fontName}
                onChange={(e) => onChangeStyle({ fontName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {fontFamilies.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size & Formats */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-zinc-300">Cỡ chữ (Font Size)</label>
                <span className="font-mono text-zinc-400 font-semibold">{styleConfig.fontSize}px</span>
              </div>
              <input
                type="range"
                min={14}
                max={48}
                value={styleConfig.fontSize}
                onChange={(e) => onChangeStyle({ fontSize: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Font Formatting Toggles: Bold, Italic, Uppercase */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onChangeStyle({ bold: !styleConfig.bold })}
                className={`flex-1 py-1.5 rounded-lg border font-bold text-center transition ${
                  styleConfig.bold
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                B (Đậm)
              </button>
              <button
                onClick={() => onChangeStyle({ italic: !styleConfig.italic })}
                className={`flex-1 py-1.5 rounded-lg border italic text-center transition ${
                  styleConfig.italic
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                I (Nghiêng)
              </button>
              <button
                onClick={() => onChangeStyle({ uppercase: !styleConfig.uppercase })}
                className={`flex-1 py-1.5 rounded-lg border text-center transition ${
                  styleConfig.uppercase
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                AA (IN HOA)
              </button>
            </div>

            {/* Primary Text Color */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="font-semibold text-zinc-300">Màu chữ chính (Primary Color)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={styleConfig.primaryColor}
                  onChange={(e) => onChangeStyle({ primaryColor: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <div className="flex-1 flex gap-1.5">
                  {textPresetColors.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => onChangeStyle({ primaryColor: color.hex })}
                      style={{ backgroundColor: color.hex }}
                      className={`w-6 h-6 rounded-full border border-black/40 transition hover:scale-110 ${
                        styleConfig.primaryColor.toUpperCase() === color.hex.toUpperCase()
                          ? "ring-2 ring-indigo-400"
                          : ""
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Outline / Stroke Color & Width */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-zinc-300">Độ dày viền (Stroke)</label>
                <span className="font-mono text-zinc-400">{styleConfig.outlineWidth}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                value={styleConfig.outlineWidth}
                onChange={(e) => onChangeStyle({ outlineWidth: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={styleConfig.outlineColor}
                  onChange={(e) => onChangeStyle({ outlineColor: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <div className="flex-1 flex gap-1.5">
                  {outlinePresetColors.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => onChangeStyle({ outlineColor: color.hex })}
                      style={{ backgroundColor: color.hex }}
                      className={`w-6 h-6 rounded-full border border-white/20 transition hover:scale-110 ${
                        styleConfig.outlineColor.toUpperCase() === color.hex.toUpperCase()
                          ? "ring-2 ring-indigo-400"
                          : ""
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Subtitle Position */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="font-semibold text-zinc-300">Vị trí hiển thị (Position)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "bottom", label: "Dưới đáy" },
                  { id: "middle", label: "Ở giữa" },
                  { id: "top", label: "Trên đỉnh" },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => onChangeStyle({ position: pos.id as any })}
                    className={`py-1.5 rounded-lg border text-center transition ${
                      styleConfig.position === pos.id
                        ? "bg-indigo-600 text-white border-indigo-500 font-semibold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Management */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="font-semibold text-zinc-300">Giới hạn số dòng (Max Lines)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 1, label: "1 Dòng (Shorts)" },
                  { id: 2, label: "2 Dòng (Chuẩn)" },
                  { id: 0, label: "Tự động" },
                ].map((line) => (
                  <button
                    key={line.id}
                    onClick={() => onChangeStyle({ maxLines: line.id })}
                    className={`py-1.5 rounded-lg border text-center transition ${
                      styleConfig.maxLines === line.id
                        ? "bg-indigo-600 text-white border-indigo-500 font-semibold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {line.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: ANIMATION EFFECTS ==================== */}
        {activeTab === "effects" && (
          <div className="flex flex-col gap-2.5">
            <p className="text-zinc-400 text-xs mb-1">
              Chọn hiệu ứng hoạt họa chữ cho phụ đề. Tương thích cả video ngang và TikTok/Reels Shorts.
            </p>

            {effectOptions.map((opt) => {
              const isSelected = styleConfig.effect === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => onChangeStyle({ effect: opt.id })}
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                    isSelected
                      ? "bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/30"
                      : "bg-zinc-950/60 hover:bg-zinc-950 border-zinc-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-xs text-white">
                      <span>{opt.icon}</span>
                      <span>{opt.name}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-400 font-bold"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">{opt.desc}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
