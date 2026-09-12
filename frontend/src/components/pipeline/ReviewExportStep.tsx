import { useState, useEffect, useMemo } from "react";
import { 
  Download, 
  Loader2, 
  CheckCircle2, 
  Film,
  Edit3,
  X,
  Save,
  Search,
  ExternalLink,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";
import StandardVideoPlayer from "../common/StandardVideoPlayer";
import PipelineStepLayout from "./PipelineStepLayout";

export default function ReviewExportStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSwitchingQuality, setIsSwitchingQuality] = useState(false);
  const [exportOptions, setExportOptions] = useState<any>(null);
  const [selectedType, setSelectedType] = useState("final_video");
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Video state
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitleSegments, setSubtitleSegments] = useState<
    Array<{ start: number; end: number; text?: string; translated_text?: string }>
  >([]);

  // Dubbed video info
  const [dubbedVideoInfo, setDubbedVideoInfo] = useState<any>(null);

  // Quick Edit Subtitles Modal State
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [editingSegments, setEditingSegments] = useState<
    Array<{ start: number; end: number; text?: string; translated_text?: string }>
  >([]);
  const [quickEditSearch, setQuickEditSearch] = useState("");
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);
  const [quickEditSuccess, setQuickEditSuccess] = useState(false);
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
  }, [state.video?.videoId, state.video?.outputPath, state.dubbedVideo]);

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
          setEditingSegments(JSON.parse(JSON.stringify(segData.segments)));
          return;
        }
      } catch {
        if (state.translation?.segments && state.translation.segments.length > 0) {
          setSubtitleSegments(state.translation.segments);
          setEditingSegments(JSON.parse(JSON.stringify(state.translation.segments)));
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
        } catch (error) {
          console.error("Failed to get preview URL, falling back to stream endpoint:", error);
          const streamUrl = videoService.getVideoStreamUrl(state.video.videoId, "output");
          setVideoUrl(streamUrl);
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

    try {
      const newUrl = await videoService.getDubbedVideoPreview(
        state.video.videoId,
        state.targetLanguage || "vi",
        newQuality
      );
      setVideoUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return newUrl;
      });
    } catch (err: any) {
      console.error("Failed to switch video quality:", err);
      setExportError(`Không thể tải độ phân giải ${newQuality}: ${err.message || "Lỗi chuyển đổi"}`);
    } finally {
      setIsSwitchingQuality(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleExport = async () => {
    if (!state.video?.videoId) return;
    
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const blob = await videoService.exportVideo(
        state.video.videoId,
        selectedType,
        selectedFormat,
        selectedQuality,
        state.targetLanguage || "vi"
      );

      if (!blob || blob.size === 0) {
        throw new Error("Empty export file received");
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = selectedFormat;
      a.download = `export_${selectedType}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
      
    } catch (error: any) {
      console.error("Export failed:", error);
      setExportError(error.message || t("pipeline:steps.reviewExport.exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveQuickEdit = async () => {
    if (!state.video?.videoId) return;
    setIsSavingQuickEdit(true);

    try {
      const targetLang = state.targetLanguage || "vi";
      await videoService.updateSubtitleSegments(
        state.video.videoId,
        targetLang,
        editingSegments
      );
      setSubtitleSegments(editingSegments);
      setQuickEditSuccess(true);
      setTimeout(() => {
        setQuickEditSuccess(false);
        setIsQuickEditOpen(false);
      }, 1000);
    } catch (err: any) {
      console.error("Quick edit save error:", err);
      alert(t("pipeline:steps.reviewExport.quickEditFailed") + (err.message || ""));
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  const filteredQuickEditSegments = useMemo(() => {
    if (!quickEditSearch.trim()) return editingSegments;
    const q = quickEditSearch.toLowerCase();
    return editingSegments.filter(
      (s) =>
        (s.translated_text && s.translated_text.toLowerCase().includes(q)) ||
        (s.text && s.text.toLowerCase().includes(q))
    );
  }, [editingSegments, quickEditSearch]);

  const assetTypeOptions = useMemo(() => [
    { key: "final_video", label: t("pipeline:steps.reviewExport.assets.final_video") },
    { key: "audio", label: t("pipeline:steps.reviewExport.assets.audio") },
    { key: "subtitles", label: t("pipeline:steps.reviewExport.assets.subtitles") },
    { key: "transcript", label: t("pipeline:steps.reviewExport.assets.transcript") },
    { key: "translation", label: t("pipeline:steps.reviewExport.assets.translation") },
  ], [t]);

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

  const currentTypeConfig = exportOptions?.available_exports?.[selectedType];
  const currentFormats = currentTypeConfig?.formats || ["mp4"];
  const currentQualities = currentTypeConfig?.qualities || [];

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
          <>
            <button
              type="button"
              onClick={() => {
                setEditingSegments(JSON.parse(JSON.stringify(subtitleSegments)));
                setIsQuickEditOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition shadow-xs"
              title={t("pipeline:steps.reviewExport.editSubtitles")}
            >
              <Edit3 size={13} className="text-amber-400" />
              <span>{t("pipeline:steps.reviewExport.editSubtitles")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (state.video?.videoId) {
                  if (state.projectId) {
                    navigate(`/workspace/project/${state.projectId}/video/${state.video.videoId}/editor`);
                  } else {
                    dispatch({ type: "SET_STEP", payload: 4 });
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition shadow-xs"
              title={t("pipeline:steps.reviewExport.nleStudio")}
            >
              <ExternalLink size={13} />
              <span>{t("pipeline:steps.reviewExport.nleStudio")}</span>
            </button>
          </>
        }
        toolPanelTitle={t("pipeline:steps.reviewExport.exportOptionsTitle")}
        toolPanel={
          <div className="space-y-4">
              {/* ASSET TYPE DROPDOWN */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
                  {t("pipeline:steps.reviewExport.assetType")}:
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setSelectedType(newType);
                    const cfg = exportOptions?.available_exports?.[newType];
                    if (cfg?.formats?.length) setSelectedFormat(cfg.formats[0]);
                    if (cfg?.qualities?.length) setSelectedQuality(cfg.qualities[0]);
                  }}
                  className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                >
                  {assetTypeOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* FORMAT DROPDOWN */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
                  {t("pipeline:steps.reviewExport.fileFormat")}:
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] uppercase font-mono"
                >
                  {currentFormats.map((fmt: string) => (
                    <option key={fmt} value={fmt}>
                      .{fmt.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* QUALITY DROPDOWN (If applicable) */}
              {currentQualities.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
                    {t("pipeline:steps.reviewExport.resolution")}:
                  </label>
                  <select
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(e.target.value)}
                    className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                  >
                    {currentQualities.map((q: string) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* PRIMARY DOWNLOAD BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting || (selectedType === "final_video" && !hasFinishedVideo)}
                  title={
                    selectedType === "final_video" && !hasFinishedVideo
                      ? t("pipeline:steps.reviewExport.downloadTooltipNotReady")
                      : t("pipeline:steps.reviewExport.downloadTooltipReady")
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
                >
                  {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  <span>
                    {isExporting
                      ? t("pipeline:steps.reviewExport.exporting")
                      : t("pipeline:steps.reviewExport.downloadFormat", { format: selectedFormat.toUpperCase() })}
                  </span>
                </button>
                {selectedType === "final_video" && !hasFinishedVideo && (
                  <p className="mt-1.5 text-[10px] text-amber-400/90 text-center">
                    ⚠️ {t("pipeline:steps.reviewExport.videoNotCreatedWarning")}
                  </p>
                )}
              </div>

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
        </div>

      </PipelineStepLayout>


      {/* QUICK SUBTITLE EDIT MODAL */}
      {isQuickEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {t("pipeline:steps.reviewExport.quickEditTitle")}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickEditOpen(false)}
                className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/30">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={quickEditSearch}
                  onChange={(e) => setQuickEditSearch(e.target.value)}
                  placeholder={t("pipeline:steps.reviewExport.quickEditSearch")}
                  className="w-full h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {filteredQuickEditSegments.map((seg) => {
                const originalIndex = editingSegments.indexOf(seg);
                return (
                  <div
                    key={originalIndex}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] font-mono">
                      <span>#{originalIndex + 1}</span>
                      <span>{formatTime(seg.start)} → {formatTime(seg.end)}</span>
                    </div>
                    <textarea
                      value={seg.translated_text || seg.text || ""}
                      onChange={(e) => {
                        const updated = [...editingSegments];
                        updated[originalIndex] = {
                          ...updated[originalIndex],
                          translated_text: e.target.value,
                        };
                        setEditingSegments(updated);
                      }}
                      rows={2}
                      className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-2 text-xs leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface)]">
              {quickEditSuccess ? (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  {t("pipeline:steps.reviewExport.quickEditSuccess")}
                </span>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t("pipeline:steps.reviewExport.segmentCount", { count: editingSegments.length })}
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickEditOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                >
                  {t("common:cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickEdit}
                  disabled={isSavingQuickEdit}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white shadow-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {isSavingQuickEdit ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  <span>
                    {isSavingQuickEdit
                      ? t("pipeline:steps.reviewExport.savingSubtitles")
                      : t("pipeline:steps.reviewExport.saveSubtitles")}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
