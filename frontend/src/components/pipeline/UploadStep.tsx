// UploadStep.tsx
import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  FileVideo,
  UploadCloud,
  Loader2,
  ArrowRight,
  RefreshCw,
  Mic,
  Music,
  Scissors,
  Activity,
  Layers,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService, type MediaInfo } from "../../services/video.service";

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
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [isLoadingMediaInfo, setIsLoadingMediaInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load media info if video is present
  useEffect(() => {
    if (state.video?.videoId) {
      setIsLoadingMediaInfo(true);
      videoService
        .getVideoMediaInfo(state.video.videoId)
        .then((info) => setMediaInfo(info))
        .catch((err) => console.warn("Could not load media info:", err))
        .finally(() => setIsLoadingMediaInfo(false));
    }
  }, [state.video?.videoId]);

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

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatusText("");
  };

  const handleFileUpload = async (file: File) => {
    // Client-side file validation (Checkpoint 6)
    const validExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      setUploadError("Định dạng video không được hỗ trợ. Vui lòng chọn tệp .MP4, .MOV, .AVI, .MKV hoặc .WEBM.");
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
          setUploadProgress(Math.min(percent, 90));
          setUploadStatusText(`Uploading video file (${percent}%)...`);
        },
        controller.signal
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
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-red-400">Lỗi tải lên video</p>
              <p className="text-xs text-red-300/90 mt-0.5">{uploadError}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setUploadError(null);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition shadow-xs"
              >
                <RefreshCw size={12} />
                <span>Thử lại tải tệp</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="px-3 py-1.5 rounded-xl border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
              >
                Bỏ qua
              </button>
            </div>
          </div>
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

            {/* Media Inspector Card (FFprobe Metadata) */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-[var(--color-primary)]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                    Media Inspector (Thông số kỹ thuật tệp)
                  </h4>
                </div>
                {isLoadingMediaInfo && (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                    <Loader2 size={12} className="animate-spin text-[var(--color-primary)]" />
                    <span>Đang phân tích ffprobe...</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] p-3">
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] block">
                    Độ phân giải & FPS
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] mt-0.5 block">
                    {mediaInfo?.video?.width && mediaInfo?.video?.height
                      ? `${mediaInfo.video.width}x${mediaInfo.video.height} (${mediaInfo.video.fps || 30} fps)`
                      : "1920x1080 (30 fps)"}
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] p-3">
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] block">
                    Video Codec
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] mt-0.5 block uppercase">
                    {mediaInfo?.video?.codec || "H.264 (AVC)"}
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] p-3">
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] block">
                    Audio Codec & Rate
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] mt-0.5 block">
                    {mediaInfo?.audio?.codec ? mediaInfo.audio.codec.toUpperCase() : "AAC"} •{" "}
                    {mediaInfo?.audio?.sample_rate ? `${mediaInfo.audio.sample_rate} Hz` : "44100 Hz"}
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] p-3">
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] block">
                    Kênh âm thanh (Channels)
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] mt-0.5 block">
                    {mediaInfo?.audio?.channels === 1
                      ? "1 Kênh (Mono)"
                      : mediaInfo?.audio?.channels === 2
                      ? "2 Kênh (Stereo)"
                      : "2 Kênh (Stereo)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Audio Separation & Pre-processing Studio (Step 1 Pro Workbench) */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-muted)]">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-[var(--color-primary)]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                    Tách âm & Tiền xử lý (Audio Separation Studio)
                  </h4>
                </div>
                <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
                  Đồng bộ 2 chiều (Auto-saved)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Demucs Separation Model */}
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
                    Mô hình bóc tách âm thanh:
                  </label>
                  <select
                    value={state.pipelineConfig?.audio_separation?.demucs_model || "htdemucs"}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PIPELINE_CONFIG",
                        payload: {
                          audio_separation: {
                            ...(state.pipelineConfig?.audio_separation || {}),
                            demucs_model: e.target.value as any,
                          },
                        },
                      })
                    }
                    className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="htdemucs">Demucs v4 HT (4-Stem Tách Chuẩn Vocals/BGM)</option>
                    <option value="htdemucs_ft">Demucs v4 Fine-tuned (Chất lượng cao nhất)</option>
                    <option value="mdx_extra">MDX-Net Vocal (Chuyên tách giọng ồn mạnh)</option>
                    <option value="bypass">Bypass (Không tách vocal / giữ nguyên audio gốc)</option>
                  </select>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    HT Demucs sử dụng Transformer trích xuất riêng biệt Vocals và Background Music.
                  </p>
                </div>

                {/* Dubbing Mode: Full Dubbing vs Voiceover */}
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
                    Chế độ lồng tiếng (Dubbing Mode):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "UPDATE_PIPELINE_CONFIG",
                          payload: {
                            export_muxing: {
                              ...(state.pipelineConfig?.export_muxing || {}),
                              dubbing_mode: "full_dubbing",
                            },
                          },
                        })
                      }
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition ${
                        (state.pipelineConfig?.export_muxing?.dubbing_mode || "full_dubbing") === "full_dubbing"
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50"
                      }`}
                    >
                      <span className="text-xs font-bold">Full Dubbing</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        Thay hoàn toàn giọng gốc bằng AI
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "UPDATE_PIPELINE_CONFIG",
                          payload: {
                            export_muxing: {
                              ...(state.pipelineConfig?.export_muxing || {}),
                              dubbing_mode: "voiceover",
                            },
                          },
                        })
                      }
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition ${
                        state.pipelineConfig?.export_muxing?.dubbing_mode === "voiceover"
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50"
                      }`}
                    >
                      <span className="text-xs font-bold">Voiceover (Thuyết minh)</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        Giữ giọng gốc nhỏ (~15%) làm nền
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Volume Sliders & Ducking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1">
                      <Mic size={12} className="text-[var(--color-primary)]" />
                      Âm lượng Vocal gốc
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--color-primary)]">
                      {state.pipelineConfig?.audio_separation?.vocal_volume ?? 100}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={state.pipelineConfig?.audio_separation?.vocal_volume ?? 100}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PIPELINE_CONFIG",
                        payload: {
                          audio_separation: {
                            ...(state.pipelineConfig?.audio_separation || {}),
                            vocal_volume: parseInt(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full accent-[var(--color-primary)] h-1.5 rounded-lg bg-[var(--color-border)] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1">
                      <Music size={12} className="text-indigo-400" />
                      Âm lượng Nhạc nền (BGM)
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      {Math.round((state.pipelineConfig?.audio_separation?.bgm_volume ?? 0.7) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={Math.round((state.pipelineConfig?.audio_separation?.bgm_volume ?? 0.7) * 100)}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PIPELINE_CONFIG",
                        payload: {
                          audio_separation: {
                            ...(state.pipelineConfig?.audio_separation || {}),
                            bgm_volume: parseInt(e.target.value) / 100,
                          },
                        },
                      })
                    }
                    className="w-full accent-indigo-500 h-1.5 rounded-lg bg-[var(--color-border)] cursor-pointer"
                  />
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={state.pipelineConfig?.audio_separation?.enable_ducking ?? true}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_PIPELINE_CONFIG",
                          payload: {
                            audio_separation: {
                              ...(state.pipelineConfig?.audio_separation || {}),
                              enable_ducking: e.target.checked,
                            },
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Smart Ducking (Tự né BGM)
                    </span>
                  </label>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 pl-6">
                    Giảm nhạc nền {state.pipelineConfig?.audio_separation?.ducking_level || -14}dB khi có giọng nói
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean((state.pipelineConfig?.audio_separation as any)?.audio_denoise)}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_PIPELINE_CONFIG",
                          payload: {
                            audio_separation: {
                              ...(state.pipelineConfig?.audio_separation || {}),
                              audio_denoise: e.target.checked,
                            } as any,
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Audio Denoise (Khử ồn mic)
                    </span>
                  </label>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 pl-6">
                    Lọc tạp âm và tiếng quạt gió microphone
                  </p>
                </div>
              </div>

              {/* Pre-trim Range */}
              <div className="pt-2 border-t border-[var(--color-border-muted)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-[var(--color-text-secondary)]">
                  <Scissors size={13} className="text-amber-400" />
                  Cắt xén phạm vi xử lý (In/Out Range Trimming):
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span>Từ</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={(state.pipelineConfig?.audio_separation as any)?.trim_start || 0}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PIPELINE_CONFIG",
                        payload: {
                          audio_separation: {
                            ...(state.pipelineConfig?.audio_separation || {}),
                            trim_start: parseFloat(e.target.value) || 0,
                          } as any,
                        },
                      })
                    }
                    className="w-16 h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-center text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                  <span>giây đến</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Hết"
                    value={(state.pipelineConfig?.audio_separation as any)?.trim_end || ""}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PIPELINE_CONFIG",
                        payload: {
                          audio_separation: {
                            ...(state.pipelineConfig?.audio_separation || {}),
                            trim_end: parseFloat(e.target.value) || 0,
                          } as any,
                        },
                      })
                    }
                    className="w-16 h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-center text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                  <span>giây (0 = Toàn bộ)</span>
                </div>
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
            } ${isUploading ? "opacity-90" : ""} ${
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
                <div className="flex items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelUpload();
                    }}
                    className="px-3 py-1 rounded-lg border border-red-500/40 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                  >
                    Hủy tải lên (Cancel)
                  </button>
                </div>
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