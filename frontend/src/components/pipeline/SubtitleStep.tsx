// SubtitleStep.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Download,
  Loader2,
  Eye,
  Plus,
  Trash2,
  Sparkles,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  FileCode,
  ShieldCheck,
  Check,
  MoveVertical,
  Sliders,
  RotateCcw,
  Palette,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";
import { formatSubtitleLines } from "../../utils/subtitleUtils";
import PipelineStepLayout from "./PipelineStepLayout";

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

  // Architecture & Sidebar State
  const [activeRightTab, setActiveRightTab] = useState<"style" | "segments">("style");
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subtitles, setSubtitles] = useState<{
    language: string;
    format: string;
    content: string;
  } | null>(null);

  // Formats & Basic Settings
  const [selectedFormat, setSelectedFormat] = useState("ass");
  const [fontSize, setFontSize] = useState("22");
  const [position, setPosition] = useState<"bottom" | "middle" | "top">("bottom");
  const [positionY, setPositionY] = useState<number>(84); // 5% to 95%
  const [alignment, setAlignment] = useState<"left" | "center" | "right" | "justify">("center");
  const [lineSpacing, setLineSpacing] = useState<number>(1.2);

  // Subtitle Customization Features
  const [fontName, setFontName] = useState("Montserrat");
  const [primaryColor, setPrimaryColor] = useState("#FFFFFF");
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [maxLines, setMaxLines] = useState<number>(2);
  const [effect, setEffect] = useState<"none" | "fade" | "pop" | "slide" | "karaoke">("pop");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1" | "4:3">("16:9");
  const [isBilingual, setIsBilingual] = useState<boolean>(
    Boolean(state.pipelineConfig?.subtitles?.bilingual_subtitles)
  );

  // Canvas Viewport & Dragging State
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<"fit" | "75" | "100">("fit");
  const [isDragging, setIsDragging] = useState(false);
  const [snapActive, setSnapActive] = useState<"center" | "bottom" | "top" | null>(null);

  // Video Player & Playback Tracking State
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const dragStartYRef = useRef<number>(0);
  const dragStartPosYRef = useRef<number>(84);

  // Accordion Sections State
  const [openSections, setOpenSections] = useState<{
    typography: boolean;
    format_text: boolean;
    animation: boolean;
    file_format: boolean;
  }>({
    typography: true,
    format_text: true,
    animation: true,
    file_format: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Segments & Editor State
  const [segments, setSegments] = useState<SubtitleSegment[]>(() => {
    return state.translation?.segments || [];
  });
  const [segmentSearch, setSegmentSearch] = useState("");
  const [previewSegmentIndex, setPreviewSegmentIndex] = useState<number>(0);
  const [animKey, setAnimKey] = useState<number>(0);

  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Real Typography Font Options (No AI/irrelevant icons)
  const fontCards = [
    {
      id: "Montserrat",
      name: "Montserrat",
      sample: "Aa",
      tag: "Hiện đại & Điện ảnh",
    },
    {
      id: "Be Vietnam Pro",
      name: "Be Vietnam Pro",
      sample: "Aa",
      tag: "Chuẩn dấu Tiếng Việt",
    },
    {
      id: "Roboto",
      name: "Roboto",
      sample: "Aa",
      tag: "Cân đối & Dễ đọc",
    },
    {
      id: "Inter",
      name: "Inter",
      sample: "Aa",
      tag: "Sắc nét giao diện",
    },
    {
      id: "Impact",
      name: "Impact",
      sample: "Aa",
      tag: "Mạnh mẽ, Shorts viral",
    },
    {
      id: "Bebas Neue",
      name: "Bebas Neue",
      sample: "Aa",
      tag: "Hẹp cao, Tiêu đề",
    },
    {
      id: "Oswald",
      name: "Oswald",
      sample: "Aa",
      tag: "Đậm nét, Báo chí",
    },
    {
      id: "Playfair Display",
      name: "Playfair",
      sample: "Aa",
      tag: "Cổ điển & Sang trọng",
    },
  ];

  // Real Motion Effect Cards (No AI/irrelevant icons)
  const effectCards = [
    {
      id: "none" as const,
      name: "Tĩnh (Standard)",
      desc: "Chữ đứng yên, rõ nét & thanh lịch",
      badge: "Mặc định",
    },
    {
      id: "pop" as const,
      name: "Bật nảy (Pop)",
      desc: "Nảy zoom bắt mắt, TikTok & Shorts",
      badge: "Viral",
    },
    {
      id: "fade" as const,
      name: "Mờ dần (Fade)",
      desc: "Xuất hiện mượt mà, chuẩn phim ảnh",
      badge: "Điện ảnh",
    },
    {
      id: "slide" as const,
      name: "Trượt lên (Slide)",
      desc: "Trượt nhẹ từ dưới lên trên",
      badge: "Mượt mà",
    },
    {
      id: "karaoke" as const,
      name: "Karaoke Glow",
      desc: "Phát sáng vàng neon từng nhịp",
      badge: "Âm nhạc",
    },
  ];

  // Presets Quick Handler
  const applyPreset = (preset: "mrbeast" | "netflix" | "tiktok" | "youtube" | "minimal" | "cinematic") => {
    if (preset === "mrbeast") {
      setFontName("Montserrat");
      setFontSize("32");
      setPrimaryColor("#FFDF00");
      setOutlineColor("#000000");
      setMaxLines(1);
      setEffect("pop");
      setPosition("bottom");
      setPositionY(80);
      setAlignment("center");
      setLineSpacing(1.2);
      setAspectRatio("16:9");
      setShowSafeArea(false);
      setAnimKey((prev) => prev + 1);
    } else if (preset === "netflix") {
      setFontName("Roboto");
      setFontSize("20");
      setPrimaryColor("#FFFFFF");
      setOutlineColor("#111111");
      setMaxLines(2);
      setEffect("fade");
      setPosition("bottom");
      setPositionY(86);
      setAlignment("center");
      setLineSpacing(1.3);
      setAspectRatio("16:9");
      setShowSafeArea(false);
      setAnimKey((prev) => prev + 1);
    } else if (preset === "tiktok") {
      setFontName("Montserrat");
      setFontSize("32");
      setPrimaryColor("#FFE600");
      setOutlineColor("#000000");
      setMaxLines(1);
      setEffect("pop");
      setPosition("bottom");
      setPositionY(82);
      setAlignment("center");
      setLineSpacing(1.2);
      setAspectRatio("9:16");
      setShowSafeArea(true);
      setAnimKey((prev) => prev + 1);
    } else if (preset === "youtube") {
      setFontName("Be Vietnam Pro");
      setFontSize("22");
      setPrimaryColor("#FFFFFF");
      setOutlineColor("#000000");
      setMaxLines(2);
      setEffect("fade");
      setPosition("bottom");
      setPositionY(85);
      setAlignment("center");
      setLineSpacing(1.2);
      setAspectRatio("16:9");
      setShowSafeArea(false);
      setAnimKey((prev) => prev + 1);
    } else if (preset === "minimal") {
      setFontName("Roboto");
      setFontSize("18");
      setPrimaryColor("#FFFFFF");
      setOutlineColor("#000000");
      setMaxLines(2);
      setEffect("none");
      setPosition("bottom");
      setPositionY(88);
      setAlignment("center");
      setLineSpacing(1.2);
      setAspectRatio("16:9");
      setShowSafeArea(false);
      setAnimKey((prev) => prev + 1);
    } else if (preset === "cinematic") {
      setFontName("Playfair Display");
      setFontSize("22");
      setPrimaryColor("#F3F4F6");
      setOutlineColor("#000000");
      setMaxLines(2);
      setEffect("none");
      setPosition("bottom");
      setPositionY(88);
      setAlignment("center");
      setLineSpacing(1.4);
      setAspectRatio("16:9");
      setShowSafeArea(false);
      setAnimKey((prev) => prev + 1);
    }
  };

  // Two-way sync to Pipeline Context
  useEffect(() => {
    dispatch({
      type: "UPDATE_PIPELINE_CONFIG",
      payload: {
        subtitles: {
          ...(state.pipelineConfig?.subtitles || {}),
          format: selectedFormat as any,
          bilingual_subtitles: isBilingual,
          style: {
            font_name: fontName,
            font_size: parseInt(fontSize, 10) || 22,
            primary_color: primaryColor,
            outline_color: outlineColor,
            alignment: alignment as any,
            margin_v: positionY,
          },
        },
      },
    });
  }, [selectedFormat, fontName, fontSize, primaryColor, outlineColor, alignment, positionY, isBilingual]);

  useEffect(() => {
    if (state.presetConfig) {
      const cfg = state.presetConfig;
      const sub = cfg.config_data?.subtitles || {};
      const subStyle = sub.style || {};
      if (sub.format || cfg.subtitle_format) {
        setSelectedFormat(sub.format || cfg.subtitle_format);
      }
      if (subStyle.font_size) {
        setFontSize(String(subStyle.font_size));
      }
      if (subStyle.font_name) {
        setFontName(subStyle.font_name);
      }
      if (subStyle.primary_color) {
        setPrimaryColor(subStyle.primary_color);
      }
      if (subStyle.outline_color) {
        setOutlineColor(subStyle.outline_color);
      }
      if (subStyle.margin_v !== undefined) {
        setPositionY(subStyle.margin_v);
      }
      const exp = cfg.config_data?.export_muxing || {};
      if (exp.aspect_ratio) {
        setAspectRatio(exp.aspect_ratio);
      }
    }
  }, [state.presetConfig]);

  useEffect(() => {
    loadSubtitles(selectedFormat);
    loadSegments();
  }, [selectedFormat, state.video?.videoId, state.targetLanguage]);

  useEffect(() => {
    const vidId = state.video?.videoId;
    if (!vidId) return;
    let isMounted = true;

    videoService
      .getDubbedVideoPreview(vidId, state.targetLanguage || "vi")
      .then((url) => {
        if (isMounted && url) {
          setVideoPreviewUrl(url);
          return;
        }
        return videoService.getVideoBlob(vidId).then((blob) => {
          if (isMounted) setVideoPreviewUrl(URL.createObjectURL(blob));
        });
      })
      .catch(() => {
        videoService
          .getVideoBlob(vidId)
          .then((blob) => {
            if (isMounted) setVideoPreviewUrl(URL.createObjectURL(blob));
          })
          .catch(() => {
            if (isMounted) setVideoPreviewUrl(null);
          });
      });

    return () => {
      isMounted = false;
    };
  }, [state.video?.videoId, state.targetLanguage]);

  // Video Playback Handlers
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  // Real-time Track Matching Segment
  const activeSegmentIndex = useMemo(() => {
    if (!segments || segments.length === 0) return -1;
    return segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime <= seg.end
    );
  }, [segments, currentTime]);

  // Auto-scroll Matching Segment in Right Sidebar
  useEffect(() => {
    if (activeSegmentIndex !== -1 && segmentRefs.current[activeSegmentIndex]) {
      segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeSegmentIndex]);

  // Click to seek to segment and preview
  const handleSeekToSegment = (index: number) => {
    const seg = segments[index];
    if (!seg) return;
    setPreviewSegmentIndex(index);
    if (videoRef.current) {
      videoRef.current.currentTime = seg.start;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    setCurrentTime(seg.start);
    replayAnimation();
  };

  // Current active or previewed segment
  const currentSegment = useMemo(() => {
    if (activeSegmentIndex !== -1 && segments[activeSegmentIndex]) {
      return segments[activeSegmentIndex];
    }
    if (segments[previewSegmentIndex]) {
      return segments[previewSegmentIndex];
    }
    if (state.translation?.segments && state.translation.segments[previewSegmentIndex]) {
      return state.translation.segments[previewSegmentIndex];
    }
    return null;
  }, [activeSegmentIndex, previewSegmentIndex, segments, state.translation?.segments]);

  // Dynamic Live Preview Text (Syncs with video during playback)
  const livePreviewText = useMemo(() => {
    // When video is playing and time is in a gap between segments (silence)
    if (isPlaying && activeSegmentIndex === -1) {
      return "";
    }
    if (currentSegment) {
      if (isBilingual && currentSegment.text && currentSegment.translated_text) {
        return `${currentSegment.text}\n${currentSegment.translated_text}`;
      }
      return currentSegment.translated_text || currentSegment.text || "";
    }
    return isBilingual
      ? "AI Video Translation System\nHệ thống dịch video tự động đa ngôn ngữ"
      : "Xử lý ngôn ngữ tự nhiên là một lĩnh vực quan trọng của trí tuệ nhân tạo.";
  }, [isPlaying, activeSegmentIndex, currentSegment, isBilingual]);

  const displayedPreviewText = useMemo(() => {
    if (!livePreviewText) return "";
    const maxChars =
      aspectRatio === "9:16" ? 22 : aspectRatio === "1:1" ? 26 : aspectRatio === "4:3" ? 32 : 38;
    return formatSubtitleLines(livePreviewText, maxLines, maxChars);
  }, [livePreviewText, maxLines, aspectRatio]);

  const fontSizePx = parseInt(fontSize, 10) || 22;

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

  // Drag & Drop Positioning Logic
  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    dragStartYRef.current = clientY;
    dragStartPosYRef.current = positionY;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!videoContainerRef.current) return;
      const rect = videoContainerRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;

      const deltaY = e.clientY - dragStartYRef.current;
      const deltaPercent = (deltaY / rect.height) * 100;
      let newY = Math.max(8, Math.min(92, dragStartPosYRef.current + deltaPercent));

      // Snapping logic (2.5% threshold)
      if (Math.abs(newY - 50) < 2.5) {
        newY = 50;
        setSnapActive("center");
      } else if (Math.abs(newY - 84) < 2.5) {
        newY = 84;
        setSnapActive("bottom");
      } else if (Math.abs(newY - 14) < 2.5) {
        newY = 14;
        setSnapActive("top");
      } else {
        setSnapActive(null);
      }

      setPositionY(Number(newY.toFixed(1)));
      if (newY <= 25) setPosition("top");
      else if (newY >= 75) setPosition("bottom");
      else setPosition("middle");
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setSnapActive(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!videoContainerRef.current || e.touches.length === 0) return;
      const rect = videoContainerRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;

      const deltaY = e.touches[0].clientY - dragStartYRef.current;
      const deltaPercent = (deltaY / rect.height) * 100;
      let newY = Math.max(8, Math.min(92, dragStartPosYRef.current + deltaPercent));

      if (Math.abs(newY - 50) < 2.5) {
        newY = 50;
        setSnapActive("center");
      } else if (Math.abs(newY - 84) < 2.5) {
        newY = 84;
        setSnapActive("bottom");
      } else if (Math.abs(newY - 14) < 2.5) {
        newY = 14;
        setSnapActive("top");
      } else {
        setSnapActive(null);
      }

      setPositionY(Number(newY.toFixed(1)));
      if (newY <= 25) setPosition("top");
      else if (newY >= 75) setPosition("bottom");
      else setPosition("middle");
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setSnapActive(null);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging]);

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
    } catch {
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
      
      const cfg = data?.config || state.subtitles?.config || (state.video as any)?.snapshot_data?.subtitle_config;
      if (cfg) {
        if (cfg.font_name) setFontName(cfg.font_name);
        if (cfg.font_size) setFontSize(String(cfg.font_size));
        if (cfg.primary_color) setPrimaryColor(cfg.primary_color);
        if (cfg.outline_color) setOutlineColor(cfg.outline_color);
        if (typeof cfg.max_lines === "number") setMaxLines(cfg.max_lines);
        if (cfg.effect) setEffect(cfg.effect);
        if (cfg.aspect_ratio) setAspectRatio(cfg.aspect_ratio);
        if (cfg.alignment) setAlignment(cfg.alignment);
        if (typeof cfg.position_y === "number") setPositionY(cfg.position_y);
        if (typeof cfg.line_spacing === "number") setLineSpacing(cfg.line_spacing);
        if (cfg.format) setSelectedFormat(cfg.format);
        if (cfg.position) setPosition(cfg.position);
      }

      if (data?.segments && Array.isArray(data.segments) && data.segments.length > 0) {
        setSegments(data.segments);
        return;
      }
    } catch {
      // Fallback
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
        parseInt(fontSize, 10) || 22,
        position,
        {
          fontName,
          primaryColor,
          outlineColor,
          maxLines,
          effect,
          aspectRatio,
          autoSplitChunks: true,
          alignment,
          positionY,
          lineSpacing,
          segments: segments.length > 0 ? segments : undefined,
        }
      );
      setSubtitles(data);
      await loadSubtitles();
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 3000);

      dispatch({
        type: "SET_SUBTITLES",
        payload: {
          ...data,
          config: {
            font_name: fontName,
            font_size: parseInt(fontSize, 10) || 22,
            primary_color: primaryColor,
            outline_color: outlineColor,
            max_lines: maxLines,
            effect,
            aspect_ratio: aspectRatio,
            alignment,
            position_y: positionY,
            line_spacing: lineSpacing,
            format: selectedFormat,
            position,
          },
          segments,
        },
      });

      if (state.video) {
        dispatch({
          type: "SET_VIDEO",
          payload: {
            ...state.video,
            subtitlePath:
              (data as any)?.subtitle_path ||
              (data as any)?.path ||
              `outputs/transcript_${state.video.videoId}/subtitles_${targetLang}.${selectedFormat}`,
            outputPath: undefined,
            progress: Math.max(state.video.progress || 0, 75),
            currentStep: "subtitle",
          },
        });
      }
      return data;
    } catch (error: any) {
      console.error("Subtitle generation failed:", error);
      setSubtitleError(error.message || "Không thể tạo phụ đề với cấu hình mới");
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProceedToDubbing = async () => {
    try {
      await generateSubtitles();
    } catch (e) {
      console.warn("Could not auto-generate subtitles before proceeding:", e);
    }
    dispatch({ type: "SET_STEP", payload: 5 });
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
      setSubtitleError(error.message || "Tải phụ đề thất bại");
    }
  };

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    const newStart = lastSeg ? Number((lastSeg.end + 0.2).toFixed(2)) : 0;
    const newEnd = Number((newStart + 3.0).toFixed(2));
    const newSegment: SubtitleSegment = {
      start: newStart,
      end: newEnd,
      text: "Câu thoại mới",
      translated_text: "Câu thoại mới đã dịch",
    };
    setSegments([...segments, newSegment]);
    setPreviewSegmentIndex(segments.length);
  };

  const handleDeleteSegment = (index: number) => {
    const updated = segments.filter((_, i) => i !== index);
    setSegments(updated);
    if (previewSegmentIndex >= updated.length) {
      setPreviewSegmentIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleUpdateSegmentText = (index: number, text: string) => {
    const updated = [...segments];
    updated[index] = {
      ...updated[index],
      translated_text: text,
      text: updated[index].text || text,
    };
    setSegments(updated);
  };

  const handleUpdateSegmentTime = (
    index: number,
    field: "start" | "end",
    val: number
  ) => {
    const updated = [...segments];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    setSegments(updated);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms}`;
  };

  const filteredSegments = useMemo(() => {
    if (!segmentSearch.trim()) return segments;
    const q = segmentSearch.toLowerCase();
    return segments.filter(
      (s) =>
        (s.translated_text && s.translated_text.toLowerCase().includes(q)) ||
        (s.text && s.text.toLowerCase().includes(q))
    );
  }, [segments, segmentSearch]);

  // Sidebar Toggles
  const handleToggleStyleTab = () => {
    if (isPanelOpen && activeRightTab === "style") {
      setIsPanelOpen(false);
    } else {
      setActiveRightTab("style");
      setIsPanelOpen(true);
    }
  };

  const handleToggleSegmentsTab = () => {
    if (isPanelOpen && activeRightTab === "segments") {
      setIsPanelOpen(false);
    } else {
      setActiveRightTab("segments");
      setIsPanelOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-sm text-[var(--color-text-muted)]">Đang tải cấu hình phụ đề...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Keyframe Animations */}
      <style>{`
        @keyframes subFadeInOut {
          0%, 100% { opacity: 0; transform: translateY(3px); }
          15%, 85% { opacity: 1; transform: translateY(0); }
        }
        @keyframes subPopBounce {
          0% { opacity: 0; transform: scale(0.82); }
          18% { opacity: 1; transform: scale(1.1); }
          28%, 82% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.92); }
        }
        @keyframes subSlideUp {
          0% { opacity: 0; transform: translateY(16px); }
          20%, 80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes subKaraokeGlow {
          0%, 100% { filter: brightness(1); }
          25%, 75% { filter: brightness(1.35) drop-shadow(0 0 10px #FFE600); transform: scale(1.03); }
        }
        .sub-anim-fade { animation: subFadeInOut 3.2s ease-in-out infinite; }
        .sub-anim-pop { animation: subPopBounce 3.2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite; }
        .sub-anim-slide { animation: subSlideUp 3.2s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
        .sub-anim-karaoke { animation: subKaraokeGlow 2.5s ease-in-out infinite; }
      `}</style>

      <PipelineStepLayout
        stepBadge={t("pipeline:header.stepBadge", { current: "04", total: "06" })}
        stepCategory="Subtitle Studio"
        stepTitle="Tùy biến Kiểu dáng & Vị trí Phụ đề"
        stepDescription="Kéo thả trực tiếp vị trí trên video, bám sát âm thanh thời gian thực, phông chữ thực tế và căn lề"
        error={subtitleError}
        onDismissError={() => setSubtitleError(null)}
        hideDefaultToggle={true}
        isPanelOpen={isPanelOpen}
        onTogglePanel={(open) => setIsPanelOpen(open)}
        panelWidth={
          activeRightTab === "segments"
            ? "w-full lg:w-[480px] xl:w-[540px]"
            : "w-full lg:w-[400px] xl:w-[450px]"
        }
        headerActions={
          <div className="flex items-center gap-2">
            {/* Toggle Style Tab */}
            <button
              type="button"
              onClick={handleToggleStyleTab}
              title={
                isPanelOpen && activeRightTab === "style"
                  ? "Ẩn bảng kiểu dáng"
                  : "Mở bảng kiểu dáng phụ đề"
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
                isPanelOpen && activeRightTab === "style"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              <Palette size={13} />
              <span>Kiểu dáng</span>
            </button>

            {/* Toggle Segments Tab */}
            <button
              type="button"
              onClick={handleToggleSegmentsTab}
              title={
                isPanelOpen && activeRightTab === "segments"
                  ? "Ẩn danh sách câu thoại"
                  : "Mở danh sách câu thoại"
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
                isPanelOpen && activeRightTab === "segments"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              <Type size={13} />
              <span>Câu thoại ({segments.length})</span>
            </button>

            {/* Download button */}
            {subtitles && (
              <button
                type="button"
                onClick={downloadSubtitles}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] shadow-2xs"
                title="Tải tệp phụ đề về máy"
              >
                <Download size={13} />
                <span>.{selectedFormat.toUpperCase()}</span>
              </button>
            )}
          </div>
        }
        toolPanelTitle={
          activeRightTab === "style"
            ? "Kiểu dáng phụ đề"
            : `Danh sách câu thoại (${segments.length})`
        }
        toolPanel={
          <div className="space-y-4">
            {/* TAB 1: STYLE STUDIO (NO DUPLICATED TABS SWITCHER) */}
            {activeRightTab === "style" && (
              <div className="space-y-3.5">
                {/* 1-CLICK QUICK PRESETS */}
                <div>
                  <label className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1.5 uppercase tracking-wider">
                    Kiểu mẫu xu hướng 1-Click (Trending Presets):
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset("mrbeast")}
                      className={`flex flex-col p-2 rounded-xl border text-left transition ${
                        primaryColor === "#FFDF00" && effect === "pop"
                          ? "border-amber-400 bg-amber-500/15 text-amber-300 font-semibold ring-1 ring-amber-400/30"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-amber-400/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">MrBeast Viral</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold">HOT</span>
                      </div>
                      <span className="text-[10px] opacity-75 mt-0.5">Vàng đậm · Pop · Viền đen 3px</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("netflix")}
                      className={`flex flex-col p-2 rounded-xl border text-left transition ${
                        fontName === "Roboto" && effect === "fade"
                          ? "border-red-400 bg-red-500/15 text-red-300 font-semibold ring-1 ring-red-400/30"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-red-400/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Netflix Cinema</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/30 text-red-300 font-bold">PRO</span>
                      </div>
                      <span className="text-[10px] opacity-75 mt-0.5">Trắng thanh lịch · Đổ bóng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("tiktok")}
                      className={`flex flex-col p-2 rounded-xl border text-left transition ${
                        aspectRatio === "9:16" && effect === "pop"
                          ? "border-cyan-400 bg-cyan-500/15 text-cyan-300 font-semibold ring-1 ring-cyan-400/30"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-cyan-400/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">TikTok / Shorts</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40">9:16</span>
                      </div>
                      <span className="text-[10px] opacity-75 mt-0.5">Pop · Neon vàng · Safe Area</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("youtube")}
                      className={`flex flex-col p-2 rounded-xl border text-left transition ${
                        aspectRatio === "16:9" && effect === "fade"
                          ? "border-blue-400 bg-blue-500/15 text-blue-300 font-semibold ring-1 ring-blue-400/30"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-blue-400/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">YouTube Chuẩn</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40">16:9</span>
                      </div>
                      <span className="text-[10px] opacity-75 mt-0.5">Fade · Trắng viền đen</span>
                    </button>
                  </div>

                  {/* Bilingual Subtitle Toggle Switch */}
                  <div className="mt-2.5 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                        Phụ đề song ngữ (Bilingual)
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        Dòng 1 câu gốc, Dòng 2 câu dịch
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isBilingual}
                        onChange={(e) => setIsBilingual(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                    </label>
                  </div>
                </div>

                {/* ACCORDION 1: REAL TYPOGRAPHY FONT CARDS */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("typography")}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <Type size={13} className="text-[var(--color-primary)]" />
                      <span>Phông chữ & Màu sắc (Typography)</span>
                    </div>
                    {openSections.typography ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {openSections.typography && (
                    <div className="p-3 pt-1 space-y-3 border-t border-[var(--color-border)]/40 bg-[var(--color-surface)]">
                      {/* Font Preview Grid */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                            Kiểu phông chữ thực tế:
                          </label>
                          <span className="text-[10px] font-mono text-[var(--color-primary)] font-bold">
                            {fontName}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {fontCards.map((f) => {
                            const isSelected = fontName === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setFontName(f.id);
                                  replayAnimation();
                                }}
                                className={`relative flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 shadow-xs ring-1 ring-[var(--color-primary)]/40"
                                    : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface)]"
                                }`}
                              >
                                {/* Font Glyph Box */}
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 border transition-all ${
                                    isSelected
                                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs"
                                      : "bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]"
                                  }`}
                                  style={{ fontFamily: `${f.id}, sans-serif` }}
                                >
                                  {f.sample}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span
                                      className="text-xs font-bold text-[var(--color-text-primary)] truncate"
                                      style={{ fontFamily: `${f.id}, sans-serif` }}
                                    >
                                      {f.name}
                                    </span>
                                    {isSelected && (
                                      <Check size={12} className="text-[var(--color-primary)] shrink-0 ml-1" />
                                    )}
                                  </div>
                                  <span className="block text-[9px] text-[var(--color-text-muted)] truncate mt-0.5">
                                    {f.tag}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Font Size & Primary Color */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--color-border)]/40">
                        <div>
                          <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
                            Cỡ chữ (Font Size):
                          </label>
                          <select
                            value={fontSize}
                            onChange={(e) => setFontSize(e.target.value)}
                            className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                          >
                            <option value="16">16px (Nhỏ)</option>
                            <option value="18">18px (Vừa gọn)</option>
                            <option value="22">22px (Tiêu chuẩn)</option>
                            <option value="26">26px (Lớn rõ nét)</option>
                            <option value="32">32px (Shorts / Reels)</option>
                            <option value="38">38px (TikTok Viral)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
                            Màu chữ (Color):
                          </label>
                          <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-1">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                            />
                            <span className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase truncate">
                              {primaryColor}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stroke / Outline */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                            Viền chữ (Stroke / Outline):
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setOutlineColor((prev) =>
                                prev === "transparent" ? "#000000" : "transparent"
                              )
                            }
                            className="text-[10px] text-[var(--color-primary)] hover:underline font-semibold"
                          >
                            {outlineColor === "transparent" ? "+ Bật viền" : "Tắt viền"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-1">
                          <input
                            type="color"
                            value={outlineColor === "transparent" ? "#000000" : outlineColor}
                            onChange={(e) => setOutlineColor(e.target.value)}
                            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase">
                            {outlineColor === "transparent" ? "Không có viền" : outlineColor}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 2: FORMAT TEXT, ALIGNMENT, SPACING & POSITION */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("format_text")}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <AlignCenter size={13} className="text-[var(--color-primary)]" />
                      <span>Căn lề, Vị trí & Khoảng cách dòng</span>
                    </div>
                    {openSections.format_text ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {openSections.format_text && (
                    <div className="p-3 pt-1 space-y-3.5 border-t border-[var(--color-border)]/40 bg-[var(--color-surface)]">
                      {/* Text Alignment */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1.5 uppercase tracking-wider">
                          Căn lề văn bản (Alignment):
                        </label>
                        <div className="grid grid-cols-4 gap-1.5 bg-[var(--color-surface-muted)] p-1 rounded-xl border border-[var(--color-border)]">
                          <button
                            type="button"
                            onClick={() => setAlignment("left")}
                            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                              alignment === "left"
                                ? "bg-[var(--color-primary)] text-white shadow-xs"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            }`}
                            title="Căn lề trái"
                          >
                            <AlignLeft size={13} />
                            <span className="text-[10px]">Trái</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlignment("center")}
                            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                              alignment === "center"
                                ? "bg-[var(--color-primary)] text-white shadow-xs"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            }`}
                            title="Căn giữa"
                          >
                            <AlignCenter size={13} />
                            <span className="text-[10px]">Giữa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlignment("right")}
                            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                              alignment === "right"
                                ? "bg-[var(--color-primary)] text-white shadow-xs"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            }`}
                            title="Căn lề phải"
                          >
                            <AlignRight size={13} />
                            <span className="text-[10px]">Phải</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlignment("justify")}
                            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                              alignment === "justify"
                                ? "bg-[var(--color-primary)] text-white shadow-xs"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            }`}
                            title="Căn đều hai bên"
                          >
                            <AlignJustify size={13} />
                            <span className="text-[10px]">Đều</span>
                          </button>
                        </div>
                      </div>

                      {/* Line Spacing */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-1">
                            <MoveVertical size={12} className="text-[var(--color-primary)]" />
                            <span>Khoảng cách dòng (Line Spacing):</span>
                          </label>
                          <span className="text-[10px] font-mono text-[var(--color-primary)] font-bold">
                            {lineSpacing.toFixed(1)}x
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 bg-[var(--color-surface-muted)] p-1 rounded-xl border border-[var(--color-border)] text-xs">
                          {[1.0, 1.2, 1.4, 1.6, 1.8].map((spacing) => (
                            <button
                              key={spacing}
                              type="button"
                              onClick={() => setLineSpacing(spacing)}
                              className={`py-1 rounded-lg text-center font-bold text-[11px] transition ${
                                lineSpacing === spacing
                                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                              }`}
                            >
                              {spacing.toFixed(1)}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max lines per subtitle */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1.5 uppercase tracking-wider">
                          Số dòng tối đa (Max Lines):
                        </label>
                        <div className="grid grid-cols-3 gap-1.5 bg-[var(--color-surface-muted)] p-1 rounded-xl border border-[var(--color-border)] text-xs">
                          {[1, 2, 3].map((lines) => (
                            <button
                              key={lines}
                              type="button"
                              onClick={() => setMaxLines(lines)}
                              className={`py-1 rounded-lg text-center font-semibold text-[11px] transition ${
                                maxLines === lines
                                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                              }`}
                            >
                              {lines} dòng {lines === 1 ? "(Gọn)" : lines === 2 ? "(Chuẩn)" : "(Dài)"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vertical Position (Y Coordinate) Slider & Presets */}
                      <div className="pt-2 border-t border-[var(--color-border)]/40">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-1">
                            <Sliders size={12} className="text-[var(--color-primary)]" />
                            <span>Vị trí theo chiều dọc (Tọa độ Y):</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-[var(--color-primary)] font-bold">
                              {Math.round(positionY)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPositionY(84);
                                setPosition("bottom");
                              }}
                              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                              title="Đặt lại về vị trí đáy mặc định (84%)"
                            >
                              <RotateCcw size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPositionY(14);
                              setPosition("top");
                            }}
                            className={`py-1 rounded-lg text-xs font-semibold border transition ${
                              position === "top"
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)]"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            }`}
                          >
                            Đỉnh (14%)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPositionY(50);
                              setPosition("middle");
                            }}
                            className={`py-1 rounded-lg text-xs font-semibold border transition ${
                              position === "middle"
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)]"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            }`}
                          >
                            Giữa (50%)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPositionY(84);
                              setPosition("bottom");
                            }}
                            className={`py-1 rounded-lg text-xs font-semibold border transition ${
                              position === "bottom"
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)]"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            }`}
                          >
                            Đáy (84%)
                          </button>
                        </div>

                        {/* Position Y Range Slider */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">5%</span>
                          <input
                            type="range"
                            min={5}
                            max={95}
                            step={1}
                            value={positionY}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setPositionY(val);
                              if (val <= 25) setPosition("top");
                              else if (val >= 75) setPosition("bottom");
                              else setPosition("middle");
                            }}
                            className="flex-1 h-1.5 bg-[var(--color-surface-muted)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                          />
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">95%</span>
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--color-text-muted)] italic">
                          💡 Bạn có thể nhấp và kéo trực tiếp khung phụ đề trên màn hình video để di chuyển tự do.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 3: REAL MOTION EFFECT CARDS */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("animation")}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[var(--color-primary)]" />
                      <span>Hiệu ứng chuyển động (Motion Effects)</span>
                    </div>
                    {openSections.animation ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {openSections.animation && (
                    <div className="p-3 pt-1 space-y-2 border-t border-[var(--color-border)]/40 bg-[var(--color-surface)]">
                      <div className="grid grid-cols-1 gap-1.5">
                        {effectCards.map((ef) => {
                          const isSelected = effect === ef.id;
                          return (
                            <button
                              key={ef.id}
                              type="button"
                              onClick={() => {
                                setEffect(ef.id);
                                replayAnimation();
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl border text-left transition ${
                                isSelected
                                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 shadow-xs ring-1 ring-[var(--color-primary)]/40"
                                  : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                                    {ef.name}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/40 text-[var(--color-text-muted)]">
                                    {ef.badge}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
                                  {ef.desc}
                                </span>
                              </div>
                              {isSelected && (
                                <Check size={14} className="text-[var(--color-primary)] shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 4: SUBTITLE EXPORT FORMAT */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("file_format")}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileCode size={13} className="text-[var(--color-primary)]" />
                      <span>Định dạng tệp phụ đề (Format)</span>
                    </div>
                    {openSections.file_format ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {openSections.file_format && (
                    <div className="p-3 pt-1 space-y-2 border-t border-[var(--color-border)]/40 bg-[var(--color-surface)]">
                      <select
                        value={selectedFormat}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                        className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                      >
                        <option value="ass">.ASS (Gốc - Hiệu ứng màu sắc, animation, vị trí chuẩn xác)</option>
                        <option value="srt">.SRT (SubRip phổ thông - Tương thích mọi nền tảng)</option>
                        <option value="vtt">.VTT (WebVTT - Chuẩn trình phát HTML5)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SEGMENTS EDITOR (WITH REAL-TIME PLAYING TRACKING) */}
            {activeRightTab === "segments" && (
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PINNED ACTION FOOTER */}
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
              <button
                type="button"
                onClick={generateSubtitles}
                disabled={isGenerating}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition active:scale-98 shadow-xs ${
                  applySuccess
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                } disabled:opacity-50`}
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin text-[var(--color-primary)]" />
                ) : applySuccess ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Sparkles size={14} className="text-[var(--color-primary)]" />
                )}
                <span>
                  {isGenerating
                    ? "Đang áp dụng cấu hình..."
                    : applySuccess
                    ? "✓ Đã áp dụng kiểu dáng thành công!"
                    : "Áp dụng kiểu dáng mới"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleProceedToDubbing}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--color-primary-hover)] active:scale-98 disabled:opacity-50"
              >
                <span>Tiếp tục: Lồng tiếng (Dubbing)</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-card)]">
            
            {/* Canvas Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isPlaying ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  Video Canvas Studio
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)] text-[var(--color-primary)] border border-[var(--color-border)] uppercase">
                  .{selectedFormat}
                </span>
              </div>

              {/* Toolbar Controls: Safe Area, Zoom, Aspect Ratio, Replay */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Safe Area Toggle */}
                <button
                  type="button"
                  onClick={() => setShowSafeArea((prev) => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
                    showSafeArea
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                      : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  }`}
                  title="Hiển thị vùng an toàn giao diện TikTok / Reels tránh che chữ"
                >
                  <ShieldCheck size={12} />
                  <span>Vùng an toàn</span>
                </button>

                {/* Aspect Ratio Switcher */}
                <div className="flex items-center gap-0.5 bg-[var(--color-surface-muted)] p-0.5 rounded-xl border border-[var(--color-border)]">
                  {(["16:9", "9:16", "1:1", "4:3"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => {
                        setAspectRatio(ratio);
                        if (ratio === "9:16") setShowSafeArea(true);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                        aspectRatio === ratio
                          ? "bg-[var(--color-primary)] text-white shadow-xs"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center gap-0.5 bg-[var(--color-surface-muted)] p-0.5 rounded-lg border border-[var(--color-border)] text-[10px]">
                  <button
                    type="button"
                    onClick={() => setZoomLevel("fit")}
                    className={`px-1.5 py-0.5 rounded font-semibold transition ${
                      zoomLevel === "fit" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel("75")}
                    className={`px-1.5 py-0.5 rounded font-semibold transition ${
                      zoomLevel === "75" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel("100")}
                    className={`px-1.5 py-0.5 rounded font-semibold transition ${
                      zoomLevel === "100" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    100%
                  </button>
                </div>

                {/* Replay Motion Button */}
                <button
                  type="button"
                  onClick={replayAnimation}
                  className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
                  title="Chạy lại hiệu ứng chuyển động"
                >
                  <RefreshCw size={11} />
                  <span>Thử hiệu ứng</span>
                </button>
              </div>
            </div>

            {/* Canvas Outer Studio Stage (Dotted Grid Canvas) */}
            <div className="mt-4 flex justify-center items-center bg-[#090d12] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] rounded-2xl overflow-hidden min-h-[420px] max-h-[600px] p-4 sm:p-6 border border-zinc-800 shadow-inner relative select-none">
              
              {/* Actual Video Frame Boundary (The Editable Canvas) */}
              <div
                ref={videoContainerRef}
                style={{
                  transform: zoomLevel === "75" ? "scale(0.75)" : zoomLevel === "100" ? "scale(1)" : "none",
                  transformOrigin: "center center",
                }}
                className={`relative flex w-full justify-center overflow-hidden transition-all duration-300 border-2 border-zinc-700/80 shadow-2xl rounded-2xl bg-black ${
                  aspectRatio === "9:16"
                    ? "aspect-[9/16] max-h-[520px] max-w-[292px]"
                    : aspectRatio === "1:1"
                    ? "aspect-square max-h-[460px] max-w-[460px]"
                    : aspectRatio === "4:3"
                    ? "aspect-[4/3] max-h-[460px] max-w-[610px]"
                    : "aspect-video max-h-[460px] max-w-[800px]"
                }`}
              >
                {/* 4 Professional Corner Framing Guides */}
                <div className="absolute top-1 left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400 pointer-events-none z-30" />
                <div className="absolute top-1 right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400 pointer-events-none z-30" />
                <div className="absolute bottom-1 left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400 pointer-events-none z-30" />
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400 pointer-events-none z-30" />

                {/* Aspect Ratio & Resolution Badge */}
                <div className="absolute top-2 left-2 z-30 pointer-events-none flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-mono font-bold text-white/90 border border-white/15">
                    {aspectRatio === "16:9"
                      ? "1920×1080 (16:9)"
                      : aspectRatio === "9:16"
                      ? "1080×1920 (9:16)"
                      : aspectRatio === "1:1"
                      ? "1080×1080 (1:1)"
                      : "1440×1080 (4:3)"}
                  </span>
                  {isPlaying && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/80 backdrop-blur-md text-[9px] font-mono font-bold text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>{formatSeconds(currentTime)}</span>
                    </span>
                  )}
                </div>

                {/* Video Preview Element (Click to Play/Pause) */}
                {videoPreviewUrl ? (
                  <video
                    ref={videoRef}
                    src={videoPreviewUrl}
                    className="absolute inset-0 h-full w-full object-contain opacity-90 cursor-pointer"
                    onClick={togglePlayPause}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    playsInline
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0d161d] to-zinc-950" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50 pointer-events-none" />

                {/* Magnetic Snap Guidelines */}
                {snapActive === "center" && (
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-cyan-400 z-30 pointer-events-none flex items-center justify-center">
                    <span className="bg-cyan-500 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow">
                      Tâm khung hình (50%)
                    </span>
                  </div>
                )}
                {snapActive === "bottom" && (
                  <div className="absolute left-0 right-0 top-[84%] -translate-y-1/2 border-t-2 border-dashed border-emerald-400 z-30 pointer-events-none flex items-center justify-center">
                    <span className="bg-emerald-600 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow">
                      Lề an toàn dưới (84%)
                    </span>
                  </div>
                )}
                {snapActive === "top" && (
                  <div className="absolute left-0 right-0 top-[14%] -translate-y-1/2 border-t-2 border-dashed border-amber-400 z-30 pointer-events-none flex items-center justify-center">
                    <span className="bg-amber-600 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow">
                      Lề an toàn trên (14%)
                    </span>
                  </div>
                )}

                {/* Safe Area Overlay (Shorts / Reels) */}
                {showSafeArea && aspectRatio === "9:16" && (
                  <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3">
                    <div className="h-10 w-full border-b border-dashed border-red-400/40 bg-red-500/10 rounded-t flex items-center justify-center">
                      <span className="text-[9px] font-mono text-red-300 font-semibold">
                        Khu vực Status / Search (Tránh che)
                      </span>
                    </div>

                    <div className="flex-1 flex justify-end items-center my-1">
                      <div className="w-12 h-44 border-l border-dashed border-red-400/40 bg-red-500/10 rounded-r flex flex-col items-center justify-around py-1">
                        <span className="text-[8px] font-mono text-red-300 transform -rotate-90 whitespace-nowrap">
                          Nút Like / Share
                        </span>
                      </div>
                    </div>

                    <div className="h-20 w-full border-t border-dashed border-red-400/40 bg-red-500/10 rounded-b flex flex-col items-center justify-center">
                      <span className="text-[9px] font-mono text-red-300 font-semibold">
                        Khu vực Caption / Âm thanh TikTok
                      </span>
                      <span className="text-[8px] text-emerald-400 font-bold mt-0.5">
                        ✓ Đặt phụ đề ngay trên vùng này
                      </span>
                    </div>
                  </div>
                )}

                {/* Interactive Draggable Subtitle Box (Syncs with live spoken speech) */}
                <div
                  style={{
                    top: `${positionY}%`,
                    transform: "translateY(-50%)",
                  }}
                  className={`absolute left-3 right-3 z-30 flex flex-col select-none transition-all duration-100 ${
                    displayedPreviewText ? "opacity-100" : isDragging ? "opacity-100" : "opacity-0 pointer-events-none"
                  } ${
                    alignment === "left"
                      ? "items-start text-left"
                      : alignment === "right"
                      ? "items-end text-right"
                      : alignment === "justify"
                      ? "items-center text-justify"
                      : "items-center text-center"
                  }`}
                >
                  {/* Drag Handle & Bounding Box */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleDragStart(e.clientY);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (e.touches[0]) handleDragStart(e.touches[0].clientY);
                    }}
                    className={`group relative max-w-[95%] cursor-grab active:cursor-grabbing rounded-xl p-1.5 transition-all ${
                      isDragging
                        ? "ring-2 ring-emerald-400 bg-emerald-500/15 shadow-xl"
                        : "hover:ring-1 hover:ring-white/40 hover:bg-white/5"
                    }`}
                  >
                    {/* Floating Drag Indicator Badge */}
                    <div
                      className={`absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono shadow-md backdrop-blur-md transition-opacity pointer-events-none whitespace-nowrap ${
                        isDragging
                          ? "bg-emerald-500 text-white opacity-100 ring-1 ring-emerald-300"
                          : "bg-black/80 text-white/90 opacity-0 group-hover:opacity-100 border border-white/20"
                      }`}
                    >
                      <MoveVertical size={10} />
                      <span>Vị trí Y: {Math.round(positionY)}% (Kéo để chỉnh)</span>
                    </div>

                    {/* Corner Marker Dots */}
                    <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Rendered Subtitle Text */}
                    <div
                      key={`${animKey}-${activeSegmentIndex}`}
                      className={`rounded-lg px-3 py-1.5 transition-all ${effectAnimationClass}`}
                      style={{
                        backgroundColor:
                          selectedFormat === "vtt" ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.35)",
                        backdropFilter: "blur(3px)",
                      }}
                    >
                      <p
                        className="font-bold whitespace-pre-line tracking-wide"
                        style={{
                          fontFamily: `${fontName}, sans-serif`,
                          fontSize: `${fontSizePx}px`,
                          lineHeight: lineSpacing,
                          color: primaryColor,
                          textAlign: alignment,
                          WebkitTextStroke:
                            outlineColor !== "transparent" ? `1.2px ${outlineColor}` : "none",
                          textShadow:
                            outlineColor !== "transparent"
                              ? `0 2px 4px ${outlineColor}, 0 0 8px ${outlineColor}`
                              : "0 2px 8px rgba(0,0,0,0.8)",
                        }}
                      >
                        {displayedPreviewText || (isDragging ? "Kéo phụ đề đến vị trí mong muốn" : "")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Segment Indicator */}
                {currentSegment && (
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-white/75 pointer-events-none z-20 font-mono">
                    <span className="flex items-center gap-1.5">
                      {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      <span>
                        Đoạn #{segments.indexOf(currentSegment) + 1}/{segments.length}:{" "}
                        {formatSeconds(currentSegment.start)} → {formatSeconds(currentSegment.end)}
                      </span>
                    </span>
                    <span className="capitalize">{alignment} · {Math.round(positionY)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Video Player Transport & Scrubbing Controls Bar */}
            <div className="mt-3 flex flex-col gap-2 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              {/* Scrubber Timeline */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] min-w-[36px]">
                  {formatSeconds(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                />
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] min-w-[36px] text-right">
                  {formatSeconds(duration)}
                </span>
              </div>

              {/* Controls Action Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Play/Pause Button */}
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold shadow-xs hover:bg-[var(--color-primary-hover)] active:scale-95 transition"
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    <span>{isPlaying ? "Tạm dừng" : "Phát video"}</span>
                  </button>

                  {/* Mute/Unmute */}
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`p-1.5 rounded-lg border text-xs transition ${
                      isMuted
                        ? "border-red-400/50 bg-red-500/10 text-red-400"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                    title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                  >
                    {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>

                  {/* Active Spoken Segment Badge */}
                  {activeSegmentIndex !== -1 && segments[activeSegmentIndex] && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[10px] text-[var(--color-primary)] font-mono border border-[var(--color-border)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Câu #{activeSegmentIndex + 1}/{segments.length}</span>
                    </span>
                  )}
                </div>

                {/* Quick Segment Jump Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const prevIdx = Math.max(
                        0,
                        (activeSegmentIndex !== -1 ? activeSegmentIndex : previewSegmentIndex) - 1
                      );
                      handleSeekToSegment(prevIdx);
                    }}
                    disabled={segments.length === 0}
                    className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[11px] font-semibold text-[var(--color-text-secondary)] disabled:opacity-30 transition"
                    title="Nhảy đến câu thoại trước"
                  >
                    ← Câu trước
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = Math.min(
                        segments.length - 1,
                        (activeSegmentIndex !== -1 ? activeSegmentIndex : previewSegmentIndex) + 1
                      );
                      handleSeekToSegment(nextIdx);
                    }}
                    disabled={segments.length === 0}
                    className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[11px] font-semibold text-[var(--color-text-secondary)] disabled:opacity-30 transition"
                    title="Nhảy đến câu thoại kế tiếp"
                  >
                    Câu sau →
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </PipelineStepLayout>
    </div>
  );
}
