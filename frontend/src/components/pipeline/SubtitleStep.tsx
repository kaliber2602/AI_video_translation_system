// SubtitleStep.tsx
import { useState, useEffect } from "react";
import { Captions, Check, Download, Loader2, Eye, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function SubtitleStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subtitles, setSubtitles] = useState<{
    language: string;
    format: string;
    content: string;
  } | null>(null);
  const [formats] = useState(["srt", "vtt", "ass"]);
  const [selectedFormat, setSelectedFormat] = useState("srt");
  const [fontSize, setFontSize] = useState("20");
  const [position, setPosition] = useState("bottom");
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

  useEffect(() => {
    loadSubtitles();
  }, [selectedFormat, state.video?.videoId, state.targetLanguage]);

  const loadSubtitles = async () => {
    if (!state.video?.videoId) return;
    setIsLoading(true);
    setSubtitleError(null);

    try {
      const targetLang = state.targetLanguage || "vi";
      const data = await videoService.getSubtitles(state.video.videoId, targetLang);
      setSubtitles(data);
    } catch (error) {
      // Subtitles not found, will show generate option
      setSubtitles(null);
    } finally {
      setIsLoading(false);
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
        parseInt(fontSize),
        position
      );
      setSubtitles(data);
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

  // Sample subtitle preview text
  const previewText =
    subtitles?.content?.split("\n").slice(0, 6).join("\n") ||
    "Xử lý ngôn ngữ tự nhiên là một lĩnh vực của trí tuệ nhân tạo.";

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Loading subtitles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "04", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.subtitle.pageTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.subtitle.pageDescription")}
        </p>
      </div>

      {subtitleError && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-500">
          <p className="text-sm font-medium">Error: {subtitleError}</p>
          <button
            type="button"
            onClick={() => setSubtitleError(null)}
            className="mt-2 text-xs underline hover:text-red-400 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Captions size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {subtitles ? "Subtitle Preview" : "Generate Subtitles"}
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {subtitles
                  ? `${subtitles.language.toUpperCase()} · ${subtitles.format.toUpperCase()}`
                  : "Choose format and generate"}
              </p>
            </div>
          </div>

          {subtitles && (
            <button
              type="button"
              onClick={downloadSubtitles}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <Download size={15} />
              Download {selectedFormat.toUpperCase()}
            </button>
          )}
        </div>

        <div className="mt-6">
          <div className="flex aspect-video items-end justify-center rounded-2xl bg-[#1B2932] p-8">
            <div className="max-w-2xl rounded-lg bg-black/70 px-5 py-3 text-center">
              <p className="text-base font-medium text-white">
                {previewText || "No subtitle content"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm text-[var(--color-text-secondary)]">
              Format
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
              >
                {formats.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label className="text-sm text-[var(--color-text-secondary)]">
              Font Size
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
              >
                <option value="16">Small</option>
                <option value="20">Medium</option>
                <option value="24">Large</option>
                <option value="28">Extra Large</option>
              </select>
            </label>
          </div>

          <div>
            <label className="text-sm text-[var(--color-text-secondary)]">
              Position
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
              >
                <option value="bottom">Bottom Center</option>
                <option value="top">Top Center</option>
                <option value="middle">Middle</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
            <Check size={17} />
            {subtitles ? "Subtitles ready" : "Settings ready to generate"}
          </div>

          {!subtitles ? (
            <button
              type="button"
              onClick={generateSubtitles}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Eye size={17} />
              )}
              {isGenerating ? "Generating..." : "Generate Subtitles"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_STEP", payload: 5 })}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)]"
            >
              Next: Dubbing →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}