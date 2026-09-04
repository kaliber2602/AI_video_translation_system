// ReviewExportStep.tsx
import { useState, useEffect } from "react";
import {
  Check,
  ChevronLeft,
  Download,
  FileAudio,
  FileText,
  Film,
  GripVertical,
  Play,
  Save,
  Settings2,
  Volume2,
  Loader2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePipeline } from "../../hooks/usePipeline";
import { videoService } from "../../services/video.service";

interface ExportOption {
  type: string;
  label: string;
  formats: string[];
  qualities?: string[];
  languages?: string[];
}

export default function ReviewExportStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const { state, dispatch } = usePipeline();
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [exportOptions, setExportOptions] = useState<ExportOption[]>([]);
  const [selectedExports, setSelectedExports] = useState<Set<string>>(new Set());
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const timelineTracks = [
    { id: "video", label: "Video", icon: Film },
    { id: "subtitle", label: "Subtitle", icon: FileText },
    { id: "audio", label: "Audio", icon: Volume2 },
    { id: "translation", label: "Translation", icon: FileText },
  ];

  useEffect(() => {
    loadExportOptions();
    loadVideoPreview();
  }, []);

  const loadExportOptions = async () => {
    if (!state.video?.videoId) return;
    setIsLoading(true);

    try {
      const data = await videoService.getExportOptions(state.video.videoId);
      setExportOptions(data.available_exports);
      // Auto-select all available exports
      setSelectedExports(new Set(data.available_exports.map((e: ExportOption) => e.type)));
    } catch (error) {
      console.error("Failed to load export options:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideoPreview = async () => {
    if (!state.video?.videoId) return;
    try {
      const data = await videoService.getPlaybackInfo(state.video.videoId);
      if (data.hls_url) {
        setVideoUrl(data.hls_url);
      }
    } catch (error) {
      console.error("Failed to load video preview:", error);
    }
  };

  const handleExport = async () => {
    if (!state.video?.videoId) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Starting export...");

    try {
      const exportTypes = Array.from(selectedExports);
      let completed = 0;
      const total = exportTypes.length;

      for (const type of exportTypes) {
        setExportStatus(`Exporting ${type}...`);
        const data = await videoService.exportVideo(
          state.video.videoId,
          type,
          selectedFormat,
          selectedQuality,
          state.targetLanguage || "vi"
        );

        // Download the exported file
        if (data) {
          const blob = await fetch(data).then((r) => r.blob());
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${type}_${state.video.videoId}.${selectedFormat}`;
          a.click();
          URL.revokeObjectURL(url);
        }

        completed++;
        setExportProgress(Math.round((completed / total) * 100));
      }

      setExportStatus("Export completed!");
    } catch (error) {
      console.error("Export failed:", error);
      setExportStatus("Export failed: " + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExport = (type: string) => {
    const newSet = new Set(selectedExports);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedExports(newSet);
  };

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
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[var(--color-primary)]">
            {t("pipeline:header.stepBadge", { current: "06", total: "06" })}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
            {t("pipeline:steps.reviewExport.pageTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            {t("pipeline:steps.reviewExport.pageDescription")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">
            <Check size={15} className="text-[var(--color-primary)]" />
            {state.job?.status === "completed" ? "Processing complete" : "Ready to export"}
          </div>
        </div>
      </div>

      {/* Main Preview + Export Options */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* Video Preview */}
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#17252B] shadow-[var(--shadow-card)]">
          <div className="relative flex aspect-video items-center justify-center bg-[#1D2D33]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,90,95,0.4),transparent_65%)]" />

            {videoUrl ? (
              <video
                src={videoUrl}
                className="h-full w-full object-contain"
                controls
                autoPlay={false}
              />
            ) : (
              <button
                type="button"
                aria-label="Play video preview"
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-[0_10px_35px_rgba(0,0,0,0.2)] transition hover:scale-105"
              >
                <Play size={26} fill="currentColor" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-white">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-white/70">
                {state.video?.filename || "Video"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-white/60">
              <Volume2 size={17} />
              <Settings2 size={17} />
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Export Options
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Select what to export
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {exportOptions.map((option) => (
              <ExportCheckbox
                key={option.type}
                label={option.label}
                description={`${option.formats.join(", ")}${option.qualities ? ` · ${option.qualities.join(", ")}` : ""}`}
                checked={selectedExports.has(option.type)}
                onChange={() => toggleExport(option.type)}
                icon={getExportIcon(option.type)}
              />
            ))}
          </div>

          <div className="mt-5 border-t border-[var(--color-border)] pt-5">
            <label className="mb-2 block text-xs font-semibold text-[var(--color-text-muted)]">
              Video Format
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="mp4">MP4</option>
              <option value="mov">MOV</option>
              <option value="avi">AVI</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold text-[var(--color-text-muted)]">
              Quality
            </label>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="360p">360p</option>
              <option value="4K">4K</option>
            </select>
          </div>

          {exportStatus && (
            <div className="mt-4 rounded-lg bg-[var(--color-surface-muted)] p-3 text-xs">
              <p className="text-[var(--color-text-secondary)]">{exportStatus}</p>
              {isExporting && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Timeline Editor
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Drag to adjust segment timing
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <Settings2 size={14} />
            Settings
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px] p-5">
            <div className="ml-[150px] mb-4 flex justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>00:00</span>
              <span>00:30</span>
              <span>01:00</span>
              <span>01:30</span>
              <span>02:00</span>
              <span>02:30</span>
            </div>

            <div className="space-y-3">
              {timelineTracks.map((track) => {
                const Icon = track.icon;
                return (
                  <div key={track.id} className="flex items-center gap-4">
                    <div className="flex w-[130px] shrink-0 items-center gap-2">
                      <Icon size={16} className="text-[var(--color-text-muted)]" />
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {track.label}
                      </span>
                    </div>
                    <div className="relative h-14 flex-1 rounded-xl bg-[var(--color-surface-muted)]">
                      <div className="absolute inset-y-0 left-[32%] z-20 w-[2px] bg-[var(--color-primary)]">
                        <div className="absolute -left-[5px] -top-1 h-3 w-3 rounded-full bg-[var(--color-primary)]" />
                      </div>
                      <div className="absolute left-[10%] top-2 h-10 w-[60%] rounded-lg bg-[var(--color-primary-soft)] opacity-20" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => dispatch({ type: "SET_STEP", payload: 5 })}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          <ChevronLeft size={17} />
          Back to Dubbing
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || selectedExports.size === 0}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download size={17} />
              Export Selected ({selectedExports.size})
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ExportCheckbox({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
      />
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
    </label>
  );
}

function getExportIcon(type: string): React.ReactNode {
  switch (type) {
    case "final_video":
      return <Film size={16} />;
    case "subtitles":
      return <FileText size={16} />;
    case "audio":
      return <FileAudio size={16} />;
    case "transcript":
      return <FileText size={16} />;
    case "translation":
      return <FileText size={16} />;
    default:
      return <FileText size={16} />;
  }
}