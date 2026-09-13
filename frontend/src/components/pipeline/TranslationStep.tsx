// TranslationStep.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Languages,
  Sparkles,
  Loader2,
  Play,
  Pause,
  ArrowRight,
  Search,
  Check,
  SlidersHorizontal,
  FileVideo,
  BookOpen,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";
import PipelineStepLayout from "./PipelineStepLayout";
import ConfirmationDialog from "../common/ConfirmationDialog";
import { toast } from "../../lib/toast";

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
  const [translationTone, setTranslationTone] = useState(
    state.pipelineConfig?.translation?.tone || "standard"
  );
  const [systemInstruction, setSystemInstruction] = useState(
    state.pipelineConfig?.translation?.system_instruction || ""
  );
  const [glossaryTerms, setGlossaryTerms] = useState<Array<{ key: string; value: string }>>(() => {
    const raw = state.pipelineConfig?.translation?.glossary;
    if (raw && typeof raw === "object") {
      return Object.entries(raw).map(([key, value]) => ({ key, value: String(value) }));
    }
    return [];
  });
  const [newTermKey, setNewTermKey] = useState("");
  const [newTermVal, setNewTermVal] = useState("");
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [rewritingSegmentIdx, setRewritingSegmentIdx] = useState<number | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [taskProgress, setTaskProgress] = useState<number>(0);
  const pollingTimerRef = useRef<any>(null);

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
    { code: "nllb_200_1.3b", label: "Meta NLLB-200 1.3B (Nhanh & Ổn định)" },
    { code: "nllb_200_3.3b", label: "Meta NLLB-200 3.3B (Độ chính xác cao)" },
    { code: "gpt_4o", label: "OpenAI GPT-4o (Đỉnh cao ngữ cảnh & Sáng tạo)" },
    { code: "claude_3_5_sonnet", label: "Claude 3.5 Sonnet (Văn phong mượt mà tự nhiên)" },
    { code: "gemini_1_5_flash", label: "Google Gemini 1.5 Flash (Siêu tốc độ)" },
    { code: "deepseek_v3", label: "DeepSeek V3 (Chi phí thấp & Logic tốt)" },
  ];

  const supportedTones = [
    { code: "standard", label: "Tiêu chuẩn (Chuẩn ngữ pháp & Tự nhiên)" },
    { code: "casual", label: "Đời thường (Thân mật, xưng hô gần gũi)" },
    { code: "formal", label: "Trang trọng (Tin tức / Phim tài liệu / Doanh nghiệp)" },
    { code: "energetic", label: "Sôi nổi / Hào hứng (Reviewer / Vlogger / TikTok)" },
    { code: "concise", label: "Ngắn gọn (Tối ưu độ dài phụ đề đọc nhanh)" },
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

  const handleAIRewrite = async (segmentIdx: number, style: "shorter" | "casual" | "formal" | "catchy") => {
    if (!state.video?.videoId || !translation?.segments?.[segmentIdx]) return;
    try {
      setIsRewriting(true);
      const res = await videoService.rewriteTranslationSegment(
        state.video.videoId,
        segmentIdx,
        style,
        systemInstruction
      );
      if (res.rewritten_text) {
        const updated = [...translation.segments];
        updated[segmentIdx].translated_text = res.rewritten_text;
        setTranslation({ ...translation, segments: updated });
        toast.success(`Đã viết lại câu #${segmentIdx + 1}!`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Không thể viết lại câu.");
    } finally {
      setIsRewriting(false);
      setRewritingSegmentIdx(null);
    }
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

  const handleAddGlossaryTerm = () => {
    if (!newTermKey.trim() || !newTermVal.trim()) return;
    const updated = [...glossaryTerms, { key: newTermKey.trim(), value: newTermVal.trim() }];
    setGlossaryTerms(updated);
    setNewTermKey("");
    setNewTermVal("");
    const glossaryObj = updated.reduce((acc, cur) => ({ ...acc, [cur.key]: cur.value }), {});
    updateTranslationConfig({ glossary: glossaryObj });
  };

  const handleRemoveGlossaryTerm = (index: number) => {
    const updated = glossaryTerms.filter((_, i) => i !== index);
    setGlossaryTerms(updated);
    const glossaryObj = updated.reduce((acc, cur) => ({ ...acc, [cur.key]: cur.value }), {});
    updateTranslationConfig({ glossary: glossaryObj });
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
    };
  }, []);

  const [translation, setTranslation] = useState<{
    source_language: string;
    target_language: string;
    translation_model?: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      translated_text: string;
    }>;
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
      const blob = await videoService.getVideoBlob(state.video.videoId);
      setVideoUrl(URL.createObjectURL(blob));
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
      // Check active Celery task for F5 / navigation resilience
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
        }
      } catch (sumErr) {
        console.warn("Could not check steps summary on mount:", sumErr);
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
    setTaskProgress(15);

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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
        (s.text && s.text.toLowerCase().includes(q)) ||
        (s.translated_text && s.translated_text.toLowerCase().includes(q))
    );
  }, [translation?.segments, searchQuery]);

  const handleRetranslateClick = () => {
    if (translation && translation.segments && translation.segments.length > 0) {
      setIsRetranslateConfirmOpen(true);
    } else {
      generateTranslation();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Đang tải dữ liệu dịch thuật...</span>
      </div>
    );
  }

  return (
    <>
      <PipelineStepLayout
        stepBadge={t("pipeline:header.stepBadge", { current: "03", total: "06" })}
        stepCategory="Neural Translation Studio"
        stepTitle={t("pipeline:steps.translation.title")}
        stepDescription={t("pipeline:steps.translation.description")}
        error={translationError}
        onDismissError={() => setTranslationError(null)}
        hideDefaultToggle={true}
        isPanelOpen={isPanelOpen}
        onTogglePanel={(open) => setIsPanelOpen(open)}
        panelWidth={
          activeRightTab === "translation"
            ? "w-full lg:w-[480px] xl:w-[540px]"
            : "w-full lg:w-[360px]"
        }
        headerActions={
          <div className="flex items-center gap-2">
            {/* Toggle Translation Tab Button */}
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

            {/* Toggle Tools Tab Button */}
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
              <span>{t("pipeline:steps.translation.toolsTab", "Tùy chọn dịch thuật")}</span>
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
            ? `${t("pipeline:steps.translation.translationTab", "Bản dịch song ngữ")}${
                translation?.segments?.length ? ` (${translation.segments.length})` : ""
              }`
            : t("pipeline:steps.translation.toolsTab", "Tùy chọn dịch thuật")
        }
        toolPanel={
          activeRightTab === "translation" ? (
            <div className="space-y-3">
              {/* Search & Saving status */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("pipeline:steps.translation.searchPlaceholder", "Tìm kiếm câu gốc hoặc câu dịch...")}
                    className="w-full h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
                  />
                </div>
                {isSaving && (
                  <span className="text-[11px] text-amber-400 animate-pulse font-medium shrink-0 flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" />
                    <span>{t("pipeline:steps.translation.saving", "Đang lưu...")}</span>
                  </span>
                )}
              </div>

              {/* Segments list or empty state */}
              {!translation || !translation.segments || translation.segments.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] mb-3">
                    <Languages size={24} />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {t(
                      "pipeline:steps.translation.noTranslation",
                      `Chưa có bản dịch cho ngôn ngữ ${selectedTargetLang.toUpperCase()}. Chọn thẻ 'Tùy chọn dịch thuật' và nhấn 'Bắt đầu dịch' để khởi chạy.`,
                      { lang: selectedTargetLang.toUpperCase() }
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveRightTab("tools")}
                    className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] transition"
                  >
                    <SlidersHorizontal size={13} />
                    <span>{t("pipeline:steps.translation.openTools", "Mở tùy chọn")}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredSegments.length > 0 ? (
                    filteredSegments.map((seg) => {
                      const originalIndex = translation.segments.indexOf(seg);
                      const isActive = activeSegmentIndex === originalIndex;

                      return (
                        <div
                          key={originalIndex}
                          ref={(el) => {
                            segmentRefs.current[originalIndex] = el;
                          }}
                          onClick={() => handleSeek(seg.start)}
                          className={`rounded-xl border px-3.5 py-2.5 transition-all duration-200 cursor-pointer ${
                            isActive
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/25 ring-2 ring-[var(--color-primary)]/70 shadow-md border-l-4 border-l-[var(--color-primary)] scale-[1.01]"
                              : "border-[var(--color-border-muted)] bg-[var(--color-surface-muted)]/50 hover:border-zinc-700 hover:bg-[var(--color-surface-muted)]"
                          }`}
                        >
                          {/* Header: Time + Segment Index + CPS Gauge + AI Rewrite */}
                          <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--color-text-muted)] gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeek(seg.start);
                              }}
                              className={`flex items-center gap-1 font-mono font-medium transition ${
                                isActive ? "text-[var(--color-primary)] font-bold" : "hover:text-[var(--color-primary)] text-[var(--color-text-secondary)]"
                              }`}
                              title={t("pipeline:steps.translation.seekTooltip", "Nhấp để tua video")}
                            >
                              <Play size={10} className={isActive ? "fill-current text-[var(--color-primary)]" : ""} />
                              <span className="text-[11px]">
                                {formatTime(seg.start)} → {formatTime(seg.end)}
                              </span>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* CPS Badge */}
                              {(() => {
                                const cpsInfo = getCpsInfo(seg.translated_text || seg.text || "", seg.start, seg.end);
                                return (
                                  <span
                                    className={`px-1.5 py-0.2 rounded border text-[10px] font-mono ${cpsInfo.color}`}
                                    title={cpsInfo.tooltip}
                                  >
                                    {cpsInfo.label}
                                  </span>
                                );
                              })()}

                              {/* AI Rewrite Button & Popover */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRewritingSegmentIdx(rewritingSegmentIdx === originalIndex ? null : originalIndex);
                                  }}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[10px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition"
                                  title="Viết lại câu thoại bằng AI theo phong cách"
                                >
                                  {isRewriting && rewritingSegmentIdx === originalIndex ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    <Sparkles size={10} />
                                  )}
                                  <span>Rewrite</span>
                                </button>

                                {rewritingSegmentIdx === originalIndex && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-6 z-30 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-2xl animate-scale-up space-y-1 text-xs"
                                  >
                                    <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border-muted)] text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                      <span>Chọn phong cách:</span>
                                      <button type="button" onClick={() => setRewritingSegmentIdx(null)}>
                                        <X size={12} />
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isRewriting}
                                      onClick={() => handleAIRewrite(originalIndex, "shorter")}
                                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] text-xs flex items-center justify-between"
                                    >
                                      <span>✂️ Rút ngắn (-25%)</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isRewriting}
                                      onClick={() => handleAIRewrite(originalIndex, "casual")}
                                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] text-xs flex items-center justify-between"
                                    >
                                      <span>💬 Đời thường</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isRewriting}
                                      onClick={() => handleAIRewrite(originalIndex, "formal")}
                                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] text-xs flex items-center justify-between"
                                    >
                                      <span>🏛️ Trang trọng</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isRewriting}
                                      onClick={() => handleAIRewrite(originalIndex, "catchy")}
                                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] text-xs flex items-center justify-between"
                                    >
                                      <span>🔥 Bắt trend</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              <span
                                className={`font-mono text-[10px] ${
                                  isActive ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-text-muted)]"
                                }`}
                              >
                                #{originalIndex + 1}
                              </span>
                            </div>
                          </div>

                          {/* Line 1: Original text (Source) */}
                          <p className="text-xs text-[var(--color-text-secondary)] leading-snug break-words select-text">
                            {seg.text}
                          </p>

                          {/* Line 2: Translated text (Target) - Inline editable */}
                          <div onClick={(e) => e.stopPropagation()} className="mt-0.5">
                            <textarea
                              defaultValue={seg.translated_text || seg.text}
                              placeholder={t("pipeline:steps.translation.enterTranslation", "Nhập bản dịch...")}
                              rows={Math.max(1, Math.ceil((seg.translated_text || seg.text || "").length / 45))}
                              className="w-full bg-transparent border-0 rounded px-1 py-0.5 text-xs font-medium text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] leading-snug resize-none outline-none focus:bg-[var(--color-input-background)] focus:ring-1 focus:ring-[var(--color-primary)]/60 transition"
                              onFocus={(e) => {
                                e.target.style.height = "auto";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              onInput={(e: any) => {
                                e.target.style.height = "auto";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              onBlur={(e) => handleUpdateSegment(originalIndex, e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                      Không tìm thấy câu nào phù hợp với từ khóa tìm kiếm
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Target Language Selection */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
                  {t("pipeline:steps.translation.targetLangLabel", "Ngôn ngữ đích:")}
                </label>
                <select
                  value={selectedTargetLang}
                  onChange={(e) => handleLanguageSelect(e.target.value)}
                  disabled={isTranslating}
                  className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                >
                  {supportedTargetLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Translation Model Selection */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
                  {t("pipeline:steps.translation.modelSelectLabel", "Mô hình dịch thuật:")}
                </label>
                <select
                  value={translationModel}
                  onChange={(e) => {
                    setTranslationModel(e.target.value);
                    updateTranslationConfig({ model_name: e.target.value });
                  }}
                  disabled={isTranslating}
                  className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                >
                  {supportedTranslationModels.map((model) => (
                    <option key={model.code} value={model.code}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Translation Tone Selection */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
                  Văn phong & Giọng điệu (Tone):
                </label>
                <select
                  value={translationTone}
                  onChange={(e) => {
                    setTranslationTone(e.target.value);
                    updateTranslationConfig({ tone: e.target.value });
                  }}
                  disabled={isTranslating}
                  className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                >
                  {supportedTones.map((tone) => (
                    <option key={tone.code} value={tone.code}>
                      {tone.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* System Instruction Prompt */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
                  Chỉ dẫn dịch thuật riêng (System Prompt):
                </label>
                <textarea
                  value={systemInstruction}
                  onChange={(e) => {
                    setSystemInstruction(e.target.value);
                    updateTranslationConfig({ system_instruction: e.target.value });
                  }}
                  placeholder="VD: Xưng hô 'mình' và 'các bạn', giữ nguyên thuật ngữ AI, phong cách dí dỏm..."
                  rows={2}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] p-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </div>

              {/* In-context Glossary */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <button
                  type="button"
                  onClick={() => setIsGlossaryOpen(!isGlossaryOpen)}
                  className="w-full flex items-center justify-between text-xs font-bold text-[var(--color-text-primary)]"
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={13} className="text-[var(--color-primary)]" />
                    <span>Thuật ngữ chuyên ngành ({glossaryTerms.length})</span>
                  </span>
                  <span className="text-[10px] text-[var(--color-primary)]">
                    {isGlossaryOpen ? "Thu gọn" : "Mở rộng"}
                  </span>
                </button>

                {isGlossaryOpen && (
                  <div className="mt-2.5 space-y-2 pt-2 border-t border-[var(--color-border-muted)]">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Từ gốc (vd: Agent)"
                        value={newTermKey}
                        onChange={(e) => setNewTermKey(e.target.value)}
                        className="w-1/2 h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-[11px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                      />
                      <input
                        type="text"
                        placeholder="Dịch (vd: Đặc vụ AI)"
                        value={newTermVal}
                        onChange={(e) => setNewTermVal(e.target.value)}
                        className="w-1/2 h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-[11px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                      />
                      <button
                        type="button"
                        onClick={handleAddGlossaryTerm}
                        className="px-2 h-7 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold shrink-0 hover:bg-[var(--color-primary-hover)]"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {glossaryTerms.length > 0 ? (
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {glossaryTerms.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-[var(--color-surface-muted)] text-[11px]"
                          >
                            <span className="font-semibold text-[var(--color-text-primary)]">{item.key}</span>
                            <span className="text-[var(--color-text-muted)]">→</span>
                            <span className="text-[var(--color-primary)] font-medium">{item.value}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveGlossaryTerm(idx)}
                              className="text-red-400 hover:text-red-500 p-0.5"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[var(--color-text-muted)]">Chưa có từ khóa nào được thiết lập.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Live Stats */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">
                      Tổng số câu:
                    </span>
                    <p className="font-bold text-[var(--color-text-primary)] font-mono text-sm mt-0.5">
                      {translation?.segments?.length || 0} câu
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">
                      Cặp ngôn ngữ:
                    </span>
                    <p className="font-bold text-[var(--color-text-primary)] font-mono text-sm mt-0.5 uppercase">
                      {translation?.source_language?.toUpperCase() || "AUTO"} → {selectedTargetLang.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleRetranslateClick}
                  disabled={isTranslating || isGlobalTaskRunning}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-2.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50 active:scale-98 shadow-xs cursor-pointer"
                >
                  {isTranslating ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  <span>
                    {isTranslating
                      ? taskProgress > 0
                        ? `Đang dịch AI (${taskProgress}%)...`
                        : t("pipeline:steps.translation.translating", "Đang dịch AI...")
                      : isGlobalTaskRunning
                      ? "Tác vụ ngầm đang chạy (Đã khóa)"
                      : translation?.segments?.length
                      ? t("pipeline:steps.translation.retranslate", { lang: selectedTargetLang.toUpperCase() })
                      : t("pipeline:steps.translation.startTranslate", { lang: selectedTargetLang.toUpperCase() })}
                  </span>
                </button>

                {isTranslating && (
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[var(--color-primary)] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, taskProgress))}%` }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => dispatch({ type: "SET_STEP", payload: 4 })}
                  disabled={!translation || !translation.segments || translation.segments.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(24,195,170,0.25)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 cursor-pointer"
                >
                  <span>{t("pipeline:steps.translation.continueSubtitle", "Tiếp tục: Phụ đề (Subtitle)")}</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] pt-1">
                <span className="flex items-center gap-1">
                  <Check size={12} className="text-emerald-400" />
                  <span>{t("pipeline:steps.translation.permanentStorage", "Lưu trữ vĩnh viễn")}</span>
                </span>
                <span className="font-semibold text-emerald-400">{t("pipeline:steps.translation.synced", "Đã đồng bộ")}</span>
              </div>
            </div>
          )
        }
      >
        {/* CENTER WORKSPACE: DEDICATED MEDIA STUDIO (NO SCROLL DOWN REQUIRED) */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[#101920] p-4 sm:p-6 shadow-[var(--shadow-card)] flex flex-col justify-center">
          {/* Video Player */}
          <div className="relative flex min-h-[300px] sm:min-h-[400px] max-h-[580px] w-full items-center justify-center overflow-hidden rounded-xl bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                onPlay={() => {
                  setIsPlaying(true);
                  setIsPanelOpen(true);
                  setActiveRightTab("translation");
                }}
                onPause={() => setIsPlaying(false)}
                className="max-h-[580px] w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-zinc-400 text-xs">
                <FileVideo size={36} />
                <span>Đang tải video xem trước...</span>
              </div>
            )}
          </div>

          {/* Video Player Footer Bar */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate max-w-md flex items-center gap-2">
                <span>{state.video?.filename || "Video"}</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded bg-zinc-800/80">
                  {isPlaying ? <Pause size={10} className="text-emerald-400" /> : <Play size={10} />}
                  {isPlaying
                    ? t("pipeline:steps.translation.playing", "Đang phát")
                    : t("pipeline:steps.translation.paused", "Tạm dừng")}
                </span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                {translation?.segments?.length || 0} câu thoại • {translation?.source_language?.toUpperCase() || "AUTO"} → {selectedTargetLang.toUpperCase()}
              </p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${
                translation?.segments?.length ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {translation?.segments?.length
                ? t("pipeline:steps.translation.translatedBadge", "✓ Đã dịch thuật")
                : t("pipeline:steps.translation.notTranslatedBadge", "Chưa có bản dịch")}
            </span>
          </div>
        </div>
      </PipelineStepLayout>

      {/* Confirmation Dialog on Retranslate Overwrite (UX-10) */}
      <ConfirmationDialog
        isOpen={isRetranslateConfirmOpen}
        onClose={() => setIsRetranslateConfirmOpen(false)}
        onConfirm={() => {
          setIsRetranslateConfirmOpen(false);
          generateTranslation();
        }}
        title={t("pipeline:steps.translation.retranslateTitle", "Dịch lại bằng AI?")}
        message={t("pipeline:steps.translation.retranslateMessage", "Thao tác này sẽ dịch lại toàn bộ lời thoại và ghi đè những chỉnh sửa của bạn đối với các câu đã có. Bạn có chắc chắn muốn tiếp tục?")}
        confirmLabel={t("pipeline:steps.translation.retranslateConfirm", "Dịch lại ngay")}
        isDestructive
      />
    </>
  );
}