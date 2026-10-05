import { FileVideo, RefreshCw } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

interface UploadedFileSummaryProps {
  filename: string;
  fileSize?: number;
  duration?: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function UploadedFileSummary({
  filename,
  fileSize,
  duration,
  fileInputRef,
  onFileSelect,
}: UploadedFileSummaryProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/20">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20">
          <FileVideo size={28} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-[var(--color-text-primary)]">
              {filename}
            </h3>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Đã tải lên
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {fileSize != null && fileSize > 0
              ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB • `
              : ""}
            {duration
              ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")} • `
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
          onChange={onFileSelect}
        />
      </div>
    </div>
  );
}
