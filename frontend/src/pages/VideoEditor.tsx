import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Check,
  AlertCircle,
  Loader2,
  HelpCircle,
  Coins,
} from "lucide-react";
import { videoService } from "../services/video.service";
import { getMySubscriptionSummary } from "../services/subscription.service";
import { EditorPlayer } from "../components/editor/EditorPlayer";
import { EditorTimeline } from "../components/editor/EditorTimeline";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { EditorInspector } from "../components/editor/EditorInspector";
import type { SubtitleSegment, SubtitleStyleConfig, VideoDetail } from "../types/video";
import { splitSegmentIntoTwo } from "../utils/subtitleUtils";

export default function VideoEditor() {
  const navigate = useNavigate();
  const { projectId, videoId } = useParams<{ projectId?: string; videoId: string }>();
  const vidId = parseInt(videoId || "0");

  // Video & Playback State
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [targetLanguage, setTargetLanguage] = useState<string>("vi");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");

  // Subtitle Segments & Active Selection
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  // Subtitle Style Configuration
  const [styleConfig, setStyleConfig] = useState<SubtitleStyleConfig>({
    fontName: "Montserrat",
    fontSize: 22,
    primaryColor: "#FFFFFF",
    outlineColor: "#000000",
    outlineWidth: 3,
    backgroundColor: "transparent",
    position: "bottom",
    maxLines: 2,
    effect: "pop",
    bold: true,
    italic: false,
    uppercase: false,
  });

  // Undo / Redo Stacks & Debounce Ref
  const [history, setHistory] = useState<SubtitleSegment[][]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const historyDebounceRef = useRef<any>(null);

  // Status & Quota
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [remainingWords, setRemainingWords] = useState<number | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // Push state to undo history
  const pushHistory = useCallback((newSegments: SubtitleSegment[]) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyPointer + 1);
      return [...upToCurrent, JSON.parse(JSON.stringify(newSegments))];
    });
    setHistoryPointer((prev) => prev + 1);
    setSaveStatus("unsaved");
  }, [historyPointer]);

  // Load Video, Preview Stream, Segments & Word Quota
  useEffect(() => {
    if (!vidId) return;
    let isMounted = true;
    setIsLoading(true);

    async function loadEditorData() {
      try {
        // 1. Fetch Video Detail
        const vidData = await videoService.getVideo(vidId);
        if (!isMounted) return;
        setVideo(vidData);
        setDuration(vidData.duration || 60);
        const lang = vidData.target_language || "vi";
        setTargetLanguage(lang);

        // 2. Fetch Video Stream URL
        try {
          const previewUrl = await videoService.getDubbedVideoPreview(vidId, lang);
          if (isMounted) setVideoUrl(previewUrl);
        } catch {
          // Fallback to original video blob
          try {
            const blob = await videoService.getVideoBlob(vidId);
            if (isMounted) setVideoUrl(URL.createObjectURL(blob));
          } catch {
            console.warn("Could not load direct video stream");
          }
        }

        // 3. Fetch Subtitle Segments
        try {
          const segData = await videoService.getSubtitleSegments(vidId, lang);
          if (segData?.segments && Array.isArray(segData.segments) && segData.segments.length > 0) {
            if (isMounted) {
              setSegments(segData.segments);
              setHistory([JSON.parse(JSON.stringify(segData.segments))]);
              setHistoryPointer(0);
            }
          } else if (vidData.transcript_path) {
            // Fallback to transcript
            const trans = await videoService.getTranscript(vidId);
            if (trans?.segments && isMounted) {
              setSegments(trans.segments);
              setHistory([JSON.parse(JSON.stringify(trans.segments))]);
              setHistoryPointer(0);
            }
          }
        } catch (e) {
          console.warn("No segments found yet:", e);
        }

        // 4. Fetch User Word Quota
        try {
          const quotaRes = await getMySubscriptionSummary();
          const wordsQuota = quotaRes.effective_quota?.words;
          if (wordsQuota && isMounted) {
            setRemainingWords(wordsQuota.remaining_words);
          } else if (quotaRes.effective_quota?.credits && isMounted) {
            setRemainingWords(quotaRes.effective_quota.credits.remaining_credits * 150);
          }
        } catch {
          // Gracefully keep quota null if fetch fails
          if (isMounted) setRemainingWords(null);
        }
      } catch (err) {
        console.error("Failed to load editor data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadEditorData();
    return () => {
      isMounted = false;
    };
  }, [vidId]);

  // SEGMENT EDITING OPERATIONS
  const handleSelectSegment = useCallback((index: number) => {
    setActiveSegmentIndex(index);
    setSegments((currentSegs) => {
      if (currentSegs[index]) {
        setCurrentTime(currentSegs[index].start);
      }
      return currentSegs;
    });
  }, []);

  const handleUpdateSegment = useCallback(
    (index: number, updated: Partial<SubtitleSegment>, immediateHistory: boolean = false) => {
      setSegments((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], ...updated };
        }
        setSaveStatus("unsaved");

        if (immediateHistory) {
          pushHistory(next);
        } else {
          // Debounce history snapshot for typing so 30 keystrokes don't create 30 full clones
          if (historyDebounceRef.current) {
            clearTimeout(historyDebounceRef.current);
          }
          historyDebounceRef.current = setTimeout(() => {
            pushHistory(next);
          }, 800);
        }
        return next;
      });
    },
    [pushHistory]
  );

  const handleSplitSegment = useCallback(
    (index: number, splitTime: number) => {
      setSegments((prev) => {
        const target = prev[index];
        if (!target) return prev;

        const [seg1, seg2] = splitSegmentIntoTwo(target, splitTime);
        const next = [...prev.slice(0, index), seg1, seg2, ...prev.slice(index + 1)];
        pushHistory(next);
        setActiveSegmentIndex(index + 1);
        return next;
      });
    },
    [pushHistory]
  );

  const handleDeleteSegment = useCallback(
    (index: number) => {
      setSegments((prev) => {
        const next = prev.filter((_, i) => i !== index);
        pushHistory(next);
        return next;
      });
      setActiveSegmentIndex(null);
    },
    [pushHistory]
  );

  const handleAddSegment = useCallback(
    (time: number) => {
      setSegments((prev) => {
        const newSeg: SubtitleSegment = {
          id: Date.now(),
          start: parseFloat(time.toFixed(3)),
          end: parseFloat((time + 3.0).toFixed(3)),
          text: "Đoạn phụ đề mới",
          translated_text: "Đoạn phụ đề mới",
          speaker: "SPEAKER_00",
        };

        // Insert sorted by start time
        const next = [...prev, newSeg].sort((a, b) => a.start - b.start);
        const newIdx = next.indexOf(newSeg);
        pushHistory(next);
        setActiveSegmentIndex(newIdx);
        return next;
      });
    },
    [pushHistory]
  );

  // Undo / Redo
  const handleUndo = () => {
    if (historyPointer > 0) {
      const prevPtr = historyPointer - 1;
      setHistoryPointer(prevPtr);
      setSegments(JSON.parse(JSON.stringify(history[prevPtr])));
      setSaveStatus("unsaved");
    }
  };

  const handleRedo = () => {
    if (historyPointer < history.length - 1) {
      const nextPtr = historyPointer + 1;
      setHistoryPointer(nextPtr);
      setSegments(JSON.parse(JSON.stringify(history[nextPtr])));
      setSaveStatus("unsaved");
    }
  };

  // SAVE SUBTITLES & STYLES (0 Quota Consumption!)
  const handleSave = async () => {
    if (!vidId) return;
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      await videoService.updateSubtitleSegments(vidId, targetLanguage, segments, styleConfig);
      setSaveStatus("saved");
    } catch (e) {
      console.error("Save error:", e);
      setSaveStatus("unsaved");
    } finally {
      setIsSaving(false);
    }
  };

  // Hotkey listener for Ctrl+S, Ctrl+Z, Ctrl+Y, Space
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isEditingText =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        Boolean(activeEl?.isContentEditable);

      // Space: Play / Pause (only if not typing in input)
      if (e.code === "Space" && !isEditingText) {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }

      // Ctrl + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }

      // Ctrl + Z: Undo (only if not typing in text fields)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !isEditingText) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl + Y or Ctrl + Shift + Z: Redo (only if not typing in text fields)
      if (
        (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")) &&
        !isEditingText
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [historyPointer, history, segments, styleConfig, vidId, targetLanguage]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-medium text-zinc-400">Đang khởi tạo trình dựng Video Editor...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen xl:h-screen w-full bg-zinc-950 text-zinc-100 overflow-x-hidden overflow-y-auto xl:overflow-hidden font-sans">
      {/* ========================================================= */}
      {/* TOP HEADER NAVIGATION BAR */}
      {/* ========================================================= */}
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 z-40 shadow-sm flex-shrink-0">
        {/* Left: Back & Project Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              projectId ? navigate(`/workspace/project/${projectId}`) : navigate("/workspace")
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition text-xs font-medium border border-zinc-700/60 shadow"
            title="Quay lại dự án"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dự án</span>
          </button>

          <div className="h-4 w-px bg-zinc-700/80" />

          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white truncate max-w-[280px]">
              {video?.title || "Video Translation Project"}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {targetLanguage.toUpperCase()} • {aspectRatio} • {segments.length} phụ đề
            </span>
          </div>
        </div>

        {/* Center: Undo / Redo & Save Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-950/80 px-1 py-0.5 rounded-xl border border-zinc-800">
            <button
              onClick={handleUndo}
              disabled={historyPointer <= 0}
              className={`p-1.5 rounded-lg transition ${
                historyPointer > 0
                  ? "hover:bg-zinc-800 text-zinc-300 hover:text-white"
                  : "text-zinc-600 cursor-not-allowed"
              }`}
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleRedo}
              disabled={historyPointer >= history.length - 1}
              className={`p-1.5 rounded-lg transition ${
                historyPointer < history.length - 1
                  ? "hover:bg-zinc-800 text-zinc-300 hover:text-white"
                  : "text-zinc-600 cursor-not-allowed"
              }`}
              title="Làm lại (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Auto-save Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-[11px]">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span className="text-zinc-300">Đang lưu...</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">Đã lưu</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-medium">Chưa lưu</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Word Quota Balance, Shortcuts, Save Button */}
        <div className="flex items-center gap-3">
          {/* Word Quota Badge */}
          {remainingWords !== null && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-950/50 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 font-mono shadow"
              title="Số từ còn lại trong gói của bạn (Tokenize Quota)"
            >
              <Coins className="w-3.5 h-3.5 text-indigo-400" />
              <span>{remainingWords.toLocaleString()} từ khả dụng</span>
            </div>
          )}

          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 border border-emerald-500/25 rounded-xl text-[11px] text-emerald-400 font-medium"
            title="Chỉnh sửa nội dung & kiểu dáng phụ đề không tiêu tốn credit"
          >
            <span>Sửa phụ đề: 0 Credits</span>
          </div>

          {/* Shortcuts Help */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            title="Phím tắt chỉnh sửa"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Save Changes Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs shadow-md shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN WORKSPACE: 3-COLUMN SPLIT (Sidebar, Player, Inspector) */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-visible xl:overflow-hidden min-h-0">
        {/* Left: Subtitle Segments & Style Customizer */}
        <div className="w-full xl:w-80 flex-shrink-0 h-[420px] xl:h-full overflow-hidden border-b xl:border-b-0 xl:border-r border-zinc-800">
          <EditorSidebar
            segments={segments}
            activeSegmentIndex={activeSegmentIndex}
            onSelectSegment={handleSelectSegment}
            onUpdateSegment={handleUpdateSegment}
            onDeleteSegment={handleDeleteSegment}
            onAddSegment={handleAddSegment}
            onSplitSegment={handleSplitSegment}
            onSeek={(t) => setCurrentTime(t)}
            styleConfig={styleConfig}
            onChangeStyle={(updated) => {
              setStyleConfig((prev) => ({ ...prev, ...updated }));
              setSaveStatus("unsaved");
            }}
            currentTime={currentTime}
          />
        </div>

        {/* Center: Live Video Player Canvas */}
        <div className="flex-1 flex flex-col p-3 bg-zinc-950 min-h-[360px] xl:min-h-0 overflow-hidden">
          <EditorPlayer
            videoUrl={videoUrl}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onSeek={(t) => {
              setCurrentTime(t);
            }}
            segments={segments}
            styleConfig={styleConfig}
            activeSegmentIndex={activeSegmentIndex}
            aspectRatio={aspectRatio}
            onToggleAspectRatio={() =>
              setAspectRatio((r) => (r === "16:9" ? "9:16" : "16:9"))
            }
          />
        </div>

        {/* Right: Active Segment Inspector & Global Theme */}
        <div className="w-full xl:w-80 flex-shrink-0 h-[400px] xl:h-full overflow-hidden border-b xl:border-b-0 xl:border-l border-zinc-800">
          <EditorInspector
            segment={activeSegmentIndex !== null ? segments[activeSegmentIndex] : null}
            segmentIndex={activeSegmentIndex}
            currentTime={currentTime}
            onUpdateSegment={handleUpdateSegment}
            onSplitSegment={handleSplitSegment}
            onClearSelection={() => setActiveSegmentIndex(null)}
            styleConfig={styleConfig}
            onChangeStyle={(updated) => {
              setStyleConfig((prev) => ({ ...prev, ...updated }));
              setSaveStatus("unsaved");
            }}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM PANEL: MULTI-TRACK NLE TIMELINE EDITOR */}
      {/* ========================================================= */}
      <div className="h-56 flex-shrink-0 z-30 sticky bottom-0 bg-zinc-950 border-t border-zinc-800">
        <EditorTimeline
          duration={duration}
          currentTime={currentTime}
          segments={segments}
          activeSegmentIndex={activeSegmentIndex}
          onSelectSegment={handleSelectSegment}
          onSeek={(t) => {
            setCurrentTime(t);
          }}
          onUpdateSegment={handleUpdateSegment}
          onSplitSegment={handleSplitSegment}
          onDeleteSegment={handleDeleteSegment}
          onAddSegment={handleAddSegment}
          audioUrl={videoUrl}
        />
      </div>

      {/* SHORTCUTS MODAL */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-4">
              <h3 className="font-semibold text-white text-sm">Phím tắt Video Editor</h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-zinc-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-zinc-300">
              <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                <span>Phát / Tạm dừng video</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-200">
                  Space
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                <span>Chia tách phụ đề tại Playhead</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-200">
                  S
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                <span>Xóa đoạn phụ đề đã chọn</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-200">
                  Delete / Backspace
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                <span>Hoàn tác (Undo)</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-200">
                  Ctrl + Z
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                <span>Làm lại (Redo)</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-200">
                  Ctrl + Y
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                <span>Lưu thay đổi phụ đề & font</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-200">
                  Ctrl + S
                </kbd>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
