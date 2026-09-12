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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";
import PipelineStepLayout from "./PipelineStepLayout";
import ConfirmationDialog from "../common/ConfirmationDialog";

export default function TranslationStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
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
  const [translationModel, setTranslationModel] = useState("nllb_200_1.3b");

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
    { code: "gpt_4o", label: "OpenAI GPT-4o (Ngữ cảnh cao cấp)" },
  ];

  useEffect(() => {
    if (state.targetLanguage && state.targetLanguage !== selectedTargetLang) {
      setSelectedTargetLang(state.targetLanguage);
    }
  }, [state.targetLanguage]);

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

  const loadTranslation = async (lang?: string) => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setTranslationError(null);

    const targetLang = lang || selectedTargetLang || state.targetLanguage || "vi";

    try {
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

    try {
      const targetLang = selectedTargetLang || state.targetLanguage || "vi";
      const data = await videoService.startTranslation(
        state.video.videoId,
        targetLang,
        translationModel
      );
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
            translationPath: `outputs/transcript_${state.video.videoId}/translation_${targetLang}.json`,
            progress: Math.max(state.video.progress || 0, 60),
            currentStep: "translation",
          },
        });
      }

      window.dispatchEvent(new CustomEvent("subscription-updated"));
    } catch (error: any) {
      console.error("Translation generation failed:", error);
      setTranslationError(error.message || "Failed to generate translation");
    } finally {
      setIsTranslating(false);
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
                          {/* Header: Time + Segment Index */}
                          <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
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
                            <span
                              className={`font-mono text-[10px] ${
                                isActive ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-text-muted)]"
                              }`}
                            >
                              {isActive ? `▶ #${originalIndex + 1}` : `#${originalIndex + 1}`}
                            </span>
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
                  onChange={(e) => setTranslationModel(e.target.value)}
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
                  disabled={isTranslating}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-2.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50 active:scale-98 shadow-xs cursor-pointer"
                >
                  {isTranslating ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  <span>
                    {isTranslating
                      ? t("pipeline:steps.translation.translating", "Đang dịch AI...")
                      : translation?.segments?.length
                      ? t("pipeline:steps.translation.retranslate", { lang: selectedTargetLang.toUpperCase() })
                      : t("pipeline:steps.translation.startTranslate", { lang: selectedTargetLang.toUpperCase() })}
                  </span>
                </button>

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