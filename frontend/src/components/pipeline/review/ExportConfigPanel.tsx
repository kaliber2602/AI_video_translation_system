import { Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ExportConfigPanelProps {
  selectedFormat: string;
  setSelectedFormat: (fmt: string) => void;
  selectedQuality: string;
  setSelectedQuality: (quality: string) => void;
  customExportFilename: string;
  setCustomExportFilename: (name: string) => void;
  isExporting: boolean;
  hasFinishedVideo: boolean;
  onExport: () => void;
}

export default function ExportConfigPanel({
  selectedFormat,
  setSelectedFormat,
  selectedQuality,
  setSelectedQuality,
  customExportFilename,
  setCustomExportFilename,
  isExporting,
  hasFinishedVideo,
  onExport,
}: ExportConfigPanelProps) {
  const { t } = useTranslation(["pipeline", "common"]);

  return (
    <div className="space-y-3 pb-3 border-b border-[var(--color-border)]">
      <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
        Khu vực 1: Xuất Video Thành Phẩm (Rendered Video)
      </span>

      {/* FORMAT SELECTION (.MP4 | .MKV) */}
      <div>
        <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
          Định dạng tệp video:
        </label>
        <div className="grid grid-cols-2 gap-2">
          {["mp4", "mkv"].map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setSelectedFormat(fmt)}
              className={`py-1.5 rounded-xl border text-xs font-bold uppercase transition font-mono ${
                selectedFormat === fmt
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-2xs"
                  : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50"
              }`}
            >
              .{fmt}
            </button>
          ))}
        </div>
      </div>

      {/* RESOLUTION SELECTION */}
      <div>
        <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
          Độ phân giải video (Resolution):
        </label>
        <select
          value={selectedQuality}
          onChange={(e) => setSelectedQuality(e.target.value)}
          className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
        >
          <option value="720p">720p HD (Gói Free & Pro)</option>
          <option value="1080p">1080p Full HD (Chuẩn - Gói Pro)</option>
          <option value="4K">4K Ultra HD (Chất lượng cao - Gói Pro)</option>
        </select>
      </div>

      {/* CUSTOM EXPORT FILENAME */}
      <div>
        <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
          Tên tệp xuất bản (Filename):
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customExportFilename}
            onChange={(e) => setCustomExportFilename(e.target.value)}
            placeholder="Nhập tên tệp xuất..."
            className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] font-mono"
          />
          <span className="text-xs font-mono text-[var(--color-text-muted)] shrink-0">
            .{selectedFormat}
          </span>
        </div>
      </div>

      {/* DOWNLOAD VIDEO BUTTON */}
      <button
        type="button"
        onClick={onExport}
        disabled={isExporting || !hasFinishedVideo}
        title={!hasFinishedVideo ? t("pipeline:steps.reviewExport.downloadTooltipNotReady") : t("pipeline:steps.reviewExport.downloadTooltipReady")}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
      >
        {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        <span>
          {isExporting
            ? t("pipeline:steps.reviewExport.exporting")
            : `Tải Video Hoàn Chỉnh (.${selectedFormat.toUpperCase()})`}
        </span>
      </button>
      {!hasFinishedVideo && (
        <p className="mt-1 text-[10px] text-amber-400/90 text-center">
           {t("pipeline:steps.reviewExport.videoNotCreatedWarning")}
        </p>
      )}
    </div>
  );
}
