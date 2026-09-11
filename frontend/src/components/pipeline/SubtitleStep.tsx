// SubtitleStep.tsx
import { useState, useEffect, useMemo } from "react";
import {
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
  Coins,
  ChevronRight,
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
  speaker?: string;
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
  const [formats] = useState(["ass", "srt", "vtt"]);
  const [selectedFormat, setSelectedFormat] = useState("ass");
  const [fontSize, setFontSize] = useState("22");
  const [position, setPosition] = useState<"bottom" | "middle" | "top">("bottom");

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
    { id: "Be Vietnam Pro", label: "Be Vietnam Pro (Tối ưu Tiếng Việt)" },
    { id: "Inter", label: "Inter (Sắc nét UI/UX)" },
    { id: "Impact", label: "Impact (Đậm nét Viral & Shorts)" },
    { id: "Arial", label: "Arial (Cổ điển & Phổ biến)" },
  ];

  // 5 Animation Effects
  const effectOptions = [
    {
      id: "none",
      name: "Tiêu chuẩn",
      badge: "Standard",
      desc: "Phụ đề tĩnh, hiển thị liên tục, sắc nét và rõ ràng.",
      icon: "🌟",
    },
    {
      id: "pop",
      name: "Pop Bật nhảy",
      badge: "Viral Shorts",
      desc: "Phóng to nhẹ rồi nảy về kích thước chuẩn, bắt mắt.",
      icon: "💥",
    },
    {
      id: "fade",
      name: "Fade In-Out",
      badge: "Mượt mà",
      desc: "Hiệu ứng mờ dần khi xuất hiện và kết thúc theo câu thoại.",
      icon: "✨",
    },
    {
      id: "slide",
      name: "Trượt lên",
      badge: "Slide Up",
      desc: "Trượt từ dưới lên kèm dãn chữ sang trọng phong cách vlog.",
      icon: "🚀",
    },
    {
      id: "karaoke",
      name: "Karaoke",
      badge: "Highlight",
      desc: "Chữ phát sáng vàng rực rỡ và nảy từng nhịp lời thoại.",
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
    } catch {
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
      speaker: "SPEAKER_00",
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
    return "Xử lý ngôn ngữ tự nhiên là một lĩnh vực quan trọng của trí tuệ nhân tạo.";
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
        <span className="ml-3 text-sm text-[var(--color-text-muted)]">Đang tải cấu hình phụ đề...</span>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            {t("pipeline:header.stepBadge", { current: "04", total: "06" })} · Live Studio
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t("pipeline:steps.subtitle.pageTitle", "Tùy biến Kiểu dáng Phụ đề")}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
            {t(
              "pipeline:steps.subtitle.pageDescription",
              "Thiết lập hiệu ứng chữ, font chữ, màu sắc và trực quan hóa thời gian thực trên khung hình video."
            )}
          </p>
        </div>

        {/* Free Quota & Download Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Coins size={14} />
            <span>0 Credits (Miễn phí)</span>
          </div>

          {subtitles && (
            <button
              type="button"
              onClick={downloadSubtitles}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] shadow-sm"
              title="Tải tệp phụ đề về máy"
            >
              <Download size={14} />
              <span>.{selectedFormat.toUpperCase()}</span>
            </button>
          )}
        </div>
      </div>

      {subtitleError && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-400 text-xs flex items-center justify-between">
          <span>Lỗi: {subtitleError}</span>
          <button
            type="button"
            onClick={() => setSubtitleError(null)}
            className="underline hover:text-red-300 ml-4 font-medium"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DUAL-PANEL SPLIT SCREEN: LEFT 55% PREVIEW CANVAS | RIGHT 45% CONTROLS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: 55% (lg:col-span-7) STICKY LIVE CANVAS */}
        <div className="lg:col-span-7 flex flex-col gap-4 sticky top-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-card)]">
            
            {/* Canvas Header Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  Live Canvas Preview
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)] text-[var(--color-primary)] border border-[var(--color-border)] uppercase">
                  {selectedFormat}
                </span>
              </div>

              {/* Aspect Ratio Switcher */}
              <div className="flex items-center gap-1 bg-[var(--color-surface-muted)] p-1 rounded-xl border border-[var(--color-border)]">
                {(["16:9", "9:16", "1:1", "4:3"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                      aspectRatio === ratio
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Screen */}
            <div className="mt-4 flex justify-center items-center bg-[#070b0e] rounded-xl overflow-hidden min-h-[320px] max-h-[460px] border border-zinc-800/80 relative">
              <div
                className={`relative flex w-full justify-center overflow-hidden transition-all ${positionClass} px-6 ${
                  aspectRatio === "9:16"
                    ? "aspect-[9/16] max-h-[440px] max-w-[248px]"
                    : aspectRatio === "1:1"
                    ? "aspect-square max-h-[380px] max-w-[380px]"
                    : aspectRatio === "4:3"
                    ? "aspect-[4/3] max-h-[380px] max-w-[506px]"
                    : "aspect-video max-h-[380px] max-w-[675px]"
                }`}
              >
                {/* Video or Cinematic Gradient */}
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
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0d161d] to-zinc-950" />
                )}

                {/* Contrast Shadow Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />

                {/* Top Info Overlay */}
                <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-md border border-white/10 font-mono">
                      {fontName} · {fontSize}px
                    </span>
                    <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] text-amber-300 backdrop-blur-md border border-white/10 capitalize">
                      Hiệu ứng: {effect}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={replayAnimation}
                    className="pointer-events-auto flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/80 hover:text-[var(--color-primary)] hover:bg-black/80 transition backdrop-blur-md border border-white/10"
                    title="Chạy lại hiệu ứng chữ"
                  >
                    <RefreshCw size={11} />
                    <span>Thử hiệu ứng</span>
                  </button>
                </div>

                {/* Rendered Subtitle Box */}
                <div
                  key={animKey}
                  className={`relative z-10 max-w-[90%] text-center transition-all duration-300 pointer-events-none ${effectAnimationClass}`}
                >
                  <div
                    className="inline-block rounded-lg px-4 py-2 transition-all duration-200"
                    style={{
                      backgroundColor: selectedFormat === "vtt" ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.35)",
                      backdropFilter: "blur(3px)",
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

                {/* Bottom Segment Timeline Indicator */}
                {segments.length > 0 && segments[previewSegmentIndex] && (
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-white/70 pointer-events-none z-20 font-mono">
                    <span>
                      Đoạn #{previewSegmentIndex + 1}/{segments.length}:{" "}
                      {formatSeconds(segments[previewSegmentIndex].start)} →{" "}
                      {formatSeconds(segments[previewSegmentIndex].end)}
                    </span>
                    <span className="capitalize">{position}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Segment Selector in Canvas Footer */}
            {segments.length > 1 && (
              <div className="mt-3 flex items-center justify-between pt-2 text-xs text-[var(--color-text-muted)]">
                <span>Chọn câu mẫu để xem thử:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewSegmentIndex((p) => Math.max(0, p - 1));
                      replayAnimation();
                    }}
                    disabled={previewSegmentIndex <= 0}
                    className="px-2 py-0.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] disabled:opacity-30"
                  >
                    ← Trước
                  </button>
                  <span className="font-mono text-xs px-2 text-[var(--color-text-primary)]">
                    #{previewSegmentIndex + 1} / {segments.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewSegmentIndex((p) => Math.min(segments.length - 1, p + 1));
                      replayAnimation();
                    }}
                    disabled={previewSegmentIndex >= segments.length - 1}
                    className="px-2 py-0.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] disabled:opacity-30"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 45% (lg:col-span-5) ACCORDION CONTROLS */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
            
            {/* Tabs Header */}
            <div className="flex items-center border-b border-[var(--color-border)] pb-3 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("style")}
                className={`flex items-center gap-2 pb-1.5 text-xs sm:text-sm font-bold transition border-b-2 ${
                  activeTab === "style"
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Sparkles size={15} />
                <span>Kiểu dáng & Hiệu ứng</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("segments")}
                className={`flex items-center gap-2 pb-1.5 text-xs sm:text-sm font-bold transition border-b-2 ${
                  activeTab === "segments"
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Layers size={15} />
                <span>Biên tập câu ({segments.length})</span>
              </button>
            </div>

            {/* TAB 1: STYLE STUDIO (Grouped into 4 Logical Accordion Sections) */}
            {activeTab === "style" && (
              <div className="mt-4 space-y-5">
                
                {/* SECTION 1: ANIMATION EFFECTS (5 EFFECTS) */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3.5">
                  <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center justify-between mb-2.5">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[var(--color-primary)]" />
                      Hiệu ứng hiển thị chữ
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">5 kiểu chuyển động</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 shadow-xs"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{opt.icon}</span>
                              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                                {opt.name}
                              </span>
                            </div>
                            {isSelected && <Check size={13} className="text-[var(--color-primary)]" />}
                          </div>
                          <p className="mt-1 text-[10px] text-[var(--color-text-muted)] leading-tight">
                            {opt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 2: TYPOGRAPHY & POSITION */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3.5 space-y-3">
                  <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <Type size={14} className="text-[var(--color-primary)]" />
                    Font chữ & Vị trí hiển thị
                  </label>

                  {/* Font dropdown */}
                  <div>
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Phông chữ</span>
                    <select
                      value={fontName}
                      onChange={(e) => setFontName(e.target.value)}
                      className="mt-1 h-9 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                    >
                      {fontOptions.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Size & Position in 2 cols */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                        Cỡ chữ: {fontSize}px
                      </span>
                      <select
                        value={fontSize}
                        onChange={(e) => setFontSize(e.target.value)}
                        className="mt-1 h-9 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                      >
                        <option value="16">16px (Nhỏ gọn)</option>
                        <option value="20">20px (Chuẩn TV)</option>
                        <option value="22">22px (Tối ưu nhất)</option>
                        <option value="26">26px (Nổi bật)</option>
                        <option value="30">30px (Lớn Shorts)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                        Vị trí khung hình
                      </span>
                      <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value as any)}
                        className="mt-1 h-9 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                      >
                        <option value="bottom">Dưới đáy (Chuẩn)</option>
                        <option value="middle">Ở giữa (Tâm)</option>
                        <option value="top">Trên đỉnh</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: COLORS & OUTLINE */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3.5 space-y-3">
                  <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <Palette size={14} className="text-[var(--color-primary)]" />
                    Màu chữ & Màu viền (Stroke)
                  </label>

                  {/* Primary Text Color */}
                  <div>
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Màu chữ chính</span>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent p-0.5"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        {textPresetColors.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => setPrimaryColor(p.hex)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] transition ${
                              primaryColor.toLowerCase() === p.hex.toLowerCase()
                                ? "border-[var(--color-primary)] text-[var(--color-primary)] font-bold bg-[var(--color-surface)]"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                            }`}
                          >
                            <span className="h-2.5 w-2.5 rounded-full border border-black/20" style={{ backgroundColor: p.hex }} />
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Outline Color */}
                  <div>
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Màu viền chữ</span>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="color"
                        value={outlineColor === "transparent" ? "#000000" : outlineColor}
                        onChange={(e) => setOutlineColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent p-0.5"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        {outlinePresetColors.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => setOutlineColor(p.hex)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] transition ${
                              outlineColor.toLowerCase() === p.hex.toLowerCase()
                                ? "border-[var(--color-primary)] text-[var(--color-primary)] font-bold bg-[var(--color-surface)]"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/20"
                              style={{ backgroundColor: p.hex === "transparent" ? "#999" : p.hex }}
                            />
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: LAYOUT & LINE LIMITS */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3.5 space-y-2.5">
                  <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlignLeft size={14} className="text-[var(--color-primary)]" />
                      Bố cục & Số dòng tối đa
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">Chống tràn lề</span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 1, label: "1 dòng", desc: "Shorts & TikTok" },
                      { val: 2, label: "2 dòng", desc: "Chuẩn Điện ảnh" },
                      { val: 0, label: "Tự động", desc: "Không ép dòng" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setMaxLines(opt.val)}
                        className={`p-2 rounded-xl border text-center transition ${
                          maxLines === opt.val
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)] font-bold shadow-xs"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <p className="text-xs font-bold">{opt.label}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format selector */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="font-semibold text-[var(--color-text-secondary)]">Định dạng tệp phụ đề:</span>
                  <div className="flex items-center gap-1.5">
                    {formats.map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setSelectedFormat(fmt)}
                        className={`px-2.5 py-1 rounded-lg uppercase font-mono text-[11px] font-bold transition ${
                          selectedFormat === fmt
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        .{fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SEGMENTS EDITOR */}
            {activeTab === "segments" && (
              <div className="mt-4 space-y-3">
                {/* Search & Actions Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-2.5 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      value={segmentSearch}
                      onChange={(e) => setSegmentSearch(e.target.value)}
                      placeholder="Tìm kiếm câu thoại..."
                      className="h-8 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] pl-8 pr-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoSplitAll}
                    title="Tự động tách câu dài thành 2 câu ngắn"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition"
                  >
                    <Sparkles size={13} />
                    <span>Tách câu dài</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddSegment}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold shadow-xs hover:bg-[var(--color-primary-hover)] transition"
                  >
                    <Plus size={14} />
                    <span>Thêm</span>
                  </button>
                </div>

                {/* Segments List */}
                <div className="max-h-[460px] space-y-2.5 overflow-y-auto pr-1">
                  {filteredSegments.map((seg) => {
                    const originalIndex = segments.indexOf(seg);
                    const isPreviewing = previewSegmentIndex === originalIndex;

                    return (
                      <div
                        key={originalIndex}
                        className={`rounded-xl border p-3 transition-all ${
                          isPreviewing
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/10 ring-1 ring-[var(--color-primary)]/30"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-zinc-500/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--color-border)]/50 text-[11px]">
                          <div className="flex items-center gap-1.5 font-mono text-[var(--color-text-muted)]">
                            <span className="font-bold text-[var(--color-primary)]">#{originalIndex + 1}</span>
                            <Clock size={11} />
                            <input
                              type="number"
                              step="0.1"
                              value={seg.start}
                              onChange={(e) =>
                                handleUpdateSegmentTime(originalIndex, "start", parseFloat(e.target.value) || 0)
                              }
                              className="w-12 text-center rounded border border-[var(--color-border)] bg-[var(--color-input-background)] py-0.5 text-[11px] text-[var(--color-text-primary)]"
                            />
                            <span>→</span>
                            <input
                              type="number"
                              step="0.1"
                              value={seg.end}
                              onChange={(e) =>
                                handleUpdateSegmentTime(originalIndex, "end", parseFloat(e.target.value) || 0)
                              }
                              className="w-12 text-center rounded border border-[var(--color-border)] bg-[var(--color-input-background)] py-0.5 text-[11px] text-[var(--color-text-primary)]"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewSegmentIndex(originalIndex);
                                replayAnimation();
                              }}
                              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                                isPreviewing
                                  ? "bg-[var(--color-primary)] text-white"
                                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                              }`}
                            >
                              <Eye size={11} />
                              {isPreviewing ? "Đang xem" : "Xem"}
                            </button>

                            {(seg.translated_text || seg.text || "").length > 40 && (
                              <button
                                type="button"
                                onClick={() => handleSplitSingle(originalIndex)}
                                title="Tách đôi câu này"
                                className="p-1 text-indigo-400 hover:bg-indigo-500/10 rounded"
                              >
                                <Sparkles size={12} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteSegment(originalIndex)}
                              title="Xóa câu này"
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <textarea
                          value={seg.translated_text || ""}
                          onChange={(e) => handleUpdateSegmentText(originalIndex, e.target.value)}
                          rows={2}
                          className="mt-2 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-2 text-xs leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERSISTENT BOTTOM WORKFLOW BAR WITH SINGLE CLEAR CTA */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--color-primary)]">
          <Check size={18} className="text-emerald-400" />
          <span>
            {subtitles
              ? `Phụ đề đã sẵn sàng (${segments.length} dòng) · Miễn phí lưu và sửa kiểu dáng`
              : `Đã thiết lập cấu hình kiểu dáng · Sẵn sàng khởi tạo`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={generateSubtitles}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={15} className="animate-spin text-[var(--color-primary)]" />
            ) : (
              <Sparkles size={15} className="text-[var(--color-primary)]" />
            )}
            <span>{isGenerating ? "Đang áp dụng..." : "Áp dụng kiểu dáng mới"}</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: "SET_STEP", payload: 5 })}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_8px_20px_rgba(24,195,170,0.25)] transition hover:bg-[var(--color-primary-hover)] active:scale-98"
          >
            <span>Tiếp tục: Lồng tiếng (Dubbing)</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}