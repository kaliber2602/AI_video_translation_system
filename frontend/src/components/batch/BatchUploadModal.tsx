import { useState, useEffect, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileVideo,
  Check,
  X,
  Loader2,
  Play,
} from "lucide-react";
import Dialog from "../common/Dialog";
import Button from "../common/Button";
import { toast } from "../../lib/toast";
import { videoService } from "../../services/video.service";
import { getPresets, type PipelinePreset } from "../../services/preset.service";
import { createBatchJob, type BatchJobDetail } from "../../services/batch.service";
import type { ProjectFolder } from "../../types/project";
import { useSubscriptionPlan } from "../../hooks/useSubscriptionPlan";
import { isPresetProTier } from "./BatchProcessModal";

export interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  folders: ProjectFolder[];
  defaultFolderId?: number | null;
  onUploadCompleted?: (uploadedVideoIds: number[]) => void;
  onBatchStarted?: (batch: BatchJobDetail) => void;
  onOpenPresetStudio?: () => void;
}

interface FileQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "pending" | "uploading" | "completed" | "failed" | "cancelled";
  progress: number;
  speed?: string;
  eta?: string;
  errorMessage?: string;
  videoId?: number;
  abortController?: AbortController;
}

const MAX_CONCURRENT_UPLOADS = 3;

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function BatchUploadModal({
  isOpen,
  onClose,
  projectId,
  folders,
  defaultFolderId = null,
  onUploadCompleted,
  onBatchStarted,
  onOpenPresetStudio,
}: BatchUploadModalProps) {
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const { isPro } = useSubscriptionPlan();

  // Settings
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(defaultFolderId);
  const [presets, setPresets] = useState<PipelinePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>("vi");
  const [batchName, setBatchName] = useState<string>("");

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadsCountRef = useRef<number>(0);
  const queueRef = useRef<FileQueueItem[]>([]);
  const hasCompletedRef = useRef<boolean>(false);
  queueRef.current = queue;

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFolderId(defaultFolderId);

    async function loadPresets() {
      try {
        const list = await getPresets();
        setPresets(list);
        if (list.length > 0) {
          const def = list.find((p) => p.is_default) || list[0];
          setSelectedPresetId(def.id);
          setTargetLanguage(def.target_language || "vi");
        }
      } catch (err) {
        console.error("Failed to load presets for batch upload:", err);
      }
    }
    loadPresets();
  }, [isOpen, defaultFolderId]);

  const addFilesToQueue = (files: FileList | File[]) => {
    const validExtensions = [".mp4", ".mov", ".mkv", ".avi", ".webm"];
    const newItems: FileQueueItem[] = [];

    Array.from(files).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        toast.warning(`Tệp ${file.name} không phải định dạng video được hỗ trợ.`);
        return;
      }

      const isDuplicate = queueRef.current.some(
        (item) => item.name === file.name && item.size === file.size
      );
      if (isDuplicate) return;

      newItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        file,
        name: file.name,
        size: file.size,
        status: "pending",
        progress: 0,
      });
    });

    if (newItems.length > 0) {
      const updated = [...queueRef.current, ...newItems];
      queueRef.current = updated;
      setQueue(updated);
      if (!batchName) {
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        setBatchName(`Batch Upload (${updated.length} videos) - ${dateStr}`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      e.target.value = "";
    }
  };

  const removeItem = (id: string) => {
    const item = queueRef.current.find((q) => q.id === id);
    if (item && item.status === "uploading" && item.abortController) {
      item.abortController.abort();
    }
    const updated = queueRef.current.filter((q) => q.id !== id);
    queueRef.current = updated;
    setQueue(updated);
  };

  const checkAndRunNextInQueue = useCallback(() => {
    const currentQueue = queueRef.current;
    const pendingItems = currentQueue.filter((item) => item.status === "pending");

    while (
      activeUploadsCountRef.current < MAX_CONCURRENT_UPLOADS &&
      pendingItems.length > 0
    ) {
      const nextItem = pendingItems.shift();
      if (!nextItem) break;
      startSingleUpload(nextItem.id);
    }

    const allDone = currentQueue.length > 0 && currentQueue.every(
      (item) => item.status === "completed" || item.status === "failed" || item.status === "cancelled"
    );

    if (allDone && activeUploadsCountRef.current === 0 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      setIsProcessingQueue(false);
      handleAllUploadsFinished();
    }
  }, []);

  const startSingleUpload = (itemId: string) => {
    const item = queueRef.current.find((q) => q.id === itemId);
    if (!item || item.status !== "pending") return;

    activeUploadsCountRef.current += 1;
    const abortController = new AbortController();

    const markedUploading = queueRef.current.map((q) =>
      q.id === itemId
        ? { ...q, status: "uploading" as const, progress: 0, abortController }
        : q
    );
    queueRef.current = markedUploading;
    setQueue(markedUploading);

    const startTime = Date.now();

    videoService
      .uploadVideo(
        item.file,
        targetLanguage,
        projectId,
        selectedFolderId || undefined,
        (percent) => {
          const now = Date.now();
          const elapsedSec = (now - startTime) / 1000;
          const uploadedBytes = (item.size * percent) / 100;
          const speedBytesPerSec = elapsedSec > 0 ? uploadedBytes / elapsedSec : 0;
          const remainingBytes = item.size - uploadedBytes;
          const etaSec = speedBytesPerSec > 0 ? Math.round(remainingBytes / speedBytesPerSec) : 0;

          const updated = queueRef.current.map((q) =>
            q.id === itemId
              ? {
                  ...q,
                  progress: percent,
                  speed: `${(speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`,
                  eta: etaSec > 0 ? `${etaSec}s` : undefined,
                }
              : q
          );
          queueRef.current = updated;
          setQueue(updated);
        },
        abortController.signal
      )
      .then((res) => {
        const videoId = res.video_id || res.id;
        const updated = queueRef.current.map((q) =>
          q.id === itemId
            ? {
                ...q,
                status: "completed" as const,
                progress: 100,
                videoId,
                abortController: undefined,
              }
            : q
        );
        queueRef.current = updated;
        setQueue(updated);
      })
      .catch((err: any) => {
        const isCancelled = abortController.signal.aborted;
        const updated = queueRef.current.map((q) =>
          q.id === itemId
            ? {
                ...q,
                status: (isCancelled ? "cancelled" : "failed") as "cancelled" | "failed",
                errorMessage: isCancelled ? "Đã hủy" : err.message || "Lỗi tải lên",
                abortController: undefined,
              }
            : q
        );
        queueRef.current = updated;
        setQueue(updated);
      })
      .finally(() => {
        activeUploadsCountRef.current = Math.max(0, activeUploadsCountRef.current - 1);
        checkAndRunNextInQueue();
      });
  };

  const handleStartQueue = () => {
    if (queueRef.current.length === 0) return;

    const chosen = presets.find((p) => p.id === selectedPresetId);
    if (!isPro && chosen && isPresetProTier(chosen)) {
      toast.error(
        "Cấu hình yêu cầu gói Pro",
        `Preset "${chosen.name}" sử dụng mô hình thuộc gói Pro. Vui lòng chọn Preset Miễn phí hoặc nâng cấp tài khoản.`
      );
      return;
    }
    hasCompletedRef.current = false;
    setIsProcessingQueue(true);
    const resetQueue = queueRef.current.map((q) =>
      q.status === "failed" || q.status === "cancelled"
        ? { ...q, status: "pending" as const, progress: 0, errorMessage: undefined }
        : q
    );
    queueRef.current = resetQueue;
    setQueue(resetQueue);
    setTimeout(() => {
      checkAndRunNextInQueue();
    }, 50);
  };

  const handleCancelAll = () => {
    queueRef.current.forEach((item) => {
      if (item.status === "uploading" && item.abortController) {
        item.abortController.abort();
      }
    });
    activeUploadsCountRef.current = 0;
    setIsProcessingQueue(false);
    setQueue((prev) =>
      prev.map((q) =>
        q.status === "uploading" || q.status === "pending"
          ? { ...q, status: "cancelled", errorMessage: "Đã hủy" }
          : q
      )
    );
  };

  const handleAllUploadsFinished = async () => {
    const completedItems = queueRef.current.filter((item) => item.status === "completed" && item.videoId);
    const videoIds = completedItems.map((item) => item.videoId!);

    if (videoIds.length === 0) {
      toast.error("Không có video nào tải lên thành công.");
      return;
    }

    toast.success(`Đã tải lên thành công ${videoIds.length} video!`);

    if (onBatchStarted) {
      setIsCreatingBatch(true);
      try {
        const finalBatchName =
          batchName.trim() ||
          `Batch (${videoIds.length} video) - ${new Date().toLocaleDateString()}`;

        const chosenPreset = presets.find((p) => p.id === selectedPresetId);
        if (!isPro && chosenPreset && isPresetProTier(chosenPreset)) {
          toast.error("Preset đã chọn thuộc gói Pro. Vui lòng chọn Preset phù hợp gói Free hoặc nâng cấp tài khoản.");
          if (onUploadCompleted) onUploadCompleted(videoIds);
          setIsCreatingBatch(false);
          return;
        }
        const batch = await createBatchJob(projectId, {
          name: finalBatchName,
          video_ids: videoIds,
          preset_id: selectedPresetId || undefined,
        });

        toast.success(`Đã khởi chạy tiến trình xử lý hàng loạt: ${batch.name}`);
        onBatchStarted(batch);
        onClose();
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Lỗi khởi chạy batch job tự động");
        if (onUploadCompleted) onUploadCompleted(videoIds);
      } finally {
        setIsCreatingBatch(false);
      }
    } else {
      if (onUploadCompleted) onUploadCompleted(videoIds);
      onClose();
    }
  };

  const completedCount = queue.filter((q) => q.status === "completed").length;
  const uploadingCount = queue.filter((q) => q.status === "uploading").length;
  const totalCount = queue.length;
  const overallPercent =
    totalCount > 0
      ? Math.round(
          queue.reduce((acc, cur) => acc + cur.progress, 0) / totalCount
        )
      : 0;

  const isSelectedPresetPro = selectedPreset ? isPresetProTier(selectedPreset) : false;
  const isBlockedByPlan = !isPro && isSelectedPresetPro;

  // Extract model specs from config_data or fallback fields
  const sepModel = selectedPreset?.config_data?.audio_separation?.model || "none";
  const sttModel = selectedPreset?.config_data?.transcription?.model_size || selectedPreset?.stt_model || "whisper-medium";
  const transModel = selectedPreset?.config_data?.translation?.model_name || selectedPreset?.translation_model || "nllb_200_1.3b";
  const ttsEngine = selectedPreset?.config_data?.tts_dubbing?.engine || selectedPreset?.tts_model || "edge_tts";
  const burnSub = selectedPreset?.burn_subtitles ?? true;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={isProcessingQueue ? () => {} : onClose}
      title={
        <div className="flex items-center gap-2.5 text-lg font-bold text-[var(--color-text-primary)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <UploadCloud size={20} />
          </div>
          <span>Tải Lên Hàng Loạt (Batch Upload) & Tự Động Xử Lý</span>
        </div>
      }
      description="Kéo thả nhiều video để tải lên và tự động chuyển tiếp vào hàng đợi xử lý Pipeline tuần tự."
      maxWidth="4xl"
      showCloseButton={!isProcessingQueue}
    >
      <div className="flex flex-col gap-4 pt-1">
        {/* Main 2-Column Layout: Left Controls + Right Preset Inspection Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT COLUMN: Controls & Upload Queue (7 cols on LG) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Quick Settings Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5">
              {/* Folder */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
                  Thư mục:
                </label>
                <div className="flex items-center h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2">
                  <select
                    value={selectedFolderId || ""}
                    onChange={(e) => setSelectedFolderId(e.target.value ? Number(e.target.value) : null)}
                    disabled={isProcessingQueue}
                    className="w-full bg-transparent text-xs text-[var(--color-text-primary)] outline-none cursor-pointer truncate"
                  >
                    <option value="">Gốc (Project Root)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preset Select (Clean, no clutter labels) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                    Preset AI:
                  </label>
                  {onOpenPresetStudio && (
                    <button
                      type="button"
                      onClick={onOpenPresetStudio}
                      disabled={isProcessingQueue}
                      className="flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      Studio
                    </button>
                  )}
                </div>
                <select
                  value={selectedPresetId || ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedPresetId(id);
                    const found = presets.find((p) => p.id === id);
                    if (found) setTargetLanguage(found.target_language || "vi");
                  }}
                  disabled={isProcessingQueue}
                  className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
                  Ngôn ngữ đích:
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  disabled={isProcessingQueue}
                  className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="vi">Tiếng Việt (vi)</option>
                  <option value="en">English (en)</option>
                  <option value="zh">Chinese (zh)</option>
                  <option value="ja">Japanese (ja)</option>
                  <option value="ko">Korean (ko)</option>
                  <option value="fr">French (fr)</option>
                  <option value="de">German (de)</option>
                  <option value="es">Spanish (es)</option>
                </select>
              </div>
            </div>

            {/* Dropzone Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isProcessingQueue && fileInputRef.current?.click()}
              className={`group flex items-center justify-center rounded-xl border-2 border-dashed transition cursor-pointer select-none ${
                queue.length > 0 ? "py-2.5 px-4 gap-2.5" : "flex-col p-6"
              } ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-indigo-500/50 hover:bg-[var(--color-surface)]"
              } ${isProcessingQueue ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".mp4,.mov,.mkv,.avi,.webm"
                onChange={handleFileChange}
                className="hidden"
              />
              {queue.length > 0 ? (
                <>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
                    <UploadCloud size={16} />
                  </div>
                  <p className="text-xs font-medium text-[var(--color-text-primary)]">
                    Kéo thả thêm video hoặc <span className="text-indigo-400 font-semibold underline">duyệt từ máy tính</span>
                  </p>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
                    <UploadCloud size={22} />
                  </div>
                  <p className="mt-2 text-xs font-bold text-[var(--color-text-primary)]">
                    Kéo thả các video vào đây hoặc <span className="text-indigo-400 underline">duyệt từ máy tính</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                    Hỗ trợ MP4, MOV, MKV, AVI, WEBM. Có thể chọn nhiều tệp cùng lúc.
                  </p>
                </>
              )}
            </div>

            {/* Queue List Header & Overall Progress */}
            {queue.length > 0 && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      Hàng đợi tải lên: {completedCount}/{totalCount} hoàn tất
                    </span>
                    {uploadingCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 animate-pulse">
                        <Loader2 size={12} className="animate-spin" /> Đang tải {uploadingCount} luồng
                      </span>
                    )}
                  </div>

                  {!isProcessingQueue && (
                    <button
                      type="button"
                      onClick={() => setQueue([])}
                      className="text-[11px] text-[var(--color-text-muted)] hover:text-rose-400 transition cursor-pointer"
                    >
                      Xóa danh sách
                    </button>
                  )}
                </div>

                {/* Total progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>

                {/* Queue Items Scroll Box */}
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs transition"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2.5">
                        <FileVideo size={16} className="text-indigo-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="truncate font-medium text-[var(--color-text-primary)] max-w-[200px]" title={item.name}>
                              {item.name}
                            </span>
                            <span className="text-[11px] text-[var(--color-text-muted)] shrink-0 ml-2">
                              {formatBytes(item.size)}
                            </span>
                          </div>

                          {/* Progress bar for item */}
                          {item.status === "uploading" && (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                                <div
                                  className="h-full bg-indigo-500 transition-all duration-200"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-indigo-400 font-medium shrink-0">
                                {item.progress}% {item.speed && `• ${item.speed}`} {item.eta && `• còn ${item.eta}`}
                              </span>
                            </div>
                          )}

                          {item.errorMessage && (
                            <p className="mt-0.5 text-[10px] text-rose-400 truncate">
                              {item.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Item Status / Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        {item.status === "completed" && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <Check size={14} /> Xong
                          </span>
                        )}
                        {item.status === "uploading" ? (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                            title="Hủy upload"
                          >
                            <X size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={isProcessingQueue}
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Xóa khỏi hàng đợi"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Dedicated Preset Inspection Sidebar Panel (5 cols on LG) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-3.5 space-y-3">
            <div className="space-y-3">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Chi tiết quy trình AI
                  </span>
                </div>
                {selectedPreset && (
                  isSelectedPresetPro ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Gói Pro
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Miễn phí
                    </span>
                  )
                )}
              </div>

              {/* Preset Title & Description */}
              {selectedPreset ? (
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    {selectedPreset.name}
                  </h4>
                  {selectedPreset.description && (
                    <p className="mt-1 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                      {selectedPreset.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)] italic">
                  Chưa chọn cấu hình mẫu nào.
                </p>
              )}

              {/* 5-Step Pipeline Models Breakdown */}
              {selectedPreset && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                      Tách âm thanh:
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {sepModel === "none" ? "Bỏ qua" : sepModel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                      Nhận dạng (STT):
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {sttModel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                      Dịch thuật (NMT):
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {transModel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                      Lồng tiếng (TTS):
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {ttsEngine === "none" ? "Tắt (Chỉ phụ đề)" : ttsEngine}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                      Định dạng phụ đề:
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {burnSub ? "Hardsub (cháy vào video)" : "Softsub (phụ đề rời)"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Plan Validation Warning Banner at bottom of sidebar */}
            {isBlockedByPlan && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] leading-relaxed">
                Tài khoản của bạn là <strong>Free</strong>. Preset này chứa mô hình gói Pro nên hệ thống sẽ chặn tự động chạy để tránh phát sinh lỗi.
              </div>
            )}
          </div>
        </div>



        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <div className="text-xs text-[var(--color-text-muted)]">
            {isProcessingQueue ? (
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <Loader2 size={13} className="animate-spin" /> Đang truyền tải song song tối đa 3 stream...
              </span>
            ) : (
              <span>Giới hạn tối đa 3 stream upload đồng thời để tránh nghẽn mạng.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isProcessingQueue ? (
              <Button variant="danger" size="sm" onClick={handleCancelAll}>
                Hủy toàn bộ
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onClose}>
                Đóng
              </Button>
            )}

            {!isProcessingQueue && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartQueue}
                disabled={queue.length === 0 || isCreatingBatch}
              >
                {isCreatingBatch ? (
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                ) : (
                  <Play size={14} className="mr-1.5 fill-current" />
                )}
                Tải lên & Khởi chạy Pipeline ({queue.length})
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
