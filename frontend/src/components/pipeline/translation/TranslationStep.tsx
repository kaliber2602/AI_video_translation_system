import { useState, useEffect, useRef, useMemo } from "react";
import {
  Languages,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../../hooks/usePipeline";
import { useHybridProgress } from "../../../hooks/useHybridProgress";
import { videoService } from "../../../services/video.service";
import { exportToSRT, exportToVTT, exportToJSON, exportToCSV } from "../../../utils/subtitleUtils";
import PipelineStepLayout from "../PipelineStepLayout";
import ConfirmationDialog from "../../common/ConfirmationDialog";
import TranslationPlayer from "./TranslationPlayer";
import TranslationToolsPanel from "./TranslationToolsPanel";
import TranslationSegmentList, { type TranslationSegment } from "./TranslationSegmentList";

export default function TranslationStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const isGlobalTaskRunning = Boolean(
    state.stepsSummary?.active_task &&
      (state.stepsSummary.active_task.status === "processing" ||
        state.stepsSummary.active_task.status === "queued") &&
      !isTranslating
  );
  const [isSaving, setIsSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const segmentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isRetranslateConfirmOpen, setIsRetranslateConfirmOpen] = useState(false);

  const [activeRightTab, setActiveRightTab] = useState<"translation" | "tools">("translation");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const hasInitializedTab = useRef(false);
  const [translationModel, setTranslationModel] = useState(
    state.pipelineConfig?.translation?.model_name || "nllb_200_1.3b"
  );
  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [taskMessage, setTaskMessage] = useState<string>("");
  const pollingTimerRef = useRef<any>(null);

  // Hybrid Real-time Progress (Mechanism 1: WebSocket with Mechanism 3: REST fallback)
  const hybrid = useHybridProgress(state.video?.videoId, "translation", async () => {
    if (state.video?.videoId) {
      try {
        const transData = await videoService.getTranslation(state.video.videoId, selectedTargetLang);
        if (transData && transData.segments && Array.isArray(transData.segments)) {
          setTranslation(transData);
          dispatch({ type: "SET_TRANSLATION", payload: transData });
          setIsTranslating(false);
          setTaskProgress(100);
          setActiveRightTab("translation");
          setIsPanelOpen(true);
        }
      } catch (err) {
        console.warn("Auto-reload translation on WS completion:", err);
      }
    }
  });

  useEffect(() => {
    if (isTranslating || (hybrid.progress > 0 && hybrid.progress < 100)) {
      if (hybrid.progress > 0) {
        setTaskProgress(hybrid.progress);
      }
      if (hybrid.message) {
        setTaskMessage(hybrid.message);
      }
      if (hybrid.status === "failed") {
        setIsTranslating(false);
        setTranslationError(hybrid.message || "Dịch thuật thất bại");
      }
    }
  }, [hybrid.progress, hybrid.message, hybrid.status, isTranslating]);

  const supportedTargetLanguages = [
    { code: "vi", label: "Tiếng Việt (Vietnamese)" },
    { code: "en", label: "English (English)" },
    { code: "zh", label: "中文 (Chinese)" },
    { code: "ja", label: "日本語 (Japanese)" },
    { code: "ko", label: "한국어 (Korean)" },
    { code: "fr", label: "Français (French)" },
    { code: "de", label: "Deutsch (German)" },
    { code: "es", label: "Español (Spanish)" },
    { code: "ar", label: "العربية (Arabic)" },
    { code: "ru", label: "Русский (Russian)" },
    { code: "pt", label: "Português (Portuguese)" },
    { code: "it", label: "Italiano (Italian)" },
  ];

  const supportedTranslationModels = [
    { code: "nllb_200_1.3b", label: "Meta NLLB-200 1.3B (Free)", requiredPlan: "free" },
    { code: "deepseek_v3", label: "DeepSeek V3 (Free)", requiredPlan: "free" },
    { code: "nllb_200_3.3b", label: "Meta NLLB-200 3.3B (Pro)", requiredPlan: "pro" },
  ];

  const updateTranslationConfig = (updates: any) => {
    dispatch({
      type: "UPDATE_PIPELINE_CONFIG",
      payload: {
        translation: {
          ...(state.pipelineConfig?.translation || {}),
          ...updates,
        },
      },
    });
  };

  const getCpsInfo = (text: string, start: number, end: number) => {
    const duration = Math.max(0.2, end - start);
    const cps = Math.round(((text || "").length / duration) * 10) / 10;
    if (cps <= 17) {
      return { cps, label: `${cps} CPS`, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", tooltip: "Tốc độ đọc lý tưởng (<= 17 ký tự/giây)" };
    } else if (cps <= 22) {
      return { cps, label: `${cps} CPS`, color: "bg-amber-500/15 text-amber-400 border-amber-500/30", tooltip: "Đọc hơi nhanh (18-22 ký tự/giây)" };
    } else {
      return { cps, label: `${cps} CPS`, color: "bg-red-500/20 text-red-400 border-red-500/40 font-bold", tooltip: "Cảnh báo: Quá dài, khán giả khó đọc kịp (> 22 ký tự/giây)" };
    }
  };

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
      if (videoUrl && videoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const [translation, setTranslation] = useState<{
    source_language: string;
    target_language: string;
    translation_model?: string;
    segments: TranslationSegment[];
  } | null>(null);

  const [translationError, setTranslationError] = useState<string | null>(null);
  const [selectedTargetLang, setSelectedTargetLang] = useState<string>(state.targetLanguage || "vi");

  useEffect(() => {
    if (state.targetLanguage && state.targetLanguage !== selectedTargetLang) {
      setSelectedTargetLang(state.targetLanguage);
    }
  }, [state.targetLanguage]);

  useEffect(() => {
    if (state.presetConfig) {
      const cfg = state.presetConfig;
      const trans = cfg.config_data?.translation || {};
      const model = trans.model_name || cfg.translation_model || "";
      if (model.includes("3.3B") || model.includes("3.3b")) {
        setTranslationModel("nllb_200_3.3b");
      } else if (model.includes("gpt") || model.includes("openai") || model.includes("claude")) {
        setTranslationModel("gpt_4o");
      } else if (model) {
        setTranslationModel("nllb_200_1.3b");
      }

      const targetLang = trans.target_language || cfg.target_language;
      if (targetLang) {
        setSelectedTargetLang(targetLang);
      }
    }
  }, [state.presetConfig]);

  useEffect(() => {
    loadTranslation(selectedTargetLang);
    loadVideoPreview();
  }, [state.video?.videoId, selectedTargetLang]);

  useEffect(() => {
    if (!hasInitializedTab.current && !isLoading) {
      if (!translation || !translation.segments || translation.segments.length === 0) {
        setActiveRightTab("tools");
      } else {
        setActiveRightTab("translation");
      }
      hasInitializedTab.current = true;
    }
  }, [isLoading, translation]);

  const loadVideoPreview = async () => {
    if (!state.video?.videoId) return;
    try {
      const url = videoService.getVideoStreamUrl(state.video.videoId, "original");
      setVideoUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      console.warn("Could not load original video for translation reference", e);
    }
  };

  const pollTranslationStatus = (videoId: number, targetLang: string) => {
    stopPolling();

    const checkStatus = async () => {
      try {
        const summary = await videoService.getStepsSummary(videoId);
        const transStep = summary?.steps?.translation;
        const activeTask = summary?.active_task;

        if (activeTask && (activeTask.current_step === "translation" || activeTask.current_step === "translate")) {
          if (typeof activeTask.progress === "number" && activeTask.progress > 0) {
            setTaskProgress(activeTask.progress);
          }
          if (activeTask.message) {
            setTaskMessage(activeTask.message);
          }
          if (activeTask.status === "failed") {
            stopPolling();
            setIsTranslating(false);
            setTranslationError(activeTask.error_message || "Dịch thuật thất bại trong Celery worker");
            return;
          }
        }

        if (
          transStep?.status === "completed" ||
          (transStep?.segment_count && transStep.segment_count > 0 && !activeTask)
        ) {
          stopPolling();
          try {
            const data = await videoService.getTranslation(videoId, targetLang);
            if (data && data.segments && Array.isArray(data.segments)) {
              setTranslation(data);
              dispatch({
                type: "SET_TRANSLATION",
                payload: data,
              });

              if (state.video) {
                dispatch({
                  type: "SET_VIDEO",
                  payload: {
                    ...state.video,
                    hasTranslation: true,
                    translationPath: `outputs/transcript_${videoId}/translation_${targetLang}.json`,
                    progress: Math.max(state.video.progress || 0, 60),
                    currentStep: "translation",
                  },
                });
              }
              window.dispatchEvent(new CustomEvent("subscription-updated"));
            }
          } catch (loadErr) {
            console.warn("Failed to load completed translation:", loadErr);
          }
          setIsTranslating(false);
          setTaskProgress(100);
          setActiveRightTab("translation");
          setIsPanelOpen(true);
        } else if (transStep?.status === "failed") {
          stopPolling();
          setIsTranslating(false);
          setTranslationError(activeTask?.error_message || "Dịch thuật thất bại");
        }
      } catch (err) {
        console.warn("Polling translation status error:", err);
      }
    };

    checkStatus();
    pollingTimerRef.current = setInterval(checkStatus, 2500);
  };

  const loadTranslation = async (lang?: string) => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setTranslationError(null);

    const targetLang = lang || selectedTargetLang || state.targetLanguage || "vi";

    try {
      let canFetchTranslation = Boolean(state.video?.hasTranslation);
      try {
        const summary = await videoService.getStepsSummary(state.video.videoId);
        const transStep = summary?.steps?.translation;
        const activeTask = summary?.active_task;

        if (
          transStep?.status === "processing" ||
          ((activeTask?.current_step === "translation" || activeTask?.current_step === "translate") &&
            (activeTask?.status === "processing" || activeTask?.status === "queued"))
        ) {
          setIsTranslating(true);
          if (typeof activeTask?.progress === "number") {
            setTaskProgress(activeTask.progress);
          }
          pollTranslationStatus(state.video.videoId, targetLang);
          return;
        }

        if (
          transStep?.status === "completed" ||
          (transStep?.segment_count && transStep.segment_count > 0) ||
          state.video?.hasTranslation
        ) {
          canFetchTranslation = true;
        }
      } catch (sumErr) {
        console.warn("Could not check steps summary on mount:", sumErr);
      }

      if (!canFetchTranslation) {
        setTranslation(null);
        setIsLoading(false);
        return;
      }

      const data = await videoService.getTranslation(state.video.videoId, targetLang);
      setTranslation(data);
      if (data?.translation_model) {
        setTranslationModel(data.translation_model);
      }
      dispatch({
        type: "SET_TRANSLATION",
        payload: data,
      });
    } catch (error) {
      setTranslation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageSelect = (newLang: string) => {
    setSelectedTargetLang(newLang);
    dispatch({
      type: "SET_TARGET_LANGUAGE",
      payload: newLang,
    });
  };

  const handleToggleTranslationTab = () => {
    if (isPanelOpen && activeRightTab === "translation") {
      setIsPanelOpen(false);
    } else {
      setActiveRightTab("translation");
      setIsPanelOpen(true);
    }
  };

  const handleToggleToolsTab = () => {
    if (isPanelOpen && activeRightTab === "tools") {
      setIsPanelOpen(false);
    } else {
      setActiveRightTab("tools");
      setIsPanelOpen(true);
    }
  };

  const generateTranslation = async () => {
    if (!state.video?.videoId) return;
    setIsTranslating(true);
    setTranslationError(null);
    setTaskProgress(0);
    setTaskMessage("Đang khởi tạo tiến trình dịch thuật...");

    try {
      const targetLang = selectedTargetLang || state.targetLanguage || "vi";
      const res = await videoService.startTranslation(
        state.video.videoId,
        targetLang,
        translationModel
      );

      if (res?.status === "processing" || res?.job_id) {
        pollTranslationStatus(state.video.videoId, targetLang);
        return;
      }

      setTranslation(res);
      dispatch({
        type: "SET_TRANSLATION",
        payload: res,
      });

      if (state.video) {
        dispatch({
          type: "SET_VIDEO",
          payload: {
            ...state.video,
            hasTranslation: true,
            translationPath: `outputs/transcript_${state.video.videoId}/translation_${targetLang}.json`,
            progress: Math.max(state.video.progress || 0, 60),
            currentStep: "translation",
          },
        });
      }

      window.dispatchEvent(new CustomEvent("subscription-updated"));
      setIsTranslating(false);
      setTaskProgress(100);
    } catch (error: any) {
      console.error("Translation generation failed:", error);
      setTranslationError(error.message || "Failed to generate translation");
      setIsTranslating(false);
      setTaskProgress(0);
    }
  };

  const handleUpdateSegment = async (index: number, newText: string) => {
    if (!state.video?.videoId || !translation) return;
    setIsSaving(true);

    try {
      await videoService.updateTranslation(
        state.video.videoId,
        translation.target_language,
        {
          segment_id: index,
          translated_text: newText,
        }
      );

      const updatedSegments = [...translation.segments];
      updatedSegments[index].translated_text = newText;
      setTranslation({
        ...translation,
        segments: updatedSegments,
      });
    } catch (error) {
      console.error("Failed to update translation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSplit = (
    index: number,
    splitTime: number,
    part1: { text: string; translated_text?: string },
    part2: { text: string; translated_text?: string }
  ) => {
    if (!translation || !translation.segments[index] || !state.video?.videoId) return;
    const target = translation.segments[index];

    const seg1 = {
      ...target,
      end: splitTime,
      text: part1.text || target.text,
      translated_text: part1.translated_text || target.translated_text,
    };
    const seg2 = {
      ...target,
      start: splitTime,
      text: part2.text || "...",
      translated_text: part2.translated_text || "",
    };

    const newSegments = [
      ...translation.segments.slice(0, index),
      seg1,
      seg2,
      ...translation.segments.slice(index + 1),
    ];

    setTranslation({ ...translation, segments: newSegments });
    dispatch({ type: "SET_TRANSLATION", payload: { ...translation, segments: newSegments } });

    // Also update pipeline transcript context to keep in sync
    const updatedTranscriptSegs = newSegments.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text,
      speaker: s.speaker || "SPEAKER_01",
    }));
    dispatch({
      type: "SET_TRANSCRIPT",
      payload: {
        ...(state.transcript || {}),
        segments: updatedTranscriptSegs,
        total_segments: updatedTranscriptSegs.length,
      },
    });

    // Sync to backend DB so Step 2, Step 4 & Step 5 reflect the split seamlessly
    try {
      videoService.updateTranslation(
        state.video.videoId,
        translation.target_language || selectedTargetLang,
        {
          segments: newSegments,
        }
      ).catch(() => {});
    } catch (_) {}
  };

  const handleMergeWithPrev = (index: number) => {
    if (!translation || index <= 0 || !translation.segments[index - 1] || !translation.segments[index] || !state.video?.videoId) return;
    const prev = translation.segments[index - 1];
    const cur = translation.segments[index];

    const merged = {
      ...prev,
      end: cur.end,
      text: `${prev.text} ${cur.text}`.trim(),
      translated_text: `${prev.translated_text} ${cur.translated_text}`.trim(),
    };

    const newSegments = [
      ...translation.segments.slice(0, index - 1),
      merged,
      ...translation.segments.slice(index + 1),
    ];

    setTranslation({ ...translation, segments: newSegments });
    dispatch({ type: "SET_TRANSLATION", payload: { ...translation, segments: newSegments } });

    const updatedTranscriptSegs = newSegments.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text,
      speaker: s.speaker || "SPEAKER_01",
    }));
    dispatch({
      type: "SET_TRANSCRIPT",
      payload: {
        ...(state.transcript || {}),
        segments: updatedTranscriptSegs,
        total_segments: updatedTranscriptSegs.length,
      },
    });

    try {
      videoService.updateTranslation(
        state.video.videoId,
        translation.target_language || selectedTargetLang,
        { segments: newSegments }
      ).catch(() => {});
    } catch (_) {}
  };

  const handleMergeWithNext = (index: number) => {
    if (!translation || !translation.segments[index] || !translation.segments[index + 1] || !state.video?.videoId) return;
    const cur = translation.segments[index];
    const next = translation.segments[index + 1];

    const merged = {
      ...cur,
      end: next.end,
      text: `${cur.text} ${next.text}`.trim(),
      translated_text: `${cur.translated_text} ${next.translated_text}`.trim(),
    };

    const newSegments = [
      ...translation.segments.slice(0, index),
      merged,
      ...translation.segments.slice(index + 2),
    ];

    setTranslation({ ...translation, segments: newSegments });
    dispatch({ type: "SET_TRANSLATION", payload: { ...translation, segments: newSegments } });

    const updatedTranscriptSegs = newSegments.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text,
      speaker: s.speaker || "SPEAKER_01",
    }));
    dispatch({
      type: "SET_TRANSCRIPT",
      payload: {
        ...(state.transcript || {}),
        segments: updatedTranscriptSegs,
        total_segments: updatedTranscriptSegs.length,
      },
    });

    try {
      videoService.updateTranslation(
        state.video.videoId,
        translation.target_language || selectedTargetLang,
        { segments: newSegments }
      ).catch(() => {});
    } catch (_) {}
  };

  const handleExportFormat = (fmt: "srt" | "vtt" | "json" | "csv" | "txt") => {
    if (!translation || !translation.segments || translation.segments.length === 0) return;
    let content = "";
    let mimeType = "text/plain;charset=utf-8";
    let filename = `translation_${translation.target_language || selectedTargetLang}_${state.video?.videoId || "export"}.${fmt}`;

    if (fmt === "srt") {
      content = exportToSRT(translation.segments, "translated_text");
      mimeType = "application/x-subrip;charset=utf-8";
    } else if (fmt === "vtt") {
      content = exportToVTT(translation.segments, "translated_text");
      mimeType = "text/vtt;charset=utf-8";
    } else if (fmt === "json") {
      content = exportToJSON(translation.segments);
      mimeType = "application/json;charset=utf-8";
    } else if (fmt === "csv") {
      content = exportToCSV(translation.segments);
      mimeType = "text/csv;charset=utf-8";
    } else {
      content = translation.segments.map((s) => s.translated_text || s.text).join("\n");
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeSegmentIndex = useMemo(() => {
    if (!translation?.segments || translation.segments.length === 0) return -1;
    return translation.segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime <= seg.end
    );
  }, [translation?.segments, currentTime]);

  useEffect(() => {
    if (activeSegmentIndex !== -1 && segmentRefs.current[activeSegmentIndex]) {
      segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeSegmentIndex]);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setIsPanelOpen(true);
      setActiveRightTab("translation");
    }
    setCurrentTime(time);
  };

  const filteredSegments = useMemo(() => {
    if (!translation?.segments) return [];
    if (!searchQuery.trim()) return translation.segments;
    const q = searchQuery.toLowerCase();
    return translation.segments.filter(
      (s) =>
        (s.translated_text && s.translated_text.toLowerCase().includes(q)) ||
        (s.text && s.text.toLowerCase().includes(q))
    );
  }, [translation?.segments, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Đang tải bản dịch...</span>
      </div>
    );
  }

  return (
    <PipelineStepLayout
      stepBadge={t("pipeline:header.stepBadge", { current: "03", total: "06" })}
      stepCategory="Neural Machine Translation"
      stepTitle={t("pipeline:steps.translation.title")}
      stepDescription={t("pipeline:steps.translation.description")}
      error={translationError}
      onDismissError={() => setTranslationError(null)}
      hideDefaultToggle={true}
      isPanelOpen={isPanelOpen}
      onTogglePanel={(open) => setIsPanelOpen(open)}
      panelWidth={
        activeRightTab === "translation"
          ? "w-full lg:w-[460px] xl:w-[500px]"
          : "w-full lg:w-[360px]"
      }
      headerActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleTranslationTab}
            title={
              isPanelOpen && activeRightTab === "translation"
                ? t("pipeline:steps.translation.hideTranslation", "Ẩn bản dịch")
                : t("pipeline:steps.translation.showTranslation", "Xem bản dịch")
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
              isPanelOpen && activeRightTab === "translation"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]"
            }`}
          >
            <Languages size={13} />
            <span>{t("pipeline:steps.translation.translationTab", "Bản dịch")}</span>
            {translation?.segments?.length ? (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isPanelOpen && activeRightTab === "translation"
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                }`}
              >
                {translation.segments.length}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={handleToggleToolsTab}
            title={
              isPanelOpen && activeRightTab === "tools"
                ? t("pipeline:steps.translation.hideTools", "Ẩn tùy chọn")
                : t("pipeline:steps.translation.showTools", "Hiện tùy chọn")
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
              isPanelOpen && activeRightTab === "tools"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]"
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>{t("pipeline:steps.translation.toolsTab", "Tùy chọn dịch")}</span>
          </button>
        </div>
      }
      toolPanelIcon={
        activeRightTab === "translation" ? (
          <Languages size={15} className="text-[var(--color-primary)] shrink-0" />
        ) : (
          <SlidersHorizontal size={15} className="text-[var(--color-primary)] shrink-0" />
        )
      }
      toolPanelTitle={
        activeRightTab === "translation"
          ? `${t("pipeline:steps.translation.translationTab", "Bản dịch")}${
              translation?.segments?.length ? ` (${translation.segments.length})` : ""
            }`
          : t("pipeline:steps.translation.toolsTab", "Tùy chọn dịch")
      }
      toolPanel={
        activeRightTab === "translation" ? (
          <TranslationSegmentList
            translation={translation}
            filteredSegments={filteredSegments}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSaving={isSaving}
            isTranslating={isTranslating}
            taskProgress={taskProgress}
            activeSegmentIndex={activeSegmentIndex}
            segmentRefs={segmentRefs}
            currentTime={currentTime}
            onSeek={handleSeek}
            onConfirmSplit={handleConfirmSplit}
            onMergeWithPrev={handleMergeWithPrev}
            onMergeWithNext={handleMergeWithNext}
            onUpdateSegment={handleUpdateSegment}
            onOpenTools={() => setActiveRightTab("tools")}
            getCpsInfo={getCpsInfo}
          />
        ) : (
          <TranslationToolsPanel
            selectedTargetLang={selectedTargetLang}
            supportedTargetLanguages={supportedTargetLanguages}
            onLanguageSelect={handleLanguageSelect}
            translationModel={translationModel}
            setTranslationModel={setTranslationModel}
            supportedTranslationModels={supportedTranslationModels}
            updateTranslationConfig={updateTranslationConfig}
            isTranslating={isTranslating}
            isGlobalTaskRunning={isGlobalTaskRunning}
            translationError={translationError}
            totalSegments={translation?.segments?.length || 0}
            sourceLang={translation?.source_language}
            targetLang={translation?.target_language}
            taskMessage={taskMessage}
            taskProgress={taskProgress}
            hasTranslation={Boolean(translation?.segments?.length)}
            onConfirmRetranslate={() => setIsRetranslateConfirmOpen(true)}
            onGenerateTranslation={generateTranslation}
            onContinue={() => dispatch({ type: "SET_STEP", payload: 4 })}
            onExportFormat={handleExportFormat}
          />
        )
      }
    >
      <TranslationPlayer
        videoRef={videoRef}
        videoUrl={videoUrl}
        filename={state.video?.filename}
        isPlaying={isPlaying}
        segmentCount={translation?.segments?.length || 0}
        targetLang={translation?.target_language}
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onPlay={() => {
          setIsPlaying(true);
          setIsPanelOpen(true);
          setActiveRightTab("translation");
        }}
        onPause={() => setIsPlaying(false)}
      />

      <ConfirmationDialog
        isOpen={isRetranslateConfirmOpen}
        title="Dịch lại toàn bộ video?"
        message="Hành động này sẽ gửi toàn bộ lời thoại sang mô hình AI để dịch lại từ đầu. Các câu bạn đã tự chỉnh sửa tay hoặc AI Rewrite trước đó trong bản dịch này sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?"
        confirmLabel="Tiến hành dịch lại"
        cancelLabel="Hủy bỏ"
        isDestructive={true}
        onConfirm={() => {
          setIsRetranslateConfirmOpen(false);
          generateTranslation();
        }}
        onClose={() => setIsRetranslateConfirmOpen(false)}
      />
    </PipelineStepLayout>
  );
}
