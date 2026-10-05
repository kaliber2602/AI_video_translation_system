import { useState, useRef, useEffect } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { usePipeline } from "../../../hooks/usePipeline";
import { videoService, type MediaInfo } from "../../../services/video.service";
import UploadedFileSummary from "./UploadedFileSummary";
import MediaInspectorCard from "./MediaInspectorCard";
import AudioSeparationCard from "./AudioSeparationCard";
import FileDropzone from "./FileDropzone";
import { toast } from "../../../lib/toast";

export default function UploadStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const navigate = useNavigate();
  const { projectId, videoId: routeVideoId } = useParams();
  const { state, dispatch } = usePipeline();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("Uploading...");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Trigger toast error on upload failure
  useEffect(() => {
    if (uploadError) {
      toast.error("Lỗi tải lên video", uploadError);
    }
  }, [uploadError]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [isLoadingMediaInfo, setIsLoadingLoadingMediaInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load media info if video is present
  useEffect(() => {
    if (state.video?.videoId) {
      setIsLoadingLoadingMediaInfo(true);
      videoService
        .getVideoMediaInfo(state.video.videoId)
        .then((info) => setMediaInfo(info))
        .catch((err) => console.warn("Could not load media info:", err))
        .finally(() => setIsLoadingLoadingMediaInfo(false));
    }
  }, [state.video?.videoId]);

  // When upload completes and video ID is created, sync route with project & video IDs
  useEffect(() => {
    if (uploadComplete && state.video?.videoId && state.projectId) {
      navigate(`/workspace/project/${state.projectId}/video/${state.video.videoId}`, { replace: true });
    }
  }, [uploadComplete, state.video?.videoId, state.projectId, navigate]);

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatusText("");
  };

  const validateFile = (file: File): boolean => {
    const validExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      setUploadError("Định dạng video không được hỗ trợ. Vui lòng chọn tệp .MP4, .MOV, .AVI, .MKV hoặc .WEBM.");
      return false;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setUploadError("Dung lượng video vượt quá giới hạn 2GB của hệ thống. Vui lòng chọn video khác hoặc nén tệp.");
      return false;
    }
    setUploadError(null);
    return true;
  };

  const handleStageFile = (file: File) => {
    if (validateFile(file)) {
      setStagedFile(file);
    }
  };

  const handleFileUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || stagedFile;
    if (!file) return;

    if (!validateFile(file)) {
      return;
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      setUploadError("Dung lượng video vượt quá giới hạn 2GB của hệ thống. Vui lòng chọn video khác hoặc nén tệp.");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
          setUploadProgress(percent);
          setUploadStatusText(`Đang tải tệp video lên (${percent}%)...`);
        },
        controller.signal
      );

      console.log("📦 Upload response:", response);

      const videoId = response.video_id || response.id || response.videoId;
      
      if (!videoId) {
        throw new Error("Server response missing video_id");
      }

      console.log("✅ Video uploaded with ID:", videoId);
      setUploadProgress(100);
      setUploadStatusText("Tải lên hoàn tất!");

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

      setStagedFile(null);
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
      handleStageFile(file);
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
      handleStageFile(file);
    }
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

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] space-y-6">
        {state.video?.filename && !isUploading && !uploadComplete ? (
          <div className="flex flex-col gap-4">
            <UploadedFileSummary
              filename={state.video.filename}
              fileSize={state.video.fileSize}
              duration={state.video.duration}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
            />

            <MediaInspectorCard
              mediaInfo={mediaInfo}
              isLoading={isLoadingMediaInfo}
            />
          </div>
        ) : (
          <FileDropzone
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadStatusText={uploadStatusText}
            uploadComplete={uploadComplete}
            stagedFile={stagedFile}
            uploadedFilename={state.video?.filename}
            uploadedFileSize={state.video?.fileSize}
            isDragging={isDragging}
            fileInputRef={fileInputRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onFileSelect={handleFileSelect}
            onCancelUpload={cancelUpload}
            onClearStagedFile={() => setStagedFile(null)}
            onStartUpload={() => handleFileUpload()}
            onGoToNextStep={() => dispatch({ type: "SET_STEP", payload: 2 })}
          />
        )}

        {(stagedFile || state.video?.filename) && !isUploading && (
          <AudioSeparationCard
            pipelineConfig={state.pipelineConfig}
            onUpdateConfig={(configUpdate) =>
              dispatch({
                type: "UPDATE_PIPELINE_CONFIG",
                payload: configUpdate,
              })
            }
          />
        )}
      </div>

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
            onClick={() => {
              const targetPId = state.projectId || projectId;
              const targetVId = state.video?.videoId;
              if (targetPId && targetVId && routeVideoId === "new") {
                navigate(`/workspace/project/${targetPId}/video/${targetVId}?step=transcript`, { replace: true });
              } else {
                dispatch({ type: "SET_STEP", payload: 2 });
              }
            }}
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
