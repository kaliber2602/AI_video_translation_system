// SubtitleStep.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Captions,
  Check,
  Download,
  Loader2,
  Eye,
  Plus,
  Trash2,
  Sparkles,
  Type,
  Palette,
  AlignLeft,
  Layers,
  Search,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";
import { formatSubtitleLines, splitSegmentIntoTwo, autoSplitLongSegments } from "../../utils/subtitleUtils";

export interface SubtitleSegment {
  start: number;
  end: number;
  text?: string;
  translated_text?: string;
}

export default function SubtitleStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();

  const [activeTab, setActiveTab] = useState<"style" | "segments">("style");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subtitles, setSubtitles] = useState<{
    language: string;
    format: string;
    content: string;
  } | null>(null);

  // Formats & Basic Settings
  const [formats] = useState(["srt", "vtt", "ass"]);
  const [selectedFormat, setSelectedFormat] = useState("ass");
  const [fontSize, setFontSize] = useState("22");
  const [position, setPosition] = useState("bottom");

  // Subtitle Customization Features
  const [fontName, setFontName] = useState("Montserrat");
  const [primaryColor, setPrimaryColor] = useState("#FFFFFF");
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [maxLines, setMaxLines] = useState<number>(2); // 1, 2, or 0 (Auto)
  const [effect, setEffect] = useState<"none" | "fade" | "pop" | "slide" | "karaoke">("pop");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1" | "4:3">("16:9");

  // Segments & Editor State
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [segmentSearch, setSegmentSearch] = useState("");
  const [previewSegmentIndex, setPreviewSegmentIndex] = useState<number>(0);
  const [animKey, setAnimKey] = useState<number>(0);

  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Available fonts
  const fontOptions = [
    { id: "Montserrat", label: "Montserrat (Điện ảnh & Hiện đại)" },
    { id: "Roboto", label: "Roboto (Cân đối & Dễ đọc)" },
    { id: "Arial", label: "Arial (Cổ điển & Tương thích)" },
    { id: "Inter", label: "Inter (Sắc nét UI/UX)" },
    { id: "Impact", label: "Impact (Đậm nét Viral & Shorts)" },
    { id: "Be Vietnam Pro", label: "Be Vietnam Pro (Tối ưu Tiếng Việt)" },
  ];

  // 5 Animation Effects
  const effectOptions = [
    {
      id: "none",
      name: "Tiêu chuẩn",
      badge: "Standard",
      desc: "Phụ đề tĩnh cổ điển, hiển thị liên tục, sắc nét và ổn định.",
      icon: "🌟",
    },
    {
      id: "fade",
      name: "Fade In-Out",
      badge: "Mượt mà",
      desc: "Hiệu ứng mờ dần khi xuất hiện và biến mất mượt mà theo từng câu.",
      icon: "✨",
    },
    {
      id: "pop",
      name: "Pop / Bật nhảy",
      badge: "Viral Shorts",
      desc: "Phóng to nhẹ rồi nảy về kích thước chuẩn, thu hút ánh nhìn tức thì.",
      icon: "💥",
    },
    {
      id: "slide",
      name: "Trượt lên",
      badge: "Slide Up",
      desc: "Trượt nhẹ từ dưới lên trên kết hợp dãn khoảng cách chữ sang trọng.",
      icon: "🚀",
    },
    {
      id: "karaoke",
      name: "Nổi bật / Karaoke",
      badge: "Highlight",
      desc: "Chữ phát sáng rực rỡ và nảy từng nhịp nhịp nhàng theo lời nói.",
      icon: "🎤",
    },
  ];

  // Preset Colors
  const textPresetColors = [
    { label: "Trắng", hex: "#FFFFFF" },
    { label: "Vàng Gold", hex: "#FFE600" },
    { label: "Cyan", hex: "#00F2FE" },
    { label: "Xanh lá", hex: "#10B981" },
    { label: "Hồng Neon", hex: "#FF3366" },
  ];

  const outlinePresetColors = [
    { label: "Đen đậm", hex: "#000000" },
    { label: "Xám Slate", hex: "#1E293B" },
    { label: "Xanh đêm", hex: "#0F172A" },
    { label: "Tím than", hex: "#4C1D95" },
    { label: "Không viền", hex: "transparent" },
  ];

  useEffect(() => {
    loadSubtitles(selectedFormat);
    loadSegments();
  }, [selectedFormat, state.video?.videoId, state.targetLanguage]);

  useEffect(() => {
    if (!state.video?.videoId) return;
    let isMounted = true;
    videoService
      .getDubbedVideoPreview(state.video.videoId, state.targetLanguage || "vi")
      .then((url) => {
        if (isMounted) setVideoPreviewUrl(url);
      })
      .catch(() => {
        if (isMounted) setVideoPreviewUrl(null);
      });
    return () => {
      isMounted = false;
    };
  }, [state.video?.videoId, state.targetLanguage]);

  const replayAnimation = () => {
    setAnimKey((prev) => prev + 1);
  };

  const loadSubtitles = async (fmt?: string) => {
    if (!state.video?.videoId) return;
    setIsLoading(true);
    setSubtitleError(null);

    try {
      const targetLang = state.targetLanguage || "vi";
      const targetFormat = fmt || selectedFormat;
      const data = await videoService.getSubtitles(state.video.videoId, targetLang, targetFormat);
      setSubtitles(data);
    } catch (error) {
      setSubtitles(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSegments = async () => {
    if (!state.video?.videoId) return;
    try {
      const targetLang = state.targetLanguage || "vi";
      const data = await videoService.getSubtitleSegments(state.video.videoId, targetLang);
      if (data?.segments && Array.isArray(data.segments) && data.segments.length > 0) {
        setSegments(data.segments);
        return;
      }
    } catch (e) {
      // Ignore
    }

    if (state.translation?.segments && state.translation.segments.length > 0) {
      setSegments(state.translation.segments);
    }
  };

  const generateSubtitles = async () => {
    if (!state.video?.videoId) return;
    setIsGenerating(true);
    setSubtitleError(null);

    try {
      const targetLang = state.targetLanguage || "vi";
      const data = await videoService.generateSubtitles(
        state.video.videoId,
        targetLang,
        selectedFormat,
        parseInt(fontSize, 10) || 20,
        position,
        {
          fontName,
          primaryColor,
          outlineColor,
          maxLines,
          effect,
          aspectRatio,
          autoSplitChunks: true,
          segments: segments.length > 0 ? segments : undefined,
        }
      );
      setSubtitles(data);
      await loadSubtitles();
      dispatch({
        type: "SET_SUBTITLES",
        payload: data,
      });
    } catch (error: any) {
      console.error("Subtitle generation failed:", error);
      setSubtitleError(error.message || "Failed to generate subtitles");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSubtitles = async () => {
    if (!state.video?.videoId) return;
    setSubtitleError(null);
    try {
      const targetLang = state.targetLanguage || "vi";
      const blob = await videoService.downloadSubtitles(
        state.video.videoId,
        targetLang,
        selectedFormat
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subtitles_${targetLang}.${selectedFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Download failed:", error);
      setSubtitleError(error.message || "Failed to download subtitles");
    }
  };

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    const newStart = lastSeg ? Number((lastSeg.end + 0.2).toFixed(2)) : 0;
    const newEnd = Number((newStart + 3.0).toFixed(2));
    const newSegment: SubtitleSegment = {
      start: newStart,
      end: newEnd,
      text: "",
      translated_text: "Nhập phụ đề mới tại đây...",
    };
    const nextList = [...segments, newSegment];
    setSegments(nextList);
    setPreviewSegmentIndex(nextList.length - 1);
    replayAnimation();
  };

  const handleUpdateSegmentText = (index: number, newText: string) => {
    const nextList = [...segments];
    nextList[index] = { ...nextList[index], translated_text: newText };
    setSegments(nextList);
  };

  const handleUpdateSegmentTime = (index: number, field: "start" | "end", val: number) => {
    const nextList = [...segments];
    nextList[index] = { ...nextList[index], [field]: Math.max(0, val) };
    setSegments(nextList);
  };

  const handleDeleteSegment = (index: number) => {
    const nextList = segments.filter((_, i) => i !== index);
    setSegments(nextList);
    if (previewSegmentIndex >= nextList.length) {
      setPreviewSegmentIndex(Math.max(0, nextList.length - 1));
    }
  };

  const handleSplitSingle = (index: number) => {
    const target = segments[index];
    if (!target) return;
    const [seg1, seg2] = splitSegmentIntoTwo(target);
    const nextList = [...segments.slice(0, index), seg1, seg2, ...segments.slice(index + 1)];
    setSegments(nextList);
    setPreviewSegmentIndex(index);
    replayAnimation();
  };

  const handleAutoSplitAll = () => {
    const nextList = autoSplitLongSegments(segments, 46, 5.0);
    setSegments(nextList);
    if (previewSegmentIndex >= nextList.length) {
      setPreviewSegmentIndex(Math.max(0, nextList.length - 1));
    }
    replayAnimation();
  };

  const formatSeconds = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms}`;
  };

  const filteredSegments = useMemo(() => {
    if (!segmentSearch.trim()) return segments;
    const query = segmentSearch.toLowerCase();
    return segments.filter(
      (s) =>
        (s.translated_text && s.translated_text.toLowerCase().includes(query)) ||
        (s.text && s.text.toLowerCase().includes(query))
    );
  }, [segments, segmentSearch]);

  const livePreviewText = useMemo(() => {
    if (segments.length > 0 && segments[previewSegmentIndex]) {
      return segments[previewSegmentIndex].translated_text || segments[previewSegmentIndex].text || "";
    }
    if (subtitles?.content) {
      const lines = subtitles.content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => {
          if (!l) return false;
          if (/^\d+$/.test(l)) return false;
          if (l.includes("-->")) return false;
          if (l.startsWith("WEBVTT") || l.startsWith("NOTE")) return false;
          if (l.startsWith("[") || l.startsWith("Format:") || l.startsWith("Style:")) return false;
          if (l.startsWith("Dialogue:")) {
            const parts = l.split(",");
            return parts.slice(9).join(",").trim();
          }
          return true;
        });
      if (lines.length > 0) return lines[0];
    }
    return "Xử lý ngôn ngữ tự nhiên là một lĩnh vực của trí tuệ nhân tạo hiện đại.";
  }, [segments, previewSegmentIndex, subtitles]);

  const displayedPreviewText = useMemo(() => {
    const maxChars = aspectRatio === "9:16" ? 22 : (aspectRatio === "1:1" ? 26 : (aspectRatio === "4:3" ? 32 : 38));
    return formatSubtitleLines(livePreviewText, maxLines, maxChars);
  }, [livePreviewText, maxLines, aspectRatio]);

  const fontSizePx = parseInt(fontSize, 10) || 22;

  const positionClass =
    position === "top"
      ? "items-start pt-8"
      : position === "middle"
      ? "items-center py-8"
      : "items-end pb-8";

  const effectAnimationClass = useMemo(() => {
    switch (effect) {
      case "fade":
        return "sub-anim-fade";
      case "pop":
        return "sub-anim-pop";
      case "slide":
        return "sub-anim-slide";
      case "karaoke":
        return "sub-anim-karaoke";
      default:
        return "";
    }
  }, [effect]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Đang tải cấu hình phụ đề...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Keyframe Animations for Subtitle Live Canvas */}
      <style>{`
        @keyframes subFadeInOut {
          0%, 100% { opacity: 0; transform: translateY(3px); }
          15%, 85% { opacity: 1; transform: translateY(0); }
        }
        @keyframes subPopBounce {
          0% { opacity: 0; transform: scale(0.82); }
          18% { opacity: 1; transform: scale(1.12); }
          28%, 82% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.92); }
        }
        @keyframes subSlideUp {
          0% { opacity: 0; transform: translateY(18px); letter-spacing: 0.05em; }
          20%, 80% { opacity: 1; transform: translateY(0); letter-spacing: 0.02em; }
          100% { opacity: 0; transform: translateY(-12px); }
        }
        @keyframes subKaraokeGlow {
          0%, 100% { filter: brightness(1); }
          25%, 75% { filter: brightness(1.4) drop-shadow(0 0 10px #FFE600); transform: scale(1.04); }
        }
        .sub-anim-fade { animation: subFadeInOut 3.2s ease-in-out infinite; }
        .sub-anim-pop { animation: subPopBounce 3.2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite; }
        .sub-anim-slide { animation: subSlideUp 3.2s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
        .sub-anim-karaoke { animation: subKaraokeGlow 2.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "04", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.subtitle.pageTitle", "Tạo & Tùy chỉnh Phụ đề")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t(
            "pipeline:steps.subtitle.pageDescription",
            "Thiết lập hiệu ứng hoạt ảnh, font chữ, màu sắc, giới hạn dòng và chỉnh sửa trực tiếp từng câu phụ đề."
          )}
        </p>
      </div>

      {subtitleError && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-500">
          <p className="text-sm font-medium">Lỗi: {subtitleError}</p>
          <button
            type="button"
            onClick={() => setSubtitleError(null)}
            className="mt-2 text-xs underline hover:text-red-400 transition-colors"
          >
            Đóng thông báo
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        {/* Top Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Captions size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {subtitles ? "Live Subtitle Studio" : "Khởi tạo Phụ đề"}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {subtitles
                  ? `${subtitles.language.toUpperCase()} · Định dạng ${selectedFormat.toUpperCase()} · ${fontName} · ${effect.toUpperCase()} · ${segments.length} dòng`
                  : "Tùy biến phong cách hiển thị và tạo phụ đề video"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {subtitles && (
              <button
                type="button"
                onClick={downloadSubtitles}
                className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                <Download size={14} />
                Tải về .{selectedFormat}
              </button>
            )}

            <button
              type="button"
              onClick={generateSubtitles}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(24,195,170,0.3)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {isGenerating
                ? "Đang xử lý..."
                : subtitles
                ? "Áp dụng & Tạo lại phụ đề"
                : "Tạo phụ đề ngay"}
            </button>
          </div>
        </div>

        {/* Live Interactive Subtitle Canvas */}
        <div className="mt-6 flex justify-center">
          <div
            className={`relative flex w-full justify-center overflow-hidden rounded-2xl bg-[#080d11] shadow-2xl transition-all ${positionClass} px-8 border border-[var(--color-border)] ${
              aspectRatio === "9:16"
                ? "aspect-[9/16] max-h-[520px] max-w-[292px]"
                : aspectRatio === "1:1"
                ? "aspect-square max-h-[460px] max-w-[460px]"
                : aspectRatio === "4:3"
                ? "aspect-[4/3] max-h-[460px] max-w-[613px]"
                : "aspect-video max-h-[460px] max-w-[800px]"
            }`}
          >
            {/* Background: actual video or clean cinematic gradient */}
            {videoPreviewUrl ? (
              <video
                src={videoPreviewUrl}
                className="absolute inset-0 h-full w-full object-contain opacity-85 pointer-events-none"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0e161c] to-slate-900" />
            )}

            {/* Readability gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/60 pointer-events-none" />

            {/* Top Canvas Badges */}
            <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)] uppercase tracking-wider backdrop-blur-md border border-white/10">
                  {selectedFormat.toUpperCase()} PREVIEW
                </span>
                <span className="rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white/80 backdrop-blur-md">
                  Font: {fontName}
                </span>
                <span className="rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white/80 backdrop-blur-md">
                  {fontSize}px
                </span>
                <span className="rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-amber-400 capitalize backdrop-blur-md">
                  Hiệu ứng: {effect}
                </span>
                <span className="rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white/80 backdrop-blur-md">
                  {maxLines === 0 ? "Dòng: Tự động" : `Dòng: Tối đa ${maxLines}`}
                </span>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={replayAnimation}
                  title="Chạy lại hiệu ứng hoạt ảnh"
                  className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white/80 hover:text-[var(--color-primary)] hover:bg-black/80 transition backdrop-blur-md border border-white/10"
                >
                  <RefreshCw size={12} />
                  Phát thử hiệu ứng
                </button>
              </div>
            </div>

            {/* Subtitle Display Box */}
            <div
              key={animKey}
              className={`relative z-10 max-w-3xl text-center transition-all duration-300 pointer-events-none ${effectAnimationClass}`}
            >
              <div
                className="inline-block rounded-lg px-6 py-2.5 transition-all duration-200"
                style={{
                  backgroundColor: selectedFormat === "vtt" ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.4)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <p
                  className="font-bold leading-relaxed tracking-wide whitespace-pre-line"
                  style={{
                    fontFamily: `${fontName}, sans-serif`,
                    fontSize: `${fontSizePx}px`,
                    color: primaryColor,
                    WebkitTextStroke:
                      outlineColor !== "transparent" ? `1.2px ${outlineColor}` : "none",
                    textShadow:
                      outlineColor !== "transparent"
                        ? `0 2px 4px ${outlineColor}, 0 0 8px ${outlineColor}`
                        : "0 2px 8px rgba(0,0,0,0.8)",
                  }}
                >
                  {displayedPreviewText}
                </p>
              </div>
            </div>

            {/* Bottom Segment Timeline Indicator in Canvas */}
            {segments.length > 0 && segments[previewSegmentIndex] && (
              <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[11px] text-white/60 pointer-events-none z-20">
                <span>
                  Đang xem câu #{previewSegmentIndex + 1}/{segments.length}:{" "}
                  {formatSeconds(segments[previewSegmentIndex].start)} →{" "}
                  {formatSeconds(segments[previewSegmentIndex].end)}
                </span>
                <span>{selectedFormat === "ass" ? "Hỗ trợ đầy đủ Effect ASS" : "Chuẩn Text Subtitle"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher: Giao diện & Hiệu ứng vs Quản lý dòng phụ đề */}
        <div className="mt-8 border-b border-[var(--color-border)]">
          <div className="flex gap-8">
            <button
              type="button"
              onClick={() => setActiveTab("style")}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                activeTab === "style"
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Sparkles size={16} />
              Tùy chỉnh Hiệu ứng & Phong cách
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("segments")}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                activeTab === "segments"
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Layers size={16} />
              Quản lý Dòng Phụ đề ({segments.length})
            </button>
          </div>
        </div>

        {/* TAB 1: STYLE & EFFECTS */}
        {activeTab === "style" && (
          <div className="mt-6 space-y-7">
            {/* 1. Hiệu ứng phụ đề (5 hiệu ứng) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--color-primary)]" />
                  Hiệu ứng hiển thị (5 hiệu ứng độc quyền)
                </label>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Chuyển động mượt mà cho định dạng ASS & Hardsub video
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {effectOptions.map((opt) => {
                  const isSelected = effect === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setEffect(opt.id as any);
                        replayAnimation();
                      }}
                      className={`relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 ring-2 ring-[var(--color-primary)]/20 shadow-md"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)]/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{opt.icon}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-[var(--color-primary)] text-white"
                                : "bg-black/10 dark:bg-white/10 text-[var(--color-text-muted)]"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-[var(--color-text-primary)]">
                          {opt.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)]">
                          <Check size={13} /> Đang chọn
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tỉ lệ khung hình Video (Aspect Ratio) */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <label className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <span className="text-[var(--color-primary)] font-bold text-base">📐</span>
                  Tỉ lệ khung hình Video (Aspect Ratio)
                </label>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Tự động căn lề và độ dài dòng tối ưu theo kích thước
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Chọn tỉ lệ tương ứng với video để tránh phụ đề bị tràn lề hoặc ép thành 4 dòng chồng chéo.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: "16:9", label: "16:9 Ngang", desc: "YouTube, PC, TV" },
                  { id: "9:16", label: "9:16 Dọc", desc: "TikTok, Shorts, Reels" },
                  { id: "1:1", label: "1:1 Vuông", desc: "Square, Instagram Feed" },
                  { id: "4:3", label: "4:3 Chuẩn", desc: "Cổ điển, Máy tính bảng" },
                ].map((ratioOpt) => {
                  const isSelected = aspectRatio === ratioOpt.id;
                  return (
                    <button
                      key={ratioOpt.id}
                      type="button"
                      onClick={() => setAspectRatio(ratioOpt.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)] font-bold shadow-sm"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40"
                      }`}
                    >
                      <p className="text-sm font-semibold">{ratioOpt.label}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-normal">
                        {ratioOpt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Giới hạn số dòng phụ đề & Typography */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Giới hạn số dòng */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4">
                <label className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-2">
                  <AlignLeft size={16} className="text-[var(--color-primary)]" />
                  Giới hạn số dòng phụ đề
                </label>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  Tối ưu bố cục văn bản hiển thị trên màn hình
                </p>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { val: 1, label: "1 dòng", desc: "TikTok / Shorts / Reels" },
                    { val: 2, label: "2 dòng", desc: "Tiêu chuẩn TV & Phim ảnh" },
                    { val: 0, label: "Tự động", desc: "Không giới hạn số dòng" },
                  ].map((lineOpt) => {
                    const isSelected = maxLines === lineOpt.val;
                    return (
                      <button
                        key={lineOpt.val}
                        type="button"
                        onClick={() => setMaxLines(lineOpt.val)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)] font-bold shadow-sm"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40"
                        }`}
                      >
                        <p className="text-sm font-semibold">{lineOpt.label}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-normal">
                          {lineOpt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font chữ */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4">
                <label className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-2">
                  <Type size={16} className="text-[var(--color-primary)]" />
                  Font chữ (Typography)
                </label>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  Chọn kiểu chữ hiển thị cho phụ đề và bản ghi cứng (Hardsub)
                </p>

                <select
                  value={fontName}
                  onChange={(e) => setFontName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3.5 text-sm font-medium text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                >
                  {fontOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Màu chữ & Màu viền */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Màu chữ (Primary Color) */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4">
                <label className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-2">
                  <Palette size={16} className="text-[var(--color-primary)]" />
                  Màu chữ chính (Text Color)
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent p-1"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#FFFFFF"
                    className="h-10 w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-mono text-[var(--color-text-primary)] uppercase outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {textPresetColors.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setPrimaryColor(preset.hex)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                        primaryColor.toLowerCase() === preset.hex.toLowerCase()
                          ? "border-[var(--color-primary)] font-bold text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-gray-400"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-black/20"
                        style={{ backgroundColor: preset.hex }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Màu viền (Outline Color) */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4">
                <label className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-2">
                  <Palette size={16} className="text-[var(--color-primary)]" />
                  Màu viền chữ (Outline / Stroke)
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="color"
                    value={outlineColor === "transparent" ? "#000000" : outlineColor}
                    onChange={(e) => setOutlineColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent p-1"
                  />
                  <input
                    type="text"
                    value={outlineColor}
                    onChange={(e) => setOutlineColor(e.target.value)}
                    placeholder="#000000"
                    className="h-10 w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-mono text-[var(--color-text-primary)] uppercase outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {outlinePresetColors.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setOutlineColor(preset.hex)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                        outlineColor.toLowerCase() === preset.hex.toLowerCase()
                          ? "border-[var(--color-primary)] font-bold text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-gray-400"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-black/20"
                        style={{
                          backgroundColor: preset.hex === "transparent" ? "#ccc" : preset.hex,
                        }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Định dạng, Cỡ chữ & Vị trí */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Định dạng phụ đề
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                >
                  {formats.map((f) => (
                    <option key={f} value={f}>
                      {f.toUpperCase()} (
                      {f === "ass" ? "Đề xuất: Đầy đủ hiệu ứng & màu" : f === "srt" ? "Chuẩn văn bản" : "Trình duyệt Web"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Cỡ chữ: {fontSize}px
                </label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                >
                  <option value="16">16px (Nhỏ - Chi tiết)</option>
                  <option value="20">20px (Vừa - Chuẩn TV)</option>
                  <option value="22">22px (Tối ưu - Dễ xem)</option>
                  <option value="26">26px (Lớn - Nổi bật)</option>
                  <option value="30">30px (Rất lớn - Shorts / TikTok)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Vị trí trên màn hình
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                >
                  <option value="bottom">Dưới cùng (Chuẩn phụ đề)</option>
                  <option value="middle">Ở giữa (Tâm màn hình)</option>
                  <option value="top">Trên cùng</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ DÒNG PHỤ ĐỀ (SUBTITLE SEGMENTS EDITOR) */}
        {activeTab === "segments" && (
          <div className="mt-6 space-y-4">
            {/* Action Bar for Segments */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface-muted)]/50 p-3.5 rounded-xl border border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-3 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={segmentSearch}
                    onChange={(e) => setSegmentSearch(e.target.value)}
                    placeholder="Tìm kiếm nội dung..."
                    className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                  {filteredSegments.length}/{segments.length} dòng
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoSplitAll}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition shadow-sm"
                  title="Tự động kiểm tra và chia các đoạn phụ đề dài thành các câu ngắn vừa vặn trên màn hình"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Tách câu dài tự động</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddSegment}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition"
                >
                  <Plus size={15} />
                  Thêm dòng mới
                </button>
              </div>
            </div>

            {/* Segments List */}
            {filteredSegments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-[var(--color-border)]">
                <Captions size={32} className="text-[var(--color-text-muted)]/50 mb-2" />
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Chưa có dòng phụ đề nào
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm">
                  Bạn có thể bấm &quot;Thêm dòng phụ đề mới&quot; để tự viết phụ đề hoặc chạy &quot;Tạo phụ đề ngay&quot; từ lời thoại video.
                </p>
                <button
                  type="button"
                  onClick={handleAddSegment}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white"
                >
                  <Plus size={14} /> Thêm dòng phụ đề đầu tiên
                </button>
              </div>
            ) : (
              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
                {filteredSegments.map((seg) => {
                  const originalIndex = segments.indexOf(seg);
                  const isPreviewing = previewSegmentIndex === originalIndex;

                  return (
                    <div
                      key={originalIndex}
                      className={`rounded-xl border p-4 transition-all ${
                        isPreviewing
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/10 ring-1 ring-[var(--color-primary)]/30"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-gray-400"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]/60">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-primary)]/15 text-[11px] font-bold text-[var(--color-primary)]">
                            #{originalIndex + 1}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                            <Clock size={12} />
                            <span>Thời gian:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={seg.start}
                              onChange={(e) =>
                                handleUpdateSegmentTime(
                                  originalIndex,
                                  "start",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-7 w-16 rounded border border-[var(--color-border)] bg-[var(--color-input-background)] px-1.5 text-center text-xs font-mono font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                            />
                            <span>→</span>
                            <input
                              type="number"
                              step="0.1"
                              value={seg.end}
                              onChange={(e) =>
                                handleUpdateSegmentTime(
                                  originalIndex,
                                  "end",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-7 w-16 rounded border border-[var(--color-border)] bg-[var(--color-input-background)] px-1.5 text-center text-xs font-mono font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                            />
                            <span className="text-[10px] text-[var(--color-text-muted)]">
                              ({(seg.end - seg.start).toFixed(1)}s)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewSegmentIndex(originalIndex);
                              replayAnimation();
                            }}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              isPreviewing
                                ? "bg-[var(--color-primary)] text-white"
                                : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                            }`}
                          >
                            <Eye size={12} />
                            {isPreviewing ? "Đang chiếu" : "Xem thử"}
                          </button>

                          {(seg.translated_text || seg.text || "").length > 40 && (
                            <button
                              type="button"
                              onClick={() => handleSplitSingle(originalIndex)}
                              title="Đoạn này khá dài. Bấm để chia đôi thành 2 câu với mốc thời gian cân đối"
                              className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold text-indigo-500 hover:bg-indigo-500/20 transition"
                            >
                              <Sparkles size={11} />
                              <span>Tách làm 2</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteSegment(originalIndex)}
                            title="Xóa dòng phụ đề này"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3">
                        {seg.text && (
                          <div className="rounded-lg bg-[var(--color-surface-muted)]/60 px-3 py-2 text-xs text-[var(--color-text-muted)]">
                            <span className="font-semibold text-[var(--color-text-secondary)] mr-1">
                              Gốc:
                            </span>
                            {seg.text}
                          </div>
                        )}

                        <div>
                          <textarea
                            value={seg.translated_text || ""}
                            onChange={(e) =>
                              handleUpdateSegmentText(originalIndex, e.target.value)
                            }
                            placeholder="Nhập nội dung phụ đề hiển thị..."
                            className="min-h-[56px] w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] p-3 text-sm leading-6 text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Action Controls & Navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
            <Check size={18} />
            {subtitles
              ? `Phụ đề đã sẵn sàng (${segments.length} dòng) ✓`
              : "Đã chọn cấu hình - Sẵn sàng khởi tạo"}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={generateSubtitles}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={17} className="animate-spin text-[var(--color-primary)]" />
              ) : (
                <Eye size={17} />
              )}
              {isGenerating
                ? "Đang xử lý..."
                : subtitles
                ? "Lưu & Tạo lại phụ đề"
                : "Tạo phụ đề"}
            </button>

            {subtitles && (
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_STEP", payload: 5 })}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)]"
              >
                Tiếp tục: Dubbing (Lồng tiếng) →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}