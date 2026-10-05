import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  FileVideo,
  Trash2,
  FileUp,
  ArrowRight,
} from "lucide-react";
import type { ChangeEvent, DragEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";

interface FileDropzoneProps {
  isUploading: boolean;
  uploadProgress: number;
  uploadStatusText: string;
  uploadComplete: boolean;
  stagedFile: File | null;
  uploadedFilename?: string;
  uploadedFileSize?: number;
  isDragging: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrop: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onCancelUpload: () => void;
  onClearStagedFile: () => void;
  onStartUpload: () => void;
  onGoToNextStep: () => void;
}

export default function FileDropzone({
  isUploading,
  uploadProgress,
  uploadStatusText,
  uploadComplete,
  stagedFile,
  uploadedFilename,
  uploadedFileSize,
  isDragging,
  fileInputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onCancelUpload,
  onClearStagedFile,
  onStartUpload,
  onGoToNextStep,
}: FileDropzoneProps) {
  const { t } = useTranslation(["pipeline", "common"]);

  if (isUploading) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 p-8 text-center">
        <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
        <p className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">
          {uploadStatusText} {uploadProgress}%
        </p>
        <div className="mt-3 h-2.5 w-64 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancelUpload();
            }}
            className="px-3 py-1 rounded-lg border border-red-500/40 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            Hủy tải lên (Cancel)
          </button>
        </div>
      </div>
    );
  }

  if (uploadComplete) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-green-500 bg-green-500/5 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/20 text-green-500">
          <CheckCircle2 size={36} />
        </div>
        <h3 className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">
          Upload Complete! 🎉
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {uploadedFilename} đã tải lên thành công và sẵn sàng để xử lý.
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          {uploadedFileSize != null && uploadedFileSize > 0
            ? `${(uploadedFileSize / (1024 * 1024)).toFixed(1)} MB`
            : ""}
        </p>
        <button
          type="button"
          onClick={onGoToNextStep}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[var(--color-primary)]/20 hover:bg-[var(--color-primary-hover)] transition"
        >
          <span>Chuyển tới bước Bóc băng (Transcript)</span>
          <ArrowRight size={15} />
        </button>
      </div>
    );
  }

  if (stagedFile) {
    return (
      <div className="p-5 rounded-2xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-md">
            <FileVideo size={28} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-[var(--color-text-primary)] truncate">
                {stagedFile.name}
              </h4>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-500">
                Chưa tải lên
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Dung lượng: {(stagedFile.size / (1024 * 1024)).toFixed(2)} MB • Tệp đã được chuẩn bị. Bạn có thể tùy chỉnh cấu hình Demucs bên dưới trước khi bấm tải lên.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClearStagedFile}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-red-500 hover:border-red-500/40 transition"
          >
            <Trash2 size={14} />
            <span>Hủy chọn</span>
          </button>
          <button
            type="button"
            onClick={onStartUpload}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white shadow-md shadow-[var(--color-primary)]/20 hover:bg-[var(--color-primary-hover)] transition"
          >
            <FileUp size={14} />
            <span>Bắt đầu tải lên & Xử lý</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
        isDragging
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)]"
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <UploadCloud size={30} />
      </div>
      <h3 className="mt-4 text-base font-bold text-[var(--color-text-primary)]">
        {t("pipeline:steps.upload.dropzoneTitle")}
      </h3>
      <p className="mt-1.5 max-w-md text-xs leading-5 text-[var(--color-text-muted)]">
        {t("pipeline:steps.upload.dropzoneDescription")}
      </p>
      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
        MP4, MOV, AVI, MKV (Hỗ trợ dung lượng tới 2GB)
      </p>
      <button
        type="button"
        className="mt-4 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[var(--color-primary-hover)] hover:scale-105 active:scale-95 transition"
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
        onChange={onFileSelect}
      />
    </div>
  );
}
