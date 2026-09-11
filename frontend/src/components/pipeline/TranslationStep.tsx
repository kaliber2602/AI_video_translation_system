// TranslationStep.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Languages,
  Sparkles,
  Loader2,
  CheckCircle2,
  Play,
  ArrowRight,
  Search,
  FileVideo,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function TranslationStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const segmentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const [translation, setTranslation] = useState<{
    source_language: string;
    target_language: string;
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

  useEffect(() => {
    if (state.targetLanguage && state.targetLanguage !== selectedTargetLang) {
      setSelectedTargetLang(state.targetLanguage);
    }
  }, [state.targetLanguage]);

  useEffect(() => {
    loadTranslation(selectedTargetLang);
    loadVideoPreview();
  }, [state.video?.videoId, selectedTargetLang]);

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
      dispatch({
        type: "SET_TRANSLATION",
        payload: data,
      });
    } catch (error) {
      // Translation not found - this is expected, set to null
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

  const generateTranslation = async () => {
    if (!state.video?.videoId) return;
    setIsTranslating(true);
    setTranslationError(null);

    try {
      const targetLang = selectedTargetLang || state.targetLanguage || "vi";
      const data = await videoService.startTranslation(state.video.videoId, targetLang);
      setTranslation(data);
      dispatch({
        type: "SET_TRANSLATION",
        payload: data,
      });

      // Notify sidebar & settings to update credit balance
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
        block: "nearest",
      });
    }
  }, [activeSegmentIndex]);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play().catch(() => {});
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Loading translation...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "03", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.translation.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.translation.description")}
        </p>
      </div>

      {translationError && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-500">
          <p className="text-sm font-medium">Error: {translationError}</p>
          <button
            type="button"
            onClick={() => setTranslationError(null)}
            className="mt-2 text-xs underline hover:text-red-400 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.38fr_0.62fr]">
        {/* Pinned Mini Video Player (Visual Context for Translators) */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[#101920] p-4 xl:sticky xl:top-6 h-fit shadow-[var(--shadow-card)]">
          <div className="relative flex max-h-[320px] min-h-[190px] w-full items-center justify-center overflow-hidden rounded-xl bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                className="max-h-[320px] w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-zinc-400 text-xs">
                <FileVideo size={32} />
                <span>Đang tải video xem trước ngữ cảnh...</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <div className="min-w-0">
              <p className="font-semibold text-white truncate max-w-[200px]">
                {state.video?.filename || "Video"}
              </p>
              <p className="mt-0.5 font-mono text-[var(--color-primary)]">
                {formatTime(currentTime)}
              </p>
            </div>
            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
              Ngữ cảnh trực quan
            </span>
          </div>
        </div>

        {/* Translation Editor Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] flex flex-col">
          <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Languages size={19} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Biên dịch Song ngữ
                </h3>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {translation?.source_language?.toUpperCase() || "EN"} →{" "}
                  {translation?.target_language?.toUpperCase() || selectedTargetLang.toUpperCase()} •{" "}
                  {filteredSegments.length} câu thoại
                  {isSaving && <span className="ml-2 text-amber-400 animate-pulse font-medium">• Đang lưu...</span>}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">
                  Ngôn ngữ đích:
                </label>
                <select
                  value={selectedTargetLang}
                  onChange={(e) => handleLanguageSelect(e.target.value)}
                  disabled={isTranslating}
                  className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-medium text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-50"
                >
                  {supportedTargetLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={generateTranslation}
                disabled={isTranslating}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50 active:scale-95"
              >
                {isTranslating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                {isTranslating ? "Đang dịch AI..." : translation ? "Dịch lại AI" : "Dịch tự động AI"}
              </button>
            </div>
          </div>

          {/* Search Filter for Long Transcript Lists */}
          {translation && translation.segments && translation.segments.length > 0 && (
            <div className="mt-4 relative">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm câu thoại hoặc bản dịch..."
                className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-9 pr-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
              />
            </div>
          )}

          {!translation ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-4 py-8">
              <p className="text-sm text-[var(--color-text-muted)]">
                Chưa có bản dịch cho ngôn ngữ {supportedTargetLanguages.find((l) => l.code === selectedTargetLang)?.label || selectedTargetLang.toUpperCase()}.
              </p>
              <button
                type="button"
                onClick={generateTranslation}
                disabled={isTranslating}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50 active:scale-95"
              >
                {isTranslating ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Sparkles size={17} />
                )}
                {isTranslating ? "Đang dịch..." : `Bắt đầu dịch (${selectedTargetLang.toUpperCase()})`}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 max-h-[500px] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
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
                        className={`rounded-xl border p-4 transition-all duration-200 ${
                          isActive
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 ring-2 ring-[var(--color-primary)]/30 shadow-sm"
                            : "border-[var(--color-border-muted)] bg-[var(--color-surface-muted)]"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                          <button
                            type="button"
                            onClick={() => handleSeek(seg.start)}
                            className={`flex items-center gap-1 font-mono transition ${
                              isActive
                                ? "text-[var(--color-primary)] font-bold"
                                : "hover:text-[var(--color-primary)]"
                            }`}
                            title="Tua video tới đoạn này"
                          >
                            <Play size={11} className={isActive ? "fill-current" : ""} />
                            <span>
                              {formatTime(seg.start)} → {formatTime(seg.end)}
                            </span>
                          </button>
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            #{originalIndex + 1}
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs leading-5 text-[var(--color-text-secondary)]">
                            <span className="block text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-1">
                              Gốc ({translation.source_language || "EN"}):
                            </span>
                            {seg.text}
                          </div>

                          <div>
                            <textarea
                              defaultValue={seg.translated_text || seg.text}
                              placeholder="Nhập bản dịch..."
                              className="min-h-[70px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-3 text-xs leading-5 text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                              onBlur={(e) => handleUpdateSegment(originalIndex, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                    Không tìm thấy câu nào phù hợp với từ khóa "{searchQuery}"
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Persistent Bottom Action Bar */}
      {translation && translation.segments && translation.segments.length > 0 && (
        <div className="sticky bottom-4 z-30 flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-[var(--color-text-primary)]">Bản dịch hoàn tất: </span>
              <span className="text-[var(--color-text-muted)]">{translation.segments.length} câu đã được dịch ({selectedTargetLang.toUpperCase()})</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => dispatch({ type: "SET_STEP", payload: 4 })}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[var(--color-primary)]/30 transition hover:bg-[var(--color-primary-hover)] active:scale-95"
          >
            <span>Tiếp tục: Tạo kiểu Phụ đề (Subtitle Studio)</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}