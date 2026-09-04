// DubbingStep.tsx
import { useState, useEffect } from "react";
import { Mic2, Play, Volume2, Loader2, CheckCircle2, SpeakerIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function DubbingStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [voices, setVoices] = useState<Array<{ id: number; label: string; language: string }>>([]);
  const [selectedVoice, setSelectedVoice] = useState<number | null>(null);
  const [speakingStyle, setSpeakingStyle] = useState("neutral");
  const [speakingSpeed, setSpeakingSpeed] = useState(1.0);
  const [ttsPreview, setTtsPreview] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    if (!state.video?.videoId) return;
    setIsLoading(true);

    try {
      const data = await videoService.listVoices(state.video.videoId);
      setVoices(data.speakers);
      if (data.speakers.length > 0) {
        setSelectedVoice(data.speakers[0].id);
      }
    } catch (error) {
      console.error("Failed to load voices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTTS = async () => {
    if (!state.video?.videoId || !selectedVoice) return;
    setIsGenerating(true);

    try {
      const targetLang = state.targetLanguage || "vi";
      const data = await videoService.generateTTS(
        state.video.videoId,
        targetLang,
        selectedVoice,
        speakingStyle,
        speakingSpeed
      );

      setTtsPreview(data.tts_path);
      dispatch({
        type: "SET_TTS",
        payload: data,
      });
    } catch (error) {
      console.error("TTS generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const playTTS = () => {
    if (!ttsPreview) return;
    const audio = new Audio(ttsPreview);
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.play();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Loading voices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "05", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.dubbing.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.dubbing.description")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Mic2 size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">Voice Settings</h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {state.targetLanguage?.toUpperCase() || "VI"} voice generation
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">
                Voice
              </label>
              <select
                value={selectedVoice || ""}
                onChange={(e) => setSelectedVoice(parseInt(e.target.value))}
                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
              >
                {voices.length === 0 ? (
                  <option value="">No voices available</option>
                ) : (
                  voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.label} — {voice.language?.toUpperCase() || "Unknown"}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">
                Speaking Style
              </label>
              <select
                value={speakingStyle}
                onChange={(e) => setSpeakingStyle(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
              >
                <option value="neutral">Natural</option>
                <option value="professional">Professional</option>
                <option value="energetic">Energetic</option>
                <option value="calm">Calm</option>
                <option value="sad">Sad</option>
                <option value="angry">Angry</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">
                Speaking Speed: {speakingSpeed}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speakingSpeed}
                onChange={(e) => setSpeakingSpeed(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>

            <button
              type="button"
              onClick={generateTTS}
              disabled={isGenerating || !selectedVoice}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Volume2 size={17} />
              )}
              {isGenerating ? "Generating..." : "Generate Voice"}
            </button>

            {ttsPreview && (
              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-primary)] font-medium">
                <CheckCircle2 size={16} />
                Voice generated successfully
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[#17232D] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9CAEB4]">
            Audio Preview
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            {ttsPreview ? (
              <>
                <div className="flex items-center gap-4 w-full">
                  <button
                    type="button"
                    onClick={playTTS}
                    aria-label="Play audio"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] transition hover:scale-105"
                  >
                    {isPlaying ? (
                      <div className="flex gap-0.5">
                        <div className="h-4 w-1 animate-pulse bg-white" />
                        <div className="h-3 w-1 animate-pulse delay-75 bg-white" />
                        <div className="h-5 w-1 animate-pulse delay-150 bg-white" />
                      </div>
                    ) : (
                      <Play size={19} fill="currentColor" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full w-[38%] rounded-full bg-[var(--color-primary)]" />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-[#9CAEB4]">
                      <span>00:04</span>
                      <span>{ttsPreview.split("/").pop()}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SET_STEP", payload: 6 })}
                  className="mt-4 w-full rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
                >
                  Next: Review & Export →
                </button>
              </>
            ) : (
              <p className="text-center text-sm text-[#9CAEB4]">
                Generate voice to preview audio
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}