// UploadStep.tsx
import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  FileVideo,
  Languages,
  UploadCloud,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function UploadStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-transition to transcript step when upload is complete
  useEffect(() => {
    if (uploadComplete && state.video?.videoId) {
      const timer = setTimeout(() => {
        dispatch({ type: "SET_STEP", payload: 2 });
      }, 1000); // 1 second delay to show the success state
      return () => clearTimeout(timer);
    }
  }, [uploadComplete, state.video?.videoId, dispatch]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadComplete(false);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      const response = await videoService.uploadVideo(
        file,
        state.targetLanguage || "vi",
        state.projectId
      );

      console.log("📦 Upload response:", response);

      const videoId = response.video_id || response.id || response.videoId;
      
      if (!videoId) {
        throw new Error("Server response missing video_id");
      }

      console.log("✅ Video uploaded with ID:", videoId);

      // Clear the progress interval
      clearInterval(progressInterval);
      setUploadProgress(100);

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
      clearInterval(progressInterval);
      setUploadError(error.message || "Upload failed");
      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Upload failed",
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
                Uploading... {uploadProgress}%
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
                {state.video?.filename} uploaded successfully
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Video ID: {state.video?.videoId} · 
                {(state.video?.fileSize || 0) > 0 
                  ? ` ${(state.video.fileSize / (1024 * 1024)).toFixed(1)} MB`
                  : ""}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-primary)]">
                <Loader2 size={16} className="animate-spin" />
                Redirecting to transcript...
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
                MP4, MOV, AVI, MKV (up to 2GB)
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

        {state.video?.filename && !isUploading && !uploadError && !uploadComplete && (
          <div className="mt-5 flex items-center gap-4 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <FileVideo size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                {state.video.filename}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {(state.video.fileSize / (1024 * 1024)).toFixed(1)} MB · Video ID: {state.video.videoId}
              </p>
            </div>
            <CheckCircle2 size={20} className="text-[var(--color-primary)]" />
          </div>
        )}
      </div>

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
            <option value="vi">Vietnamese</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
            <option value="ar">Arabic</option>
            <option value="ru">Russian</option>
            <option value="pt">Portuguese</option>
            <option value="it">Italian</option>
          </select>
        </div>
      </div>
    </div>
  );
}