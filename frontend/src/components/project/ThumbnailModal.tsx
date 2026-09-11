// frontend/src/components/project/ThumbnailModal.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  Play,
  Pause,
  Trash2,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import Dialog from "../common/Dialog";
import Button from "../common/Button";
import { videoService } from "../../services/video.service";
import { toast } from "../../lib/toast";
import type { Video } from "./VideoCard";

interface ThumbnailModalProps {
  isOpen: boolean;
  video: Video | null;
  onClose: () => void;
  onThumbnailUpdated: (videoId: number, newThumbnailUrl: string) => void;
}

export default function ThumbnailModal({
  isOpen,
  video,
  onClose,
  onThumbnailUpdated,
}: ThumbnailModalProps) {
  const [activeTab, setActiveTab] = useState<"pick" | "upload" | "auto">("pick");
  const [sourceKind, setSourceKind] = useState<"output" | "original">("output");

  // Video playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Capture preview state
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedTime, setCapturedTime] = useState<number | null>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action loaders
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoId = video?.id;
  const isCompleted = video?.status === "completed";

  // Reset state on open
  useEffect(() => {
    if (isOpen && video) {
      setSourceKind(isCompleted ? "output" : "original");
      setCapturedPreview(null);
      setCapturedTime(null);
      setSelectedFile(null);
      setUploadPreview(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setVideoLoaded(false);
    }
  }, [isOpen, video, isCompleted]);

  // Video time formatting helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}.${ms}`;
  };

  // Video stream source URL
  const videoStreamUrl = videoId
    ? videoService.getVideoStreamUrl(videoId, sourceKind)
    : "";

  // Handle video element time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setVideoLoaded(true);
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  // Seek video
  const seekTo = (timeInSeconds: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(timeInSeconds, duration));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  // Micro step by delta seconds
  const stepBy = (delta: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    seekTo(videoRef.current.currentTime + delta);
  };

  // Take visual snapshot of current frame
  const handleTakeSnapshot = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;

    el.pause();
    setIsPlaying(false);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = el.videoWidth || 640;
      canvas.height = el.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedPreview(dataUrl);
        setCapturedTime(el.currentTime);
      }
    } catch {
      // If cross-origin canvas security prevents toDataURL, record timestamp directly
      setCapturedTime(el.currentTime);
      setCapturedPreview(null);
    }
  }, []);

  // Save captured frame as thumbnail
  const handleApplyFrameCapture = async () => {
    if (!videoId) return;
    const ts = capturedTime ?? currentTime;

    try {
      setIsSubmitting(true);
      const res = await videoService.captureThumbnail(videoId, ts, sourceKind);
      toast.success(
        "Đã cập nhật Thumbnail",
        `Đã trích xuất khung hình tại mốc ${formatTime(ts)}.`
      );
      const newUrl =
        res.thumbnail_url ||
        videoService.getThumbnailUrl(videoId, Date.now());
      onThumbnailUpdated(videoId, newUrl);
      onClose();
    } catch (err: any) {
      console.error("[ThumbnailModal] Capture error:", err);
      toast.error(
        "Không thể lưu Thumbnail",
        err.response?.data?.detail || "Đã xảy ra lỗi khi trích xuất khung hình."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom image file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Tệp không hợp lệ", "Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ảnh quá lớn", "Dung lượng ảnh tối đa là 10MB.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload custom thumbnail
  const handleUploadCustomThumbnail = async () => {
    if (!videoId || !selectedFile) return;

    try {
      setIsSubmitting(true);
      const res = await videoService.uploadThumbnail(videoId, selectedFile);
      toast.success("Tải ảnh lên thành công", "Đã đặt làm Thumbnail video.");
      const newUrl =
        res.thumbnail_url ||
        videoService.getThumbnailUrl(videoId, Date.now());
      onThumbnailUpdated(videoId, newUrl);
      onClose();
    } catch (err: any) {
      console.error("[ThumbnailModal] Upload error:", err);
      toast.error(
        "Lỗi tải lên",
        err.response?.data?.detail || "Không thể tải ảnh Thumbnail lên."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-generate optimal thumbnail
  const handleAutoGenerate = async () => {
    if (!videoId) return;

    try {
      setIsSubmitting(true);
      const res = await videoService.autoGenerateThumbnail(videoId);
      toast.success("Tự động tạo Thumbnail thành công!");
      const newUrl =
        res.thumbnail_url ||
        videoService.getThumbnailUrl(videoId, Date.now());
      onThumbnailUpdated(videoId, newUrl);
      onClose();
    } catch (err: any) {
      console.error("[ThumbnailModal] Auto generate error:", err);
      toast.error("Thất bại", "Không thể tự động trích xuất Thumbnail.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / reset thumbnail
  const handleDeleteThumbnail = async () => {
    if (!videoId) return;

    try {
      setIsDeleting(true);
      await videoService.deleteThumbnail(videoId);
      toast.info("Đã xóa Thumbnail tùy chỉnh", "Khôi phục về trạng thái ban đầu.");
      onThumbnailUpdated(videoId, "");
      onClose();
    } catch (err: any) {
      console.error("[ThumbnailModal] Delete error:", err);
      toast.error("Lỗi xóa Thumbnail", "Không thể xóa Thumbnail.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!video) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Camera size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[var(--color-text-primary)] truncate">
              Chỉnh sửa Thumbnail Video
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] truncate max-w-md">
              {video.title}
            </p>
          </div>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="mt-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("pick")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "pick"
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            <Camera size={15} />
            <span>Tua & Chọn khung hình</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "upload"
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            <Upload size={15} />
            <span>Tải ảnh từ máy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("auto")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "auto"
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            <Sparkles size={15} />
            <span>Tự động tạo</span>
          </button>

          {/* Current Thumbnail Indicator */}
          {video.thumbnail && (
            <div className="ml-auto hidden sm:flex items-center gap-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">Hiện tại:</span>
              <img
                src={video.thumbnail}
                alt="Current thumbnail"
                className="h-7 w-12 rounded object-cover border border-[var(--color-border)] shadow-xs"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Video Frame Picker */}
        {activeTab === "pick" && (
          <div className="mt-4 space-y-4">
            {/* Source Switcher (Output vs Original) */}
            {isCompleted && (
              <div className="flex items-center gap-3 bg-[var(--color-surface-muted)] p-2 rounded-xl">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Nguồn video:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceKind("output");
                      setCapturedPreview(null);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      sourceKind === "output"
                        ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-bold shadow-xs"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    Video kết quả (Đã dịch / lồng tiếng)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceKind("original");
                      setCapturedPreview(null);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      sourceKind === "original"
                        ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-bold shadow-xs"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    Video gốc ban đầu
                  </button>
                </div>
              </div>
            )}

            {/* Video Player */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-md border border-[var(--color-border)]">
              <video
                ref={videoRef}
                src={videoStreamUrl}
                crossOrigin="anonymous"
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                className="h-full w-full object-contain"
                onClick={togglePlay}
              />

              {!videoLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
                  <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
                  <span className="text-xs">Đang tải video...</span>
                </div>
              )}
            </div>

            {/* Scrubber & Controls */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-3">
              {/* Seekbar */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.05"
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="w-full accent-[var(--color-primary)] cursor-pointer h-2 bg-[var(--color-border)] rounded-lg"
                />

                <div className="flex items-center justify-between text-xs font-mono text-[var(--color-text-secondary)]">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls & Quick Jumps */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]">
                {/* Micro Steps & Play */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepBy(-0.1)}
                    title="Lùi 0.1s"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] transition"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition"
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => stepBy(0.1)}
                    title="Tiến 0.1s"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Quick percentage jumps */}
                <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] mr-1">
                    Nhảy nhanh:
                  </span>
                  {[0, 0.25, 0.5, 0.75, 0.9].map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => seekTo(duration * ratio)}
                      className="rounded px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
                    >
                      {ratio === 0 ? "Đầu" : `${Math.round(ratio * 100)}%`}
                    </button>
                  ))}
                </div>

                {/* Capture Button */}
                <button
                  type="button"
                  onClick={handleTakeSnapshot}
                  className="ml-auto flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] active:scale-95 cursor-pointer"
                >
                  <Camera size={14} />
                  <span>Chụp khung hình này</span>
                </button>
              </div>
            </div>

            {/* Frame Confirmation Card */}
            {(capturedPreview || capturedTime !== null) && (
              <div className="flex items-center gap-4 rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-3 animate-fade-up">
                {capturedPreview ? (
                  <img
                    src={capturedPreview}
                    alt="Captured frame preview"
                    className="h-20 w-36 rounded-xl object-cover border border-[var(--color-border)] shadow-sm"
                  />
                ) : (
                  <div className="flex h-20 w-36 items-center justify-center rounded-xl bg-black/80 text-white">
                    <ImageIcon size={24} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Đã chọn khung hình tại mốc {formatTime(capturedTime ?? currentTime)}
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Hệ thống sẽ trích xuất khung hình độ nét cao làm hình đại diện cho video này.
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={handleApplyFrameCapture}
                  isLoading={isSubmitting}
                >
                  <Check size={16} />
                  <span>Xác nhận đặt làm Thumbnail</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upload Custom Image */}
        {activeTab === "upload" && (
          <div className="mt-4 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {!uploadPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] py-14 px-6 text-center cursor-pointer transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
              >
                <div className="rounded-full bg-[var(--color-surface)] p-4 shadow-sm text-[var(--color-primary)]">
                  <Upload size={28} />
                </div>
                <h4 className="mt-3 text-sm font-bold text-[var(--color-text-primary)]">
                  Bấm để chọn hoặc kéo thả ảnh Thumbnail
                </h4>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Hỗ trợ định dạng JPG, PNG, WebP (Tối đa 10MB)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black/90">
                  <img
                    src={uploadPreview}
                    alt="Upload preview"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)] truncate max-w-sm">
                    Tệp đã chọn: <strong>{selectedFile?.name}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      Chọn ảnh khác
                    </Button>

                    <Button
                      variant="primary"
                      onClick={handleUploadCustomThumbnail}
                      isLoading={isSubmitting}
                    >
                      <Check size={16} />
                      <span>Lưu Thumbnail mới</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Auto-Extract */}
        {activeTab === "auto" && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-12 px-6 text-center space-y-4">
            <div className="rounded-full bg-[var(--color-primary-soft)] p-4 text-[var(--color-primary)]">
              <Sparkles size={32} />
            </div>

            <div className="max-w-md">
              <h4 className="text-base font-bold text-[var(--color-text-primary)]">
                Tự động tạo Thumbnail từ Video
              </h4>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Hệ thống AI sẽ tự động phân tích luồng video, loại bỏ màn hình đen hoặc phần giới thiệu, và trích xuất một khung hình chuẩn đẹp nhất từ video.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleAutoGenerate}
              isLoading={isSubmitting}
              className="mt-2"
            >
              <Sparkles size={16} />
              <span>Bắt đầu tự động trích xuất</span>
            </Button>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          {video.thumbnail ? (
            <button
              type="button"
              onClick={handleDeleteThumbnail}
              disabled={isDeleting || isSubmitting}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 transition cursor-pointer"
            >
              {isDeleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              <span>Xóa Thumbnail hiện tại</span>
            </button>
          ) : (
            <div />
          )}

          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
