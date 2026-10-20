import { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, 
  Film,
  AlertCircle,
  ChevronLeft,
  Loader2,
  Sparkles,
  BookOpen,
  Clock,
  Download,
  FileText,
  Play,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../../hooks/usePipeline";
import { videoService } from "../../../services/video.service";
import StandardVideoPlayer from "../../common/StandardVideoPlayer";
import PipelineStepLayout from "../PipelineStepLayout";
import ExportConfigPanel from "./ExportConfigPanel";
import ZipDownloadCard from "./ZipDownloadCard";

export default function ReviewExportStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSwitchingQuality, setIsSwitchingQuality] = useState(false);
  const [_exportOptions, setExportOptions] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [customExportFilename, setCustomExportFilename] = useState("");

  // Video chapters & summary intelligence states
  const [chapters, setChapters] = useState<any[]>([]);
  const [summaryDoc, setSummaryDoc] = useState<any | null>(null);
  const [isGeneratingIntelligence, setIsGeneratingIntelligence] = useState(false);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  const [activeSeekTime, setActiveSeekTime] = useState<number | null>(null);

  useEffect(() => {
    if (!customExportFilename && (state.video?.title || state.video?.filename)) {
      const base = (state.video?.title || state.video?.filename || "video").replace(/\.[^/.]+$/, "");
      const sanitized = base.replace(/[\\/:*?"<>|]/g, "_").trim();
      setCustomExportFilename(`${sanitized}_${state.targetLanguage || "vi"}`);
    }
  }, [state.video?.title, state.video?.filename, state.targetLanguage]);

  // State for downloading all assets as ZIP
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipOptions, setZipOptions] = useState({
    include_video: true,
    include_subtitles: true,
    include_audio: true,
    include_original: false,
  });

  // Video state
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitleSegments, setSubtitleSegments] = useState<
    Array<{ start: number; end: number; text?: string; translated_text?: string }>
  >([]);

  // Dubbed video info
  const [dubbedVideoInfo, setDubbedVideoInfo] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const hasBurnedSubtitles = useMemo(() => {
    if (dubbedVideoInfo?.has_burned_subtitles !== undefined) {
      return Boolean(dubbedVideoInfo.has_burned_subtitles);
    }
    if ((state.dubbedVideo as any)?.has_burned_subtitles !== undefined) {
      return Boolean((state.dubbedVideo as any).has_burned_subtitles);
    }
    if ((state.video as any)?.subtitle_path) {
      return true;
    }
    return true;
  }, [dubbedVideoInfo, state.dubbedVideo, state.video]);

  useEffect(() => {
    loadExportOptions();
    loadVideoPreview();
    loadSubtitles();
    loadIntelligence();
  }, [state.video?.videoId, state.video?.outputPath, state.dubbedVideo]);

  const loadIntelligence = async () => {
    const vidId = state.video?.videoId;
    if (!vidId) return;
    try {
      setIsLoadingIntelligence(true);
      const [chs, docs] = await Promise.all([
        videoService.getVideoChapters(vidId).catch(() => []),
        videoService.getVideoDocuments(vidId).catch(() => []),
      ]);
      setChapters(chs || []);
      if (docs && docs.length > 0) {
        setSummaryDoc(docs[0]);
      }
    } catch (err) {
      console.warn("Failed to load intelligence data:", err);
    } finally {
      setIsLoadingIntelligence(false);
    }
  };

  const handleGenerateIntelligence = async () => {
    const vidId = state.video?.videoId;
    if (!vidId) return;
    try {
      setIsGeneratingIntelligence(true);
      const res = await videoService.generateVideoIntelligence(vidId);
      if (res) {
        if (res.chapters) setChapters(res.chapters);
        if (res.document) setSummaryDoc(res.document);
      }
    } catch (err) {
      console.error("Failed to generate intelligence:", err);
    } finally {
      setIsGeneratingIntelligence(false);
    }
  };

  const handleDownloadSummaryDoc = () => {
    if (!summaryDoc?.content_markdown) return;
    const blob = new Blob([summaryDoc.content_markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${customExportFilename || "video"}_summary_chapters.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (state.presetConfig) {
      const cfg = state.presetConfig;
      const exp = cfg.config_data?.export_muxing || {};
      if (exp.container || cfg.video_format) {
        setSelectedFormat(exp.container || cfg.video_format);
      }
      if (exp.resolution || cfg.video_quality) {
        setSelectedQuality(exp.resolution || cfg.video_quality);
      }
    }
  }, [state.presetConfig]);

  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const loadSubtitles = async () => {
    if (!state.video?.videoId) return;
    try {
      const targetLang = state.targetLanguage || "vi";
      try {
        const segData = await videoService.getSubtitleSegments(state.video.videoId, targetLang);
        if (segData?.segments && Array.isArray(segData.segments) && segData.segments.length > 0) {
          setSubtitleSegments(segData.segments);
          return;
        }
      } catch {
        if (state.translation?.segments && state.translation.segments.length > 0) {
          setSubtitleSegments(state.translation.segments);
          return;
        }
      }
    } catch {
      // Ignored
    }
  };

  const loadExportOptions = async () => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setExportError(null);

    try {
      const options = await videoService.getExportOptions(state.video.videoId);
      
      if (options && options.available_exports) {
        setExportOptions(options);
      } else if (options && typeof options === 'object') {
        setExportOptions({ available_exports: options });
      } else {
        setExportOptions({
          available_exports: {
            final_video: {
              available: true,
              formats: ["mp4", "mov", "avi"],
              qualities: ["360p", "720p", "1080p", "2k", "4k"]
            },
            audio: {
              available: true,
              formats: ["mp3", "wav"]
            },
            subtitles: {
              available: true,
              formats: ["srt", "vtt", "ass", "txt"]
            },
            transcript: {
              available: true,
              formats: ["json", "txt"]
            },
            translation: {
              available: true,
              formats: ["json", "txt"]
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Failed to load export options:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideoPreview = async () => {
    if (!state.video?.videoId) return;

    try {
      setIsLoadingPreview(true);
      let currentDubInfo = dubbedVideoInfo;
      try {
        const dubStatus = await videoService.getDubbingStatus(state.video.videoId);
        if (dubStatus && (dubStatus.status === "completed" || dubStatus.completed || dubStatus.output_path || (dubStatus as any).s3_path)) {
          setDubbedVideoInfo(dubStatus);
          currentDubInfo = dubStatus;
        }
      } catch (e) {
        console.warn("Could not check dubbing status directly:", e);
      }

      const hasDubbedVideo = Boolean(
        state.dubbedVideo?.output_path ||
        (state.dubbedVideo as any)?.s3_path ||
        state.video?.outputPath ||
        (state.video as any)?.output_path ||
        currentDubInfo?.output_path ||
        (currentDubInfo as any)?.s3_path ||
        (currentDubInfo && (currentDubInfo.status === "completed" || currentDubInfo.completed)) ||
        state.video?.status === "completed"
      );

      if (hasDubbedVideo) {
        try {
          const targetLang =
            state.targetLanguage ||
            (state.video as any)?.targetLanguage ||
            (state.video as any)?.target_language ||
            "vi";
          const previewUrl = await videoService.getDubbedVideoPreview(
            state.video.videoId,
            targetLang,
            selectedQuality
          );
          setVideoUrl((prev) => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return previewUrl;
          });
          return;
        } catch (error) {
          console.error("Failed to get preview URL, falling back to stream endpoint:", error);
          const streamUrl = videoService.getVideoStreamUrl(state.video.videoId, "output");
          setVideoUrl(streamUrl);
          return;
        }
      }

      if (state.video?.videoId) {
        try {
          const originalUrl = videoService.getVideoStreamUrl(state.video.videoId, "original");
          setVideoUrl((prev) => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return originalUrl;
          });
        } catch {
          console.warn("Original stream endpoint error");
        }
      }
    } catch (error) {
      console.error("Failed to load video preview:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleQualityChange = async (newQuality: string) => {
    if (!state.video?.videoId) return;
    if (newQuality === selectedQuality && videoUrl) return;

    setSelectedQuality(newQuality);
    setIsSwitchingQuality(true);
    setExportError(null);

    const targetLang =
      state.targetLanguage ||
      (state.video as any)?.targetLanguage ||
      (state.video as any)?.target_language ||
      "vi";

    try {
      const newUrl = await videoService.getDubbedVideoPreview(
        state.video.videoId,
        targetLang,
        newQuality
      );
      setVideoUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return newUrl;
      });
    } catch (err) {
      console.error("Error switching video stream quality:", err);
    } finally {
      setIsSwitchingQuality(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleExport = async () => {
    if (!state.video?.videoId) return;

    setIsExporting(true);
    setExportError(null);

    const targetLang =
      state.targetLanguage ||
      (state.video as any)?.targetLanguage ||
      (state.video as any)?.target_language ||
      "vi";

    try {
      const blob = await videoService.getDubbedVideoBlob(
        state.video.videoId,
        targetLang,
        selectedFormat,
        selectedQuality
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = customExportFilename.trim() || (state.video?.title ? state.video.title.replace(/\.[^/.]+$/, "") : `video_${state.video.videoId}`);
      a.download = `${baseName}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (error: any) {
      console.error("Export failed:", error);
      setExportError(error.message || "Xuất video thất bại");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (!state.video?.videoId) return;

    setIsDownloadingZip(true);
    setExportError(null);

    try {
      const blob = await videoService.downloadAllAssetsZip(state.video.videoId, zipOptions);
      if (!blob || blob.size === 0) {
        throw new Error("Tệp ZIP rỗng hoặc không có dữ liệu tải về.");
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = customExportFilename.trim() || (state.video?.title ? state.video.title.replace(/\.[^/.]+$/, "") : `video_${state.video.videoId}`);
      a.download = `${baseName}_all_assets.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (error: any) {
      console.error("Download all assets ZIP failed:", error);
      setExportError(error.message || "Tải gói tệp ZIP thất bại. Vui lòng thử lại sau.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const hasFinishedVideo = Boolean(
    videoUrl ||
    state.dubbedVideo?.output_path ||
    (state.dubbedVideo as any)?.s3_path ||
    state.video?.outputPath ||
    (state.video as any)?.output_path ||
    dubbedVideoInfo?.output_path ||
    (dubbedVideoInfo as any)?.s3_path ||
    dubbedVideoInfo?.status === "completed" ||
    state.video?.status === "completed"
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-sm text-[var(--color-text-muted)]">{t("pipeline:steps.reviewExport.loadingExportOptions")}</span>
      </div>
    );
  }

  return (
    <>
      <PipelineStepLayout
        stepBadge={t("pipeline:header.stepBadge", { current: "06", total: "06" })}
        stepCategory={t("pipeline:steps.reviewExport.category")}
        stepTitle={t("pipeline:steps.reviewExport.pageTitle")}
        stepDescription={t("pipeline:steps.reviewExport.pageDescription")}
        error={exportError}
        onDismissError={() => setExportError(null)}
        headerActions={
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "SET_STEP", payload: 5 });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition shadow-xs"
            title="Quay lại Studio Lồng Tiếng (Bước 5)"
          >
            <ChevronLeft size={13} />
            <span>Quay lại Bước 5</span>
          </button>
        }
        toolPanelTitle={t("pipeline:steps.reviewExport.exportOptionsTitle")}
        toolPanel={
          <div className="space-y-4">
            <ExportConfigPanel
              selectedFormat={selectedFormat}
              setSelectedFormat={setSelectedFormat}
              selectedQuality={selectedQuality}
              setSelectedQuality={setSelectedQuality}
              customExportFilename={customExportFilename}
              setCustomExportFilename={setCustomExportFilename}
              isExporting={isExporting}
              hasFinishedVideo={hasFinishedVideo}
              onExport={handleExport}
            />

            <ZipDownloadCard
              zipOptions={zipOptions}
              setZipOptions={setZipOptions}
              isDownloadingZip={isDownloadingZip}
              onDownloadZip={handleDownloadAllZip}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4 w-full">
          {exportSuccess && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span className="font-medium">{t("pipeline:steps.reviewExport.exportSuccess")}</span>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Film size={16} className="text-[var(--color-primary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  {t("pipeline:steps.reviewExport.previewBoxTitle")}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {videoUrl || hasFinishedVideo ? (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    {t("pipeline:steps.reviewExport.readyBadge")}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {t("pipeline:steps.reviewExport.notReadyBadge")}
                  </span>
                )}
              </div>
            </div>

            {videoUrl ? (
              <div>
                <StandardVideoPlayer
                  src={videoUrl}
                  selectedQuality={selectedQuality}
                  availableQualities={["360p", "720p", "1080p", "2k", "4k"]}
                  onQualityChange={handleQualityChange}
                  isSwitchingQuality={isSwitchingQuality}
                  hasBurnedSubtitles={hasBurnedSubtitles}
                  subtitleSegments={subtitleSegments}
                  aspectRatio="auto"
                  onDurationChange={(d) => setDuration(d)}
                  seekTime={activeSeekTime}
                />

                {/* Video Info Badges */}
                <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 text-center">
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">{t("pipeline:steps.reviewExport.duration")}</p>
                    <p className="text-xs font-bold text-[var(--color-text-primary)] font-mono mt-0.5">{formatTime(duration)}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 text-center">
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">{t("pipeline:steps.reviewExport.resolution")}</p>
                    <p className="text-xs font-bold text-[var(--color-text-primary)] font-mono mt-0.5">{selectedQuality}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 text-center">
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">{t("pipeline:steps.reviewExport.targetLang")}</p>
                    <p className="text-xs font-bold text-[var(--color-text-primary)] mt-0.5">{state.targetLanguage?.toUpperCase() || (state.video as any)?.target_language?.toUpperCase() || "VI"}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 text-center">
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">{t("pipeline:steps.reviewExport.subtitles")}</p>
                    <p className="text-xs font-bold text-emerald-400 mt-0.5">{hasBurnedSubtitles ? t("pipeline:steps.reviewExport.hardsub") : t("pipeline:steps.reviewExport.softsub")}</p>
                  </div>
                </div>
              </div>
            ) : isLoadingPreview ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 text-center p-12">
                <Loader2 size={32} className="animate-spin text-[var(--color-primary)] mb-3" />
                <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {t("pipeline:steps.reviewExport.loadingPreview")}
                </h4>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {t("pipeline:steps.reviewExport.loadingPreviewDesc")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 text-center p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 mb-3">
                  <Film size={28} />
                </div>
                <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {t("pipeline:steps.reviewExport.emptyTitle")}
                </h4>
                <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-sm leading-relaxed">
                  {t("pipeline:steps.reviewExport.emptyDescription")}
                </p>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SET_STEP", payload: 5 })}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] active:scale-95 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>{t("pipeline:steps.reviewExport.backToDubbing")}</span>
                </button>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------- */}
          {/* VIDEO INTELLIGENCE: SUMMARY & SEMANTIC CHAPTERS */}
          {/* -------------------------------------------------------- */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--color-primary)]" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Phân đoạn & Tóm tắt nội dung thông minh (AI Chapters & Summary)
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Phân tích ngữ nghĩa transcript bằng LLM để tự động chia chương mục và trích xuất điểm nổi bật
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {summaryDoc && (
                  <button
                    type="button"
                    onClick={handleDownloadSummaryDoc}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition"
                    title="Tải tài liệu tổng hợp Markdown"
                  >
                    <Download size={13} />
                    <span>Tải Báo Cáo (.md)</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isGeneratingIntelligence}
                  onClick={handleGenerateIntelligence}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] shadow-xs transition disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {isGeneratingIntelligence ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang phân tích LLM...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>{chapters.length > 0 ? "Tạo lại với AI" : "Tạo Chapters & Tóm tắt"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {isLoadingIntelligence ? (
              <div className="flex h-36 items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[var(--color-primary)] mr-2" />
                <span className="text-xs text-[var(--color-text-muted)]">Đang tải dữ liệu tóm tắt...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left/Main Column: Timeline Chapters */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
                      <Clock size={14} className="text-[var(--color-primary)]" />
                      Danh sách Chapters ({chapters.length})
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      Click vào chapter để tua video
                    </span>
                  </div>

                  {chapters.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-8 text-center">
                      <BookOpen size={28} className="mx-auto text-[var(--color-text-muted)] opacity-60 mb-2" />
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Chưa có chapters nào được tạo cho video này. Nhấn nút "Tạo Chapters & Tóm tắt" để LLM nhận diện các phân đoạn ngữ nghĩa.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {chapters.map((ch) => (
                        <div
                          key={ch.id || ch.sequence}
                          onClick={() => {
                            setActiveSeekTime(ch.start_time);
                          }}
                          className="group flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-3 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition">
                            <Play size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[var(--color-primary)]">
                                {formatTime(ch.start_time)} - {formatTime(ch.end_time)}
                              </span>
                              <span className="rounded bg-[var(--color-border)]/50 px-1.5 py-0.2 text-[10px] font-semibold text-[var(--color-text-muted)]">
                                #{ch.sequence}
                              </span>
                            </div>
                            <h4 className="mt-1 text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition">
                              {ch.title}
                            </h4>
                            {ch.summary && (
                              <p className="mt-1 text-[11px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                                {ch.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Executive Summary Overview */}
                <div className="lg:col-span-5 flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 p-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5 mb-2.5">
                    <FileText size={14} className="text-[var(--color-primary)]" />
                    Bản tóm tắt tổng quan (Executive Summary)
                  </span>

                  {summaryDoc?.content_markdown ? (
                    <div className="flex-1 max-h-[340px] overflow-y-auto pr-1 text-xs leading-relaxed text-[var(--color-text-secondary)] space-y-2 whitespace-pre-wrap">
                      {summaryDoc.content_markdown}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--color-text-muted)]">
                      <Sparkles size={24} className="opacity-40 mb-2" />
                      Nhấn nút tạo phía trên để xem bản tóm tắt điều hành và các điểm chính (Key Takeaways).
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PipelineStepLayout>
    </>
  );
}
