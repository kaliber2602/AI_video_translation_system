// TranslationStep.tsx
import { useState, useEffect } from "react";
import { Languages, Save, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function TranslationStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    loadTranslation();
  }, []);

  const loadTranslation = async () => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const targetLang = state.targetLanguage || "vi";
      const data = await videoService.getTranslation(state.video.videoId, targetLang);
      setTranslation(data);
      dispatch({
        type: "SET_TRANSLATION",
        payload: data,
      });
    } catch (error) {
      // Translation not found
      setTranslation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTranslation = async () => {
    if (!state.video?.videoId) return;
    setIsTranslating(true);

    try {
      const targetLang = state.targetLanguage || "vi";
      const data = await videoService.startTranslation(state.video.videoId, targetLang);
      setTranslation(data);
      dispatch({
        type: "SET_TRANSLATION",
        payload: data,
      });
    } catch (error) {
      console.error("Translation generation failed:", error);
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

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Languages size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Translation Editor
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {translation?.source_language || "English"} →{" "}
                {translation?.target_language?.toUpperCase() || state.targetLanguage?.toUpperCase() || "VI"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generateTranslation}
            disabled={isTranslating}
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
          >
            {isTranslating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {isTranslating ? "Translating..." : translation ? "Re-translate" : "Generate Translation"}
          </button>
        </div>

        {!translation ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-4 py-8">
            <p className="text-sm text-[var(--color-text-muted)]">
              No translation found. Generate one to get started.
            </p>
            <button
              type="button"
              onClick={generateTranslation}
              disabled={isTranslating}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isTranslating ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Sparkles size={17} />
              )}
              {isTranslating ? "Translating..." : "Generate Translation"}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 max-h-[500px] space-y-5 overflow-y-auto pr-2">
              {translation.segments.map((seg, index) => (
                <div key={index} className="grid gap-4 xl:grid-cols-2">
                  <div>
                    <div className="mb-2 flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>{formatTime(seg.start)} → {formatTime(seg.end)}</span>
                    </div>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                        {seg.text}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Translation</span>
                    </div>
                    <textarea
                      defaultValue={seg.translated_text || seg.text}
                      className="min-h-[80px] w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] p-4 text-sm leading-6 text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
                      onBlur={(e) => handleUpdateSegment(index, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col justify-between gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="text-[var(--color-primary)]" />
                    Changes are automatically saved
                  </>
                )}
              </p>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {translation.segments.length} segments translated
                </span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SET_STEP", payload: 4 })}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)]"
                >
                  Next: Subtitles →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}