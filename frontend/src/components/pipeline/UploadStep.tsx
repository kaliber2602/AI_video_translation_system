// UploadStep.tsx
import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  FileVideo,
  Languages,
  UploadCloud,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function UploadStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const navigate = useNavigate();
  const { state, dispatch } = usePipeline();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("Uploading...");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-transition to transcript step when upload is complete
  useEffect(() => {
    if (uploadComplete && state.video?.videoId) {
      const timer = setTimeout(() => {
        if (state.projectId && state.video?.videoId) {
          navigate(`/workspace/project/${state.projectId}/video/${state.video.videoId}`, { replace: true });
        }
        dispatch({ type: "SET_STEP", payload: 2 });
      }, 1200); // 1.2 second delay to show the success state
      return () => clearTimeout(timer);
    }
  }, [uploadComplete, state.video?.videoId, state.projectId, dispatch, navigate]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusText("Uploading video file...");
    setUploadError(null);
    setUploadComplete(false);

    try {
      const response = await videoService.uploadVideo(
        file,
        state.targetLanguage || "vi",
        state.projectId,
        undefined,
        (percent) => {
          setUploadProgress(Math.min(percent, 90));
          setUploadStatusText(`Uploading video file (${percent}%)...`);
        }
      );

      console.log("📦 Upload response:", response);

      const videoId = response.video_id || response.id || response.videoId;
      
      if (!videoId) {
        throw new Error("Server response missing video_id");
      }

      console.log("✅ Video uploaded with ID:", videoId);
      setUploadProgress(95);
      setUploadStatusText("Extracting audio for transcription...");

      // Automatically extract audio now so Step 2 (Transcript) is immediately ready
      try {
        await videoService.extractAudio(videoId);
        console.log("✅ Audio extracted for video:", videoId);
      } catch (extractErr: any) {
        console.warn("⚠️ Initial audio extraction notice:", extractErr?.message || extractErr);
      }

      setUploadProgress(100);
      setUploadStatusText("Upload complete!");

      // Update state with video details
      dispatch({
        type: "SET_VIDEO",
        payload: {
          videoId: videoId,
          filename: file.name,
          fileSize: file.size,
          status: response.status || "uploaded",
          projectId: state.projectId,
        },
      });

      // Mark upload as complete - this will trigger the useEffect to transition
      setUploadComplete(true);
      
    } catch (error: any) {
      console.error("❌ Upload failed:", error);
      let errorMsg = error?.response?.data?.detail || error.message || "Upload failed";
      const status = error?.response?.status;
      if (status === 413) {
        errorMsg = "Dung lượng video vượt quá giới hạn 2GB của hệ thống. Vui lòng nén file hoặc chọn video khác.";
      } else if (status === 415 || status === 422) {
        errorMsg = "Định dạng video không được hỗ trợ hoặc file bị hỏng. Hỗ trợ: MP4, MOV, MKV, WebM, AVI.";
      } else if (status === 402) {
        errorMsg = "Hạn mức dung lượng lưu trữ của bạn đã đầy. Vui lòng nâng cấp gói hoặc dọn bớt video cũ.";
      }
      setUploadError(errorMsg);
      dispatch({
        type: "SET_ERROR",
        payload: errorMsg,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && !isUploading) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isUploading) {
      handleFileUpload(file);
    }
    // Reset the input so the same file can be re-uploaded
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "01", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.upload.pageTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.upload.pageDescription")}
        </p>
      </div>

      {uploadError && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-500">
          <p className="text-sm font-medium">Error: {uploadError}</p>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="mt-2 text-xs underline hover:text-red-400 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        {state.video?.filename && !isUploading && !uploadComplete ? (
          /* File Summary Card (Replaces Dropzone when video is loaded) */
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/20">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20">
                  <FileVideo size={28} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-[var(--color-text-primary)]">
                      {state.video.filename}
                    </h3>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ Đã tải lên
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {state.video.fileSize != null && state.video.fileSize > 0
                      ? `${(state.video.fileSize / (1024 * 1024)).toFixed(1)} MB • `
                      : ""}
                    {state.video.duration
                      ? `${Math.floor(state.video.duration / 60)}:${String(Math.floor(state.video.duration % 60)).padStart(2, "0")} • `
                      : ""}
                    Định dạng MP4/MOV • Sẵn sàng xử lý
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:scale-95 shadow-2xs"
                >
                  <RefreshCw size={14} />
                  <span>Thay đổi video</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.mov,.avi,.mkv,.webm"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Dropzone / Upload Progress / Upload Complete */
          <div
            className={`flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
              isDragging
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)]"
            } ${isUploading ? "pointer-events-none opacity-60" : ""} ${
              uploadComplete ? "border-green-500 bg-green-500/5" : ""
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && !uploadComplete && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {uploadStatusText} {uploadProgress}%
                </p>
                <div className="h-2 w-64 overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {state.video?.filename || "Processing..."}
                </p>
              </div>
            ) : uploadComplete ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20 text-green-500">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                  Upload Complete! 🎉
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {state.video?.filename} đã tải lên thành công
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {state.video?.fileSize != null && state.video.fileSize > 0 
                    ? `${(state.video.fileSize / (1024 * 1024)).toFixed(1)} MB`
                    : ""}
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-primary)]">
                  <Loader2 size={16} className="animate-spin" />
                  Đang chuyển tới bước bóc băng...
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <UploadCloud size={30} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[var(--color-text-primary)]">
                  {t("pipeline:steps.upload.dropzoneTitle")}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
                  {t("pipeline:steps.upload.dropzoneDescription")}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  MP4, MOV, AVI, MKV (Hỗ trợ dung lượng tới 2GB)
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] hover:scale-105 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  {t("pipeline:steps.upload.browseFiles")}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.mov,.avi,.mkv,.webm"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Language Selection Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Languages size={19} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {t("pipeline:steps.upload.translationLanguage")}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {t("pipeline:steps.upload.autoDetectionNote")}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
            {t("pipeline:steps.upload.translateTo")}
          </label>
          <select
            value={state.targetLanguage || "vi"}
            onChange={(e) =>
              dispatch({
                type: "SET_TARGET_LANGUAGE",
                payload: e.target.value,
              })
            }
            disabled={isUploading || uploadComplete}
            className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="vi">Tiếng Việt (Vietnamese)</option>
            <option value="en">Tiếng Anh (English)</option>
            <option value="zh">Tiếng Trung (Chinese)</option>
            <option value="ja">Tiếng Nhật (Japanese)</option>
            <option value="ko">Tiếng Hàn (Korean)</option>
            <option value="fr">Tiếng Pháp (French)</option>
            <option value="de">Tiếng Đức (German)</option>
            <option value="es">Tiếng Tây Ban Nha (Spanish)</option>
            <option value="ar">Tiếng Ả Rập (Arabic)</option>
            <option value="ru">Tiếng Nga (Russian)</option>
            <option value="pt">Tiếng Bồ Đào Nha (Portuguese)</option>
            <option value="it">Tiếng Ý (Italian)</option>
          </select>
        </div>
      </div>

      {/* Persistent Bottom Action Bar */}
      {state.video?.videoId && !isUploading && (
        <div className="sticky bottom-4 z-30 flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-[var(--color-text-primary)]">Tệp video đã nạp: </span>
              <span className="text-[var(--color-text-muted)] truncate max-w-xs inline-block align-bottom">{state.video.filename}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => dispatch({ type: "SET_STEP", payload: 2 })}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[var(--color-primary)]/30 transition hover:bg-[var(--color-primary-hover)] active:scale-95"
          >
            <span>Tiếp tục: Bóc băng (Transcript)</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}