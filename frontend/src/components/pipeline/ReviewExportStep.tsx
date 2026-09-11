import { useState, useEffect, useMemo } from "react";
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
  Clock,
  Film,
  Edit3,
  X,
  Save,
  Search,
  ExternalLink,
  Coins,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";
import StandardVideoPlayer from "../common/StandardVideoPlayer";

export default function ReviewExportStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSwitchingQuality, setIsSwitchingQuality] = useState(false);
  const [exportOptions, setExportOptions] = useState<any>(null);
  const [selectedType, setSelectedType] = useState("final_video");
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Video state
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitleSegments, setSubtitleSegments] = useState<
    Array<{ start: number; end: number; text?: string; translated_text?: string }>
  >([]);
  const [hasSubtitles, setHasSubtitles] = useState(false);

  // Dubbed video info
  const [dubbedVideoInfo, setDubbedVideoInfo] = useState<any>(null);

  // Quick Edit Subtitles Modal State
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [editingSegments, setEditingSegments] = useState<
    Array<{ start: number; end: number; text?: string; translated_text?: string }>
  >([]);
  const [quickEditSearch, setQuickEditSearch] = useState("");
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);
  const [quickEditSuccess, setQuickEditSuccess] = useState(false);

  // Detect whether the current dubbed video already has burned subtitles (hardsub)
  const hasBurnedSubtitles = useMemo(() => {
    if (dubbedVideoInfo?.has_burned_subtitles !== undefined) {
      return Boolean(dubbedVideoInfo.has_burned_subtitles);
    }
    if ((state.dubbedVideo as any)?.has_burned_subtitles !== undefined) {
      return Boolean((state.dubbedVideo as any).has_burned_subtitles);
    }
    if ((state.video as any)?.subtitle_path) {
      return true;
    }
    return true; // Default in our pipeline: dubbed video is hardsubbed with custom styles
  }, [dubbedVideoInfo, state.dubbedVideo, state.video]);

  useEffect(() => {
    loadExportOptions();
    loadVideoPreview();
    loadSubtitles();
  }, [state.video?.videoId]);

  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const loadSubtitles = async () => {
    if (!state.video?.videoId) return;
    try {
      const targetLang = state.targetLanguage || "vi";
      try {
        const segData = await videoService.getSubtitleSegments(state.video.videoId, targetLang);
        if (segData?.segments && Array.isArray(segData.segments) && segData.segments.length > 0) {
          setSubtitleSegments(segData.segments);
          setEditingSegments(JSON.parse(JSON.stringify(segData.segments)));
          setHasSubtitles(true);
          return;
        }
      } catch {
        if (state.translation?.segments && state.translation.segments.length > 0) {
          setSubtitleSegments(state.translation.segments);
          setEditingSegments(JSON.parse(JSON.stringify(state.translation.segments)));
          setHasSubtitles(true);
          return;
        }
      }
    } catch {
      setHasSubtitles(false);
    }
  };

  const loadExportOptions = async () => {
    if (!state.video?.videoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setExportError(null);

    try {
      const options = await videoService.getExportOptions(state.video.videoId);
      
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
              qualities: ["360p", "720p", "1080p", "2k", "4k"]
            },
            audio: {
              available: true,
              formats: ["mp3", "wav"]
            },
            subtitles: {
              available: true,
              formats: ["srt", "vtt", "ass", "txt"]
            },
            transcript: {
              available: true,
              formats: ["json", "txt"]
            },
            translation: {
              available: true,
              formats: ["json", "txt"]
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
            qualities: ["360p", "720p", "1080p", "2k", "4k"]
          },
          audio: {
            available: true,
            formats: ["mp3", "wav"]
          },
          subtitles: {
            available: true,
            formats: ["srt", "vtt", "ass", "txt"]
          }
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideoPreview = async (quality = selectedQuality) => {
    if (!state.video?.videoId) return;
    
    try {
      const status = await videoService.getDubbingStatus(state.video.videoId);
      if (status.status === "completed" && status.output_path) {
        setDubbedVideoInfo(status);
        
        try {
          const previewUrl = await videoService.getDubbedVideoPreview(
            state.video.videoId,
            state.targetLanguage || "vi",
            quality
          );
          setVideoUrl((prev) => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return previewUrl;
          });
        } catch (error) {
          console.error("Failed to get preview URL:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load video preview:", error);
    }
  };

  const handleQualityChange = async (newQuality: string) => {
    if (!state.video?.videoId) return;
    if (newQuality === selectedQuality && videoUrl) return;

    setSelectedQuality(newQuality);
    setIsSwitchingQuality(true);
    setExportError(null);

    try {
      const newUrl = await videoService.getDubbedVideoPreview(
        state.video.videoId,
        state.targetLanguage || "vi",
        newQuality
      );
      setVideoUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return newUrl;
      });
    } catch (err: any) {
      console.error("Failed to switch video quality:", err);
      setExportError(`Không thể tải độ phân giải ${newQuality}: ${err.message || "Lỗi chuyển đổi"}`);
    } finally {
      setIsSwitchingQuality(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

      if (!blob || blob.size === 0) {
        throw new Error('Tệp tải về rỗng');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = selectedFormat;
      a.download = `export_${selectedType}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
      
    } catch (error: any) {
      console.error("Export failed:", error);
      setExportError(error.message || "Xuất tệp không thành công. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  // QUICK SUBTITLE EDIT HANDLERS
  const handleSaveQuickEdit = async () => {
    if (!state.video?.videoId) return;
    setIsSavingQuickEdit(true);

    try {
      const targetLang = state.targetLanguage || "vi";
      await videoService.updateSubtitleSegments(
        state.video.videoId,
        targetLang,
        editingSegments
      );
      setSubtitleSegments(editingSegments);
      setQuickEditSuccess(true);
      setTimeout(() => {
        setQuickEditSuccess(false);
        setIsQuickEditOpen(false);
      }, 1000);
    } catch (err: any) {
      console.error("Quick edit save error:", err);
      alert("Lỗi khi lưu phụ đề: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  const filteredQuickEditSegments = useMemo(() => {
    if (!quickEditSearch.trim()) return editingSegments;
    const q = quickEditSearch.toLowerCase();
    return editingSegments.filter(
      (s) =>
        (s.translated_text && s.translated_text.toLowerCase().includes(q)) ||
        (s.text && s.text.toLowerCase().includes(q))
    );
  }, [editingSegments, quickEditSearch]);

  const getExportTypes = () => {
    if (!exportOptions?.available_exports) return [];
    
    const types = [
      { 
        key: "final_video", 
        label: "Video Hoàn Thiện", 
        desc: "Video đã ghép tiếng & phụ đề",
        icon: FileVideo,
        ...exportOptions.available_exports.final_video
      },
      { 
        key: "audio", 
        label: "Bản Âm Thanh", 
        desc: "Audio lồng tiếng thuyết minh",
        icon: FileAudio,
        ...exportOptions.available_exports.audio
      },
      { 
        key: "subtitles", 
        label: "Tệp Phụ Đề", 
        desc: "Tệp phụ đề rời (SRT, VTT, ASS)",
        icon: Subtitles,
        ...exportOptions.available_exports.subtitles
      },
      { 
        key: "transcript", 
        label: "Văn Bản Bóc Băng", 
        desc: "Nội dung gốc có mốc thời gian",
        icon: FileText,
        ...exportOptions.available_exports.transcript
      },
      { 
        key: "translation", 
        label: "Bản Dịch Thuật", 
        desc: "Văn bản bản dịch song ngữ",
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
        <span className="ml-3 text-sm text-[var(--color-text-muted)]">Đang tải tùy chọn xuất video...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            {t("pipeline:header.stepBadge", { current: "06", total: "06" })} · Kiểm duyệt & Xuất bản
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Kiểm tra thành phẩm & Tải về
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
            Xem trước video đã lồng tiếng và phụ đề hoàn chỉnh. Bạn có thể sửa nhanh phụ đề hoặc xuất theo định dạng mong muốn.
          </p>
        </div>

        {/* Quick Edit & Open in NLE Editor Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setEditingSegments(JSON.parse(JSON.stringify(subtitleSegments)));
              setIsQuickEditOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition shadow-xs"
            title="Mở cửa sổ sửa nhanh lỗi chính tả phụ đề ngay tại đây mà không cần quay lại các bước trước"
          >
            <Edit3 size={14} className="text-amber-400" />
            <span>Sửa nhanh phụ đề</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (state.video?.videoId) {
                if (state.projectId) {
                  navigate(`/workspace/project/${state.projectId}/video/${state.video.videoId}/editor`);
                } else {
                  dispatch({ type: "SET_STEP", payload: 4 });
                }
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition shadow-xs"
            title="Mở trình dựng chuyên sâu Subtitle Studio với Timeline đa rãnh"
          >
            <ExternalLink size={14} />
            <span>Trình dựng NLE Editor</span>
          </button>
        </div>
      </div>

      {exportError && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>Lỗi: {exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="underline hover:text-red-300 ml-4 font-medium"
          >
            Đóng
          </button>
        </div>
      )}

      {exportSuccess && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span className="font-medium">Xuất tệp thành công! Trình duyệt đang tải tệp về máy của bạn.</span>
        </div>
      )}

      {/* ============================================================
          VIDEO PREVIEW SECTION
          ============================================================ */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Film size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Khung chiếu Video thành phẩm
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {dubbedVideoInfo ? "Video hoàn thiện sẵn sàng để kiểm duyệt" : "Đang kết nối video..."}
              </p>
            </div>
          </div>
          {dubbedVideoInfo && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 size={12} />
              Đã hoàn tất
            </span>
          )}
        </div>

        {/* Video Player */}
        {videoUrl ? (
          <div className="mt-4">
            <StandardVideoPlayer
              src={videoUrl}
              selectedQuality={selectedQuality}
              availableQualities={["360p", "720p", "1080p", "2k", "4k"]}
              onQualityChange={handleQualityChange}
              isSwitchingQuality={isSwitchingQuality}
              hasBurnedSubtitles={hasBurnedSubtitles}
              subtitleSegments={subtitleSegments}
              aspectRatio="auto"
              onDurationChange={(d) => setDuration(d)}
            />

            {/* Video Info Badges */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">Thời lượng</p>
                <p className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] font-mono mt-0.5">
                  {formatTime(duration)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">Độ phân giải</p>
                <p className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] font-mono mt-0.5">
                  {selectedQuality}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">Ngôn ngữ đích</p>
                <p className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
                  {state.targetLanguage?.toUpperCase() || "VI"}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">Phụ đề</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                  {hasBurnedSubtitles ? "✓ Đã nhúng (Hardsub)" : (hasSubtitles ? "✓ Phụ đề mềm" : "Không có")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex h-60 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/50">
            <Film size={40} className="text-[var(--color-text-muted)] opacity-30" />
            <p className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
              Chưa có bản xem trước video lồng tiếng
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] opacity-60">
              Hãy tạo bản lồng tiếng ở bước 5 trước khi kiểm duyệt
            </p>
          </div>
        )}
      </div>

      {/* ============================================================
          EXPORT SETTINGS SECTION
          ============================================================ */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Tùy chọn Định dạng Xuất bản
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Chọn loại tệp và định dạng bạn muốn tải về
              </p>
            </div>
          </div>
        </div>

        {/* Export Type Selection */}
        {availableTypes.length > 0 ? (
          <div className="mt-4">
            <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">
              Loại tệp xuất bản
            </span>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
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
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 shadow-xs ring-1 ring-[var(--color-primary)]/30"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 hover:border-[var(--color-primary)]/40"
                    }`}
                  >
                    <Icon size={18} className={isSelected ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"} />
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">{type.label}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] leading-tight">{type.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-400 text-xs">
            Chưa có tùy chọn xuất bản khả dụng. Vui lòng hoàn thành quá trình xử lý video.
          </div>
        )}

        {/* Format & Quality Selection */}
        {availableTypes.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 pt-4 border-t border-[var(--color-border)]">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">
                Định dạng tệp (Format)
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] uppercase outline-none focus:border-[var(--color-primary)]"
              >
                {availableTypes
                  .find(t => t.key === selectedType)
                  ?.formats?.map((format: string) => (
                    <option key={format} value={format}>
                      .{format.toUpperCase()}
                    </option>
                  )) || (
                  <option value="mp4">.MP4</option>
                )}
              </select>
            </div>

            {/* Quality Selection (only for video) */}
            {selectedType === "final_video" && (
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">
                  Độ phân giải xuất bản
                </label>
                <select
                  value={selectedQuality}
                  onChange={(e) => handleQualityChange(e.target.value)}
                  disabled={isSwitchingQuality}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
                >
                  {(
                    availableTypes.find(t => t.key === selectedType)?.qualities ||
                    ["360p", "720p", "1080p", "2k", "4k"]
                  ).map((quality: string) => (
                    <option key={quality} value={quality}>
                      {quality.toUpperCase()} {quality === "1080p" ? "(Đề xuất - Full HD)" : quality === "4k" ? "(Ultra HD)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Download Action Footer */}
        {availableTypes.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1 font-mono">
                <Clock size={13} />
                Sẵn sàng tải
              </span>
              <span>·</span>
              <span className="font-semibold text-[var(--color-text-primary)] uppercase">
                {selectedType.replace("_", " ")} (.{selectedFormat})
              </span>
            </div>
            
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_8px_20px_rgba(24,195,170,0.25)] transition hover:bg-[var(--color-primary-hover)] active:scale-98 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>{isExporting ? "Đang xuất tệp..." : "Tải xuống ngay"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================
          QUICK SUBTITLE EDIT MODAL
          ============================================================ */}
      {isQuickEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Sửa nhanh Phụ đề
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Chỉnh sửa lỗi chính tả trực tiếp mà không ảnh hưởng tiến trình video
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickEditOpen(false)}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-2.5 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={quickEditSearch}
                  onChange={(e) => setQuickEditSearch(e.target.value)}
                  placeholder="Tìm câu cần sửa..."
                  className="h-8 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Modal Segments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredQuickEditSegments.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                  Không tìm thấy câu phụ đề nào phù hợp
                </div>
              ) : (
                filteredQuickEditSegments.map((seg) => {
                  const idx = editingSegments.indexOf(seg);
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 p-3"
                    >
                      <div className="flex items-center justify-between pb-1.5 text-[10px] text-[var(--color-text-muted)] font-mono">
                        <span className="font-bold text-[var(--color-primary)]">Câu #{idx + 1}</span>
                        <span>
                          {formatTime(seg.start)} → {formatTime(seg.end)}
                        </span>
                      </div>

                      {seg.text && (
                        <div className="text-[11px] text-[var(--color-text-muted)] italic mb-1.5 line-clamp-1">
                          Gốc: {seg.text}
                        </div>
                      )}

                      <textarea
                        value={seg.translated_text || ""}
                        onChange={(e) => {
                          const next = [...editingSegments];
                          next[idx] = { ...next[idx], translated_text: e.target.value };
                          setEditingSegments(next);
                        }}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-2 text-xs leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                        placeholder="Nội dung phụ đề..."
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <Coins size={14} />
                <span>0 Credits (Lưu miễn phí)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickEditOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleSaveQuickEdit}
                  disabled={isSavingQuickEdit}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {isSavingQuickEdit ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : quickEditSuccess ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{quickEditSuccess ? "Đã lưu!" : isSavingQuickEdit ? "Đang lưu..." : "Lưu thay đổi"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}