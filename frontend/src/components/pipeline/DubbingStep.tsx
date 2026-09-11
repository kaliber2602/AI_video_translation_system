// DubbingStep.tsx
import { useState, useEffect, useRef } from "react";
import { 
  Volume2, 
  Play, 
  Pause, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileVideo,
  Music,
  Mic,
  Sparkles,
  User,
  Gauge,
  Waves,
  Captions
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function DubbingStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [isGeneratingDub, setIsGeneratingDub] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // TTS State
  const [ttsStatus, setTtsStatus] = useState<string | null>(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<number>(1);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [ttsStyle, setTtsStyle] = useState("neutral");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  
  // Speaker Clone Voice Sample State
  const activeSpeakerAudio = useRef<HTMLAudioElement | null>(null);
  const [speakerAudioUrl, setSpeakerAudioUrl] = useState<string | null>(null);
  const [isPlayingSpeaker, setIsPlayingSpeaker] = useState(false);
  const [isLoadingSpeakerAudio, setIsLoadingSpeakerAudio] = useState(false);
  
  // Dubbing State
  const [dubbingStatus, setDubbingStatus] = useState<string | null>(null);
  const [dubbingError, setDubbingError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("vi");
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dubbedVideo, setDubbedVideo] = useState<any>(null);
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [hasSubtitles, setHasSubtitles] = useState(false);

  // Audio player for preview
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    loadDubbingStatus();
    checkSubtitles();
  }, [state.video?.videoId, selectedLanguage]);

  const checkSubtitles = async () => {
    if (!state.video?.videoId) return;
    try {
      const data = await videoService.getSubtitles(state.video.videoId, selectedLanguage, "srt");
      if (data && (data.content || data.path)) {
        setHasSubtitles(true);
      } else {
        setHasSubtitles(false);
      }
    } catch {
      setHasSubtitles(false);
    }
  };

  useEffect(() => {
    loadSpeakers();
  }, [state.video?.videoId]);

  useEffect(() => {
    // Update language when context changes
    if (state.targetLanguage) {
      setSelectedLanguage(state.targetLanguage);
    }
  }, [state.targetLanguage]);

  useEffect(() => {
    return () => {
      if (activeSpeakerAudio.current) {
        activeSpeakerAudio.current.pause();
        activeSpeakerAudio.current = null;
      }
      if (ttsAudioUrl && ttsAudioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(ttsAudioUrl);
      }
      if (videoUrl && videoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrl);
      }
      if (speakerAudioUrl && speakerAudioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(speakerAudioUrl);
      }
    };
  }, [ttsAudioUrl, videoUrl, speakerAudioUrl]);

  const playSpeakerSample = async (speakerId: number) => {
    if (!state.video?.videoId) return;
    
    // If already playing, toggle pause
    if (activeSpeakerAudio.current && !activeSpeakerAudio.current.paused) {
      activeSpeakerAudio.current.pause();
      setIsPlayingSpeaker(false);
      return;
    }

    if (activeSpeakerAudio.current && speakerAudioUrl) {
      try {
        await activeSpeakerAudio.current.play();
        setIsPlayingSpeaker(true);
        return;
      } catch (e) {
        console.warn("Retrying speaker audio playback...", e);
      }
    }

    setIsLoadingSpeakerAudio(true);
    try {
      const blob = await videoService.getSpeakerSampleBlob(state.video.videoId, speakerId);
      const url = URL.createObjectURL(blob);
      setSpeakerAudioUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });

      const audio = new Audio(url);
      activeSpeakerAudio.current = audio;

      audio.onplay = () => setIsPlayingSpeaker(true);
      audio.onpause = () => setIsPlayingSpeaker(false);
      audio.onended = () => {
        setIsPlayingSpeaker(false);
        activeSpeakerAudio.current = null;
      };
      audio.onerror = (e) => {
        console.warn("Speaker audio playback event error:", e);
        setIsPlayingSpeaker(false);
      };

      try {
        await audio.play();
        setIsPlayingSpeaker(true);
      } catch (playErr) {
        console.warn("Autoplay or audio play interrupted:", playErr);
        setIsPlayingSpeaker(false);
      }
    } catch (err: any) {
      console.warn("Could not load original voice sample for this speaker:", err);
      setIsPlayingSpeaker(false);
    } finally {
      setIsLoadingSpeakerAudio(false);
    }
  };

  const handleSpeakerChange = (id: number) => {
    setSelectedSpeaker(id);
    if (activeSpeakerAudio.current) {
      activeSpeakerAudio.current.pause();
      activeSpeakerAudio.current = null;
    }
    if (speakerAudioUrl && speakerAudioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(speakerAudioUrl);
      setSpeakerAudioUrl(null);
    }
    setIsPlayingSpeaker(false);
  };

  const loadDubbingStatus = async () => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setDubbingError(null);

    try {
      // Check TTS status and load audio blob for preview
      try {
        const ttsData = await videoService.getTTS(state.video.videoId, selectedLanguage);
        if (ttsData && (ttsData.status === "available" || ttsData.status === "completed")) {
          setTtsStatus("completed");
          try {
            const blob = await videoService.getTTSBlob(state.video.videoId, selectedLanguage);
            const blobUrl = URL.createObjectURL(blob);
            setTtsAudioUrl((prev) => {
              if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
              return blobUrl;
            });
          } catch (audioErr) {
            console.error("Failed to load TTS preview blob:", audioErr);
          }
        } else {
          setTtsStatus("not_generated");
          setTtsAudioUrl((prev) => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return null;
          });
        }
      } catch (error) {
        setTtsStatus("not_generated");
        setTtsAudioUrl((prev) => {
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return null;
        });
      }

      // Check dubbing status
      try {
        const status = await videoService.getDubbingStatus(state.video.videoId);
        setDubbingStatus(status.status);
        
        if (status.status === "completed" && status.output_path) {
          setDubbedVideo(status);
          try {
            const previewUrl = await videoService.getDubbedVideoPreview(
              state.video.videoId,
              selectedLanguage
            );
            setVideoUrl((prev) => {
              if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
              return previewUrl;
            });
            console.log("✅ Video preview URL loaded:", previewUrl);
          } catch (error) {
            console.error("Failed to get preview URL:", error);
          }
        }
      } catch (error: any) {
        if (error.message?.includes("404")) {
          setDubbingStatus("not_started");
        } else {
          setDubbingError(error.message || "Failed to load dubbing status");
        }
      }
    } catch (error: any) {
      console.error("Failed to load status:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const loadSpeakers = async () => {
    if (!state.video?.videoId) return;
    try {
      const data = await videoService.listVoices(state.video.videoId);
      if (data && data.speakers && data.speakers.length > 0) {
        setSpeakers(data.speakers);
        setSelectedSpeaker(data.speakers[0].id);
      }
    } catch (error) {
      console.error("Failed to load speakers:", error);
      // Fallback: create default speaker
      setSpeakers([
        { id: 1, label: "SPEAKER_01", language: "en", gender: "unknown" }
      ]);
    }
  };

  // ============================================================
  // TTS GENERATION
  // ============================================================

  const generateTTS = async () => {
    if (!state.video?.videoId) return;
    
    setIsGeneratingTTS(true);
    setDubbingError(null);
    setTtsStatus("processing");

    try {
      const result = await videoService.generateTTS(
        state.video.videoId,
        selectedLanguage,
        selectedSpeaker,
        ttsStyle,
        ttsSpeed
      );
      
      setTtsStatus("completed");
      try {
        const blob = await videoService.getTTSBlob(state.video.videoId, selectedLanguage);
        const blobUrl = URL.createObjectURL(blob);
        setTtsAudioUrl((prev) => {
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return blobUrl;
        });
      } catch (audioErr) {
        console.error("Failed to load TTS preview blob after generation:", audioErr);
      }
      
      // Update context
      dispatch({
        type: "SET_TTS",
        payload: result,
      });

      // Notify sidebar & settings to update credit balance
      window.dispatchEvent(new CustomEvent("subscription-updated"));
    } catch (error: any) {
      console.error("TTS generation failed:", error);
      setDubbingError(error.message || "Failed to generate TTS");
      setTtsStatus("failed");
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // ============================================================
  // DUBBING GENERATION
  // ============================================================

  const generateDubbedVideo = async () => {
    if (!state.video?.videoId) return;
    
    setIsGeneratingDub(true);
    setDubbingError(null);
    setDubbingStatus("processing");

    try {
      const result = await videoService.generateDubbedVideo(
        state.video.videoId,
        selectedLanguage,
        selectedFormat,
        selectedQuality,
        burnSubtitles
      );
      
      setDubbedVideo(result);
      setDubbingStatus("completed");
      
      try {
        const previewUrl = await videoService.getDubbedVideoPreview(
          state.video.videoId,
          selectedLanguage
        );
        setVideoUrl((prev) => {
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return previewUrl;
        });
      } catch (previewErr) {
        console.error("Failed to load dubbed video preview:", previewErr);
      }
      
      dispatch({
        type: "SET_DUBBED_VIDEO",
        payload: result,
      });

      // Notify sidebar & settings to update credit balance
      window.dispatchEvent(new CustomEvent("subscription-updated"));

      // Auto-advance to review step
      setTimeout(() => {
        dispatch({ type: "SET_STEP", payload: 6 });
      }, 1500);
      
    } catch (error: any) {
      console.error("Dubbing generation failed:", error);
      setDubbingError(error.message || "Failed to generate dubbed video");
      setDubbingStatus("failed");
    } finally {
      setIsGeneratingDub(false);
    }
  };

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleDownload = async () => {
      if (!state.video?.videoId || !dubbedVideo) return;
      
      try {
          const response = await videoService.downloadDubbedVideo(
              state.video.videoId,
              selectedLanguage,
              selectedFormat
          );
          
          if (response instanceof Blob) {
              const url = URL.createObjectURL(response);
              const a = document.createElement("a");
              a.href = url;
              a.download = `dubbed_${selectedLanguage}_${selectedQuality}.${selectedFormat}`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              return;
          }
      } catch (error: any) {
          console.error("Download failed:", error);
          setDubbingError(error.message || "Failed to download dubbed video");
      }
  };

  const togglePlay = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (err) {
        console.error("Audio playback error:", err);
        setIsPlaying(false);
      }
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoaded = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Loading dubbing status...</span>
      </div>
    );
  }

  const isTTSReady = ttsStatus === "completed" || ttsStatus === "available";
  const isDubReady = dubbingStatus === "completed";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "05", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          Voice Generation & Dubbing
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          Generate AI voice from translated text, preview it, then create the complete dubbed video.
        </p>
      </div>

      {dubbingError && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-500">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Error</p>
              <p className="mt-1 text-xs opacity-80">{dubbingError}</p>
              <button
                type="button"
                onClick={() => setDubbingError(null)}
                className="mt-2 text-xs underline hover:text-red-400 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 1: TTS GENERATION
          ============================================================ */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Volume2 size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Step 1: Generate AI Voice
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {isTTSReady ? "Voice generated ✓" : "Create voice from translated text"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generateTTS}
            disabled={isGeneratingTTS || ttsStatus === "processing"}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {isGeneratingTTS ? (
              <Loader2 size={17} className="animate-spin" />
            ) : isTTSReady ? (
              <CheckCircle2 size={17} />
            ) : (
              <Sparkles size={17} />
            )}
            {isGeneratingTTS 
              ? "Generating Voice..." 
              : isTTSReady 
                ? "Regenerate Voice" 
                : "Generate Voice"}
          </button>
        </div>

        {/* TTS Settings */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                <User size={14} className="inline mr-1" />
                Speaker
              </label>
              <button
                type="button"
                onClick={() => playSpeakerSample(selectedSpeaker)}
                disabled={isLoadingSpeakerAudio}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                title="Nghe mẫu giọng clone gốc"
              >
                {isLoadingSpeakerAudio ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : isPlayingSpeaker ? (
                  <>
                    <Pause size={12} />
                    Dừng mẫu
                  </>
                ) : (
                  <>
                    <Play size={12} />
                    Nghe giọng gốc
                  </>
                )}
              </button>
            </div>
            <select
              value={selectedSpeaker}
              onChange={(e) => handleSpeakerChange(Number(e.target.value))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            >
              {speakers.length > 0 ? (
                speakers.map((speaker) => (
                  <option key={speaker.id} value={speaker.id}>
                    {speaker.label} {speaker.gender ? `(${speaker.gender})` : ''}
                  </option>
                ))
              ) : (
                <option value={1}>SPEAKER_01</option>
              )}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              <Waves size={14} className="inline mr-1" />
              Style
            </label>
            <select
              value={ttsStyle}
              onChange={(e) => setTtsStyle(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            >
              <option value="neutral">Neutral</option>
              <option value="conversational">Conversational</option>
              <option value="professional">Professional</option>
              <option value="energetic">Energetic</option>
              <option value="calm">Calm</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              <Gauge size={14} className="inline mr-1" />
              Speed: {ttsSpeed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={ttsSpeed}
              onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            >
              <option value="vi">Vietnamese</option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
        </div>

        {/* TTS Status & Preview */}
        {ttsStatus && (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ttsStatus === "processing" && (
                  <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
                )}
                {ttsStatus === "completed" && (
                  <CheckCircle2 size={20} className="text-[var(--color-primary)]" />
                )}
                {ttsStatus === "failed" && (
                  <AlertCircle size={20} className="text-red-500" />
                )}
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  TTS: {ttsStatus === "not_generated" ? "Not Generated" : ttsStatus.charAt(0).toUpperCase() + ttsStatus.slice(1)}
                </span>
              </div>
            </div>

            {/* Audio Player */}
            {isTTSReady && ttsAudioUrl && (
              <div className="mt-4 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <audio
                  ref={audioRef}
                  src={ttsAudioUrl}
                  className="hidden"
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={handleAudioLoaded}
                  onEnded={handleAudioEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <div
                    className="flex-1 cursor-pointer py-1 group"
                    onClick={(e) => {
                      if (!audioRef.current || !audioDuration) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const pct = Math.max(0, Math.min(1, clickX / rect.width));
                      const newTime = pct * audioDuration;
                      audioRef.current.currentTime = newTime;
                      setCurrentTime(newTime);
                    }}
                  >
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)] group-hover:h-2.5 transition-all">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                        style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(audioDuration)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const downloadUrl = ttsAudioUrl || audioRef.current?.src;
                      if (downloadUrl) {
                        const a = document.createElement("a");
                        a.href = downloadUrl;
                        a.download = `tts_${selectedLanguage}.wav`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }}
                    className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <Download size={14} />
                    Download Audio
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          SECTION 2: DUBBING GENERATION
          ============================================================ */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <FileVideo size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Step 2: Create Dubbed Video
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {isDubReady ? "Dubbed video ready ✓" : "Mix voice with video"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generateDubbedVideo}
            disabled={!isTTSReady || isGeneratingDub || dubbingStatus === "processing"}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {isGeneratingDub ? (
              <Loader2 size={17} className="animate-spin" />
            ) : isDubReady ? (
              <CheckCircle2 size={17} />
            ) : (
              <FileVideo size={17} />
            )}
            {isGeneratingDub 
              ? "Generating..." 
              : isDubReady 
                ? "Regenerate" 
                : !isTTSReady 
                  ? "Generate Voice First" 
                  : "Generate Dubbed Video"}
          </button>
        </div>

        {/* Dubbing Settings */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              Video Format
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            >
              <option value="mp4">MP4</option>
              <option value="mov">MOV</option>
              <option value="avi">AVI</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              Quality
            </label>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            >
              <option value="360p">360p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4K">4K</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              Status
            </label>
            <div className="flex h-11 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm text-[var(--color-text-muted)]">
              {dubbingStatus === "completed" ? "✅ Ready" : 
               dubbingStatus === "processing" ? "⏳ Processing..." :
               dubbingStatus === "failed" ? "❌ Failed" :
               "⏸ Not started"}
            </div>
          </div>
        </div>

        {/* Subtitle Burn-in Option */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Captions size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Gắn phụ đề vào video (Burn-in Hardsub)
                </p>
                {hasSubtitles ? (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                    ✓ Đã có phụ đề Bước 4
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                    Chưa tạo phụ đề
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                In phụ đề trực tiếp vào hình ảnh video để hiển thị mượt mà trên mọi thiết bị và trình phát.
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center shrink-0">
            <input
              type="checkbox"
              checked={burnSubtitles}
              onChange={(e) => setBurnSubtitles(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-[var(--color-border)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--color-primary)] peer-checked:after:translate-x-full" />
            <span className="ml-3 text-xs font-semibold text-[var(--color-text-secondary)]">
              {burnSubtitles ? "Bật" : "Tắt"}
            </span>
          </label>
        </div>

        {/* Dubbing Status & Preview */}
        {dubbingStatus && dubbingStatus !== "not_started" && (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {dubbingStatus === "processing" && (
                  <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
                )}
                {dubbingStatus === "completed" && (
                  <CheckCircle2 size={20} className="text-[var(--color-primary)]" />
                )}
                {dubbingStatus === "failed" && (
                  <AlertCircle size={20} className="text-red-500" />
                )}
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  Dubbing: {dubbingStatus.charAt(0).toUpperCase() + dubbingStatus.slice(1)}
                </span>
              </div>
              {isDubReady && videoUrl && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <Download size={15} />
                    Download Video
                  </button>
                </div>
              )}
            </div>

            {/* Dubbed Video Preview Player */}
            {isDubReady && videoUrl && (
              <div className="mt-4 overflow-hidden rounded-xl bg-black border border-[var(--color-border)] shadow-md">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[440px] object-contain"
                  onError={(e) => console.error("Dubbed video preview player error:", e)}
                />
              </div>
            )}

            {dubbingStatus === "processing" && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                    style={{ width: "60%" }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Generating dubbed video... This may take a few minutes.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          INFO CARDS
          ============================================================ */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Music size={16} />
            <span className="text-xs font-medium">Background Music</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {dubbingStatus === "completed" ? "Mixed ✓" : "Preserved"}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Original BGM mixed with dubbed audio
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Mic size={16} />
            <span className="text-xs font-medium">Voice Cloning</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {isTTSReady ? "XTTS-v2 ✓" : "Not generated"}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Natural voice with speaker matching
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <FileVideo size={16} />
            <span className="text-xs font-medium">Output</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {isDubReady ? `${selectedQuality} · ${selectedFormat.toUpperCase()}` : "Pending"}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {isDubReady ? "Ready for download" : "Generate to continue"}
          </p>
        </div>
      </div>

      {/* ============================================================
          NEXT BUTTON
          ============================================================ */}
      {isDubReady && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_STEP", payload: 6 })}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)]"
          >
            Next: Review & Export →
          </button>
        </div>
      )}
    </div>
  );
}