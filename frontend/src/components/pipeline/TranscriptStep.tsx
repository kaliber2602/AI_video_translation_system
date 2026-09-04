// TranscriptStep.tsx
import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText, Play, Loader2, Save, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function TranscriptStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transcript, setTranscript] = useState<{
    segments: Array<{ start: number; end: number; text: string; speaker: string }>;
    language: string;
  } | null>(null);
  const [editingSegment, setEditingSegment] = useState<number | null>(null);

  useEffect(() => {
    loadTranscript();
  }, []);

  const loadTranscript = async () => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const data = await videoService.getTranscript(state.video.videoId);
      // ✅ Make sure we have valid data
      if (data && data.segments && Array.isArray(data.segments)) {
        setTranscript(data);
        dispatch({
          type: "SET_TRANSCRIPT",
          payload: data,
        });
      } else {
        setTranscript(null);
      }
    } catch (error) {
      // Transcript not found - user needs to generate it
      console.log("No transcript found, ready to generate");
      setTranscript(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTranscript = async () => {
    if (!state.video?.videoId) return;
    setIsGenerating(true);

    try {
      const data = await videoService.startTranscription(state.video.videoId);
      
      // ✅ Make sure we have valid data
      if (data && data.segments && Array.isArray(data.segments)) {
        setTranscript(data);
        dispatch({
          type: "SET_TRANSCRIPT",
          payload: data,
        });
      } else {
        throw new Error("Invalid transcript data received");
      }
      
    } catch (error) {
      console.error("Transcription failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSegment = async (index: number, newText: string) => {
    if (!state.video?.videoId || !transcript) return;
    setIsSaving(true);

    try {
      await videoService.updateTranscript(state.video.videoId, {
        segment_id: index,
        text: newText,
      });

      const updatedSegments = [...transcript.segments];
      updatedSegments[index].text = newText;
      setTranscript({
        ...transcript,
        segments: updatedSegments,
      });
      setEditingSegment(null);
    } catch (error) {
      console.error("Failed to update segment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportTranscript = async () => {
    if (!state.video?.videoId) return;
    try {
      const blob = await videoService.exportTranscript(state.video.videoId, "txt");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transcript_${state.video.videoId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export transcript:", error);
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
        <span className="ml-3 text-[var(--color-text-muted)]">Loading transcript...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "02", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.transcript.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.transcript.description")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[#17232D] p-5">
          <div className="relative flex aspect-video items-center justify-center rounded-xl bg-[#293B46]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,90,95,0.4),transparent_65%)]" />
            <button
              type="button"
              aria-label="Play video"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-xl transition hover:scale-110"
            >
              <Play size={22} fill="currentColor" />
            </button>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-white">
              {state.video?.filename || "Video"}
            </p>
            <p className="mt-1 text-xs text-[#9CAEB4]">
              {transcript?.segments?.length || 0} segments · {transcript?.language || "Not generated"}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-xs font-medium ${transcript ? 'text-[var(--color-primary)]' : 'text-[#9CAEB4]'}`}>
                {transcript ? "✅ Ready" : "⏳ Not generated"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <FileText size={19} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">Transcript</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {transcript?.language || "Not generated"} · {transcript?.segments?.length || 0} segments
                </p>
              </div>
            </div>
            {transcript && transcript.segments && transcript.segments.length > 0 && (
              <button
                type="button"
                onClick={handleExportTranscript}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                <Download size={14} />
                {t("common:export")}
              </button>
            )}
          </div>

          {!transcript || !transcript.segments || transcript.segments.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-4 py-8">
              <p className="text-sm text-[var(--color-text-muted)]">
                No transcript found. Generate one to get started.
              </p>
              <button
                type="button"
                onClick={generateTranscript}
                disabled={isGenerating}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Sparkles size={17} />
                )}
                {isGenerating ? "Generating..." : "Generate Transcript"}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 max-h-[400px] space-y-4 overflow-y-auto pr-2">
                {transcript.segments.map((seg, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-4 transition hover:border-[var(--color-primary)]"
                  >
                    <div className="mb-2 flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>
                        {formatTime(seg.start)} → {formatTime(seg.end)}
                      </span>
                      <span className="font-medium text-[var(--color-primary)]">
                        {seg.speaker || "Speaker"}
                      </span>
                    </div>

                    {editingSegment === index ? (
                      <div>
                        <textarea
                          defaultValue={seg.text}
                          className="min-h-[80px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm leading-6 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditingSegment(null);
                          }}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              const textarea = document.querySelector(
                                `textarea[data-index="${index}"]`
                              ) as HTMLTextAreaElement;
                              if (textarea) handleUpdateSegment(index, textarea.value);
                            }}
                            disabled={isSaving}
                            className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
                          >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingSegment(null)}
                            className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="cursor-pointer text-sm leading-6 text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
                        onClick={() => setEditingSegment(index)}
                      >
                        {seg.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-5">
                <div className="flex items-center gap-2 text-xs text-[var(--color-primary)] font-medium">
                  <CheckCircle2 size={16} />
                  Transcript ready for translation
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SET_STEP", payload: 3 })}
                  className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)]"
                >
                  Next: Translation →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}