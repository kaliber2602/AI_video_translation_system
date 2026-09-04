// ReviewExportStep.tsx
import { useState, useEffect, useRef } from "react";
import { 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileVideo,
  FileAudio,
  FileText,
  Subtitles,
  Globe,
  Settings,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  Film,
  Music,
  Mic
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

export default function ReviewExportStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<any>(null);
  const [selectedType, setSelectedType] = useState("final_video");
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Dubbed video info
  const [dubbedVideoInfo, setDubbedVideoInfo] = useState<any>(null);

  useEffect(() => {
    loadExportOptions();
    loadVideoPreview();
  }, [state.video?.videoId]);

  const loadExportOptions = async () => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setExportError(null);

    try {
      const options = await videoService.getExportOptions(state.video.videoId);
      console.log("📦 Export options received:", options);
      
      if (options && options.available_exports) {
        setExportOptions(options);
      } else if (options && typeof options === 'object') {
        setExportOptions({ available_exports: options });
      } else {
        setExportOptions({
          available_exports: {
            final_video: {
              available: true,
              formats: ["mp4", "mov", "avi"],
              qualities: ["360p", "720p", "1080p", "4K"]
            },
            audio: {
              available: false,
              formats: ["mp3", "wav"]
            },
            transcript: {
              available: false,
              formats: ["json", "txt"]
            },
            translation: {
              available: false,
              formats: ["json", "txt"]
            },
            subtitles: {
              available: false,
              formats: ["srt", "vtt", "ass"]
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Failed to load export options:", error);
      setExportOptions({
        available_exports: {
          final_video: {
            available: true,
            formats: ["mp4", "mov", "avi"],
            qualities: ["360p", "720p", "1080p", "4K"]
          }
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideoPreview = async () => {
    if (!state.video?.videoId) return;
    
    try {
      // Get dubbed video info
      const status = await videoService.getDubbingStatus(state.video.videoId);
      if (status.status === "completed" && status.output_path) {
        setDubbedVideoInfo(status);
        const lang = state.targetLanguage || "vi";
        const format = "mp4";
        // Create URL for video preview
        const url = `/api/videos/${state.video.videoId}/dub/${lang}/download?video_format=${format}`;
        setVideoUrl(url);
        
        // Also load audio preview if available
        try {
          const audioBlob = await videoService.getAudioBlob(state.video.videoId, lang);
          const audioUrl = URL.createObjectURL(audioBlob);
          setAudioUrl(audioUrl);
        } catch (error) {
          console.log("No audio preview available");
        }
      }
    } catch (error) {
      console.error("Failed to load video preview:", error);
    }
  };

  // ============================================================
  // VIDEO PLAYER CONTROLS
  // ============================================================

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        videoRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoLoaded(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ============================================================
  // EXPORT HANDLER
  // ============================================================

  const handleExport = async () => {
    if (!state.video?.videoId) return;
    
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const blob = await videoService.exportVideo(
        state.video.videoId,
        selectedType,
        selectedFormat,
        selectedQuality,
        state.targetLanguage || "vi"
      );
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = selectedFormat;
      a.download = `export_${selectedType}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
      
    } catch (error: any) {
      console.error("Export failed:", error);
      setExportError(error.message || "Failed to export");
    } finally {
      setIsExporting(false);
    }
  };

  const getExportTypes = () => {
    if (!exportOptions?.available_exports) return [];
    
    const types = [
      { 
        key: "final_video", 
        label: "Final Video", 
        icon: FileVideo,
        ...exportOptions.available_exports.final_video
      },
      { 
        key: "audio", 
        label: "Audio", 
        icon: FileAudio,
        ...exportOptions.available_exports.audio
      },
      { 
        key: "subtitles", 
        label: "Subtitles", 
        icon: Subtitles,
        ...exportOptions.available_exports.subtitles
      },
      { 
        key: "transcript", 
        label: "Transcript", 
        icon: FileText,
        ...exportOptions.available_exports.transcript
      },
      { 
        key: "translation", 
        label: "Translation", 
        icon: Globe,
        ...exportOptions.available_exports.translation
      }
    ];
    
    return types.filter(t => t.available);
  };

  const availableTypes = getExportTypes();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">Loading export options...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "06", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          Review & Export
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          Review your translated video, preview the result, and export it in your preferred format.
        </p>
      </div>

      {exportError && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-500">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Export failed</p>
              <p className="mt-1 text-xs opacity-80">{exportError}</p>
              <button
                type="button"
                onClick={() => setExportError(null)}
                className="mt-2 text-xs underline hover:text-red-400 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {exportSuccess && (
        <div className="rounded-2xl border border-green-500/50 bg-green-500/10 p-4 text-green-500">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} />
            <p className="text-sm font-medium">Export successful! Download started.</p>
          </div>
        </div>
      )}

      {/* ============================================================
          VIDEO PREVIEW SECTION
          ============================================================ */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Film size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Video Preview
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {dubbedVideoInfo ? "Dubbed video ready for review" : "Waiting for dubbed video..."}
              </p>
            </div>
          </div>
          {dubbedVideoInfo && (
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500">
              ✓ Ready
            </span>
          )}
        </div>

        {/* Video Player */}
        {videoUrl ? (
          <div className="mt-4">
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full max-h-[500px] object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full accent-white"
                    />
                    <div className="mt-1 flex justify-between text-xs text-white/70">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <p className="text-xs text-[var(--color-text-muted)]">Duration</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {formatTime(duration)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <p className="text-xs text-[var(--color-text-muted)]">Quality</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {selectedQuality}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <p className="text-xs text-[var(--color-text-muted)]">Language</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {state.targetLanguage?.toUpperCase() || "VI"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <Film size={48} className="text-[var(--color-text-muted)] opacity-30" />
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              No dubbed video available yet
            </p>
            <p className="text-xs text-[var(--color-text-muted)] opacity-60">
              Generate the dubbed video first
            </p>
          </div>
        )}
      </div>

      {/* ============================================================
          EXPORT SETTINGS
          ============================================================ */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Settings size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Export Settings
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Choose what to export and in which format
              </p>
            </div>
          </div>
        </div>

        {/* Export Type Selection */}
        {availableTypes.length > 0 ? (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
              What to export
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {availableTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.key;
                return (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => {
                      setSelectedType(type.key);
                      if (type.formats && type.formats.length > 0) {
                        setSelectedFormat(type.formats[0]);
                      }
                    }}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[0_0_0_2px_var(--color-primary)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <Icon size={20} className={isSelected ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"} />
                    <span className="text-xs font-medium">{type.label}</span>
                    {type.available && (
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-4 text-yellow-500">
            <p className="text-sm">No export options available. Please generate the video first.</p>
          </div>
        )}

        {/* Format & Quality Selection */}
        {availableTypes.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                Format
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
              >
                {availableTypes
                  .find(t => t.key === selectedType)
                  ?.formats?.map((format: string) => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  )) || (
                  <option value="mp4">MP4</option>
                )}
              </select>
            </div>

            {/* Quality Selection (only for video) */}
            {selectedType === "final_video" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  Quality
                </label>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
                >
                  {availableTypes
                    .find(t => t.key === selectedType)
                    ?.qualities?.map((quality: string) => (
                      <option key={quality} value={quality}>
                        {quality}
                      </option>
                    )) || (
                    <option value="1080p">1080p</option>
                  )}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Export Summary & Button */}
        {availableTypes.length > 0 && (
          <div className="mt-6 flex flex-col gap-4 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Clock size={14} />
                <span>Export ready</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <FileVideo size={14} />
                <span>{selectedType.replace("_", " ").toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Download size={14} />
                <span>{selectedFormat.toUpperCase()}</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Download size={17} />
              )}
              {isExporting ? "Exporting..." : "Download"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}