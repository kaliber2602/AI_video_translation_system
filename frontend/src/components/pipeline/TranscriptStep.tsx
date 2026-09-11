// TranscriptStep.tsx
import { useEffect, useState, useRef, useMemo } from "react";
import {
  CheckCircle2,
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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function TranscriptStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const segmentRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [transcript, setTranscript] = useState<{
    segments: Array<{ start: number; end: number; text: string; speaker: string }>;
    language: string;
  } | null>(null);
  const [editingSegment, setEditingSegment] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [editingSpeakerIdx, setEditingSpeakerIdx] = useState<number | null>(null);
  const [editingSpeakerText, setEditingSpeakerText] = useState<string>("");

  useEffect(() => {
    loadTranscript();
    loadVideoPreview();
  }, [state.video?.videoId]);

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
    setTranscriptionError(null);

    try {
      // 1. Ensure audio is extracted first so transcription doesn't fail with HTTP 400
      try {
        await videoService.extractAudio(state.video.videoId);
      } catch (extractErr: any) {
        console.log("Audio extraction status:", extractErr.message || extractErr);
      }

      // 2. Start transcription
      const data = await videoService.startTranscription(state.video.videoId);
      
      // ✅ Make sure we have valid data
      if (data && data.segments && Array.isArray(data.segments)) {
        setTranscript(data);
        dispatch({
          type: "SET_TRANSCRIPT",
          payload: data,
        });

        // Notify sidebar & settings to update credit balance
        window.dispatchEvent(new CustomEvent("subscription-updated"));
      } else {
        throw new Error(data?.message || "Invalid transcript data received");
      }
      
    } catch (error: any) {
      console.error("Transcription failed:", error);
      setTranscriptionError(error.message || "Transcription failed");
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
        block: "nearest",
      });
    }
  }, [activeSegmentIndex]);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
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

      {transcriptionError && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-500">
          <p className="text-sm font-medium">Error: {transcriptionError}</p>
          <button
            type="button"
            onClick={() => setTranscriptionError(null)}
            className="mt-2 text-xs underline hover:text-red-400 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Responsive Media Player */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[#101920] p-4 sm:p-5">
          <div className="relative flex max-h-[460px] min-h-[260px] w-full items-center justify-center overflow-hidden rounded-xl bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="max-h-[460px] w-full object-contain"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,90,95,0.4),transparent_65%)]" />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-xl">
                  <Play size={22} fill="currentColor" />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate max-w-xs flex items-center gap-2">
                <span>{state.video?.filename || "Video"}</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded bg-zinc-800/80">
                  {isPlaying ? <Pause size={10} className="text-emerald-400" /> : <Play size={10} />}
                  {isPlaying ? "Đang phát" : "Tạm dừng"}
                </span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">
                {transcript?.segments?.length || 0} câu thoại • {transcript?.language?.toUpperCase() || "Tự động"}
              </p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                transcript ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {transcript ? "✓ Đã bóc băng" : "Chưa tạo"}
            </span>
          </div>
        </div>

        {/* Synchronized Transcript Segments List */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <FileText size={19} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Transcript Lời thoại
                </h3>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {transcript?.language?.toUpperCase() || "Tự động"} • {transcript?.segments?.length || 0} câu thoại
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
                Chưa có bản bóc băng cho video này. Nhấn nút dưới đây để trích xuất tự động bằng Whisper.
              </p>
              <button
                type="button"
                onClick={generateTranscript}
                disabled={isGenerating}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50 active:scale-95"
              >
                {isGenerating ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Sparkles size={17} />
                )}
                {isGenerating ? "Đang trích xuất lời thoại..." : "Bắt đầu Bóc băng Whisper"}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 max-h-[480px] space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {transcript.segments.map((seg, index) => {
                  const isActive = activeSegmentIndex === index;
                  return (
                    <div
                      key={index}
                      ref={(el) => {
                        segmentRefs.current[index] = el;
                      }}
                      className={`rounded-xl border p-4 transition-all duration-200 ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/25 ring-2 ring-[var(--color-primary)]/30 shadow-sm"
                          : "border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)]/50"
                      }`}
                    >
                      {/* Segment Meta & Controls */}
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                        {/* Clickable timecode seek */}
                        <button
                          type="button"
                          onClick={() => handleSeek(seg.start)}
                          className={`flex items-center gap-1.5 font-mono font-medium transition ${
                            isActive
                              ? "text-[var(--color-primary)] font-bold"
                              : "hover:text-[var(--color-primary)] text-[var(--color-text-secondary)]"
                          }`}
                          title="Nhấp để tua video tới giây này"
                        >
                          <Play size={11} className={isActive ? "fill-current text-[var(--color-primary)]" : ""} />
                          <span>
                            {formatTime(seg.start)} → {formatTime(seg.end)}
                          </span>
                        </button>

                        {/* Speaker & Action Buttons */}
                        <div className="flex items-center gap-2">
                          {editingSpeakerIdx === index ? (
                            <input
                              type="text"
                              value={editingSpeakerText}
                              onChange={(e) => setEditingSpeakerText(e.target.value)}
                              className="h-6 w-28 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 text-xs text-[var(--color-text-primary)] font-medium outline-none focus:border-[var(--color-primary)]"
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
                              className="flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline"
                              title="Nhấp để đổi tên người nói"
                            >
                              <User size={12} />
                              <span>{seg.speaker || "Speaker"}</span>
                            </button>
                          )}

                          <div className="h-3 w-px bg-[var(--color-border)] mx-0.5" />

                          {/* Split button */}
                          <button
                            type="button"
                            onClick={() => handleSplitSegment(index)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-[var(--color-surface)] rounded transition"
                            title="Chia đôi câu thoại tại con trỏ"
                          >
                            <Scissors size={13} />
                          </button>

                          {/* Merge with next */}
                          {index < transcript.segments.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMergeWithNext(index)}
                              className="p-1 text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-[var(--color-surface)] rounded transition"
                              title="Gộp với câu thoại tiếp theo"
                            >
                              <Merge size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Segment Text / Edit Input */}
                      {editingSegment === index ? (
                        <div>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-[80px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm leading-6 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingSegment(null);
                            }}
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateSegment(index, editingText)}
                              disabled={isSaving}
                              className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
                            >
                              {isSaving ? <Loader2 size={14} className="animate-spin" /> : "Lưu"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSegment(null)}
                              className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="cursor-pointer text-sm leading-6 text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
                          onClick={() => {
                            setEditingSegment(index);
                            setEditingText(seg.text);
                          }}
                          title="Nhấp để chỉnh sửa nội dung văn bản"
                        >
                          {seg.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Persistent Bottom Action Bar */}
      {transcript && transcript.segments && transcript.segments.length > 0 && (
        <div className="sticky bottom-4 z-30 flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-[var(--color-text-primary)]">Bản bóc băng hoàn tất: </span>
              <span className="text-[var(--color-text-muted)]">{transcript.segments.length} câu thoại sẵn sàng dịch thuật</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => dispatch({ type: "SET_STEP", payload: 3 })}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[var(--color-primary)]/30 transition hover:bg-[var(--color-primary-hover)] active:scale-95"
          >
            <span>Tiếp tục: Dịch thuật (Translation)</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}