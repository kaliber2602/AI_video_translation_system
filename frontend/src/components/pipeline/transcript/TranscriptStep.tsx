import { useEffect, useState, useRef, useMemo } from "react";
import {
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../../hooks/usePipeline";
import { useHybridProgress } from "../../../hooks/useHybridProgress";
import { videoService } from "../../../services/video.service";
import { exportToSRT, exportToVTT, exportToJSON, exportToCSV } from "../../../utils/subtitleUtils";
import PipelineStepLayout from "../PipelineStepLayout";
import TranscriptPlayer from "./TranscriptPlayer";
import TranscriptToolsPanel from "./TranscriptToolsPanel";
import TranscriptSegmentList, { type TranscriptSegment } from "./TranscriptSegmentList";

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
    segments: TranscriptSegment[];
    language: string;
  } | null>(null);
  const [editingSegment, setEditingSegment] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [editingSpeakerIdx, setEditingSpeakerIdx] = useState<number | null>(null);
  const [editingSpeakerText, setEditingSpeakerText] = useState<string>("");

  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hybrid Real-time Progress (Mechanism 1: WebSocket with Mechanism 3: REST fallback)
  const hybrid = useHybridProgress(state.video?.videoId, "transcript", async () => {
    if (state.video?.videoId) {
      try {
        const data = await videoService.getTranscript(state.video.videoId);
        if (data && data.segments && Array.isArray(data.segments)) {
          setTranscript(data);
          dispatch({ type: "SET_TRANSCRIPT", payload: data });
          setIsGenerating(false);
          setTaskProgress(100);
          setActiveRightTab("transcript");
          setIsPanelOpen(true);
        }
      } catch (err) {
        console.warn("Auto-reload transcript on WS completion:", err);
      }
    }
  });

  useEffect(() => {
    if (isGenerating || (hybrid.progress > 0 && hybrid.progress < 100)) {
      if (hybrid.progress > 0) {
        setTaskProgress(hybrid.progress);
      }
      if (hybrid.message) {
        setTaskMessage(hybrid.message);
      }
      if (hybrid.status === "failed") {
        setIsGenerating(false);
        setTranscriptionError(hybrid.message || "Bóc băng thất bại");
      }
    }
  }, [hybrid.progress, hybrid.message, hybrid.status, isGenerating]);

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
      if (videoUrl && videoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

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

  const loadVideoPreview = async () => {
    if (!state.video?.videoId) return;
    try {
      const url = videoService.getVideoStreamUrl(state.video.videoId, "original");
      setVideoUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
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

        if (activeTask && (activeTask.current_step === "transcript" || activeTask.current_step === "whisperx")) {
          if (typeof activeTask.progress === "number" && activeTask.progress > 0) {
            setTaskProgress(activeTask.progress);
          }
          if (activeTask.message) {
            setTaskMessage(activeTask.message);
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
    setTaskProgress(0);
    setTaskMessage("Đang khởi tạo tác vụ bóc băng...");
    setTranscriptionError(null);
    setTranscriptionNotice(null);

    try {
      try {
        await videoService.extractAudio(state.video.videoId);
      } catch (extractErr: any) {
        console.log("Audio extraction status:", extractErr.message || extractErr);
      }

      const data = await videoService.startTranscription(state.video.videoId, false);
      
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
        setTaskMessage(null);
      } else if (data && (data.status === "processing" || data.job_id || data.celery_task_id)) {
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

  const handleConfirmSplit = async (
    index: number,
    splitTime: number,
    textPart1: string,
    textPart2: string
  ) => {
    if (!transcript || !transcript.segments[index] || !state.video?.videoId) return;
    const target = transcript.segments[index];

    const seg1 = { ...target, end: splitTime, text: textPart1 };
    const seg2 = { ...target, start: splitTime, text: textPart2 };

    const newSegments = [
      ...transcript.segments.slice(0, index),
      seg1,
      seg2,
      ...transcript.segments.slice(index + 1),
    ];

    setTranscript({ ...transcript, segments: newSegments });
    dispatch({ type: "SET_TRANSCRIPT", payload: { ...transcript, segments: newSegments } });

    // Persist to backend transcript.json and database
    setIsSaving(true);
    try {
      await videoService.updateTranscript(state.video.videoId, { segments: newSegments });
    } catch (err) {
      console.error("Failed to persist split transcript segments:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMergeWithPrev = async (index: number) => {
    if (!transcript || index <= 0 || !transcript.segments[index - 1] || !transcript.segments[index] || !state.video?.videoId) return;
    const prev = transcript.segments[index - 1];
    const cur = transcript.segments[index];

    const merged = {
      ...prev,
      end: cur.end,
      text: `${prev.text} ${cur.text}`.trim(),
    };

    const newSegments = [
      ...transcript.segments.slice(0, index - 1),
      merged,
      ...transcript.segments.slice(index + 1),
    ];

    setTranscript({ ...transcript, segments: newSegments });
    dispatch({ type: "SET_TRANSCRIPT", payload: { ...transcript, segments: newSegments } });

    // Persist to backend transcript.json and database
    setIsSaving(true);
    try {
      await videoService.updateTranscript(state.video.videoId, { segments: newSegments });
    } catch (err) {
      console.error("Failed to persist merged transcript segments:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMergeWithNext = async (index: number) => {
    if (!transcript || !transcript.segments[index] || !transcript.segments[index + 1] || !state.video?.videoId) return;
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

    // Persist to backend transcript.json and database
    setIsSaving(true);
    try {
      await videoService.updateTranscript(state.video.videoId, { segments: newSegments });
    } catch (err) {
      console.error("Failed to persist merged transcript segments:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSpeaker = async (index: number, newSpeaker: string) => {
    if (!transcript || !transcript.segments[index] || !state.video?.videoId) return;
    const updated = [...transcript.segments];
    updated[index] = { ...updated[index], speaker: newSpeaker.trim() || "Speaker" };
    setTranscript({ ...transcript, segments: updated });
    dispatch({ type: "SET_TRANSCRIPT", payload: { ...transcript, segments: updated } });
    setEditingSpeakerIdx(null);

    try {
      await videoService.updateTranscript(state.video.videoId, {
        segment_id: index,
        speaker: newSpeaker.trim() || "Speaker",
      });
    } catch (err) {
      console.error("Failed to update speaker:", err);
    }
  };

  const handleExportFormat = (fmt: "srt" | "vtt" | "json" | "csv" | "txt" | "txt-time") => {
    if (!transcript || !transcript.segments || transcript.segments.length === 0) return;
    let content = "";
    let mimeType = "text/plain;charset=utf-8";
    let filename = `transcript_${state.video?.videoId || "export"}.${fmt === "txt-time" ? "txt" : fmt}`;

    const formatTimestamp = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    if (fmt === "srt") {
      content = exportToSRT(transcript.segments, "text");
      mimeType = "application/x-subrip;charset=utf-8";
    } else if (fmt === "vtt") {
      content = exportToVTT(transcript.segments, "text");
      mimeType = "text/vtt;charset=utf-8";
    } else if (fmt === "json") {
      content = exportToJSON(transcript.segments);
      mimeType = "application/json;charset=utf-8";
    } else if (fmt === "csv") {
      content = exportToCSV(transcript.segments);
      mimeType = "text/csv;charset=utf-8";
    } else if (fmt === "txt-time") {
      content = transcript.segments
        .map((s) => `[${formatTimestamp(s.start)} - ${formatTimestamp(s.end)}] ${s.text}`)
        .join("\n");
    } else {
      content = transcript.segments.map((s) => s.text).join("\n");
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSegments = useMemo(() => {
    if (!transcript?.segments) return [];
    if (!searchQuery.trim()) return transcript.segments;
    const q = searchQuery.toLowerCase();
    return transcript.segments.filter((s) => s.text && s.text.toLowerCase().includes(q));
  }, [transcript?.segments, searchQuery]);

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
            <span>{t("pipeline:steps.transcript.toolsTab", "Tùy chọn nhận dạng")}</span>
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
          : t("pipeline:steps.transcript.toolsTab", "Tùy chọn nhận dạng")
      }
      toolPanel={
        activeRightTab === "transcript" ? (
          <TranscriptSegmentList
            transcript={transcript}
            filteredSegments={filteredSegments}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSaving={isSaving}
            isGenerating={isGenerating}
            taskProgress={taskProgress}
            activeSegmentIndex={activeSegmentIndex}
            segmentRefs={segmentRefs}
            editingSegment={editingSegment}
            editingText={editingText}
            setEditingText={setEditingText}
            setEditingSegment={setEditingSegment}
            editingSpeakerIdx={editingSpeakerIdx}
            editingSpeakerText={editingSpeakerText}
            setEditingSpeakerText={setEditingSpeakerText}
            setEditingSpeakerIdx={setEditingSpeakerIdx}
            currentTime={currentTime}
            onSeek={handleSeek}
            onSaveSpeaker={handleSaveSpeaker}
            onConfirmSplit={handleConfirmSplit}
            onMergeWithPrev={handleMergeWithPrev}
            onMergeWithNext={handleMergeWithNext}
            onUpdateSegment={handleUpdateSegment}
            onOpenTools={() => setActiveRightTab("tools")}
          />
        ) : (
          <TranscriptToolsPanel
            whisperModel={whisperModel}
            setWhisperModel={setWhisperModel}
            updateTranscriptionConfig={updateTranscriptionConfig}
            isGenerating={isGenerating}
            isGlobalTaskRunning={isGlobalTaskRunning}
            transcriptionNotice={transcriptionNotice}
            transcriptionError={transcriptionError}
            totalSegments={transcript?.segments?.length || 0}
            sourceLang={transcript?.language}
            taskMessage={taskMessage}
            taskProgress={taskProgress}
            onGenerateTranscript={generateTranscript}
            onContinue={() => dispatch({ type: "SET_STEP", payload: 3 })}
            onExportFormat={handleExportFormat}
          />
        )
      }
    >
      <TranscriptPlayer
        videoRef={videoRef}
        videoUrl={videoUrl}
        filename={state.video?.filename}
        isPlaying={isPlaying}
        segmentCount={transcript?.segments?.length || 0}
        language={transcript?.language}
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onPlay={() => {
          setIsPlaying(true);
          setIsPanelOpen(true);
          setActiveRightTab("transcript");
        }}
        onPause={() => setIsPlaying(false)}
      />
    </PipelineStepLayout>
  );
}
