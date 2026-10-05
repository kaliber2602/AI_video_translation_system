import { useState, useEffect, useMemo, useRef } from "react";
import {
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  Palette,
  Type,
  Check,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { usePipeline } from "../../../hooks/usePipeline";
import { videoService } from "../../../services/video.service";
import { formatSubtitleLines, splitSegmentIntoTwo } from "../../../utils/subtitleUtils";
import PipelineStepLayout from "../PipelineStepLayout";
import { EditorTimeline } from "../../editor/EditorTimeline";
import type { SubtitleSegment, SubtitleMaskConfig, OverlayConfig } from "../../../types/video";

import SubtitleStylePanel from "./SubtitleStylePanel";
import SubtitleSegmentList from "./SubtitleSegmentList";
import SubtitlePreviewPlayer from "./SubtitlePreviewPlayer";

export type { SubtitleSegment };

export default function SubtitleStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();

  // Architecture & Sidebar State
  const [activeRightTab, setActiveRightTab] = useState<"style" | "segments">("style");
  const [isSubtitleEnabled, setIsSubtitleEnabled] = useState<boolean>(() => {
    return state.pipelineConfig?.subtitles?.enabled !== false;
  });
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Subtitle Eraser & Masking State (Retained internally for compatibility if previously saved)
  const [subtitleMask, setSubtitleMask] = useState<SubtitleMaskConfig | undefined>(undefined);
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig | undefined>(undefined);

  // Active Timeline Selection
  const [activeTimelineSegmentIndex, setActiveTimelineSegmentIndex] = useState<number | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [_subtitles, setSubtitles] = useState<{
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
  const [effect, setEffect] = useState<"none" | "fade" | "pop" | "slide" | "karaoke">("none");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1" | "4:3">("16:9");
  const [isBilingual, setIsBilingual] = useState<boolean>(
    Boolean(state.pipelineConfig?.subtitles?.bilingual_subtitles)
  );

  const [positionX, setPositionX] = useState<number>(50);
  const [isEditingInline, setIsEditingInline] = useState<boolean>(false);
  const [inlineEditText, setInlineEditText] = useState<string>("");

  // Undo / Redo History Stack for Subtitle Configuration
  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Canvas Viewport & Dragging State
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<"fit" | "75" | "100">("fit");
  const [isDragging, setIsDragging] = useState(false);
  const [snapActive, setSnapActive] = useState<"center" | "bottom" | "top" | "centerX" | null>(null);

  // Video Player & Playback Tracking State
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const dragStartXRef = useRef<number>(0);
  const dragStartYRef = useRef<number>(0);
  const dragStartPosXRef = useRef<number>(50);
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
  const [resynthesizingIndex, setResynthesizingIndex] = useState<number | null>(null);
  const [playingChunkIndex, setPlayingChunkIndex] = useState<number | null>(null);
  const [rewritingIndex, setRewritingIndex] = useState<number | null>(null);
  const chunkAudioRef = useRef<HTMLAudioElement | null>(null);

  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const fontCards = [
    { id: "Montserrat", name: "Montserrat", sample: "Aa" },
    { id: "Be Vietnam Pro", name: "Be Vietnam Pro", sample: "Aa" },
    { id: "Roboto", name: "Roboto", sample: "Aa" },
    { id: "Inter", name: "Inter", sample: "Aa" },
    { id: "Impact", name: "Impact", sample: "Aa" },
    { id: "Bebas Neue", name: "Bebas Neue", sample: "Aa" },
    { id: "Oswald", name: "Oswald", sample: "Aa" },
    { id: "Playfair Display", name: "Playfair", sample: "Aa" },
  ];

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

  const pushHistory = (stateObj?: any) => {
    setHistoryStack((prev) => [
      ...prev.slice(-25),
      stateObj || {
        fontName,
        fontSize,
        primaryColor,
        outlineColor,
        maxLines,
        effect,
        aspectRatio,
        alignment,
        positionY,
        positionX,
        lineSpacing,
        isBilingual,
      },
    ]);
    setRedoStack([]);
  };

  const applyPreset = (preset: "none" | "mrbeast" | "netflix" | "tiktok" | "youtube" | "minimal" | "cinematic") => {
    pushHistory();
    if (preset === "none") {
      setFontName("Roboto");
      setFontSize("22");
      setPrimaryColor("#FFFFFF");
      setOutlineColor("#000000");
      setMaxLines(2);
      setEffect("none");
      setPosition("bottom");
      setPositionY(84);
      setPositionX(50);
      setAlignment("center");
      setLineSpacing(1.2);
      setAspectRatio("16:9");
      setShowSafeArea(false);
      setAnimKey((prev) => prev + 1);
    } else if (preset === "mrbeast") {
      setFontName("Montserrat");
      setFontSize("32");
      setPrimaryColor("#FFDF00");
      setOutlineColor("#000000");
      setMaxLines(1);
      setEffect("pop");
      setPosition("bottom");
      setPositionY(80);
      setPositionX(50);
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

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [
      ...prev,
      {
        fontName,
        fontSize,
        primaryColor,
        outlineColor,
        maxLines,
        effect,
        aspectRatio,
        alignment,
        positionY,
        positionX,
        lineSpacing,
        isBilingual,
      },
    ]);

    if (previous.fontName) setFontName(previous.fontName);
    if (previous.fontSize) setFontSize(previous.fontSize);
    if (previous.primaryColor) setPrimaryColor(previous.primaryColor);
    if (previous.outlineColor) setOutlineColor(previous.outlineColor);
    if (previous.maxLines !== undefined) setMaxLines(previous.maxLines);
    if (previous.effect) setEffect(previous.effect);
    if (previous.aspectRatio) setAspectRatio(previous.aspectRatio);
    if (previous.alignment) setAlignment(previous.alignment);
    if (previous.positionY !== undefined) setPositionY(previous.positionY);
    if (previous.positionX !== undefined) setPositionX(previous.positionX);
    if (previous.lineSpacing !== undefined) setLineSpacing(previous.lineSpacing);
    if (previous.isBilingual !== undefined) setIsBilingual(previous.isBilingual);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setHistoryStack((prev) => [
      ...prev,
      {
        fontName,
        fontSize,
        primaryColor,
        outlineColor,
        maxLines,
        effect,
        aspectRatio,
        alignment,
        positionY,
        positionX,
        lineSpacing,
        isBilingual,
      },
    ]);

    if (next.fontName) setFontName(next.fontName);
    if (next.fontSize) setFontSize(next.fontSize);
    if (next.primaryColor) setPrimaryColor(next.primaryColor);
    if (next.outlineColor) setOutlineColor(next.outlineColor);
    if (next.maxLines !== undefined) setMaxLines(next.maxLines);
    if (next.effect) setEffect(next.effect);
    if (next.aspectRatio) setAspectRatio(next.aspectRatio);
    if (next.alignment) setAlignment(next.alignment);
    if (next.positionY !== undefined) setPositionY(next.positionY);
    if (next.positionX !== undefined) setPositionX(next.positionX);
    if (next.lineSpacing !== undefined) setLineSpacing(next.lineSpacing);
    if (next.isBilingual !== undefined) setIsBilingual(next.isBilingual);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyStack, redoStack, fontName, fontSize, primaryColor, outlineColor, maxLines, effect, aspectRatio, alignment, positionY, positionX, lineSpacing, isBilingual]);

  // Debounced auto-save subtitle configuration to backend
  useEffect(() => {
    if (!state.video?.videoId) return;
    const vidId = state.video.videoId;
    const targetLang = state.targetLanguage || "vi";

    const timer = setTimeout(async () => {
      try {
        await videoService.updateSubtitleSegments(
          vidId,
          targetLang,
          segments,
          {
            font_name: fontName,
            fontName,
            font_size: parseInt(fontSize, 10) || 22,
            fontSize: parseInt(fontSize, 10) || 22,
            primary_color: primaryColor,
            primaryColor,
            outline_color: outlineColor,
            outlineColor,
            max_lines: maxLines,
            maxLines,
            effect,
            aspect_ratio: aspectRatio,
            aspectRatio,
            alignment,
            position_y: positionY,
            positionY,
            position_x: positionX,
            positionX,
            line_spacing: lineSpacing,
            lineSpacing,
            format: selectedFormat,
            position,
            bilingual: isBilingual,
            enabled: isSubtitleEnabled,
          },
          {
            subtitle_mask: subtitleMask,
            overlay_config: overlayConfig,
          }
        );
      } catch (err) {
        console.debug("Debounced auto-save subtitle config:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    fontName,
    fontSize,
    primaryColor,
    outlineColor,
    maxLines,
    effect,
    aspectRatio,
    alignment,
    positionY,
    positionX,
    lineSpacing,
    selectedFormat,
    position,
    isBilingual,
    isSubtitleEnabled,
    state.video?.videoId,
    state.targetLanguage,
  ]);

  // Two-way sync to Pipeline Context
  useEffect(() => {
    dispatch({
      type: "UPDATE_PIPELINE_CONFIG",
      payload: {
        subtitles: {
          ...(state.pipelineConfig?.subtitles || {}),
          enabled: isSubtitleEnabled,
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
  }, [isSubtitleEnabled, selectedFormat, fontName, fontSize, primaryColor, outlineColor, alignment, positionY, isBilingual]);

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

    // Subtitle step must always preview the ORIGINAL video
    const streamUrl = videoService.getVideoStreamUrl(vidId, "original");
    if (isMounted) {
      setVideoPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return streamUrl;
      });
    }

    return () => {
      isMounted = false;
    };
  }, [state.video?.videoId]);

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

  const [searchParams] = useSearchParams();
  const initialSeekDoneRef = useRef(false);

  const seekToQueryTimestamp = () => {
    const tParam = searchParams.get("t");
    if (tParam !== null && videoRef.current) {
      const seekSec = parseFloat(tParam);
      if (!isNaN(seekSec) && seekSec >= 0) {
        videoRef.current.currentTime = seekSec;
        setCurrentTime(seekSec);
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);

    if (!initialSeekDoneRef.current) {
      seekToQueryTimestamp();
      initialSeekDoneRef.current = true;
    }
  };

  useEffect(() => {
    const tParam = searchParams.get("t");
    if (tParam !== null && videoRef.current) {
      seekToQueryTimestamp();
    }
  }, [searchParams.get("t")]);

  const handleSelectTimelineSegment = (index: number) => {
    setActiveTimelineSegmentIndex(index);
    if (segments[index]) {
      handleSeek(segments[index].start);
      setPreviewSegmentIndex(index);
    }
  };

  const handleUpdateTimelineSegment = (index: number, updated: Partial<SubtitleSegment>) => {
    setSegments((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...updated } as SubtitleSegment;
      }
      return next;
    });
  };

  const handleSplitTimelineSegment = (index: number, splitTime: number) => {
    const seg = segments[index];
    if (!seg) return;
    const [seg1, seg2] = splitSegmentIntoTwo(seg, splitTime);
    setSegments((prev) => {
      const next = [...prev];
      next.splice(index, 1, seg1 as SubtitleSegment, seg2 as SubtitleSegment);
      return next;
    });
  };

  const handleDeleteTimelineSegment = (index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
    if (activeTimelineSegmentIndex === index) {
      setActiveTimelineSegmentIndex(null);
    }
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

  const activeSegmentIndex = useMemo(() => {
    if (!segments || segments.length === 0) return -1;
    return segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime <= seg.end
    );
  }, [segments, currentTime]);

  useEffect(() => {
    if (activeSegmentIndex !== -1 && segmentRefs.current[activeSegmentIndex]) {
      segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeSegmentIndex]);

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

  const livePreviewText = useMemo(() => {
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

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartXRef.current = clientX;
    dragStartYRef.current = clientY;
    dragStartPosXRef.current = positionX;
    dragStartPosYRef.current = positionY;
  };

  useEffect(() => {
    if (!isDragging) return;

    const updateDragPosition = (clientX: number, clientY: number) => {
      if (!videoContainerRef.current) return;
      const rect = videoContainerRef.current.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) return;

      const deltaX = clientX - dragStartXRef.current;
      const deltaPercentX = (deltaX / rect.width) * 100;
      let newX = Math.max(0, Math.min(100, dragStartPosXRef.current + deltaPercentX));

      const deltaY = clientY - dragStartYRef.current;
      const deltaPercentY = (deltaY / rect.height) * 100;
      let newY = Math.max(0, Math.min(100, dragStartPosYRef.current + deltaPercentY));

      if (Math.abs(newX - 50) < 2.0) {
        newX = 50;
        setSnapActive("centerX");
      } else if (Math.abs(newY - 50) < 2.0) {
        newY = 50;
        setSnapActive("center");
      } else if (Math.abs(newY - 84) < 2.0) {
        newY = 84;
        setSnapActive("bottom");
      } else if (Math.abs(newY - 14) < 2.0) {
        newY = 14;
        setSnapActive("top");
      } else {
        setSnapActive(null);
      }

      setPositionX(Number(newX.toFixed(1)));
      setPositionY(Number(newY.toFixed(1)));
      if (newY <= 25) setPosition("top");
      else if (newY >= 75) setPosition("bottom");
      else setPosition("middle");
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateDragPosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        updateDragPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      setSnapActive(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleDragEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  const replayAnimation = () => {
    setAnimKey((prev) => prev + 1);
  };

  const loadSubtitles = async (fmt?: string) => {
    if (!state.video?.videoId) return;
    const hasSubtitles =
      state.stepsSummary?.steps?.subtitle?.status === "completed" ||
      Boolean(state.video?.subtitlePath);

    if (!hasSubtitles) {
      setSubtitles(null);
      setIsLoading(false);
      return;
    }

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
        const fName = cfg.font_name || cfg.fontName;
        if (fName) setFontName(fName);
        const fSize = cfg.font_size || cfg.fontSize;
        if (fSize) setFontSize(String(fSize));
        const pColor = cfg.primary_color || cfg.primaryColor;
        if (pColor) setPrimaryColor(pColor);
        const oColor = cfg.outline_color || cfg.outlineColor;
        if (oColor) setOutlineColor(oColor);
        const mLines = cfg.max_lines ?? cfg.maxLines;
        if (typeof mLines === "number") setMaxLines(mLines);
        if (cfg.effect) setEffect(cfg.effect);
        const aRatio = cfg.aspect_ratio || cfg.aspectRatio;
        if (aRatio) setAspectRatio(aRatio);
        if (cfg.alignment) setAlignment(cfg.alignment);
        const posY = cfg.position_y ?? cfg.positionY;
        if (typeof posY === "number") setPositionY(posY);
        const posX = cfg.position_x ?? cfg.positionX;
        if (typeof posX === "number") setPositionX(posX);
        const lSpacing = cfg.line_spacing ?? cfg.lineSpacing;
        if (typeof lSpacing === "number") setLineSpacing(lSpacing);
        if (cfg.format) setSelectedFormat(cfg.format);
        if (cfg.position) setPosition(cfg.position);
        if (typeof cfg.bilingual === "boolean") setIsBilingual(cfg.bilingual);
        else if (typeof cfg.isBilingual === "boolean") setIsBilingual(cfg.isBilingual);
        if (typeof cfg.enabled === "boolean") setIsSubtitleEnabled(cfg.enabled);
      }

      const loadedMask = data?.subtitle_mask || data?.snapshot_data?.subtitle_mask || (state.video as any)?.snapshot_data?.subtitle_mask;
      if (loadedMask) setSubtitleMask(loadedMask);

      const loadedOverlay = data?.overlay_config || data?.snapshot_data?.overlay_config || (state.video as any)?.snapshot_data?.overlay_config;
      if (loadedOverlay) {
        if (loadedOverlay.logo_path || loadedOverlay.logo_url) {
          loadedOverlay.logo_url = videoService.getOverlayLogoUrl(state.video.videoId);
        }
        setOverlayConfig(loadedOverlay);
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
          bilingual: isBilingual,
          segments: segments.length > 0 ? segments : undefined,
        }
      );

      try {
        await videoService.updateSubtitleSegments(
          state.video.videoId,
          targetLang,
          segments.length > 0 ? segments : (data as any)?.segments || [],
          {
            font_name: fontName,
            fontName,
            font_size: parseInt(fontSize, 10) || 22,
            fontSize: parseInt(fontSize, 10) || 22,
            primary_color: primaryColor,
            primaryColor,
            outline_color: outlineColor,
            outlineColor,
            max_lines: maxLines,
            maxLines,
            effect,
            aspect_ratio: aspectRatio,
            aspectRatio,
            alignment,
            position_y: positionY,
            positionY,
            line_spacing: lineSpacing,
            lineSpacing,
            format: selectedFormat,
            position,
            bilingual: isBilingual,
          },
          {
            subtitle_mask: subtitleMask,
            overlay_config: overlayConfig,
          }
        );
      } catch (saveErr) {
        console.warn("Could not save mask/overlay snapshot:", saveErr);
      }

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
    if (isSubtitleEnabled) {
      try {
        await generateSubtitles();
      } catch (e) {
        console.warn("Could not auto-generate subtitles before proceeding:", e);
      }
    }
    dispatch({ type: "SET_STEP", payload: 5 });
  };

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleExportSubtitleFormat = async (format: "ass" | "srt" | "vtt" | "txt" | "csv") => {
    if (!state.video?.videoId) return;
    setSubtitleError(null);
    setIsExportMenuOpen(false);
    try {
      const targetLang = state.targetLanguage || "vi";
      if (format === "ass" || format === "srt" || format === "vtt") {
        const blob = await videoService.downloadSubtitles(
          state.video.videoId,
          targetLang,
          format
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `subtitles_${targetLang}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "txt") {
        const textContent = segments
          .map((s) => (s.translated_text || s.text || "").trim())
          .filter(Boolean)
          .join("\n\n");
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `subtitles_${targetLang}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "csv") {
        const headers = "id,start,end,text,translated_text\n";
        const rows = segments
          .map((s, idx) => {
            const start = s.start ?? 0;
            const end = s.end ?? 0;
            const text = (s.text || "").replace(/"/g, '""');
            const trans = (s.translated_text || "").replace(/"/g, '""');
            return `${idx + 1},${start},${end},"${text}","${trans}"`;
          })
          .join("\n");
        const csvContent = "\uFEFF" + headers + rows;
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `subtitles_${targetLang}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      console.error("Export subtitle failed:", error);
      setSubtitleError(error.message || "Xuất phụ đề thất bại");
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

  const handleMicroTTS = async (index: number) => {
    if (!state.video?.videoId || !segments[index]) return;
    try {
      setResynthesizingIndex(index);
      const seg = segments[index];
      const targetLang = state.targetLanguage || "vi";
      await videoService.resynthesizeSegment(state.video.videoId, index, {
        text: seg.translated_text || seg.text || "",
        speaker: seg.speaker,
        target_language: targetLang,
      });
      handlePlayChunk(index);
    } catch (err: any) {
      console.error("Micro-TTS failed:", err);
      setSubtitleError(err.message || "Tái tổng hợp giọng đọc cho câu này thất bại");
    } finally {
      setResynthesizingIndex(null);
    }
  };

  const handlePlayChunk = (index: number) => {
    if (!state.video?.videoId) return;
    const baseUrl = videoService.getSegmentAudioUrl(state.video.videoId, index);
    const delimiter = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${delimiter}t=${Date.now()}`;
    if (chunkAudioRef.current) {
      chunkAudioRef.current.src = url;
      chunkAudioRef.current.currentTime = 0;
      chunkAudioRef.current
        .play()
        .then(() => {
          setPlayingChunkIndex(index);
        })
        .catch((e) => console.warn("Audio play failed:", e));
    }
  };

  const handleRewriteSegment = async (index: number, mode: "shorter" | "casual" | "catchy") => {
    if (!state.video?.videoId || !segments[index]) return;
    try {
      setRewritingIndex(index);
      const seg = segments[index];
      const currentText = seg.translated_text || seg.text || "";
      const res = await videoService.rewriteTranslationSegment(
        state.video.videoId,
        index,
        mode,
        currentText
      );
      if (res?.rewritten_text) {
        handleUpdateSegmentText(index, res.rewritten_text);
      }
    } catch (err: any) {
      console.error("Rewrite failed:", err);
      setSubtitleError(err.message || "Viết lại câu thất bại");
    } finally {
      setRewritingIndex(null);
    }
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
        onTogglePanel={(open: boolean) => setIsPanelOpen(open)}
        panelWidth={
          activeRightTab === "segments"
            ? "w-full lg:w-[480px] xl:w-[540px]"
            : "w-full lg:w-[400px] xl:w-[450px]"
        }
        headerActions={
          <div className="flex items-center gap-2">
            {/* Toggle Enable / Disable Subtitles (Bypass) */}
            <button
              type="button"
              onClick={() => setIsSubtitleEnabled(!isSubtitleEnabled)}
              title={
                isSubtitleEnabled
                  ? "Đang bật phụ đề - Nhấn để tắt / bỏ qua bước này"
                  : "Đang tắt phụ đề - Nhấn để kích hoạt lại"
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
                isSubtitleEnabled
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  : "border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isSubtitleEnabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                }`}
              />
              <span>{isSubtitleEnabled ? "Phụ đề: BẬT" : "Phụ đề: TẮT (Bỏ qua)"}</span>
            </button>

            {/* Toggle Style Tab */}
            <button
              type="button"
              onClick={handleToggleStyleTab}
              disabled={!isSubtitleEnabled}
              title={
                !isSubtitleEnabled
                  ? "Phụ đề đang tắt"
                  : isPanelOpen && activeRightTab === "style"
                  ? "Ẩn bảng kiểu dáng"
                  : "Mở bảng kiểu dáng phụ đề"
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
                !isSubtitleEnabled
                  ? "border-[var(--color-border)] bg-[var(--color-surface)] opacity-40 cursor-not-allowed text-[var(--color-text-muted)]"
                  : isPanelOpen && activeRightTab === "style"
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
              disabled={!isSubtitleEnabled}
              title={
                !isSubtitleEnabled
                  ? "Phụ đề đang tắt"
                  : isPanelOpen && activeRightTab === "segments"
                  ? "Ẩn danh sách câu thoại"
                  : "Mở danh sách câu thoại"
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
                !isSubtitleEnabled
                  ? "border-[var(--color-border)] bg-[var(--color-surface)] opacity-40 cursor-not-allowed text-[var(--color-text-muted)]"
                  : isPanelOpen && activeRightTab === "segments"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              <Type size={13} />
              <span>Câu thoại ({segments.length})</span>
            </button>

            {/* Multi-Format Export Subtitle Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] shadow-2xs"
                title="Xuất phụ đề đa định dạng"
              >
                <Download size={13} />
                <span>Xuất phụ đề</span>
                <ChevronDown size={11} className={`transition-transform ${isExportMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-xl z-50 space-y-0.5 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => handleExportSubtitleFormat("ass")}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-medium rounded-lg hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] transition"
                  >
                    <span>Tải file .ASS</span>
                    <span className="text-[10px] opacity-60 font-mono">Đầy đủ style</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSubtitleFormat("srt")}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-medium rounded-lg hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] transition"
                  >
                    <span>Tải file .SRT</span>
                    <span className="text-[10px] opacity-60 font-mono">SubRip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSubtitleFormat("vtt")}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-medium rounded-lg hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] transition"
                  >
                    <span>Tải file .VTT</span>
                    <span className="text-[10px] opacity-60 font-mono">WebVTT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSubtitleFormat("txt")}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-medium rounded-lg hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] transition"
                  >
                    <span>Tải file .TXT</span>
                    <span className="text-[10px] opacity-60 font-mono">Văn bản</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSubtitleFormat("csv")}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-medium rounded-lg hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] transition"
                  >
                    <span>Tải file .CSV</span>
                    <span className="text-[10px] opacity-60 font-mono">Bảng tính</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        }
        toolPanelTitle={
          !isSubtitleEnabled
            ? "Trạng thái phụ đề"
            : activeRightTab === "style"
            ? "Kiểu dáng phụ đề"
            : `Danh sách câu thoại (${segments.length})`
        }
        toolPanel={
          <div className="space-y-4">
            {!isSubtitleEnabled ? (
              <div className="py-6 px-3 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
                  <Palette size={22} className="opacity-50" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Phụ đề đã được TẮT
                  </h5>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    Bạn đã chọn bỏ qua bước tạo và chỉnh sửa phụ đề. Video xuất ra sẽ không nhúng chữ (Clean video).
                  </p>
                </div>
              </div>
            ) : (
              <>
                {activeRightTab === "style" && (
                  <SubtitleStylePanel
                    primaryColor={primaryColor}
                    setPrimaryColor={setPrimaryColor}
                    outlineColor={outlineColor}
                    setOutlineColor={setOutlineColor}
                    fontName={fontName}
                    setFontName={setFontName}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    alignment={alignment}
                    setAlignment={setAlignment}
                    maxLines={maxLines}
                    setMaxLines={setMaxLines}
                    lineSpacing={lineSpacing}
                    setLineSpacing={setLineSpacing}
                    positionY={positionY}
                    setPositionY={setPositionY}
                    setPosition={setPosition}
                    effect={effect}
                    setEffect={setEffect}
                    aspectRatio={aspectRatio}
                    isBilingual={isBilingual}
                    setIsBilingual={setIsBilingual}
                    selectedFormat={selectedFormat}
                    setSelectedFormat={setSelectedFormat}
                    openSections={openSections}
                    toggleSection={toggleSection}
                    applyPreset={applyPreset}
                    replayAnimation={replayAnimation}
                    fontCards={fontCards}
                    effectCards={effectCards}
                  />
                )}

                {activeRightTab === "segments" && (
                  <SubtitleSegmentList
                    segments={segments}
                    filteredSegments={filteredSegments}
                    segmentSearch={segmentSearch}
                    setSegmentSearch={setSegmentSearch}
                    handleAddSegment={handleAddSegment}
                    handleDeleteSegment={handleDeleteSegment}
                    handleUpdateSegmentText={handleUpdateSegmentText}
                    handleUpdateSegmentTime={handleUpdateSegmentTime}
                    handleSeekToSegment={handleSeekToSegment}
                    activeSegmentIndex={activeSegmentIndex}
                    previewSegmentIndex={previewSegmentIndex}
                    segmentRefs={segmentRefs}
                    rewritingIndex={rewritingIndex}
                    handleRewriteSegment={handleRewriteSegment}
                    playingChunkIndex={playingChunkIndex}
                    handlePlayChunk={handlePlayChunk}
                    resynthesizingIndex={resynthesizingIndex}
                    handleMicroTTS={handleMicroTTS}
                  />
                )}
              </>
            )}

            {/* PINNED ACTION FOOTER */}
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
              {activeRightTab !== "style" && isSubtitleEnabled && (
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
                      ? "Đang lưu..."
                      : applySuccess
                      ? "✓ Đã lưu câu thoại thành công!"
                      : "Lưu & Cập nhật câu thoại"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleProceedToDubbing}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--color-primary-hover)] active:scale-98 disabled:opacity-50"
              >
                <span>{isSubtitleEnabled ? "Tiếp tục: Lồng tiếng (Dubbing)" : "Bỏ qua & Tiếp tục: Lồng tiếng (Dubbing)"}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <SubtitlePreviewPlayer
            videoRef={videoRef}
            videoContainerRef={videoContainerRef}
            videoPreviewUrl={videoPreviewUrl}
            selectedFormat={selectedFormat}
            isPlaying={isPlaying}
            togglePlayPause={togglePlayPause}
            handleTimeUpdate={handleTimeUpdate}
            handleLoadedMetadata={handleLoadedMetadata}
            setIsPlaying={setIsPlaying}
            currentTime={currentTime}
            duration={duration}
            handleSeek={handleSeek}
            isMuted={isMuted}
            handleToggleMute={handleToggleMute}
            historyStack={historyStack}
            redoStack={redoStack}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            showSafeArea={showSafeArea}
            setShowSafeArea={setShowSafeArea}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            isSubtitleEnabled={isSubtitleEnabled}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            replayAnimation={replayAnimation}
            snapActive={snapActive}
            positionX={positionX}
            positionY={positionY}
            displayedPreviewText={displayedPreviewText}
            isDragging={isDragging}
            handleDragStart={handleDragStart}
            fontSize={fontSize}
            setFontSize={setFontSize}
            isEditingInline={isEditingInline}
            setIsEditingInline={setIsEditingInline}
            inlineEditText={inlineEditText}
            setInlineEditText={setInlineEditText}
            activeSegmentIndex={activeSegmentIndex}
            previewSegmentIndex={previewSegmentIndex}
            segments={segments}
            handleUpdateSegmentText={handleUpdateSegmentText}
            handleSeekToSegment={handleSeekToSegment}
            animKey={animKey}
            effectAnimationClass={effectAnimationClass}
            isBilingual={isBilingual}
            fontName={fontName}
            fontSizePx={fontSizePx}
            lineSpacing={lineSpacing}
            primaryColor={primaryColor}
            alignment={alignment}
            outlineColor={outlineColor}
            currentSegment={currentSegment}
            chunkAudioRef={chunkAudioRef}
            setPlayingChunkIndex={setPlayingChunkIndex}
            formatSeconds={formatSeconds}
          />

          {/* Multi-Track Subtitle Timeline Studio */}
          <div className="mt-3">
            <EditorTimeline
              duration={duration}
              currentTime={currentTime}
              segments={segments}
              activeSegmentIndex={activeTimelineSegmentIndex !== null ? activeTimelineSegmentIndex : activeSegmentIndex}
              onSelectSegment={handleSelectTimelineSegment}
              onSeek={handleSeek}
              onUpdateSegment={handleUpdateTimelineSegment}
              onSplitSegment={handleSplitTimelineSegment}
              onDeleteSegment={handleDeleteTimelineSegment}
              onAddSegment={handleAddSegment}
              audioUrl={state.video?.videoId ? videoService.getAudioStreamUrl(state.video.videoId, "vocals") : null}
            />
          </div>
        </div>
      </PipelineStepLayout>
    </div>
  );
}
