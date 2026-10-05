import { Archive, Loader2 } from "lucide-react";

interface ZipOptions {
  include_video: boolean;
  include_subtitles: boolean;
  include_audio: boolean;
  include_original: boolean;
}

interface ZipDownloadCardProps {
  zipOptions: ZipOptions;
  setZipOptions: React.Dispatch<React.SetStateAction<ZipOptions>>;
  isDownloadingZip: boolean;
  onDownloadZip: () => void;
}

export default function ZipDownloadCard({
  zipOptions,
  setZipOptions,
  isDownloadingZip,
  onDownloadZip,
}: ZipDownloadCardProps) {
  return (
    <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
      <span className="text-[10px] font-bold text-[var(--color-text-secondary)] block">
        Đóng gói tệp ZIP (Tùy chọn tài nguyên):
      </span>
      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[var(--color-text-primary)]">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={zipOptions.include_video}
            onChange={(e) => setZipOptions((prev) => ({ ...prev, include_video: e.target.checked }))}
            className="rounded border-[var(--color-border)] accent-[var(--color-primary)]"
          />
          <span>Video kết xuất</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={zipOptions.include_subtitles}
            onChange={(e) => setZipOptions((prev) => ({ ...prev, include_subtitles: e.target.checked }))}
            className="rounded border-[var(--color-border)] accent-[var(--color-primary)]"
          />
          <span>Phụ đề & Dịch</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={zipOptions.include_audio}
            onChange={(e) => setZipOptions((prev) => ({ ...prev, include_audio: e.target.checked }))}
            className="rounded border-[var(--color-border)] accent-[var(--color-primary)]"
          />
          <span>Âm thanh lồng tiếng</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={zipOptions.include_original}
            onChange={(e) => setZipOptions((prev) => ({ ...prev, include_original: e.target.checked }))}
            className="rounded border-[var(--color-border)] accent-[var(--color-primary)]"
          />
          <span>Video gốc (Nặng)</span>
        </label>
      </div>

      <button
        type="button"
        onClick={onDownloadZip}
        disabled={isDownloadingZip}
        title="Tải toàn bộ tài nguyên video này dưới dạng một tệp nén .ZIP"
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-2.5 text-xs font-bold text-[var(--color-text-primary)] shadow-sm transition hover:bg-[var(--color-border)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
      >
        {isDownloadingZip ? (
          <Loader2 size={15} className="animate-spin text-[var(--color-primary)]" />
        ) : (
          <Archive size={15} className="text-amber-400" />
        )}
        <span>
          {isDownloadingZip ? "Đang đóng gói tệp ZIP..." : "Tải gói tệp đã chọn (ZIP)"}
        </span>
      </button>
    </div>
  );
}
