import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Download, 
  Loader2, 
  Mic, 
  Sparkles 
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { usePipeline } from "../../../hooks/usePipeline";
import { useHybridProgress } from "../../../hooks/useHybridProgress";
import { videoService } from "../../../services/video.service";
import PipelineStepLayout from "../PipelineStepLayout";
import { toast } from "../../../lib/toast";
import type { SubtitleSegment } from "../../../types/video";
import NleTimelineEditor from "../../editor/NleTimelineEditor";
import DubbingToolsPanel from "./DubbingToolsPanel";
import DubbingSegmentList from "./DubbingSegmentList";
import DubbingPlayer from "./DubbingPlayer";

export default function DubbingStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [isGeneratingDub, setIsGeneratingDub] = useState(false);
  const isGlobalTaskRunning = Boolean(
    state.stepsSummary?.active_task &&
      (state.stepsSummary.active_task.status === "processing" ||
        state.stepsSummary.active_task.status === "queued") &&
      !isGeneratingTTS &&
      !isGeneratingDub
  );
  
  // TTS State
  const [ttsStatus, setTtsStatus] = useState<string | null>(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsEngine, setTtsEngine] = useState<string>(
    state.pipelineConfig?.tts_dubbing?.engine || "coqui_xtts_v2"
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    (state.pipelineConfig?.tts_dubbing as any)?.voice_id || "21m00Tcm4TlvDq8ikWAM"
  );
  const selectedSpeaker = 1;
  const [ttsStyle] = useState("neutral");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);

  // 3-Track Virtual Mixer State
  const [vocalVolume, setVocalVolume] = useState<number>(
    state.pipelineConfig?.audio_separation?.vocal_volume ?? 100
  );
  const [bgmVolume, setBgmVolume] = useState<number>(
    Math.round((state.pipelineConfig?.audio_separation?.bgm_volume ?? 0.7) * 100)
  );
  const [dubVolume, setDubVolume] = useState<number>(100);
  const [isVocalMuted, setIsVocalMuted] = useState(false);
  const [isBgmMuted, setIsBgmMuted] = useState(false);
  const [isDubMuted, setIsDubMuted] = useState(false);
  const [regeneratingSegmentIdx, setRegeneratingSegmentIdx] = useState<number | null>(null);
  
  // Speaker Clone Voice Sample State
  const activeSpeakerAudio = useRef<HTMLAudioElement | null>(null);

  // Background Task & Polling States
  const [ttsProgress, setTtsProgress] = useState<number>(0);
  const [ttsMessage, setTtsMessage] = useState<string>("");
  const [dubProgress, setDubProgress] = useState<number>(0);
  const [dubMessage, setDubMessage] = useState<string>("");
  const ttsPollingTimerRef = useRef<any>(null);
  const dubPollingTimerRef = useRef<any>(null);

  // Hybrid Real-time Progress (Mechanism 1: WebSocket with Mechanism 3: REST fallback)
  const ttsHybrid = useHybridProgress(state.video?.videoId, "tts", async () => {
    if (state.video?.videoId) {
      stopTtsPolling();
      setTtsStatus("completed");
      setIsGeneratingTTS(false);
      setTtsProgress(100);
      try {
        const blob = await videoService.getTTSBlob(state.video.videoId, selectedLanguage);
        const url = URL.createObjectURL(blob);
        setTtsAudioUrl((prev) => {
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (err) {
        console.warn("Auto-reload TTS on WS completion:", err);
      }
      loadDubbingStatus();
      window.dispatchEvent(new CustomEvent("subscription-updated"));
    }
  });

  const dubHybrid = useHybridProgress(state.video?.videoId, "dub", async () => {
    if (state.video?.videoId) {
      stopDubPolling();
      setIsGeneratingDub(false);
      setDubProgress(100);
      setDubbingStatus("completed");
      try {
        const status = await videoService.getDubbingStatus(state.video.videoId);
        setDubbedVideo(status);
        const previewUrl = await videoService.getDubbedVideoPreview(state.video.videoId, selectedLanguage);
        if (previewUrl) {
          setVideoUrl((prev) => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return previewUrl;
          });
          setIsDubbed(true);
        }
      } catch (e) {
        console.warn("Failed to load dubbed preview after hybrid completion:", e);
      }
      loadDubbingStatus();
      window.dispatchEvent(new CustomEvent("subscription-updated"));
    }
  });

  useEffect(() => {
    if (isGeneratingTTS || (ttsHybrid.progress > 0 && ttsHybrid.progress < 100)) {
      if (ttsHybrid.progress > 0) setTtsProgress(ttsHybrid.progress);
      if (ttsHybrid.message) setTtsMessage(ttsHybrid.message);
      if (ttsHybrid.status === "failed") {
        setIsGeneratingTTS(false);
        setDubbingError(ttsHybrid.message || "Tạo giọng nói thất bại");
      }
    }
  }, [ttsHybrid.progress, ttsHybrid.message, ttsHybrid.status, isGeneratingTTS]);

  useEffect(() => {
    if (isGeneratingDub || (dubHybrid.progress > 0 && dubHybrid.progress < 100)) {
      if (dubHybrid.progress > 0) setDubProgress(dubHybrid.progress);
      if (dubHybrid.message) setDubMessage(dubHybrid.message);
      if (dubHybrid.status === "failed") {
        setIsGeneratingDub(false);
        setDubbingError(dubHybrid.message || "Render video thất bại");
      }
    }
  }, [dubHybrid.progress, dubHybrid.message, dubHybrid.status, isGeneratingDub]);

  const stopTtsPolling = () => {
    if (ttsPollingTimerRef.current) {
      clearInterval(ttsPollingTimerRef.current);
      ttsPollingTimerRef.current = null;
    }
  };

  const stopDubPolling = () => {
    if (dubPollingTimerRef.current) {
      clearInterval(dubPollingTimerRef.current);
      dubPollingTimerRef.current = null;
    }
  };
  
  // Right sidebar tab state: Merge TTS and Render into a single unified menu
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<"dubbing" | "mvoice">("dubbing");

  // mVoice Studio & Segment Audio States
  const [segmentSearch, setSegmentSearch] = useState<string>("");
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);
  const [playingSegmentAudioIdx, setPlayingSegmentAudioIdx] = useState<number | null>(null);
  const segmentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [segmentOverrides, setSegmentOverrides] = useState<
    Record<number, { speed?: number; gain?: number; speaker?: string; slip?: number }>
  >({});

  // Video & Dubbing State
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDubbed, setIsDubbed] = useState(false);
  const [dubbingStatus, setDubbingStatus] = useState<string | null>(null);
  const [dubbingError, setDubbingError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    () => state.targetLanguage || (state.video as any)?.targetLanguage || (state.video as any)?.target_language || "vi"
  );
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [dubbedVideo, setDubbedVideo] = useState<any>(null);
  const [burnSubtitles, setBurnSubtitles] = useState(() => {
    return state.pipelineConfig?.subtitles?.enabled !== false;
  });

  // Subtitle styling & segments inherited from Step 4 (Subtitle Studio)
  const [segments, setSegments] = useState<SubtitleSegment[]>(() => {
    if (state.subtitles?.segments && Array.isArray(state.subtitles.segments)) {
      return state.subtitles.segments;
    }
    if (state.translation?.segments && Array.isArray(state.translation.segments)) {
      return state.translation.segments;
    }
    return [];
  });
  const [aspectRatio, setAspectRatio] = useState<string>(
    () => state.subtitles?.aspect_ratio || state.subtitles?.config?.aspect_ratio || "16:9"
  );
  const [fontName, setFontName] = useState<string>(
    () => state.subtitles?.font_name || state.subtitles?.config?.font_name || "Montserrat"
  );
  const [fontSize, setFontSize] = useState<string>(
    () => String(state.subtitles?.font_size || state.subtitles?.config?.font_size || "22")
  );
  const [primaryColor, setPrimaryColor] = useState<string>(
    () => state.subtitles?.primary_color || state.subtitles?.config?.primary_color || "#FFFFFF"
  );
  const [outlineColor, setOutlineColor] = useState<string>(
    () => state.subtitles?.outline_color || state.subtitles?.config?.outline_color || "#000000"
  );
  const [positionY, setPositionY] = useState<number>(
    () => state.subtitles?.position_y ?? state.subtitles?.config?.position_y ?? 84
  );
  const [alignment, setAlignment] = useState<string>(
    () => state.subtitles?.alignment || state.subtitles?.config?.alignment || "center"
  );
  const [lineSpacing, setLineSpacing] = useState<number>(
    () => state.subtitles?.line_spacing ?? state.subtitles?.config?.line_spacing ?? 1.2
  );
  const [effect, setEffect] = useState<string>(
    () => state.subtitles?.effect || state.subtitles?.config?.effect || "pop"
  );
  const [showSubtitleOverlay, setShowSubtitleOverlay] = useState<boolean>(true);

  // Video Studio Playback & Transport State
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // TTS Waveform audio player state
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlayingTTSOnly, setIsPlayingTTSOnly] = useState(false);

  const loadDubbingStatus = async () => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    const vidId = state.video.videoId;
    setIsLoading(true);
    setDubbingError(null);

    try {
      let summaryData: any = null;
      try {
        summaryData = await videoService.getStepsSummary(vidId);
        const dubStep = summaryData?.steps?.dubbing;
        const exportStep = summaryData?.steps?.export;
        const activeTask = summaryData?.active_task;

        if (
          dubStep?.status === "processing" ||
          ((activeTask?.current_step === "tts" || activeTask?.current_step === "dubbing") &&
            (activeTask?.status === "processing" || activeTask?.status === "queued"))
        ) {
          setIsGeneratingTTS(true);
          setTtsStatus("processing");
          if (typeof activeTask?.progress === "number") {
            setTtsProgress(activeTask.progress);
          }
          pollTTSStatus(vidId, selectedLanguage);
        }

        if (
          exportStep?.status === "processing" ||
          ((activeTask?.current_step === "dub" || activeTask?.current_step === "export") &&
            (activeTask?.status === "processing" || activeTask?.status === "queued"))
        ) {
          setIsGeneratingDub(true);
          setDubbingStatus("processing");
          if (typeof activeTask?.progress === "number") {
            setDubProgress(activeTask.progress);
          }
          pollDubbingStatus(vidId, selectedLanguage);
        }
      } catch (sumErr) {
        console.warn("Could not check steps summary on mount in DubbingStep:", sumErr);
      }

      // 1. Fetch Subtitle Segments & Config from Step 4 (Subtitle Studio)
      const transStatus = summaryData?.steps?.translation?.status;
      const subStatus = summaryData?.steps?.subtitle?.status;
      const hasSubOrTrans =
        transStatus === "completed" ||
        subStatus === "completed" ||
        Boolean(state.video?.hasTranslation) ||
        Boolean(state.video?.subtitlePath);

      if (hasSubOrTrans) {
        try {
          const subData = await videoService.getSubtitleSegments(vidId, selectedLanguage);
          if (subData && subData.segments && Array.isArray(subData.segments) && subData.segments.length > 0) {
            setSegments(subData.segments);
          }
          const cfg = subData?.config || state.subtitles?.config || (state.video as any)?.snapshot_data?.subtitle_config;
          if (cfg) {
            const aRatio = cfg.aspect_ratio || cfg.aspectRatio;
            if (aRatio) setAspectRatio(aRatio);
            const fName = cfg.font_name || cfg.fontName;
            if (fName) setFontName(fName);
            const fSize = cfg.font_size || cfg.fontSize;
            if (fSize) setFontSize(String(fSize));
            const pColor = cfg.primary_color || cfg.primaryColor;
            if (pColor) setPrimaryColor(pColor);
            const oColor = cfg.outline_color || cfg.outlineColor;
            if (oColor) setOutlineColor(oColor);
            const posY = cfg.position_y ?? cfg.positionY;
            if (typeof posY === "number") setPositionY(posY);
            const algn = cfg.alignment;
            if (algn) setAlignment(algn);
            const lSpacing = cfg.line_spacing ?? cfg.lineSpacing;
            if (typeof lSpacing === "number") setLineSpacing(lSpacing);
            const eff = cfg.effect;
            if (eff) setEffect(eff);
          }
        } catch (subErr) {
          console.warn("Could not load subtitle config/segments:", subErr);
        }
      }

      // 2. Fetch TTS audio data (only if dubbing step is completed/has audio or on disk)
      const dubStep = summaryData?.steps?.dubbing;
      const targetLangToFetch =
        selectedLanguage ||
        summaryData?.steps?.translation?.target_language ||
        state.targetLanguage ||
        (state.video as any)?.target_language ||
        "vi";

      const hasTTSAudio =
        dubStep?.status === "completed" ||
        Boolean(dubStep?.dubbed_audio_path) ||
        Boolean(state.video?.dubbedAudioPath);

      if (hasTTSAudio) {
        try {
          const ttsData = await videoService.getTTS(vidId, targetLangToFetch);
          if (ttsData && (ttsData.status === "available" || ttsData.status === "completed")) {
            setTtsStatus("completed");
            try {
              const blob = await videoService.getTTSBlob(vidId, targetLangToFetch);
              const blobUrl = URL.createObjectURL(blob);
              setTtsAudioUrl((prev) => {
                if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
                return blobUrl;
              });
            } catch (audioErr) {
              console.error("Failed to load TTS blob:", audioErr);
            }
          } else {
            setTtsStatus("not_generated");
          }
        } catch (error) {
          setTtsStatus("not_generated");
        }
      } else {
        // Kiểm tra trực tiếp xem có file TTS trên server không kể cả khi dubStep chưa cập nhật kịp
        try {
          const ttsData = await videoService.getTTS(vidId, targetLangToFetch);
          if (ttsData && (ttsData.status === "available" || ttsData.status === "completed")) {
            setTtsStatus("completed");
            const blob = await videoService.getTTSBlob(vidId, targetLangToFetch);
            const blobUrl = URL.createObjectURL(blob);
            setTtsAudioUrl((prev) => {
              if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
              return blobUrl;
            });
          } else {
            setTtsStatus("not_generated");
          }
        } catch {
          setTtsStatus("not_generated");
        }
      }

      // 3. Load Dubbed video if completed, otherwise load Step 4 original video
      let dubbedLoaded = false;
      const exportStep = summaryData?.steps?.export;
      const hasDubbedVideo =
        exportStep?.status === "completed" ||
        Boolean(exportStep?.output_path) ||
        Boolean(state.video?.outputPath);

      if (hasDubbedVideo) {
        try {
          const status = await videoService.getDubbingStatus(vidId);
          setDubbingStatus(status.status);
          
          const isActuallyCompleted =
            (status.status === "completed" || Boolean(status.output_path)) &&
            Boolean(status.output_path);

          if (isActuallyCompleted) {
            setDubbedVideo(status);
            try {
              const previewUrl = await videoService.getDubbedVideoPreview(
                vidId,
                selectedLanguage
              );
              if (previewUrl) {
                setVideoUrl((prev) => {
                  if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
                  return previewUrl;
                });
                setIsDubbed(true);
                dubbedLoaded = true;
              }
            } catch (error) {
              console.error("Failed to get dubbed preview URL:", error);
            }
          }
        } catch (error: any) {
          if (error.message?.includes("404")) {
            setDubbingStatus("not_started");
          } else {
            setDubbingError(error.message || "Failed to load dubbing status");
          }
        }
      } else {
        setDubbingStatus("not_started");
      }

      // 4. If not dubbed yet, simply play the Step 4 video (original voice + subtitles)
      if (!dubbedLoaded) {
        setIsDubbed(false);
        const streamUrl = videoService.getVideoStreamUrl(vidId, "original");
        setVideoUrl((prev) => {
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return streamUrl;
        });
      }
    } catch (error: any) {
      console.error("Failed to load status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDubbingStatus();
  }, [state.video?.videoId, selectedLanguage]);

  useEffect(() => {
    if (state.targetLanguage) {
      setSelectedLanguage(state.targetLanguage);
    }
  }, [state.targetLanguage]);

  useEffect(() => {
    if (state.presetConfig) {
      const cfg = state.presetConfig;
      const tts = cfg.config_data?.tts_dubbing || {};
      const sub = cfg.config_data?.subtitles || {};
      const exp = cfg.config_data?.export_muxing || {};

      if (tts.speed_rate !== undefined) {
        setTtsSpeed(tts.speed_rate);
      } else if (cfg.voice_speed !== undefined) {
        setTtsSpeed(cfg.voice_speed);
      }

      if (sub.burn_mode !== undefined) {
        setBurnSubtitles(sub.burn_mode === "hardcode" || sub.burn_mode === "hardsub");
      } else if (cfg.burn_subtitles !== undefined) {
        setBurnSubtitles(Boolean(cfg.burn_subtitles));
      }

      if (exp.container || cfg.video_format) {
        setSelectedFormat(exp.container || cfg.video_format);
      }
      if (exp.resolution || cfg.video_quality) {
        setSelectedQuality(exp.resolution || cfg.video_quality);
      }
    }
  }, [state.presetConfig]);

  // Two-way sync to Pipeline Context
  useEffect(() => {
    dispatch({
      type: "UPDATE_PIPELINE_CONFIG",
      payload: {
        tts_dubbing: {
          ...(state.pipelineConfig?.tts_dubbing || {}),
          engine: ttsEngine as any,
          voice_id: selectedVoiceId,
          speed_rate: ttsSpeed,
        },
      },
    });
  }, [ttsEngine, ttsSpeed, selectedVoiceId]);

  const handleRegenerateSegmentTTS = async (segmentIdx: number, text: string) => {
    if (!state.video?.videoId) return;
    try {
      setRegeneratingSegmentIdx(segmentIdx);
      await videoService.regenerateSegmentTTS(
        state.video.videoId,
        segmentIdx,
        {
          text,
          voice_id: `speaker_${selectedSpeaker}`,
          speed: ttsSpeed,
          engine: ttsEngine,
        }
      );
      toast.success(`Đã sinh lại giọng đọc cho câu #${segmentIdx + 1}!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Không thể sinh lại âm thanh câu này.");
    } finally {
      setRegeneratingSegmentIdx(null);
    }
  };

  const handlePlaySegmentChunk = (segmentIdx: number) => {
    if (!state.video?.videoId) return;
    const url = `${videoService.getSegmentAudioUrl(state.video.videoId, segmentIdx)}?t=${Date.now()}`;
    if (segmentAudioRef.current) {
      segmentAudioRef.current.src = url;
      segmentAudioRef.current.currentTime = 0;
      segmentAudioRef.current
        .play()
        .then(() => {
          setPlayingSegmentAudioIdx(segmentIdx);
        })
        .catch((e) => console.warn("Failed to play segment audio chunk:", e));
    }
  };

  const handleMicroResynthesize = async (segmentIdx: number) => {
    if (!state.video?.videoId || !segments[segmentIdx]) return;
    try {
      setRegeneratingSegmentIdx(segmentIdx);
      const seg = segments[segmentIdx];
      const override = segmentOverrides[segmentIdx] || {};
      const targetLang = selectedLanguage || "vi";
      const spk = override.speaker || seg.speaker || `speaker_${selectedSpeaker}`;

      const res = await videoService.resynthesizeSegment(state.video.videoId, segmentIdx, {
        text: seg.translated_text || seg.text,
        voice_id: spk,
        speed: override.speed ?? ttsSpeed,
        target_language: targetLang,
        speaker: spk,
      });

      toast.success(`⚡ Đã đọc lại câu #${segmentIdx + 1} (${res.elapsed_seconds || 0.37}s)!`);
      handlePlaySegmentChunk(segmentIdx);
    } catch (err: any) {
      console.error("Micro-resynthesize failed:", err);
      toast.error(err?.response?.data?.detail || "Không thể sinh lại giọng đọc câu này.");
    } finally {
      setRegeneratingSegmentIdx(null);
    }
  };

  const handleSegmentSlip = (segmentIdx: number, delta: number) => {
    setSegmentOverrides((prev) => {
      const cur = prev[segmentIdx]?.slip || 0;
      const nextSlip = Number(Math.max(-0.6, Math.min(0.6, cur + delta)).toFixed(2));
      return {
        ...prev,
        [segmentIdx]: {
          ...(prev[segmentIdx] || {}),
          slip: nextSlip,
        },
      };
    });
  };

  const handleUpdateSegmentText = (segmentIdx: number, newText: string) => {
    setSegments((prev) => {
      const next = [...prev];
      if (next[segmentIdx]) {
        next[segmentIdx] = {
          ...next[segmentIdx],
          translated_text: newText,
        };
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      stopTtsPolling();
      stopDubPolling();
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
    };
  }, [ttsAudioUrl, videoUrl]);

  // Sidebar Toggles
  const handleToggleDubbingTab = () => {
    if (isPanelOpen && activeRightTab === "dubbing") {
      setIsPanelOpen(false);
    } else {
      setActiveRightTab("dubbing");
      setIsPanelOpen(true);
    }
  };

  const handleToggleMVoiceTab = () => {
    if (isPanelOpen && activeRightTab === "mvoice") {
      setIsPanelOpen(false);
    } else {
      setActiveRightTab("mvoice");
      setIsPanelOpen(true);
    }
  };



  const pollTTSStatus = (vidId: number, lang: string) => {
    stopTtsPolling();

    const checkStatus = async () => {
      try {
        const summary = await videoService.getStepsSummary(vidId);
        const dubStep = summary?.steps?.dubbing;
        const activeTask = summary?.active_task;

        if (activeTask && (activeTask.current_step === "tts" || activeTask.current_step === "dubbing")) {
          if (typeof activeTask.progress === "number" && activeTask.progress > 0) {
            setTtsProgress(activeTask.progress);
          }
          if (activeTask.message) {
            setTtsMessage(activeTask.message);
          }
          if (activeTask.status === "failed") {
            stopTtsPolling();
            setIsGeneratingTTS(false);
            setTtsStatus("failed");
            setDubbingError(activeTask.error_message || "Tổng hợp giọng nói thất bại trong Celery worker");
            return;
          }
        }

        if (dubStep?.status === "completed" || (dubStep?.dubbed_audio_path && !activeTask)) {
          stopTtsPolling();
          setTtsStatus("completed");
          setTtsProgress(100);
          setIsGeneratingTTS(false);
          try {
            const blob = await videoService.getTTSBlob(vidId, lang);
            const blobUrl = URL.createObjectURL(blob);
            setTtsAudioUrl((prev) => {
              if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
              return blobUrl;
            });
          } catch (audioErr) {
            console.error("Failed to load TTS preview blob:", audioErr);
          }

          if (state.video) {
            dispatch({
              type: "SET_VIDEO",
              payload: {
                ...state.video,
                dubbedAudioPath: dubStep?.dubbed_audio_path || `outputs/tts_${vidId}/tts_${lang}.wav`,
                progress: Math.max(state.video.progress || 0, 85),
                currentStep: "dubbing",
              },
            });
          }
          window.dispatchEvent(new CustomEvent("subscription-updated"));
        } else if (dubStep?.status === "failed") {
          stopTtsPolling();
          setIsGeneratingTTS(false);
          setTtsStatus("failed");
          setDubbingError(activeTask?.error_message || "Tạo giọng nói thất bại");
        }
      } catch (err) {
        console.warn("Polling TTS status error:", err);
      }
    };

    checkStatus();
    ttsPollingTimerRef.current = setInterval(checkStatus, 2500);
  };

  const pollDubbingStatus = (vidId: number, lang: string) => {
    stopDubPolling();

    const checkStatus = async () => {
      try {
        const summary = await videoService.getStepsSummary(vidId);
        const exportStep = summary?.steps?.export;
        const activeTask = summary?.active_task;

        if (activeTask && (activeTask.current_step === "dub" || activeTask.current_step === "export")) {
          if (typeof activeTask.progress === "number" && activeTask.progress > 0) {
            setDubProgress(activeTask.progress);
          }
          if (activeTask.message) {
            setDubMessage(activeTask.message);
          }
          if (activeTask.status === "failed") {
            stopDubPolling();
            setIsGeneratingDub(false);
            setDubbingStatus("failed");
            setDubbingError(activeTask.error_message || "Lồng tiếng video thất bại trong Celery worker");
            return;
          }
        }

        if (exportStep?.status === "completed" || (exportStep?.output_path && !activeTask)) {
          stopDubPolling();
          setDubbingStatus("completed");
          setDubProgress(100);
          setIsGeneratingDub(false);

          try {
            const status = await videoService.getDubbingStatus(vidId);
            setDubbedVideo(status);
            const previewUrl = await videoService.getDubbedVideoPreview(vidId, lang);
            if (previewUrl) {
              setVideoUrl((prev) => {
                if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
                return previewUrl;
              });
              setIsDubbed(true);
            }
          } catch (previewErr) {
            console.error("Failed to load dubbed preview:", previewErr);
          }

          if (state.video) {
            dispatch({
              type: "SET_VIDEO",
              payload: {
                ...state.video,
                outputPath: exportStep?.output_path,
                status: "completed",
                progress: 100,
                currentStep: "completed",
              },
            });
          }
          window.dispatchEvent(new CustomEvent("subscription-updated"));
        } else if (exportStep?.status === "failed") {
          stopDubPolling();
          setIsGeneratingDub(false);
          setDubbingStatus("failed");
          setDubbingError(activeTask?.error_message || "Lồng tiếng video thất bại");
        }
      } catch (err) {
        console.warn("Polling dubbing status error:", err);
      }
    };

    checkStatus();
    dubPollingTimerRef.current = setInterval(checkStatus, 3000);
  };

  const generateTTS = async () => {
    if (!state.video?.videoId) return;
    
    setIsGeneratingTTS(true);
    setDubbingError(null);
    setTtsStatus("processing");
    setTtsProgress(0);
    setTtsMessage("Đang khởi tạo tiến trình tổng hợp giọng nói AI...");

    try {
      const voiceIdToUse = ttsEngine === "elevenlabs" ? selectedVoiceId : undefined;
      const result = await videoService.generateTTS(
        state.video.videoId,
        selectedLanguage,
        selectedSpeaker,
        ttsStyle,
        ttsSpeed,
        false,
        voiceIdToUse,
        ttsEngine
      );

      if (result?.status === "processing" || result?.job_id) {
        pollTTSStatus(state.video.videoId, selectedLanguage);
        return;
      }
      
      setTtsStatus("completed");
      setTtsProgress(100);
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
      
      dispatch({
        type: "SET_TTS",
        payload: result,
      });

      if (state.video) {
        dispatch({
          type: "SET_VIDEO",
          payload: {
            ...state.video,
            dubbedAudioPath: (result as any)?.audio_path || (result as any)?.tts_path || `outputs/tts_${state.video.videoId}/tts_${selectedLanguage}.wav`,
            progress: Math.max(state.video.progress || 0, 85),
            currentStep: "dubbing",
          },
        });
      }

      window.dispatchEvent(new CustomEvent("subscription-updated"));
      setIsGeneratingTTS(false);
    } catch (error: any) {
      console.error("TTS generation failed:", error);
      setDubbingError(error.message || "Failed to generate TTS");
      setTtsStatus("failed");
      setIsGeneratingTTS(false);
      setTtsProgress(0);
    }
  };

  const generateDubbedVideo = async () => {
    if (!state.video?.videoId) return;
    
    setIsGeneratingDub(true);
    setDubbingError(null);
    setDubbingStatus("processing");
    setDubProgress(0);
    setDubMessage("Đang chuẩn bị render và hòa âm video...");

    try {
      const result = await videoService.generateDubbedVideo(
        state.video.videoId,
        selectedLanguage,
        selectedFormat,
        selectedQuality,
        burnSubtitles,
        aspectRatio,
        false,
        {
          vocalVolume: isVocalMuted ? 0 : vocalVolume,
          bgmVolume: isBgmMuted ? 0 : bgmVolume,
          dubVolume: isDubMuted ? 0 : dubVolume,
        }
      );

      if (result?.status === "processing" || result?.job_id) {
        pollDubbingStatus(state.video.videoId, selectedLanguage);
        return;
      }
      
      setDubbedVideo(result);
      setDubbingStatus("completed");
      setDubProgress(100);
      
      try {
        const previewUrl = await videoService.getDubbedVideoPreview(
          state.video.videoId,
          selectedLanguage
        );
        if (previewUrl) {
          setVideoUrl((prev) => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return previewUrl;
          });
          setIsDubbed(true);
        }
      } catch (previewErr) {
        console.error("Failed to load dubbed preview:", previewErr);
      }
      
      dispatch({
        type: "SET_DUBBED_VIDEO",
        payload: result,
      });

      if (state.video) {
        dispatch({
          type: "SET_VIDEO",
          payload: {
            ...state.video,
            outputPath: (result as any)?.s3_key || (result as any)?.output_path || (result as any)?.local_path,
            status: "completed",
            progress: 100,
            currentStep: "completed",
          },
        });
      }

      window.dispatchEvent(new CustomEvent("subscription-updated"));
      setIsGeneratingDub(false);
    } catch (error: any) {
      console.error("Dubbing generation failed:", error);
      setDubbingError(error.message || "Failed to generate dubbed video");
      setDubbingStatus("failed");
      setIsGeneratingDub(false);
      setDubProgress(0);
    }
  };

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
      }
    } catch (error: any) {
      console.error("Download failed:", error);
      setDubbingError(error.message || "Failed to download dubbed video");
    }
  };

  // Video playback & transport controls
  const toggleVideoPlay = async () => {
    if (!videoRef.current) return;
    try {
      if (isVideoPlaying) {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      } else {
        videoRef.current.muted = isMuted;
        await videoRef.current.play();
        setIsVideoPlaying(true);
      }
    } catch (err) {
      console.warn("Video playback error:", err);
      setIsVideoPlaying(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    setVideoCurrentTime(videoRef.current.currentTime);
  };

  const [searchParams] = useSearchParams();
  const dubbingSeekDoneRef = useRef(false);

  const seekToDubbingTimestamp = () => {
    const tParam = searchParams.get("t");
    if (tParam !== null && videoRef.current) {
      const seekSec = parseFloat(tParam);
      if (!isNaN(seekSec) && seekSec >= 0) {
        videoRef.current.currentTime = seekSec;
        setVideoCurrentTime(seekSec);
        videoRef.current.play().catch(() => {});
        setIsVideoPlaying(true);
      }
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration || 0);
      if (!dubbingSeekDoneRef.current) {
        seekToDubbingTimestamp();
        dubbingSeekDoneRef.current = true;
      }
    }
  };

  useEffect(() => {
    const tParam = searchParams.get("t");
    if (tParam !== null && videoRef.current) {
      seekToDubbingTimestamp();
    }
  }, [searchParams.get("t")]);

  const handleVideoSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setVideoCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  // Standalone TTS audio player controls
  const togglePlayTTSOnly = async () => {
    if (audioRef.current) {
      try {
        if (isPlayingTTSOnly) {
          audioRef.current.pause();
          setIsPlayingTTSOnly(false);
        } else {
          await audioRef.current.play();
          setIsPlayingTTSOnly(true);
        }
      } catch (err) {
        console.error("Audio playback error:", err);
        setIsPlayingTTSOnly(false);
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
    setIsPlayingTTSOnly(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Active dialogue segment matching current video playback position
  const activeSegmentIndex = useMemo(() => {
    if (!segments || segments.length === 0) return -1;
    return segments.findIndex(
      (s) => videoCurrentTime >= s.start && videoCurrentTime <= s.end
    );
  }, [segments, videoCurrentTime]);

  const activeSegment = activeSegmentIndex !== -1 ? segments[activeSegmentIndex] : null;

  const displayedSubtitleText = useMemo(() => {
    if (isVideoPlaying) {
      if (activeSegmentIndex === -1) return "";
      const seg = segments[activeSegmentIndex];
      return seg?.translated_text || seg?.text || "";
    }
    // When paused or stopped:
    if (activeSegment) {
      return activeSegment.translated_text || activeSegment.text || "";
    }
    if (segments.length > 0) {
      return segments[0].translated_text || segments[0].text || "";
    }
    return "";
  }, [isVideoPlaying, activeSegmentIndex, activeSegment, segments]);

  const filteredSegments = useMemo(() => {
    if (!segmentSearch.trim()) {
      return segments.map((seg, idx) => ({ seg, originalIndex: idx }));
    }
    const q = segmentSearch.toLowerCase();
    return segments
      .map((seg, idx) => ({ seg, originalIndex: idx }))
      .filter(
        ({ seg }) =>
          (seg.text && seg.text.toLowerCase().includes(q)) ||
          (seg.translated_text && seg.translated_text.toLowerCase().includes(q))
      );
  }, [segments, segmentSearch]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Đang tải trạng thái lồng tiếng...</span>
      </div>
    );
  }

  const isTTSReady =
    ttsStatus === "completed" ||
    ttsStatus === "available" ||
    Boolean(ttsAudioUrl) ||
    Boolean(state.video?.dubbedAudioPath);
  const isDubReady = dubbingStatus === "completed";

  return (
    <PipelineStepLayout
      stepBadge={t("pipeline:header.stepBadge", { current: "05", total: "06" })}
      stepCategory="Voice & Dubbing Studio"
      stepTitle="Lồng Tiếng & Hòa Âm Video"
      stepDescription="Tạo giọng đọc AI, nhúng phụ đề và hòa âm nền video chất lượng cao"
      error={dubbingError}
      onDismissError={() => setDubbingError(null)}
      hideDefaultToggle={true}
      isPanelOpen={isPanelOpen}
      onTogglePanel={(open: boolean) => setIsPanelOpen(open)}
      panelWidth={activeRightTab === "mvoice" ? "w-full lg:w-[440px] xl:w-[500px]" : "w-full lg:w-[360px] xl:w-[410px]"}
      headerActions={
        <div className="flex items-center gap-2">
          {/* Tab 1: Giọng đọc AI & Render (Unified Menu) */}
          <button
            type="button"
            onClick={handleToggleDubbingTab}
            title={
              isPanelOpen && activeRightTab === "dubbing"
                ? "Ẩn bảng lồng tiếng & render"
                : "Mở bảng tùy chọn giọng đọc AI, hòa âm & render video"
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
              isPanelOpen && activeRightTab === "dubbing"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            <Mic size={13} />
            <span>Giọng đọc AI & Render</span>
            {(isTTSReady || isDubReady) && (
              <span className={`h-1.5 w-1.5 rounded-full ml-0.5 ${isDubReady ? "bg-cyan-400" : "bg-emerald-400"}`} />
            )}
          </button>

          {/* Tab 2: mVoice Studio */}
          <button
            type="button"
            onClick={handleToggleMVoiceTab}
            title={
              isPanelOpen && activeRightTab === "mvoice"
                ? "Ẩn bảng mVoice Studio"
                : "Mở mVoice Studio - Chỉnh sửa & vi âm từng câu thoại"
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
              isPanelOpen && activeRightTab === "mvoice"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            <Sparkles size={13} />
            <span>mVoice Studio ({segments.length})</span>
          </button>

          {/* Download button */}
          {dubbedVideo && isDubReady && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] shadow-2xs"
              title="Tải video lồng tiếng về máy"
            >
              <Download size={13} />
              <span>.{selectedFormat.toUpperCase()}</span>
            </button>
          )}
        </div>
      }
      toolPanelTitle={
        activeRightTab === "dubbing"
          ? "Giọng Đọc AI & Hòa Âm Video"
          : `mVoice Studio (${segments.length} câu thoại)`
      }
      toolPanelIcon={
        activeRightTab === "dubbing" ? (
          <Mic size={16} className="text-[var(--color-primary)]" />
        ) : (
          <Sparkles size={16} className="text-[var(--color-primary)]" />
        )
      }
      toolPanel={
        activeRightTab === "dubbing" ? (
          <DubbingToolsPanel
            ttsEngine={ttsEngine}
            setTtsEngine={setTtsEngine}
            activeSpeakerAudio={activeSpeakerAudio}
            selectedVoiceId={selectedVoiceId}
            onSelectVoice={setSelectedVoiceId}
            ttsSpeed={ttsSpeed}
            setTtsSpeed={setTtsSpeed}
            isGeneratingTTS={isGeneratingTTS}
            isGlobalTaskRunning={isGlobalTaskRunning}
            isTTSReady={isTTSReady}
            ttsProgress={ttsProgress}
            ttsMessage={ttsMessage}
            generateTTS={generateTTS}
            ttsAudioUrl={ttsAudioUrl}
            audioRef={audioRef}
            handleAudioTimeUpdate={handleAudioTimeUpdate}
            handleAudioLoaded={handleAudioLoaded}
            handleAudioEnded={handleAudioEnded}
            togglePlayTTSOnly={togglePlayTTSOnly}
            isPlayingTTSOnly={isPlayingTTSOnly}
            currentTime={currentTime}
            audioDuration={audioDuration}
            formatTime={formatTime}
            selectedLanguage={selectedLanguage}
            isVocalMuted={isVocalMuted}
            setIsVocalMuted={setIsVocalMuted}
            vocalVolume={vocalVolume}
            setVocalVolume={setVocalVolume}
            isBgmMuted={isBgmMuted}
            setIsBgmMuted={setIsBgmMuted}
            bgmVolume={bgmVolume}
            setBgmVolume={setBgmVolume}
            isDubMuted={isDubMuted}
            setIsDubMuted={setIsDubMuted}
            dubVolume={dubVolume}
            setDubVolume={setDubVolume}
            isDubReady={isDubReady}
            isGeneratingDub={isGeneratingDub}
            burnSubtitles={burnSubtitles}
            setBurnSubtitles={setBurnSubtitles}
            aspectRatio={aspectRatio}
            generateDubbedVideo={generateDubbedVideo}
            dubProgress={dubProgress}
            dubMessage={dubMessage}
            onGoToReviewStep={() => {
              dispatch({ type: "SET_STEP", payload: 6 });
            }}
          />
        ) : (
          <DubbingSegmentList
            segmentAudioRef={segmentAudioRef}
            playingSegmentAudioIdx={playingSegmentAudioIdx}
            setPlayingSegmentAudioIdx={setPlayingSegmentAudioIdx}
            filteredSegments={filteredSegments}
            segments={segments}
            segmentSearch={segmentSearch}
            setSegmentSearch={setSegmentSearch}
            selectedSegmentIdx={selectedSegmentIdx}
            activeSegmentIndex={activeSegmentIndex}
            setSelectedSegmentIdx={setSelectedSegmentIdx}
            handleVideoSeek={handleVideoSeek}
            regeneratingSegmentIdx={regeneratingSegmentIdx}
            segmentOverrides={segmentOverrides}
            setSegmentOverrides={setSegmentOverrides}
            selectedSpeaker={selectedSpeaker}
            handleUpdateSegmentText={handleUpdateSegmentText}
            handlePlaySegmentChunk={handlePlaySegmentChunk}
            handleMicroResynthesize={handleMicroResynthesize}
            handleSegmentSlip={handleSegmentSlip}
            formatTime={formatTime}
          />
        )
      }
    >
      <div className="flex flex-col gap-4 w-full">
        {/* CSS Keyframe Animations for Subtitle Effects */}
        <style>{`
          @keyframes subFadeInOut {
            0%, 100% { opacity: 0; transform: translateY(3px); }
            15%, 85% { opacity: 1; transform: translateY(0); }
          }
          @keyframes subPopBounce {
            0% { opacity: 0; transform: scale(0.82); }
            18% { opacity: 1; transform: scale(1.1); }
            28%, 82% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.92); }
          }
          @keyframes subSlideUp {
            0% { opacity: 0; transform: translateY(16px); }
            20%, 80% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
          }
          @keyframes subKaraokeGlow {
            0%, 100% { filter: brightness(1); }
            25%, 75% { filter: brightness(1.35) drop-shadow(0 0 10px #FFE600); transform: scale(1.03); }
          }
          .sub-anim-fade { animation: subFadeInOut 3.2s ease-in-out infinite; }
          .sub-anim-pop { animation: subPopBounce 3.2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite; }
          .sub-anim-slide { animation: subSlideUp 3.2s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
          .sub-anim-karaoke { animation: subKaraokeGlow 2.5s ease-in-out infinite; }
        `}</style>

        {/* Video Player Component */}
        <DubbingPlayer
          videoRef={videoRef}
          videoUrl={videoUrl}
          isVideoPlaying={isVideoPlaying}
          videoDuration={videoDuration}
          videoCurrentTime={videoCurrentTime}
          isMuted={isMuted}
          isDubbed={isDubbed}
          showSubtitleOverlay={showSubtitleOverlay}
          setShowSubtitleOverlay={setShowSubtitleOverlay}
          displayedSubtitleText={displayedSubtitleText}
          activeSegmentIndex={activeSegmentIndex}
          regeneratingSegmentIdx={regeneratingSegmentIdx}
          toggleVideoPlay={toggleVideoPlay}
          handleVideoSeek={handleVideoSeek}
          toggleMute={toggleMute}
          handleRegenerateSegmentTTS={handleRegenerateSegmentTTS}
          formatTime={formatTime}
          positionY={positionY}
          alignment={alignment}
          effect={effect}
          fontName={fontName}
          fontSize={fontSize}
          primaryColor={primaryColor}
          outlineColor={outlineColor}
          lineSpacing={lineSpacing}
          isGeneratingDub={isGeneratingDub}
          isTTSReady={isTTSReady}
          generateDubbedVideo={generateDubbedVideo}
          onTimeUpdate={handleVideoTimeUpdate}
          onLoadedMetadata={handleVideoLoaded}
          onEnded={() => setIsVideoPlaying(false)}
          vocalTrackUrl={state.video?.videoId ? videoService.getVocalTrackUrl(state.video.videoId) : null}
          bgmTrackUrl={state.video?.videoId ? videoService.getBgmTrackUrl(state.video.videoId) : null}
          ttsTrackUrl={ttsAudioUrl}
          vocalVolume={vocalVolume}
          bgmVolume={bgmVolume}
          dubVolume={dubVolume}
          isVocalMuted={isVocalMuted}
          isBgmMuted={isBgmMuted}
          isDubMuted={isDubMuted}
        />

        {/* Multi-Track NLE Studio Timeline */}
        <NleTimelineEditor
          duration={videoDuration}
          currentTime={videoCurrentTime}
          segments={segments}
          activeSegmentIndex={activeSegmentIndex}
          onSelectSegment={(idx: number) => {
            setSelectedSegmentIdx(idx);
            setActiveRightTab("mvoice");
            setIsPanelOpen(true);
          }}
          onSeek={handleVideoSeek}
          onUpdateSegment={(idx: number, updated: Partial<SubtitleSegment>) => {
            if (typeof updated.start === "number" || typeof updated.end === "number") {
              setSegments((prev) => {
                const next = [...prev];
                if (next[idx]) {
                  next[idx] = {
                    ...next[idx],
                    ...(updated.start !== undefined ? { start: updated.start } : {}),
                    ...(updated.end !== undefined ? { end: updated.end } : {}),
                  };
                }
                return next;
              });
            }
          }}
          isMultiTrack={true}
          tracksConfig={{
            videoDuration,
            bgmVolume,
            isBgmMuted,
            onToggleBgmMute: () => setIsBgmMuted(!isBgmMuted),
            vocalVolume,
            isVocalMuted,
            onToggleVocalMute: () => setIsVocalMuted(!isVocalMuted),
            segmentOverrides,
          }}
        />
      </div>
    </PipelineStepLayout>
  );
}
