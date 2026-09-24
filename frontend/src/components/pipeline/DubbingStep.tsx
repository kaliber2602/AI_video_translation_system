// DubbingStep.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Volume2, 
  VolumeX,
  Play, 
  Pause, 
  Download, 
  Loader2, 
  FileVideo,
  Mic,
  Waves,
  Film,
  Captions,
  AlertTriangle,
  Lock,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Sliders,
  Search,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Zap,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";
import PipelineStepLayout from "./PipelineStepLayout";
import { toast } from "../../lib/toast";
import type { SubtitleSegment } from "../../types/video";
import NleTimelineEditor from "../editor/NleTimelineEditor";

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
  const [selectedSpeaker, setSelectedSpeaker] = useState<number>(1);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [ttsStyle, setTtsStyle] = useState("neutral");
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
  const [speakerAudioUrl, setSpeakerAudioUrl] = useState<string | null>(null);
  const [isPlayingSpeaker, setIsPlayingSpeaker] = useState(false);
  const [isLoadingSpeakerAudio, setIsLoadingSpeakerAudio] = useState(false);

  // Background Task & Polling States
  const [ttsProgress, setTtsProgress] = useState<number>(0);
  const [dubProgress, setDubProgress] = useState<number>(0);
  const ttsPollingTimerRef = useRef<any>(null);
  const dubPollingTimerRef = useRef<any>(null);

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
  
  // Right sidebar tab state
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<"tts" | "render" | "mvoice">("tts");

  // mVoice Studio & Segment Audio States
  const [segmentSearch, setSegmentSearch] = useState<string>("");
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);
  const [playingSegmentAudioIdx, setPlayingSegmentAudioIdx] = useState<number | null>(null);
  const segmentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [segmentOverrides, setSegmentOverrides] = useState<
    Record<number, { speed?: number; gain?: number; speaker?: string; slip?: number }>
  >({});
  const [recordingSegmentIdx, setRecordingSegmentIdx] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chunkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingChunkIdx, setUploadingChunkIdx] = useState<number | null>(null);

  // Video & Dubbing State
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDubbed, setIsDubbed] = useState(false);
  const [dubbingStatus, setDubbingStatus] = useState<string | null>(null);
  const [dubbingError, setDubbingError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("vi");
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [dubbedVideo, setDubbedVideo] = useState<any>(null);
  const [burnSubtitles, setBurnSubtitles] = useState(true);

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

  useEffect(() => {
    loadDubbingStatus();
  }, [state.video?.videoId, selectedLanguage]);

  useEffect(() => {
    loadSpeakers();
  }, [state.video?.videoId]);

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
          speed_rate: ttsSpeed,
        },
      },
    });
  }, [ttsEngine, ttsSpeed]);

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

  const handleAutoTimeStretch = (segmentIdx: number) => {
    const seg = segments[segmentIdx];
    if (!seg) return;
    const targetDuration = seg.end - seg.start;
    if (targetDuration <= 0) return;
    const text = seg.translated_text || seg.text || "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const naturalSec = Math.max(1, words / 2.8);
    const suggestedSpeed = Number(Math.max(0.75, Math.min(1.45, naturalSec / targetDuration)).toFixed(2));

    setSegmentOverrides((prev) => ({
      ...prev,
      [segmentIdx]: {
        ...(prev[segmentIdx] || {}),
        speed: suggestedSpeed,
      },
    }));
    toast.success(`Khớp thời lượng #${segmentIdx + 1}: Tốc độ ${suggestedSpeed}x cho khung ${targetDuration.toFixed(1)}s`);
  };

  const startRecordingVoiceover = async (segmentIdx: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        if (segmentAudioRef.current) {
          segmentAudioRef.current.src = URL.createObjectURL(audioBlob);
          segmentAudioRef.current.play();
        }
        toast.success(`✓ Đã thu âm giọng đọc đè lên câu #${segmentIdx + 1}!`);
        setRecordingSegmentIdx(null);
      };

      mediaRecorder.start();
      setRecordingSegmentIdx(segmentIdx);
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("Không thể kết nối Microphone của trình duyệt.");
    }
  };

  const stopRecordingVoiceover = () => {
    if (mediaRecorderRef.current && recordingSegmentIdx !== null) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleUploadCustomChunk = (segmentIdx: number, file: File) => {
    if (segmentAudioRef.current) {
      segmentAudioRef.current.src = URL.createObjectURL(file);
      segmentAudioRef.current.play();
    }
    toast.success(`Đã nạp file âm thanh riêng cho câu #${segmentIdx + 1}`);
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
      if (speakerAudioUrl && speakerAudioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(speakerAudioUrl);
      }
    };
  }, [ttsAudioUrl, videoUrl, speakerAudioUrl]);

  // Sidebar Toggles
  const handleToggleTtsTab = () => {
    if (isPanelOpen && activeRightTab === "tts") {
      setIsPanelOpen(false);
    } else {
      setActiveRightTab("tts");
      setIsPanelOpen(true);
    }
  };

  const handleToggleRenderTab = () => {
    if (isPanelOpen && activeRightTab === "render") {
      setIsPanelOpen(false);
    } else {
      setActiveRightTab("render");
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

  const playSpeakerSample = async (speakerId: number) => {
    if (!state.video?.videoId) return;
    
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
        console.warn("Speaker audio error:", e);
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
      console.warn("Could not load voice sample:", err);
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

  const loadDubbingStatus = async () => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    const vidId = state.video.videoId;
    setIsLoading(true);
    setDubbingError(null);

    try {
      // 0. Check active Celery tasks for F5 / navigation resilience
      try {
        const summary = await videoService.getStepsSummary(vidId);
        const dubStep = summary?.steps?.dubbing;
        const exportStep = summary?.steps?.export;
        const activeTask = summary?.active_task;

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

      // 2. Fetch TTS audio data
      try {
        const ttsData = await videoService.getTTS(vidId, selectedLanguage);
        if (ttsData && (ttsData.status === "available" || ttsData.status === "completed")) {
          setTtsStatus("completed");
          try {
            const blob = await videoService.getTTSBlob(vidId, selectedLanguage);
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

      // 3. Load Dubbed video if completed, otherwise load Step 4 original video
      let dubbedLoaded = false;
      try {
        const status = await videoService.getDubbingStatus(vidId);
        setDubbingStatus(status.status);
        
        const isActuallyCompleted =
          status.status === "completed" &&
          Boolean(status.output_path) &&
          state.video?.currentStep === "completed";

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

  const loadSpeakers = async () => {
    if (!state.video?.videoId) return;
    try {
      const data = await videoService.listVoices(state.video.videoId);
      if (data && data.speakers && data.speakers.length > 0) {
        setSpeakers(data.speakers);
        setSelectedSpeaker(data.speakers[0].id);
      }
    } catch (error) {
      setSpeakers([
        { id: 1, label: "SPEAKER_01", language: "vi", gender: "neutral" }
      ]);
    }
  };

  const generateTTS = async () => {
    if (!state.video?.videoId) return;
    
    setIsGeneratingTTS(true);
    setDubbingError(null);
    setTtsStatus("processing");
    setTtsProgress(20);

    try {
      const result = await videoService.generateTTS(
        state.video.videoId,
        selectedLanguage,
        selectedSpeaker,
        ttsStyle,
        ttsSpeed
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
    setDubProgress(20);

    try {
      const result = await videoService.generateDubbedVideo(
        state.video.videoId,
        selectedLanguage,
        selectedFormat,
        selectedQuality,
        burnSubtitles,
        aspectRatio
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

  const isTTSReady = ttsStatus === "completed" || ttsStatus === "available";
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
      onTogglePanel={(open) => setIsPanelOpen(open)}
      panelWidth={activeRightTab === "mvoice" ? "w-full lg:w-[440px] xl:w-[500px]" : "w-full lg:w-[360px] xl:w-[410px]"}
      headerActions={
        <div className="flex items-center gap-2">
          {/* Tab 1: Giọng đọc AI */}
          <button
            type="button"
            onClick={handleToggleTtsTab}
            title={
              isPanelOpen && activeRightTab === "tts"
                ? "Ẩn bảng giọng đọc AI"
                : "Mở bảng tùy chọn giọng đọc AI (TTS)"
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
              isPanelOpen && activeRightTab === "tts"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            <Mic size={13} />
            <span>Giọng đọc AI (TTS)</span>
            {isTTSReady && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-0.5" />}
          </button>

          {/* Tab 2: Lồng tiếng & Render */}
          <button
            type="button"
            onClick={handleToggleRenderTab}
            title={
              isPanelOpen && activeRightTab === "render"
                ? "Ẩn bảng lồng tiếng & render"
                : "Mở bảng hòa âm & render video"
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
              isPanelOpen && activeRightTab === "render"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            <Film size={13} />
            <span>Lồng tiếng & Render</span>
            {isDubReady && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-0.5" />}
          </button>

          {/* Tab 3: mVoice Studio */}
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
        activeRightTab === "tts"
          ? "Thiết lập Giọng Đọc AI (TTS)"
          : activeRightTab === "render"
          ? "Hòa Âm & Render Video Lồng Tiếng"
          : `mVoice Studio (${segments.length} câu thoại)`
      }
      toolPanelIcon={
        activeRightTab === "tts" ? (
          <Mic size={16} className="text-[var(--color-primary)]" />
        ) : activeRightTab === "render" ? (
          <Film size={16} className="text-[var(--color-primary)]" />
        ) : (
          <Sparkles size={16} className="text-[var(--color-primary)]" />
        )
      }
      toolPanel={
        activeRightTab === "tts" ? (
          /* ========================================================= */
          /* TAB 1: TTS AUDIO GENERATION CONTROLS                      */
          /* ========================================================= */
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
                    1
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    Giọng Đọc AI (TTS)
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isTTSReady
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : isGeneratingTTS
                      ? "bg-amber-500/15 text-amber-400 animate-pulse"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {isTTSReady ? "✓ Đã sẵn sàng" : isGeneratingTTS ? "Đang tạo..." : "Chưa tạo"}
                </span>
              </div>

              {/* TTS Engine Selector */}
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
                  Mô hình lồng tiếng AI (TTS Engine):
                </label>
                <select
                  value={ttsEngine}
                  onChange={(e) => setTtsEngine(e.target.value)}
                  className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="edge_tts">Microsoft Edge-TTS Neural (Free Cloud API - Miễn phí)</option>
                  <option value="bark">Suno Bark Expressive (Local - Miễn phí)</option>
                  <option value="coqui_xtts_v2">Coqui XTTS-v2 Voice Cloning (Local Deep - Gói Pro)</option>
                </select>
              </div>

              {/* Speaker selection with voice sample preview */}
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
                  Nhân vật / Giọng mẫu AI:
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedSpeaker}
                    onChange={(e) => handleSpeakerChange(parseInt(e.target.value, 10))}
                    className="flex-1 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                  >
                    {speakers.map((spk) => (
                      <option key={spk.id} value={spk.id}>
                        {spk.label || `Speaker ${spk.id}`} ({spk.language || "Đa ngữ"})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => playSpeakerSample(selectedSpeaker)}
                    disabled={isLoadingSpeakerAudio}
                    className={`h-8 px-2.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1 shrink-0 ${
                      isPlayingSpeaker
                        ? "border-amber-500 bg-amber-500/20 text-amber-300"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                    }`}
                    title="Nghe thử giọng mẫu nhân vật này"
                  >
                    {isLoadingSpeakerAudio ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isPlayingSpeaker ? (
                      <Pause size={12} />
                    ) : (
                      <Volume2 size={12} />
                    )}
                    <span>{isPlayingSpeaker ? "Dừng" : "Thử"}</span>
                  </button>
                </div>
              </div>

              {/* TONE STYLE DROPDOWN */}
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
                  Phong cách biểu cảm:
                </label>
                <select
                  value={ttsStyle}
                  onChange={(e) => setTtsStyle(e.target.value)}
                  className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="neutral">Tự nhiên (Neutral)</option>
                  <option value="warm">Ấm áp, truyền cảm (Warm)</option>
                  <option value="enthusiastic">Hào hứng, sôi nổi (Enthusiastic)</option>
                  <option value="professional">Chuyên nghiệp, tin tức (Professional)</option>
                </select>
              </div>

              {/* SPEED SLIDER */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">
                  <span>Tốc độ đọc:</span>
                  <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{ttsSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-primary)] h-1.5 bg-[var(--color-border)] rounded-lg cursor-pointer"
                />
              </div>

              {/* GENERATE TTS BUTTON */}
              <button
                type="button"
                onClick={generateTTS}
                disabled={isGeneratingTTS || isGlobalTaskRunning}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-3 py-2.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50 active:scale-98 shadow-xs"
              >
                {isGeneratingTTS ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
                <span>
                  {isGeneratingTTS
                    ? `Đang tạo giọng AI...${ttsProgress > 0 ? ` (${ttsProgress}%)` : ""}`
                    : isGlobalTaskRunning
                    ? "Tác vụ ngầm đang chạy (Đã khóa)"
                    : isTTSReady
                    ? "Tạo lại giọng đọc AI"
                    : "Tạo giọng đọc AI (TTS)"}
                </span>
              </button>

              {/* TTS AUDIO WAVEFORM TRACK CARD (Inside TTS Tool Panel) */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      <Waves size={13} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                      Rãnh Âm Thanh Lồng Tiếng (TTS)
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      isTTSReady
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isGeneratingTTS
                        ? "bg-amber-500/20 text-amber-400 animate-pulse"
                        : "bg-zinc-800/80 text-zinc-400"
                    }`}
                  >
                    {isTTSReady ? "✓ Đã Tạo" : isGeneratingTTS ? "Đang tạo..." : "Chưa tạo"}
                  </span>
                </div>

                {ttsAudioUrl ? (
                  <div className="space-y-2">
                    <audio
                      ref={audioRef}
                      src={ttsAudioUrl}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onLoadedMetadata={handleAudioLoaded}
                      onEnded={handleAudioEnded}
                    />

                    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                      <button
                        type="button"
                        onClick={togglePlayTTSOnly}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition active:scale-95"
                      >
                        {isPlayingTTSOnly ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[9px] font-mono text-[var(--color-text-muted)] mb-1">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(audioDuration)}</span>
                        </div>
                        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                          <div
                            className="h-full bg-[var(--color-primary)] transition-all"
                            style={{
                              width: `${audioDuration ? (currentTime / audioDuration) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>

                      <a
                        href={ttsAudioUrl}
                        download={`tts_${selectedLanguage}.wav`}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                        title="Tải tệp âm thanh wav"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-[var(--color-text-muted)] py-0.5 italic">
                    Chưa có tệp âm thanh xem trước. Hãy nhấn nút tạo ở trên.
                  </div>
                )}
              </div>

              {/* 3-Track Virtual Mixer (Web Audio Real-Time Mixing) */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-1.5">
                    <Sliders size={13} className="text-[var(--color-primary)]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                      Bàn Trộn 3 Rãnh (Virtual Mixer)
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.2 rounded">
                    Real-time 0ms
                  </span>
                </div>

                {/* Track 1: Original Vocal */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 font-semibold text-[var(--color-text-secondary)]">
                      <Mic size={11} className="text-zinc-400" />
                      Vocal Gốc (Original)
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() => setIsVocalMuted(!isVocalMuted)}
                        className={`text-[9px] px-1 py-0.2 rounded font-bold transition ${
                          isVocalMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {isVocalMuted ? "MUTED" : "ON"}
                      </button>
                      <span className="w-8 text-right">{isVocalMuted ? "0%" : `${vocalVolume}%`}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    disabled={isVocalMuted}
                    value={isVocalMuted ? 0 : vocalVolume}
                    onChange={(e) => setVocalVolume(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[var(--color-border)] rounded accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>

                {/* Track 2: Original BGM */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 font-semibold text-[var(--color-text-secondary)]">
                      <Waves size={11} className="text-indigo-400" />
                      Nhạc nền (BGM)
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() => setIsBgmMuted(!isBgmMuted)}
                        className={`text-[9px] px-1 py-0.2 rounded font-bold transition ${
                          isBgmMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {isBgmMuted ? "MUTED" : "ON"}
                      </button>
                      <span className="w-8 text-right">{isBgmMuted ? "0%" : `${bgmVolume}%`}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    disabled={isBgmMuted}
                    value={isBgmMuted ? 0 : bgmVolume}
                    onChange={(e) => setBgmVolume(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[var(--color-border)] rounded accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Track 3: AI Dubbing Voice */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 font-semibold text-[var(--color-text-secondary)]">
                      <Volume2 size={11} className="text-emerald-400" />
                      Giọng AI Dubbing
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() => setIsDubMuted(!isDubMuted)}
                        className={`text-[9px] px-1 py-0.2 rounded font-bold transition ${
                          isDubMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {isDubMuted ? "MUTED" : "ON"}
                      </button>
                      <span className="w-8 text-right">{isDubMuted ? "0%" : `${dubVolume}%`}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    disabled={isDubMuted}
                    value={isDubMuted ? 0 : dubVolume}
                    onChange={(e) => setDubVolume(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[var(--color-border)] rounded accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* QUICK LINK TO PHASE 2 */}
            <button
              type="button"
              onClick={() => {
                setActiveRightTab("render");
                setIsPanelOpen(true);
              }}
              className="w-full flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs font-bold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition group shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                  2
                </span>
                <span>Chuyển sang Lồng Tiếng & Render</span>
              </div>
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : activeRightTab === "render" ? (
          /* ========================================================= */
          /* TAB 2: VIDEO MUXING & RENDERING CONTROLS                  */
          /* ========================================================= */
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
                    2
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    Hòa Âm & Render Video
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDubReady
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : isGeneratingDub
                      ? "bg-amber-500/15 text-amber-400 animate-pulse"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {isDubReady ? "✓ Đã xong" : isGeneratingDub ? "Đang render..." : "Chờ TTS"}
                </span>
              </div>

              {/* Dependency Warning if TTS not ready */}
              {!isTTSReady && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <Lock size={14} className="shrink-0 mt-0.5" />
                    <span>Cần tạo giọng đọc AI (TTS) trước khi kết xuất video hoàn chỉnh.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRightTab("tts");
                      setIsPanelOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 transition"
                  >
                    <Mic size={12} />
                    <span>← Thiết lập Giọng Đọc AI ngay</span>
                  </button>
                </div>
              )}

              {/* HARDSUB SWITCH TOGGLE */}
              <div
                onClick={() => setBurnSubtitles(!burnSubtitles)}
                className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] p-2.5 transition hover:border-[var(--color-primary)]/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-primary)]">
                    <Captions size={14} className="text-[var(--color-primary)]" />
                    <span>Nhúng phụ đề cứng (Hardsub)</span>
                  </div>
                  <div
                    className={`w-8 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${
                      burnSubtitles ? "bg-[var(--color-primary)]" : "bg-zinc-600"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        burnSubtitles ? "transform translate-x-4" : ""
                      }`}
                    />
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)] leading-normal">
                  {burnSubtitles
                    ? "✓ Bật: Cắt khung hình & nung phụ đề đúng kiểu dáng đã chọn ở Bước 4"
                    : "✗ Tắt: Giữ video sạch không chữ (Clean export)"}
                </p>
              </div>

              {/* ASPECT RATIO EXPORT SELECTION */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">
                  <span>Khung hình xuất (Aspect Ratio):</span>
                  <span className="font-mono text-[10px] text-[var(--color-primary)] font-bold">
                    {aspectRatio === "9:16" ? "9:16 (Dọc TikTok)" : aspectRatio === "1:1" ? "1:1 (Vuông)" : aspectRatio === "4:3" ? "4:3" : "16:9 (Ngang)"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 bg-[var(--color-input-background)] p-1 rounded-lg border border-[var(--color-border)]">
                  {(["16:9", "9:16", "1:1", "4:3"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAspectRatio(r)}
                      className={`py-1 text-[10px] font-semibold rounded transition ${
                        aspectRatio === r
                          ? "bg-[var(--color-primary)] text-white shadow-xs"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* VIDEO QUALITY & FORMAT DROPDOWNS (2 COLS) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
                    Độ phân giải:
                  </label>
                  <select
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(e.target.value)}
                    disabled={!isTTSReady}
                    className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
                  >
                    <option value="1080p">1080p Full HD</option>
                    <option value="720p">720p HD</option>
                    <option value="4k">4K Ultra HD</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
                    Định dạng tệp:
                  </label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    disabled={!isTTSReady}
                    className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] uppercase font-mono disabled:opacity-50"
                  >
                    <option value="mp4">.MP4</option>
                    <option value="mkv">.MKV</option>
                    <option value="webm">.WEBM</option>
                  </select>
                </div>
              </div>

              {/* GENERATE DUBBED VIDEO BUTTON */}
              <button
                type="button"
                onClick={generateDubbedVideo}
                disabled={isGeneratingDub || !isTTSReady || isGlobalTaskRunning}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
              >
                {isGeneratingDub ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
                <span>
                  {isGeneratingDub
                    ? `Đang render video...${dubProgress > 0 ? ` (${dubProgress}%)` : ""}`
                    : isGlobalTaskRunning
                    ? "Tác vụ ngầm đang chạy (Đã khóa)"
                    : isDubReady
                    ? "Tạo lại Video Lồng Tiếng"
                    : "Tạo Video Lồng Tiếng"}
                </span>
              </button>
            </div>

            {/* QUICK LINK BACK TO PHASE 1 */}
            <button
              type="button"
              onClick={() => {
                setActiveRightTab("tts");
                setIsPanelOpen(true);
              }}
              className="w-full flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition group shadow-xs"
            >
              <div className="flex items-center gap-1.5">
                <Mic size={13} />
                <span>← Tùy chỉnh lại Giọng đọc AI</span>
              </div>
            </button>

            {/* PROCEED TO REVIEW (STEP 6) */}
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_STEP", payload: 6 })}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition active:scale-98 shadow-xs"
            >
              <span>Tiếp tục: Kiểm duyệt & Xuất (Bước 6)</span>
              <ChevronRight size={15} />
            </button>
          </div>
        ) : (
          /* ========================================================= */
          /* TAB 3: mVOICE STUDIO (SEGMENT-LEVEL AUDIO EDITOR)          */
          /* ========================================================= */
          <div className="space-y-3">
            {/* Hidden audio element for segment chunk playback */}
            <audio
              ref={segmentAudioRef}
              onEnded={() => setPlayingSegmentAudioIdx(null)}
              className="hidden"
            />
            {/* Hidden file input for custom audio chunk upload */}
            <input
              type="file"
              ref={chunkFileInputRef}
              className="hidden"
              accept="audio/*"
              onChange={(e) => {
                if (e.target.files?.[0] && uploadingChunkIdx !== null) {
                  handleUploadCustomChunk(uploadingChunkIdx, e.target.files[0]);
                  setUploadingChunkIdx(null);
                }
              }}
            />

            {/* Quick summary & Search */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[var(--color-primary)]" />
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    Bộ Biên Tập Vi Âm Từng Câu
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold">
                  {filteredSegments.length} / {segments.length} câu
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nội dung câu thoại..."
                  value={segmentSearch}
                  onChange={(e) => setSegmentSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-muted)]"
                />
              </div>
            </div>

            {/* Segment Cards List */}
            <div className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {filteredSegments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-muted)]">
                  Không tìm thấy câu thoại phù hợp với từ khóa "{segmentSearch}"
                </div>
              ) : (
                filteredSegments.map(({ seg, originalIndex: idx }) => {
                  const isSelected = selectedSegmentIdx === idx || activeSegmentIndex === idx;
                  const isPlaying = playingSegmentAudioIdx === idx;
                  const isRegenerating = regeneratingSegmentIdx === idx;
                  const isRecording = recordingSegmentIdx === idx;
                  const override = segmentOverrides[idx] || {};
                  const currentSpeed = override.speed ?? 1.0;
                  const currentSlip = override.slip ?? 0;
                  const durationSec = seg.end - seg.start;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedSegmentIdx(idx);
                        handleVideoSeek(seg.start);
                      }}
                      className={`rounded-xl border p-3 transition space-y-2.5 cursor-pointer ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-surface)] ring-1 ring-[var(--color-primary)]/30 shadow-xs"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-border)]/80"
                      }`}
                    >
                      {/* Card Header: Index, Timecode, Speaker */}
                      <div className="flex items-center justify-between gap-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`flex h-5 min-w-[20px] items-center justify-center rounded-md px-1 text-[10px] font-bold ${
                              isSelected
                                ? "bg-[var(--color-primary)] text-white"
                                : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                            {formatTime(seg.start)} - {formatTime(seg.end)} ({durationSec.toFixed(1)}s)
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {currentSlip !== 0 && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-bold">
                              Slip: {currentSlip > 0 ? `+${currentSlip}` : currentSlip}s
                            </span>
                          )}
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-input-background)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                            {override.speaker || seg.speaker || `Speaker ${selectedSpeaker}`}
                          </span>
                        </div>
                      </div>

                      {/* Original text preview if exists */}
                      {seg.text && seg.text !== seg.translated_text && (
                        <div className="text-[10px] text-[var(--color-text-muted)] italic line-clamp-1 border-l-2 border-zinc-700 pl-2">
                          {seg.text}
                        </div>
                      )}

                      {/* Editable Translated Text */}
                      <textarea
                        value={seg.translated_text || seg.text || ""}
                        onChange={(e) => handleUpdateSegmentText(idx, e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] resize-none"
                        placeholder="Nhập nội dung lời thoại..."
                        onClick={(e) => e.stopPropagation()}
                      />

                      {/* Action Buttons Row 1: Listen Chunk, Micro-TTS, Auto Time-Stretch, Mic, Upload */}
                      <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {/* Play segment audio chunk */}
                        <button
                          type="button"
                          onClick={() => handlePlaySegmentChunk(idx)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
                            isPlaying
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-emerald-500/50 hover:text-emerald-400"
                          }`}
                          title="Nghe thử file audio riêng của câu này (< 50ms)"
                        >
                          {isPlaying ? <Pause size={11} /> : <Play size={11} />}
                          <span>{isPlaying ? "Dừng" : "Nghe chunk"}</span>
                        </button>

                        {/* Micro-TTS Resynthesize (~0.37s) */}
                        <button
                          type="button"
                          onClick={() => handleMicroResynthesize(idx)}
                          disabled={isRegenerating}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition disabled:opacity-50"
                          title="⚡ Micro-TTS: Sinh lại giọng đọc riêng cho câu này trong ~0.37s"
                        >
                          {isRegenerating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                          <span>⚡ Micro-TTS</span>
                        </button>

                        {/* Auto Time-Stretch */}
                        <button
                          type="button"
                          onClick={() => handleAutoTimeStretch(idx)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-indigo-500/40 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 transition"
                          title="Tự động co giãn tốc độ đọc để khớp khít thời lượng khung hình"
                        >
                          <Clock size={11} />
                          <span>Tự khớp nhịp</span>
                        </button>

                        {/* Record Voiceover */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isRecording) {
                              stopRecordingVoiceover();
                            } else {
                              startRecordingVoiceover(idx);
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                            isRecording
                              ? "border-red-500 bg-red-500 text-white animate-pulse"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-red-400"
                          }`}
                          title={isRecording ? "Dừng thu âm" : "Thu âm trực tiếp từ micro đè lên câu thoại này"}
                        >
                          {isRecording ? <Square size={11} /> : <Mic size={11} />}
                          <span>{isRecording ? "Dừng thu" : "Mic"}</span>
                        </button>

                        {/* Upload custom audio file */}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadingChunkIdx(idx);
                            chunkFileInputRef.current?.click();
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition"
                          title="Tải lên tệp âm thanh WAV/MP3 riêng cho câu này"
                        >
                          <Upload size={11} />
                          <span>Tải file</span>
                        </button>
                      </div>

                      {/* Action Controls Row 2: Speed & Slip Nudge */}
                      <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-3 text-[10px]" onClick={(e) => e.stopPropagation()}>
                        {/* Speed adjustment slider */}
                        <div className="flex-1 flex items-center gap-1.5">
                          <span className="text-[var(--color-text-muted)] whitespace-nowrap">Tốc độ:</span>
                          <input
                            type="range"
                            min="0.75"
                            max="1.45"
                            step="0.05"
                            value={currentSpeed}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setSegmentOverrides((prev) => ({
                                ...prev,
                                [idx]: { ...(prev[idx] || {}), speed: val },
                              }));
                            }}
                            className="w-full accent-[var(--color-primary)] h-1 bg-[var(--color-border)] rounded cursor-pointer"
                          />
                          <span className="font-mono font-bold text-[var(--color-primary)] w-8 text-right">
                            {currentSpeed.toFixed(2)}x
                          </span>
                        </div>

                        {/* Slip Timing Nudge buttons (-50ms / +50ms) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[var(--color-text-muted)]">Slip:</span>
                          <button
                            type="button"
                            onClick={() => handleSegmentSlip(idx, -0.05)}
                            className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] active:scale-95 font-mono text-[9px] font-bold"
                            title="Lùi thời điểm phát 50ms"
                          >
                            -50ms
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSegmentSlip(idx, 0.05)}
                            className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] active:scale-95 font-mono text-[9px] font-bold"
                            title="Tiến thời điểm phát 50ms"
                          >
                            +50ms
                          </button>
                          {currentSlip !== 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSegmentOverrides((prev) => {
                                  const next = { ...prev };
                                  if (next[idx]) {
                                    delete next[idx].slip;
                                  }
                                  return next;
                                });
                              }}
                              className="p-1 text-[var(--color-text-muted)] hover:text-red-400"
                              title="Đặt lại slip về 0"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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

        {/* Main Video Review Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[#070b0e] p-2 sm:p-3 shadow-[var(--shadow-card)]">
          {/* Clean Cinema Player Area - No grid, no corner guides, compact modern frame */}
          <div className="flex justify-center items-center bg-black rounded-xl overflow-hidden min-h-[400px] max-h-[580px] border border-zinc-800 shadow-inner relative select-none">
            {/* Floating Cinema Badges (Aspect Ratio & Language & Status) */}
            <div className="absolute top-3 left-3 z-30 pointer-events-none flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-mono font-bold text-white/90 border border-white/15 uppercase">
                {aspectRatio}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-mono text-zinc-300 border border-white/15 uppercase">
                {selectedLanguage}
              </span>
              {isDubbed ? (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/85 backdrop-blur-md text-[9px] font-bold text-white shadow-xs">
                  ✓ Đã Lồng Tiếng
                </span>
              ) : isGeneratingDub ? (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/85 backdrop-blur-md text-[9px] font-bold text-white shadow-xs animate-pulse">
                  Đang render...
                </span>
              ) : null}
            </div>

            {/* Aspect Ratio Video Container Frame */}
            <div
              className={`relative flex w-full justify-center overflow-hidden transition-all duration-300 rounded-lg bg-black ${
                aspectRatio === "9:16"
                  ? "aspect-[9/16] max-h-[520px] max-w-[292px]"
                  : aspectRatio === "1:1"
                  ? "aspect-square max-h-[460px] max-w-[460px]"
                  : aspectRatio === "4:3"
                  ? "aspect-[4/3] max-h-[460px] max-w-[613px]"
                  : "aspect-video max-h-[460px] max-w-[818px]"
              }`}
            >
              {/* Video Element */}
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain cursor-pointer"
                  onClick={toggleVideoPlay}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoaded}
                  onEnded={() => setIsVideoPlaying(false)}
                />
              ) : isGeneratingDub ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-zinc-300 text-center z-10">
                  <Loader2 size={36} className="animate-spin text-[var(--color-primary)]" />
                  <div>
                    <p className="text-xs font-bold text-white">Đang hòa âm nền & kết xuất video lồng tiếng...</p>
                    <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">
                      Quá trình cắt tỉa khung hình và nhúng âm thanh thường mất từ 30-90 giây.
                    </p>
                  </div>
                </div>
              ) : dubbingStatus === "failed" ? (
                <div className="flex flex-col items-center justify-center gap-2.5 p-8 text-center text-red-400 z-10">
                  <AlertTriangle size={36} className="text-red-400" />
                  <div>
                    <p className="text-xs font-bold text-red-300">Kết xuất video thất bại</p>
                    <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">
                      {dubbingError || "Đã xảy ra lỗi trong quá trình kết xuất. Vui lòng thử lại."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={generateDubbedVideo}
                    disabled={isGeneratingDub || !isTTSReady}
                    className="mt-1 flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
                  >
                    <RefreshCw size={12} />
                    <span>Thử lại ngay</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-zinc-400 text-center z-10">
                  <FileVideo size={40} className="text-zinc-600" />
                  <p className="text-xs font-medium text-zinc-300">Không thể tải luồng video xem trước</p>
                </div>
              )}

              {/* Subtitle Overlay tracking spoken dialogue (shown in preview mode when not yet dubbed) */}
              {!isDubbed && showSubtitleOverlay && displayedSubtitleText && (
                <div
                  style={{
                    top: `${positionY}%`,
                    transform: "translateY(-50%)",
                  }}
                  className={`absolute left-3 right-3 z-30 flex flex-col select-none pointer-events-none transition-all duration-100 ${
                    alignment === "left"
                      ? "items-start text-left"
                      : alignment === "right"
                      ? "items-end text-right"
                      : alignment === "justify"
                      ? "items-center text-justify"
                      : "items-center text-center"
                  }`}
                >
                  <div
                    key={`${effect}-${activeSegmentIndex}-${videoCurrentTime < 0.2 ? "init" : "play"}`}
                    className={`px-2.5 py-1 rounded max-w-[94%] ${
                      effect === "pop"
                        ? "sub-anim-pop"
                        : effect === "fade"
                        ? "sub-anim-fade"
                        : effect === "slide"
                        ? "sub-anim-slide"
                        : effect === "karaoke"
                        ? "sub-anim-karaoke"
                        : ""
                    }`}
                    style={{
                      fontFamily: `"${fontName}", sans-serif`,
                      fontSize: `${parseInt(fontSize, 10)}px`,
                      color: primaryColor,
                      WebkitTextStroke:
                        outlineColor && outlineColor !== "transparent"
                          ? `2px ${outlineColor}`
                          : "none",
                      textShadow:
                        outlineColor && outlineColor !== "transparent"
                          ? `0 2px 4px ${outlineColor}`
                          : "none",
                      lineHeight: lineSpacing,
                    }}
                  >
                    <span className="break-words drop-shadow-md font-bold">
                      {displayedSubtitleText}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clean Player Transport Control Bar */}
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 sm:p-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={toggleVideoPlay}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-md hover:bg-[var(--color-primary-hover)] transition active:scale-95"
              >
                {isVideoPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>

              {/* Progress Timeline Scrubber */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span className="text-white font-semibold">{formatTime(videoCurrentTime)}</span>
                  <span>{formatTime(videoDuration)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 100}
                  step={0.1}
                  value={videoCurrentTime}
                  onChange={(e) => handleVideoSeek(parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-primary)] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Volume & Mute */}
              <button
                type="button"
                onClick={toggleMute}
                className="p-2 text-zinc-400 hover:text-white transition rounded-lg hover:bg-zinc-800/60"
                title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
              >
                {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} />}
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
              {/* Subtitle toggle */}
              <div className="flex items-center gap-1.5">
                {!isDubbed ? (
                  <button
                    type="button"
                    onClick={() => setShowSubtitleOverlay((prev) => !prev)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition border ${
                      showSubtitleOverlay
                        ? "border-amber-400/50 bg-amber-500/15 text-amber-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                    title="Bật/Tắt xem trước phụ đề"
                  >
                    {showSubtitleOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{showSubtitleOverlay ? "Phụ đề: Bật" : "Phụ đề: Tắt"}</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={11} />
                    <span>Video đã render hoàn chỉnh</span>
                  </span>
                )}

                {/* Current Active Spoken Dialogue Segment Indicator & Regenerate TTS */}
                {!isDubbed && displayedSubtitleText && (
                  <div className="flex items-center gap-1.5">
                    <span className="hidden sm:inline-block max-w-[280px] truncate text-[10px] text-zinc-400 italic">
                      "{displayedSubtitleText}"
                    </span>
                    {activeSegmentIndex !== -1 && (
                      <button
                        type="button"
                        onClick={() => handleRegenerateSegmentTTS(activeSegmentIndex, displayedSubtitleText)}
                        disabled={regeneratingSegmentIdx === activeSegmentIndex}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-surface-muted)] text-[10px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition border border-[var(--color-border)] cursor-pointer"
                        title="Sinh lại giọng đọc TTS cho riêng câu thoại này"
                      >
                        {regeneratingSegmentIdx === activeSegmentIndex ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <RefreshCw size={10} />
                        )}
                        <span>TTS Câu #{activeSegmentIndex + 1}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status note */}
              <div className="text-[10px] text-zinc-500">
                {!isDubbed ? "Đang phát video với âm thanh gốc" : "Đang phát video lồng tiếng đã kết xuất"}
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Track NLE Studio Timeline powered by @xzdarcy/react-timeline-editor & wavesurfer.js */}
        <NleTimelineEditor
          duration={videoDuration}
          currentTime={videoCurrentTime}
          segments={segments}
          activeSegmentIndex={activeSegmentIndex}
          onSelectSegment={(idx) => {
            setSelectedSegmentIdx(idx);
            setActiveRightTab("mvoice");
            setIsPanelOpen(true);
          }}
          onSeek={handleVideoSeek}
          onUpdateSegment={(idx, updated) => {
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
