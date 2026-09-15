// frontend/src/components/editor/EditorInspector.tsx
import React, { useState, useRef } from "react";
import {
  Clock,
  Type,
  User,
  AlertTriangle,
  Sparkles,
  Scissors,
  Layers,
  Palette,
  ChevronLeft,
  Check,
  Crop,
  Image as ImageIcon,
  Upload,
  Volume2,
  Loader2,
  Play,
  X,
} from "lucide-react";

import type {
  SubtitleSegment,
  SubtitleStyleConfig,
  SubtitleEffectType,
  SubtitleMaskConfig,
  OverlayConfig,
} from "../../types/video";
import { videoService } from "../../services/video.service";

interface EditorInspectorProps {
  segment: SubtitleSegment | null;
  segmentIndex: number | null;
  currentTime?: number;
  onUpdateSegment: (index: number, updated: Partial<SubtitleSegment>) => void;
  onSplitSegment: (index: number, splitTime: number) => void;
  onClearSelection?: () => void;
  styleConfig: SubtitleStyleConfig;
  onChangeStyle: (updated: Partial<SubtitleStyleConfig>) => void;
  videoId?: number;
  targetLanguage?: string;
  subtitleMask?: SubtitleMaskConfig;
  onChangeSubtitleMask?: (mask: SubtitleMaskConfig) => void;
  overlayConfig?: OverlayConfig;
  onChangeOverlayConfig?: (overlay: OverlayConfig) => void;
  isMaskingMode?: boolean;
  onToggleMaskingMode?: () => void;
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
  videoId,
  targetLanguage = "vi",
  subtitleMask,
  onChangeSubtitleMask,
  overlayConfig,
  onChangeOverlayConfig,
  isMaskingMode = false,
  onToggleMaskingMode,
}) => {
  const [globalTab, setGlobalTab] = useState<"style" | "mask" | "branding">("style");
  const [isResynthesizing, setIsResynthesizing] = useState(false);
  const [snippetAudioUrl, setSnippetAudioUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isPlayingSnippet, setIsPlayingSnippet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);


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
  // STATE A: NO SEGMENT SELECTED -> RENDER GLOBAL THEME, MASK & BRANDING TABS
  // =========================================================================
  if (!segment || segmentIndex === null) {
    return (
      <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-zinc-200 text-xs select-none">
        {/* Navigation Tabs Header */}
        <div className="p-2 border-b border-zinc-800 bg-zinc-950/80 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setGlobalTab("style")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              globalTab === "style" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kiểu chữ</span>
          </button>
          <button
            type="button"
            onClick={() => setGlobalTab("mask")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              globalTab === "mask" ? "bg-rose-600 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Xóa sub cũ</span>
          </button>
          <button
            type="button"
            onClick={() => setGlobalTab("branding")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              globalTab === "branding" ? "bg-amber-600 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Đồ họa</span>
          </button>
        </div>

        {/* TAB 1: TYPOGRAPHY & SUBTITLE STYLES */}
        {globalTab === "style" && (
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
          </div>
        )}

        {/* TAB 2: SUBTITLE ERASER / BLUR MASK */}
        {globalTab === "mask" && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4">
            <div className="p-2.5 rounded-xl border border-rose-800/40 bg-rose-950/20 text-rose-300 text-[11px] leading-relaxed">
              <span className="font-bold block mb-1">Công cụ xóa / che phụ đề gốc:</span>
              Tạo vùng làm mờ hoặc dải băng tương phản che đi phụ đề tiếng Trung/Anh có sẵn trên video trước khi burn phụ đề dịch mới.
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="font-semibold text-white">Bật che phụ đề cũ</span>
              <input
                type="checkbox"
                checked={subtitleMask?.enabled ?? false}
                onChange={(e) =>
                  onChangeSubtitleMask?.({
                    enabled: e.target.checked,
                    x: subtitleMask?.x || 100,
                    y: subtitleMask?.y || 880,
                    width: subtitleMask?.width || 1720,
                    height: subtitleMask?.height || 140,
                    mask_type: subtitleMask?.mask_type || "blur",
                    opacity: subtitleMask?.opacity ?? 0.85,
                    color: subtitleMask?.color || "black",
                  })
                }
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Draw on screen action */}
            {onToggleMaskingMode && (
              <button
                type="button"
                onClick={onToggleMaskingMode}
                className={`w-full py-2.5 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
                  isMaskingMode
                    ? "bg-rose-600 text-white shadow-lg ring-2 ring-rose-400"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                }`}
              >
                <Crop className="w-4 h-4" />
                <span>{isMaskingMode ? "Đang chọn vùng trên màn hình..." : "Kéo chuột vẽ vùng che trên video"}</span>
              </button>
            )}

            {/* Mask Type: Blur vs Banner */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-zinc-300">Chế độ che phủ</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChangeSubtitleMask?.({
                      ...(subtitleMask || {
                        enabled: true,
                        x: 100,
                        y: 880,
                        width: 1720,
                        height: 140,
                        opacity: 0.85,
                        color: "black",
                      }),
                      mask_type: "blur",
                    })
                  }
                  className={`p-2 rounded-xl border text-center transition ${
                    (subtitleMask?.mask_type || "blur") === "blur"
                      ? "border-rose-500 bg-rose-950/30 text-rose-300 font-bold"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400"
                  }`}
                >
                  Làm mờ (Blur)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeSubtitleMask?.({
                      ...(subtitleMask || {
                        enabled: true,
                        x: 100,
                        y: 880,
                        width: 1720,
                        height: 140,
                        opacity: 0.85,
                        color: "black",
                      }),
                      mask_type: "banner",
                    })
                  }
                  className={`p-2 rounded-xl border text-center transition ${
                    subtitleMask?.mask_type === "banner"
                      ? "border-rose-500 bg-rose-950/30 text-rose-300 font-bold"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400"
                  }`}
                >
                  Dải băng (Banner)
                </button>
              </div>
            </div>

            {/* Coordinates Input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-zinc-300">Tọa độ & Kích thước (Buffer 1080p)</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800 font-mono">
                  <span className="text-[10px] text-zinc-500">Tọa độ X</span>
                  <input
                    type="number"
                    value={subtitleMask?.x || 0}
                    onChange={(e) =>
                      onChangeSubtitleMask?.({
                        ...(subtitleMask || {
                          enabled: true,
                          y: 0,
                          width: 100,
                          height: 100,
                          mask_type: "blur",
                          opacity: 0.85,
                          color: "black",
                        }),
                        x: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="bg-transparent text-white text-xs focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800 font-mono">
                  <span className="text-[10px] text-zinc-500">Tọa độ Y</span>
                  <input
                    type="number"
                    value={subtitleMask?.y || 0}
                    onChange={(e) =>
                      onChangeSubtitleMask?.({
                        ...(subtitleMask || {
                          enabled: true,
                          x: 0,
                          width: 100,
                          height: 100,
                          mask_type: "blur",
                          opacity: 0.85,
                          color: "black",
                        }),
                        y: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="bg-transparent text-white text-xs focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800 font-mono">
                  <span className="text-[10px] text-zinc-500">Rộng (Width)</span>
                  <input
                    type="number"
                    value={subtitleMask?.width || 0}
                    onChange={(e) =>
                      onChangeSubtitleMask?.({
                        ...(subtitleMask || {
                          enabled: true,
                          x: 0,
                          y: 0,
                          height: 100,
                          mask_type: "blur",
                          opacity: 0.85,
                          color: "black",
                        }),
                        width: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="bg-transparent text-white text-xs focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800 font-mono">
                  <span className="text-[10px] text-zinc-500">Cao (Height)</span>
                  <input
                    type="number"
                    value={subtitleMask?.height || 0}
                    onChange={(e) =>
                      onChangeSubtitleMask?.({
                        ...(subtitleMask || {
                          enabled: true,
                          x: 0,
                          y: 0,
                          width: 100,
                          mask_type: "blur",
                          opacity: 0.85,
                          color: "black",
                        }),
                        height: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="bg-transparent text-white text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="font-semibold">Độ mờ che phủ</span>
                <span className="font-mono text-[10px]">{Math.round((subtitleMask?.opacity ?? 0.85) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={subtitleMask?.opacity ?? 0.85}
                onChange={(e) =>
                  onChangeSubtitleMask?.({
                    ...(subtitleMask || {
                      enabled: true,
                      x: 100,
                      y: 880,
                      width: 1720,
                      height: 140,
                      mask_type: "blur",
                      color: "black",
                    }),
                    opacity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB 3: BRANDING OVERLAYS & TICKER */}
        {globalTab === "branding" && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4">
            {/* Logo Watermark Upload */}
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Logo / Watermark thương hiệu</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !videoId) return;
                  try {
                    setIsUploadingLogo(true);
                    const res = await videoService.uploadOverlayLogo(videoId, file);
                    onChangeOverlayConfig?.({
                      ...(overlayConfig || {
                        logo_x: 30,
                        logo_y: 30,
                        logo_scale: 1.0,
                        logo_opacity: 1.0,
                        ticker_speed: 100,
                        ticker_font_size: 24,
                        ticker_color: "white",
                        ticker_bg_color: "black@0.6",
                      }),
                      logo_url: res.logo_url,
                      logo_path: res.logo_path,
                    });
                  } catch (err) {
                    console.error("Failed to upload logo:", err);
                  } finally {
                    setIsUploadingLogo(false);
                  }
                }}
              />

              {overlayConfig?.logo_url ? (
                <div className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <img
                      src={overlayConfig.logo_url}
                      alt="Logo"
                      className="w-10 h-10 object-contain rounded bg-black/40 border border-zinc-800"
                    />
                    <span className="text-emerald-400 font-medium text-[11px]">Đã tải Logo PNG</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeOverlayConfig?.({
                        ...overlayConfig,
                        logo_url: null,
                        logo_path: null,
                      })
                    }
                    className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded transition"
                    title="Gỡ logo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="w-full py-3 px-3 rounded-xl border border-dashed border-zinc-700 hover:border-amber-500 bg-zinc-950/60 hover:bg-zinc-950 flex flex-col items-center justify-center gap-1.5 transition text-zinc-400 hover:text-zinc-200"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  ) : (
                    <Upload className="w-5 h-5 text-amber-400" />
                  )}
                  <span className="font-medium text-[11px]">Chọn file Logo PNG trong suốt</span>
                </button>
              )}
            </div>

            {/* Lower-Third Ticker Marquee */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/80">
              <label className="font-semibold text-zinc-300 flex items-center justify-between">
                <span>Dòng chữ chạy chân trang (Ticker Marquee)</span>
              </label>
              <textarea
                rows={2}
                value={overlayConfig?.ticker_text || ""}
                onChange={(e) =>
                  onChangeOverlayConfig?.({
                    ...(overlayConfig || {
                      logo_x: 30,
                      logo_y: 30,
                      logo_scale: 1.0,
                      logo_opacity: 1.0,
                      ticker_speed: 100,
                      ticker_font_size: 24,
                      ticker_color: "white",
                      ticker_bg_color: "black@0.6",
                    }),
                    ticker_text: e.target.value,
                  })
                }
                placeholder="Nhập thông báo, tin tức chạy ngang dưới video..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
              />
            </div>
          </div>
        )}
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

  // Micro-TTS Re-synthesis for this single segment (< 1s)
  const handleMicroResynthesize = async () => {
    if (!videoId || segmentIndex === null || !segment) return;
    try {
      setIsResynthesizing(true);
      const text = segment.translated_text || segment.text || "";
      await videoService.resynthesizeSegment(videoId, segmentIndex, {
        text,
        speaker: segment.speaker,
        target_language: targetLanguage,
      });
      const chunkUrl = `${videoService.getSegmentAudioUrl(videoId, segmentIndex)}?t=${Date.now()}`;
      setSnippetAudioUrl(chunkUrl);
      if (audioRef.current) {
        audioRef.current.src = chunkUrl;
        audioRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("Failed to micro-resynthesize segment:", err);
    } finally {
      setIsResynthesizing(false);
    }
  };

  const handlePlaySnippet = () => {
    if (!videoId || segmentIndex === null) return;
    const chunkUrl = snippetAudioUrl || `${videoService.getSegmentAudioUrl(videoId, segmentIndex)}?t=${Date.now()}`;
    if (audioRef.current) {
      if (audioRef.current.src !== chunkUrl) {
        audioRef.current.src = chunkUrl;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => console.warn("Audio playback failed:", e));
    }
  };

  const handleRewrite = async (mode: "shorter" | "casual" | "formal" | "catchy") => {
    if (!videoId || segmentIndex === null || !segment) return;
    try {
      setIsRewriting(true);
      const currentText = segment.translated_text || segment.text || "";
      const res = await videoService.rewriteTranslationSegment(videoId, segmentIndex, mode, currentText);
      if (res?.rewritten_text) {
        onUpdateSegment(segmentIndex, { translated_text: res.rewritten_text });
      }
    } catch (err) {
      console.error("Failed to rewrite segment:", err);
    } finally {
      setIsRewriting(false);
    }
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

          {/* AI REWRITE QUICK PILLS */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                AI Viết lại câu này
              </span>
              {isRewriting && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isRewriting}
                onClick={() => handleRewrite("shorter")}
                className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white transition disabled:opacity-50"
              >
                Ngắn gọn
              </button>
              <button
                type="button"
                disabled={isRewriting}
                onClick={() => handleRewrite("casual")}
                className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white transition disabled:opacity-50"
              >
                Tự nhiên
              </button>
              <button
                type="button"
                disabled={isRewriting}
                onClick={() => handleRewrite("catchy")}
                className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white transition disabled:opacity-50"
              >
                Hấp dẫn
              </button>
            </div>
          </div>

          {/* MICRO-TTS RESYNTHESIS & AUDIO PREVIEW */}
          <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5 text-[11px]">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                Giọng đọc câu này (Micro-TTS)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">0.37s Tức thì</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isResynthesizing}
                onClick={handleMicroResynthesize}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isResynthesizing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{isResynthesizing ? "Đang đọc..." : "⚡ Đọc lại câu này"}</span>
              </button>

              <button
                type="button"
                onClick={handlePlaySnippet}
                className="p-1.5 rounded-xl border border-indigo-500/40 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-200 transition"
                title="Nghe thử âm thanh đoạn này"
              >
                {isPlayingSnippet ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
              </button>

            </div>

            <audio
              ref={audioRef}
              onPlay={() => setIsPlayingSnippet(true)}
              onPause={() => setIsPlayingSnippet(false)}
              onEnded={() => setIsPlayingSnippet(false)}
              className="hidden"
            />
          </div>
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
