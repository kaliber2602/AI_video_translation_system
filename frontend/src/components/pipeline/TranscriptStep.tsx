import { useEffect, useState, useRef, useMemo } from "react";
import {
  Download,
  FileText,
  Play,
  Pause,
  Loader2,
  Sparkles,
  Scissors,
  Merge,
  User,
  ArrowRight,
  Cpu,
  Check,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";
import PipelineStepLayout from "./PipelineStepLayout";

export default function TranscriptStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const isGlobalTaskRunning = Boolean(
    state.stepsSummary?.active_task &&
      (state.stepsSummary.active_task.status === "processing" ||
        state.stepsSummary.active_task.status === "queued") &&
      !isGenerating
  );
  const [isSaving, setIsSaving] = useState(false);
  const [whisperModel, setWhisperModel] = useState(
    state.pipelineConfig?.transcription?.model_size || "whisper-medium"
  );
  const [enableDiarization, setEnableDiarization] = useState<boolean>(
    state.pipelineConfig?.transcription?.diarization ?? true
  );
  const [minSpeakers, setMinSpeakers] = useState<number>(
    state.pipelineConfig?.transcription?.min_speakers ?? 1
  );
  const [maxSpeakers, setMaxSpeakers] = useState<number>(
    state.pipelineConfig?.transcription?.max_speakers ?? 5
  );
  const [filterFillers, setFilterFillers] = useState<boolean>(
    Boolean(state.pipelineConfig?.transcription?.filter_fillers)
  );
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [transcriptionNotice, setTranscriptionNotice] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const segmentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const [activeRightTab, setActiveRightTab] = useState<"transcript" | "tools">("transcript");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const hasInitializedTab = useRef(false);

  const [transcript, setTranscript] = useState<{
    segments: Array<{ start: number; end: number; text: string; speaker: string }>;
    language: string;
  } | null>(null);
  const [editingSegment, setEditingSegment] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [editingSpeakerIdx, setEditingSpeakerIdx] = useState<number | null>(null);
  const [editingSpeakerText, setEditingSpeakerText] = useState<string>("");

  const [taskProgress, setTaskProgress] = useState<number>(0);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    stopPolling();
    loadTranscript();
    loadVideoPreview();
  }, [state.video?.videoId]);

  useEffect(() => {
    if (!hasInitializedTab.current && !isLoading) {
      if (!transcript || !transcript.segments || transcript.segments.length === 0) {
        setActiveRightTab("tools");
      } else {
        setActiveRightTab("transcript");
      }
      hasInitializedTab.current = true;
    }
  }, [isLoading, transcript]);

  useEffect(() => {
    if (state.presetConfig) {
      const cfg = state.presetConfig;
      const transcription = cfg.config_data?.transcription || {};
      const rawModel = transcription.model_size || cfg.stt_model || "";
      if (rawModel.includes("large")) {
        setWhisperModel("whisper-large-v3");
      } else if (rawModel.includes("base")) {
        setWhisperModel("whisper-base");
      } else if (rawModel) {
        setWhisperModel("whisper-medium");
      }

      const diarVal = transcription.diarization !== undefined ? transcription.diarization : cfg.enable_diarization;
      if (diarVal !== undefined) {
        const isEnabled = typeof diarVal === "object" && diarVal !== null ? Boolean((diarVal as any).enabled) : Boolean(diarVal);
        setEnableDiarization(isEnabled);
      }
      if (transcription.min_speakers) setMinSpeakers(transcription.min_speakers);
      if (transcription.max_speakers) setMaxSpeakers(transcription.max_speakers);
      if (transcription.filter_fillers !== undefined) setFilterFillers(Boolean(transcription.filter_fillers));
    }
  }, [state.presetConfig]);
  const updateTranscriptionConfig = (updates: any) => {
    dispatch({
      type: "UPDATE_PIPELINE_CONFIG",
      payload: {
        transcription: {
          ...(state.pipelineConfig?.transcription || {}),
          ...updates,
        },
      },
    });
  };

  const handleToggleTranscriptTab = () => {
    if (isPanelOpen && activeRightTab === "transcript") {
      setIsPanelOpen(false);
    } else {
      setActiveRightTab("transcript");
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

  const loadVideoPreview = async () => {
    if (!state.video?.videoId) return;
    try {
      const blob = await videoService.getVideoBlob(state.video.videoId);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (error) {
      console.warn("Original video preview unavailable:", error);
    }
  };

  const pollTranscriptionStatus = (videoId: number) => {
    stopPolling();

    const checkStatus = async () => {
      try {
        const summary = await videoService.getStepsSummary(videoId);
        const transcriptStep = summary?.steps?.transcript;
        const activeTask = summary?.active_task;

        if (activeTask && activeTask.current_step === "transcript") {
          if (typeof activeTask.progress === "number" && activeTask.progress > 0) {
            setTaskProgress(activeTask.progress);
          }
          if (activeTask.status === "failed") {
            stopPolling();
            setIsGenerating(false);
            setTranscriptionError(activeTask.error_message || "Bóc băng thất bại trong Celery worker");
            return;
          }
        }

        if (
          transcriptStep?.status === "completed" ||
          (transcriptStep?.segment_count && transcriptStep.segment_count > 0 && !activeTask)
        ) {
          stopPolling();
          try {
            const data = await videoService.getTranscript(videoId);
            if (data && data.segments && Array.isArray(data.segments)) {
              setTranscript(data);
              dispatch({
                type: "SET_TRANSCRIPT",
                payload: data,
              });

              if (state.video) {
                dispatch({
                  type: "SET_VIDEO",
                  payload: {
                    ...state.video,
                    transcriptPath: transcriptStep?.transcript_path || data.transcript_path || `outputs/transcript_${videoId}/transcript.json`,
                    progress: Math.max(state.video.progress || 0, 40),
                    currentStep: "transcript",
                  },
                });
              }
              window.dispatchEvent(new CustomEvent("subscription-updated"));
            }
          } catch (loadErr: any) {
            console.warn("Failed to load completed transcript:", loadErr);
          }
          setIsGenerating(false);
          setTaskProgress(100);
          setActiveRightTab("transcript");
          setIsPanelOpen(true);
        } else if (transcriptStep?.status === "failed") {
          stopPolling();
          setIsGenerating(false);
          setTranscriptionError(activeTask?.error_message || "Bóc băng thất bại");
        }
      } catch (err: any) {
        console.warn("Polling transcript status error:", err);
      }
    };

    checkStatus();
    pollingTimerRef.current = setInterval(checkStatus, 2500);
  };

  const loadTranscript = async () => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      // Check active Celery task for F5 resilience
      try {
        const summary = await videoService.getStepsSummary(state.video.videoId);
        const transcriptStep = summary?.steps?.transcript;
        const activeTask = summary?.active_task;

        if (
          transcriptStep?.status === "processing" ||
          (activeTask?.current_step === "transcript" &&
            (activeTask?.status === "processing" || activeTask?.status === "queued"))
        ) {
          setIsGenerating(true);
          if (typeof activeTask?.progress === "number") {
            setTaskProgress(activeTask.progress);
          }
          pollTranscriptionStatus(state.video.videoId);
        }
      } catch (sumErr) {
        console.warn("Could not check steps summary on mount:", sumErr);
      }

      const data = await videoService.getTranscript(state.video.videoId);
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
      setTranscript(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTranscript = async () => {
    if (!state.video?.videoId) return;
    setIsGenerating(true);
    setTaskProgress(10);
    setTranscriptionError(null);
    setTranscriptionNotice(null);

    try {
      try {
        await videoService.extractAudio(state.video.videoId);
      } catch (extractErr: any) {
        console.log("Audio extraction status:", extractErr.message || extractErr);
      }

      const data = await videoService.startTranscription(state.video.videoId, enableDiarization);
      
      // Case 1: Synchronous response (if sync=True or data returned directly)
      if (data && data.segments && Array.isArray(data.segments)) {
        setTranscript(data);
        if (data.message && data.message.includes("fallback")) {
          setTranscriptionNotice(data.message);
        }
        dispatch({
          type: "SET_TRANSCRIPT",
          payload: data,
        });

        if (state.video) {
          dispatch({
            type: "SET_VIDEO",
            payload: {
              ...state.video,
              transcriptPath: data.transcript_path || `outputs/transcript_${state.video.videoId}/transcript.json`,
              progress: Math.max(state.video.progress || 0, 40),
              currentStep: "transcript",
            },
          });
        }

        window.dispatchEvent(new CustomEvent("subscription-updated"));
        setIsGenerating(false);
        setTaskProgress(100);
      } 
      // Case 2: Asynchronous HTTP 202 Accepted response (Celery worker running)
      else if (data && (data.status === "processing" || data.job_id || data.celery_task_id)) {
        setTaskProgress(15);
        pollTranscriptionStatus(state.video.videoId);
      } else {
        throw new Error(data?.message || "Invalid transcript data received");
      }
      
    } catch (error: any) {
      console.error("Transcription failed:", error);
      const msg = error.response?.data?.detail || error.response?.data?.message || error.message || "Transcription failed";
      setTranscriptionError(msg);
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
    } catch (error: any) {
      console.error("Failed to update segment:", error);
      setTranscriptionError(error.message || "Failed to update segment");
    } finally {
      setIsSaving(false);
    }
  };

  const activeSegmentIndex = useMemo(() => {
    if (!transcript?.segments || transcript.segments.length === 0) return -1;
    return transcript.segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime <= seg.end
    );
  }, [transcript?.segments, currentTime]);

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
      setActiveRightTab("transcript");
    }
    setCurrentTime(time);
  };

  const handleSplitSegment = (index: number) => {
    if (!transcript || !transcript.segments[index] || !state.video?.videoId) return;
    const target = transcript.segments[index];
    const duration = target.end - target.start;
    if (duration < 0.6) return;

    let splitTime = currentTime;
    if (splitTime <= target.start + 0.2 || splitTime >= target.end - 0.2) {
      splitTime = parseFloat((target.start + duration / 2).toFixed(2));
    }

    const words = (target.text || "").trim().split(/\s+/);
    const midWord = Math.max(1, Math.floor(words.length / 2));
    const text1 = words.slice(0, midWord).join(" ");
    const text2 = words.slice(midWord).join(" ");

    const seg1 = { ...target, end: splitTime, text: text1 || target.text };
    const seg2 = { ...target, start: splitTime, text: text2 || "..." };

    const newSegments = [
      ...transcript.segments.slice(0, index),
      seg1,
      seg2,
      ...transcript.segments.slice(index + 1),
    ];

    setTranscript({ ...transcript, segments: newSegments });
    dispatch({ type: "SET_TRANSCRIPT", payload: { ...transcript, segments: newSegments } });
  };

  // Pro Video Editing Shortcut: Ctrl+K / Cmd+K splits active segment at playhead
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (activeSegmentIndex !== -1) {
          handleSplitSegment(activeSegmentIndex);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSegmentIndex, currentTime, transcript]);

  const handleMergeWithNext = (index: number) => {
    if (!transcript || !transcript.segments[index] || !transcript.segments[index + 1]) return;
    const cur = transcript.segments[index];
    const next = transcript.segments[index + 1];

    const merged = {
      ...cur,
      end: next.end,
      text: `${cur.text} ${next.text}`.trim(),
    };

    const newSegments = [
      ...transcript.segments.slice(0, index),
      merged,
      ...transcript.segments.slice(index + 2),
    ];

    setTranscript({ ...transcript, segments: newSegments });
    dispatch({ type: "SET_TRANSCRIPT", payload: { ...transcript, segments: newSegments } });
  };

  const handleSaveSpeaker = (index: number, newSpeaker: string) => {
    if (!transcript || !transcript.segments[index]) return;
    const updated = [...transcript.segments];
    updated[index] = { ...updated[index], speaker: newSpeaker.trim() || "Speaker" };
    setTranscript({ ...transcript, segments: updated });
    setEditingSpeakerIdx(null);
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

  const filteredSegments = useMemo(() => {
    if (!transcript?.segments) return [];
    if (!searchQuery.trim()) return transcript.segments;
    const q = searchQuery.toLowerCase();
    return transcript.segments.filter((s) => s.text && s.text.toLowerCase().includes(q));
  }, [transcript?.segments, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Đang tải bản bóc băng...</span>
      </div>
    );
  }

  return (
    <PipelineStepLayout
      stepBadge={t("pipeline:header.stepBadge", { current: "02", total: "06" })}
      stepCategory="Speech-to-Text Studio"
      stepTitle={t("pipeline:steps.transcript.title")}
      stepDescription={t("pipeline:steps.transcript.description")}
      error={transcriptionError}
      onDismissError={() => setTranscriptionError(null)}
      hideDefaultToggle={true}
      isPanelOpen={isPanelOpen}
      onTogglePanel={(open) => setIsPanelOpen(open)}
      panelWidth={
        activeRightTab === "transcript"
          ? "w-full lg:w-[460px] xl:w-[500px]"
          : "w-full lg:w-[360px]"
      }
      headerActions={
        <div className="flex items-center gap-2">
          {/* Toggle Transcript Tab Button */}
          <button
            type="button"
            onClick={handleToggleTranscriptTab}
            title={
              isPanelOpen && activeRightTab === "transcript"
                ? t("pipeline:steps.transcript.hideTranscript", "Ẩn lời thoại")
                : t("pipeline:steps.transcript.showTranscript", "Xem lời thoại")
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
              isPanelOpen && activeRightTab === "transcript"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]"
            }`}
          >
            <FileText size={13} />
            <span>{t("pipeline:steps.transcript.transcriptTab", "Bản bóc băng")}</span>
            {transcript?.segments?.length ? (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isPanelOpen && activeRightTab === "transcript"
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                }`}
              >
                {transcript.segments.length}
              </span>
            ) : null}
          </button>

          {/* Toggle Tools Tab Button */}
          <button
            type="button"
            onClick={handleToggleToolsTab}
            title={
              isPanelOpen && activeRightTab === "tools"
                ? t("pipeline:steps.transcript.hideTools", "Ẩn tùy chọn")
                : t("pipeline:steps.transcript.showTools", "Hiện tùy chọn")
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
              isPanelOpen && activeRightTab === "tools"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]"
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>{t("pipeline:steps.transcript.toolsTab", "Tùy chọn Whisper")}</span>
          </button>
        </div>
      }
      toolPanelIcon={
        activeRightTab === "transcript" ? (
          <FileText size={15} className="text-[var(--color-primary)] shrink-0" />
        ) : (
          <SlidersHorizontal size={15} className="text-[var(--color-primary)] shrink-0" />
        )
      }
      toolPanelTitle={
        activeRightTab === "transcript"
          ? `${t("pipeline:steps.transcript.transcriptTab", "Bản bóc băng")}${
              transcript?.segments?.length ? ` (${transcript.segments.length})` : ""
            }`
          : t("pipeline:steps.transcript.toolsTab", "Tùy chọn Whisper")
      }
      toolPanel={
        activeRightTab === "transcript" ? (
          <div className="space-y-3">
            {/* Search & Saving status */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("pipeline:steps.transcript.searchPlaceholder", "Tìm kiếm lời thoại...")}
                  className="w-full h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
                />
              </div>
              {isSaving && (
                <span className="text-[11px] text-amber-400 animate-pulse font-medium shrink-0 flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" />
                  <span>{t("pipeline:steps.transcript.saving", "Đang lưu...")}</span>
                </span>
              )}
            </div>

            {/* Segments list or empty state */}
            {!transcript || !transcript.segments || transcript.segments.length === 0 ? (
              isGenerating ? (
                <div className="py-10 flex flex-col items-center justify-center text-center px-4 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">
                      Đang bóc băng và nhận dạng giọng nói...
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] font-mono">
                      Tiến trình Celery Worker: {taskProgress}%
                    </p>
                  </div>
                  <div className="w-48 bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(8, taskProgress)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] max-w-xs">
                    Tác vụ đang chạy nền trên Celery worker. Bạn có thể tải lại trang (F5) mà không làm gián đoạn tiến trình.
                  </p>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] mb-3">
                    <Cpu size={24} />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {t(
                      "pipeline:steps.transcript.emptyTranscript",
                      "Chưa có bản bóc băng cho video này. Chọn thẻ 'Tùy chọn Whisper' và nhấn 'Bắt đầu bóc băng Whisper' để khởi chạy."
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveRightTab("tools")}
                    className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] transition"
                  >
                    <SlidersHorizontal size={13} />
                    <span>{t("pipeline:steps.transcript.openTools", "Mở tùy chọn")}</span>
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar">
                {filteredSegments.map((seg) => {
                  const index = transcript.segments.indexOf(seg);
                  const isActive = activeSegmentIndex === index;
                  return (
                    <div
                      key={index}
                      ref={(el) => {
                        segmentRefs.current[index] = el;
                      }}
                      className={`rounded-xl border p-3 transition-all duration-200 ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/25 ring-2 ring-[var(--color-primary)]/70 shadow-md border-l-4 border-l-[var(--color-primary)] scale-[1.01]"
                          : "border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)]/40"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                        <button
                          type="button"
                          onClick={() => handleSeek(seg.start)}
                          className={`flex items-center gap-1 font-mono font-medium transition ${
                            isActive
                              ? "text-[var(--color-primary)] font-bold"
                              : "hover:text-[var(--color-primary)] text-[var(--color-text-secondary)]"
                          }`}
                          title={t("pipeline:steps.transcript.seekTooltip", "Nhấp để tua video")}
                        >
                          <Play size={10} className={isActive ? "fill-current text-[var(--color-primary)]" : ""} />
                          <span className="text-[11px]">
                            {formatTime(seg.start)} → {formatTime(seg.end)}
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {editingSpeakerIdx === index ? (
                            <input
                              type="text"
                              value={editingSpeakerText}
                              onChange={(e) => setEditingSpeakerText(e.target.value)}
                              className="h-5 w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 text-[11px] text-[var(--color-text-primary)] font-medium outline-none focus:border-[var(--color-primary)]"
                              autoFocus
                              onBlur={() => handleSaveSpeaker(index, editingSpeakerText)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveSpeaker(index, editingSpeakerText);
                                if (e.key === "Escape") setEditingSpeakerIdx(null);
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSpeakerIdx(index);
                                setEditingSpeakerText(seg.speaker || "Speaker");
                              }}
                              className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                              title={t("pipeline:steps.transcript.renameSpeakerTooltip", "Nhấp để đổi tên người nói")}
                            >
                              <User size={11} />
                              <span className="truncate max-w-[80px]">{seg.speaker || "Speaker"}</span>
                            </button>
                          )}

                          <div className="h-3 w-px bg-[var(--color-border)] mx-0.5" />

                          <button
                            type="button"
                            onClick={() => handleSplitSegment(index)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-[var(--color-surface)] rounded transition"
                            title={t("pipeline:steps.transcript.splitTooltip", "Chia đôi câu thoại")}
                          >
                            <Scissors size={12} />
                          </button>

                          {index < transcript.segments.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMergeWithNext(index)}
                              className="p-1 text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-[var(--color-surface)] rounded transition"
                              title={t("pipeline:steps.transcript.mergeTooltip", "Gộp với câu tiếp theo")}
                            >
                              <Merge size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {editingSegment === index ? (
                        <div>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-[60px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingSegment(null);
                            }}
                          />
                          <div className="mt-1.5 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateSegment(index, editingText)}
                              disabled={isSaving}
                              className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
                            >
                              {isSaving ? <Loader2 size={11} className="animate-spin" /> : t("pipeline:steps.transcript.save", "Lưu")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSegment(null)}
                              className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
                            >
                              {t("pipeline:steps.transcript.cancel", "Hủy")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="cursor-pointer text-xs leading-relaxed text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
                          onClick={() => {
                            setEditingSegment(index);
                            setEditingText(seg.text);
                          }}
                          title={t("pipeline:steps.transcript.editTextTooltip", "Nhấp để chỉnh sửa nội dung")}
                        >
                          {seg.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Clean Single Dropdown for Whisper Model */}
            <div>
              <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
                {t("pipeline:steps.transcript.modelSelectLabel", "Mô hình nhận dạng:")}
              </label>
              <select
                value={whisperModel}
                onChange={(e) => {
                  setWhisperModel(e.target.value);
                  updateTranscriptionConfig({ model_size: e.target.value });
                }}
                disabled={isGenerating}
                className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
              >
                <option value="whisper-large-v3">Whisper Large-v3 (Chính xác cao nhất & Đa ngữ xuất sắc)</option>
                <option value="whisper-medium">Whisper Medium (Cân bằng & Chuẩn xác)</option>
                <option value="whisper-small">Whisper Small (Nhanh & Tiết kiệm bộ nhớ)</option>
                <option value="whisper-base">Whisper Base (Tốc độ tối đa)</option>
                <option value="whisperx-large-v3">WhisperX Large-v3 (Khớp mốc thời gian từng từ)</option>
              </select>

              {/* Speaker Diarization Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer mt-3 text-xs text-[var(--color-text-secondary)] select-none">
                <input
                  type="checkbox"
                  checked={enableDiarization}
                  onChange={(e) => {
                    setEnableDiarization(e.target.checked);
                    updateTranscriptionConfig({ diarization: e.target.checked });
                  }}
                  disabled={isGenerating}
                  className="h-3.5 w-3.5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                />
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {t("pipeline:steps.transcript.enableDiarization", "Phân tách người nói (Pyannote 3.1)")}
                </span>
              </label>

              {enableDiarization ? (
                <div className="mt-2.5 space-y-2 p-2.5 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)]">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--color-text-muted)] block mb-1">Số người tối thiểu:</span>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={minSpeakers}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setMinSpeakers(val);
                          updateTranscriptionConfig({ min_speakers: val });
                        }}
                        disabled={isGenerating}
                        className="w-full h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs font-mono text-center text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--color-text-muted)] block mb-1">Số người tối đa:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={maxSpeakers}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 5;
                          setMaxSpeakers(val);
                          updateTranscriptionConfig({ max_speakers: val });
                        }}
                        disabled={isGenerating}
                        className="w-full h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs font-mono text-center text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-[var(--color-text-secondary)] select-none">
                    <input
                      type="checkbox"
                      checked={filterFillers}
                      onChange={(e) => {
                        setFilterFillers(e.target.checked);
                        updateTranscriptionConfig({ filter_fillers: e.target.checked });
                      }}
                      disabled={isGenerating}
                      className="h-3 w-3 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                    <span className="text-[11px]">Lọc bỏ từ đệm (à, ừm, like, you know...)</span>
                  </label>
                </div>
              ) : (
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 pl-5.5">
                  Tắt để nhận diện nhanh trên CPU (mặc định 1 người nói).
                </p>
              )}

              <div className="mt-2.5 p-2 rounded-lg bg-[var(--color-surface-muted)] text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                <Scissors size={12} className="text-amber-400 shrink-0" />
                <span>Mẹo: Nhấn <strong className="text-[var(--color-text-primary)] font-mono">Ctrl+K</strong> để chia cắt câu thoại ngay tại vị trí video đang phát.</span>
              </div>
            </div>

            {transcriptionNotice && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <span className="font-bold shrink-0">ℹ️ Lưu ý:</span>
                <span>{transcriptionNotice}</span>
              </div>
            )}

            {transcriptionError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️ Lỗi:</span>
                <span className="break-words flex-1">{transcriptionError}</span>
              </div>
            )}

            {/* Live Stats */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">
                    {t("pipeline:steps.transcript.totalSegments", "Tổng số câu:")}
                  </span>
                  <p className="font-bold text-[var(--color-text-primary)] font-mono text-sm mt-0.5">
                    {transcript?.segments?.length || 0} câu
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">
                    {t("pipeline:steps.transcript.sourceLang", "Ngôn ngữ gốc:")}
                  </span>
                  <p className="font-bold text-[var(--color-text-primary)] font-mono text-sm mt-0.5 uppercase">
                    {transcript?.language || "Tự động"}
                  </p>
                </div>
              </div>
            </div>

            {/* Export TXT */}
            {transcript && transcript.segments && transcript.segments.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={handleExportTranscript}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  <Download size={13} />
                  <span>{t("pipeline:steps.transcript.exportTxt", "Xuất tệp văn bản (.TXT)")}</span>
                </button>
              </div>
            )}

            {/* Celery Async Progress Indicator */}
            {isGenerating && (
              <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-primary)]">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-[var(--color-primary)]" />
                    <span>
                      {taskProgress < 30
                        ? "Đang chuẩn bị âm thanh..."
                        : taskProgress < 70
                        ? "Đang bóc băng Whisper..."
                        : taskProgress < 95
                        ? "Đang phân tách người nói (Diarization)..."
                        : "Đang lưu trữ dữ liệu..."}
                    </span>
                  </span>
                  <span className="font-mono font-bold text-[var(--color-primary)]">{taskProgress}%</span>
                </div>
                <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(8, taskProgress)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  Tác vụ đang chạy nền trên Celery worker. Bạn có thể tải lại trang (F5) mà không làm gián đoạn tiến trình.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={generateTranscript}
                disabled={isGenerating || isGlobalTaskRunning}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-2.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50 active:scale-98 shadow-xs"
              >
                {isGenerating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                <span>
                  {isGenerating
                    ? t("pipeline:steps.transcript.extracting", "Đang trích xuất lời thoại...")
                    : isGlobalTaskRunning
                    ? "Tác vụ ngầm đang chạy (Đã khóa)"
                    : transcript
                    ? t("pipeline:steps.transcript.retranscribe", "Bóc băng lại Whisper")
                    : t("pipeline:steps.transcript.startTranscribe", "Bắt đầu bóc băng Whisper")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => dispatch({ type: "SET_STEP", payload: 3 })}
                disabled={!transcript || !transcript.segments || transcript.segments.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(24,195,170,0.25)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
              >
                <span>{t("pipeline:steps.transcript.continueTranslation", "Tiếp tục: Dịch thuật (Translation)")}</span>
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] pt-1">
              <span className="flex items-center gap-1">
                <Check size={12} className="text-emerald-400" />
                <span>{t("pipeline:steps.transcript.permanentStorage", "Lưu trữ vĩnh viễn")}</span>
              </span>
              <span className="font-semibold text-emerald-400">{t("pipeline:steps.transcript.synced", "Đã đồng bộ")}</span>
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
                setActiveRightTab("transcript");
              }}
              onPause={() => setIsPlaying(false)}
              className="max-h-[580px] w-full object-contain"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-xl">
              <Play size={24} fill="currentColor" />
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
                  ? t("pipeline:steps.transcript.playing", "Đang phát")
                  : t("pipeline:steps.transcript.paused", "Tạm dừng")}
              </span>
            </p>
            <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
              {transcript?.segments?.length || 0} {t("pipeline:steps.reviewExport.segmentCount", "câu thoại")} • {transcript?.language?.toUpperCase() || "AUTO"}
            </p>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${
              transcript?.segments?.length ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {transcript?.segments?.length ? "✓ Đã bóc băng" : "Chưa bóc băng"}
          </span>
        </div>
      </div>
    </PipelineStepLayout>
  );
}