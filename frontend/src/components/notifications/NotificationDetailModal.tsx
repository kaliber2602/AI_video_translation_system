import { useEffect } from "react";
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Coins,
  Cpu,
  Layers,
  FileVideo,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "../../types/notification";
import { formatRelativeTime, sanitizeInternalActionUrl } from "./notificationMeta";

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (id: number) => Promise<void>;
}

export default function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
}: NotificationDetailModalProps) {
  const { i18n } = useTranslation(["notifications", "common"]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && notification && !notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  }, [isOpen, notification, onMarkAsRead]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !notification) return null;

  const meta = notification.metadata || {};
  const statusVal = (meta.status || "completed").toLowerCase();
  const isSuccess = statusVal === "completed" || statusVal === "success";
  const safeActionUrl = sanitizeInternalActionUrl(notification.action_url);

  const videoTitle = meta.video_title || meta.name || (meta.video_id ? `Video #${meta.video_id}` : null);
  const projectName = meta.project_name;
  const duration = meta.duration_formatted;
  const quotaConsumed = meta.words_used || meta.quota_consumed;
  const quotaRemaining = meta.quota_remaining;
  const models = meta.pipeline_models;
  const languages = meta.languages;
  const batchSummary = meta.batch_summary;

  const handleNavigateToEditor = () => {
    onClose();
    if (safeActionUrl) {
      navigate(safeActionUrl);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 bg-[var(--color-surface-muted)]/50">
          <div className="flex items-center gap-2.5">
            {isSuccess ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={18} />
              </span>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle size={18} />
              </span>
            )}
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)] leading-tight">
                {notification.title}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {formatRelativeTime(notification.created_at, i18n.language)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Main Message Note */}
          <div className="rounded-xl p-3.5 bg-[var(--color-surface-muted)]/60 border border-[var(--color-border)]/60 text-sm text-[var(--color-text-primary)] leading-relaxed">
            {notification.message}
          </div>

          {/* Structured Execution Summary (Mirroring Email) */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--color-surface-muted)]/40 border-b border-[var(--color-border)] text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} className="text-[var(--color-primary)]" />
              <span>Thông tin chi tiết tiến trình & Kết quả</span>
            </div>

            <div className="divide-y divide-[var(--color-border)]/50 text-xs sm:text-sm">
              {videoTitle && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <FileVideo size={14} /> Video / Đối tượng
                  </span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {videoTitle}
                  </span>
                </div>
              )}

              {projectName && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[var(--color-text-muted)]">Dự án</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {projectName}
                  </span>
                </div>
              )}

              {meta.started_at && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <Clock size={14} /> Thời gian bắt đầu
                  </span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {meta.started_at}
                  </span>
                </div>
              )}

              {meta.finished_at && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <Clock size={14} /> Thời gian hoàn tất
                  </span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {meta.finished_at}
                  </span>
                </div>
              )}

              {duration && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <Clock size={14} /> Tổng thời gian thực thi
                  </span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {duration}
                  </span>
                </div>
              )}

              {quotaConsumed !== undefined && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <Coins size={14} /> Quota đã tiêu hao
                  </span>
                  <span className="font-bold text-[var(--color-primary)]">
                    {Number(quotaConsumed).toLocaleString()} từ
                  </span>
                </div>
              )}

              {quotaRemaining !== undefined && quotaRemaining !== null && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[var(--color-text-muted)]">Quota khả dụng còn lại</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {Number(quotaRemaining).toLocaleString()} từ
                  </span>
                </div>
              )}

              {languages && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[var(--color-text-muted)]">Cặp ngôn ngữ</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {languages}
                  </span>
                </div>
              )}

              {models && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <Cpu size={14} /> Cấu hình AI models
                  </span>
                  <span className="font-mono text-xs text-[var(--color-text-primary)]">
                    {models}
                  </span>
                </div>
              )}

              {batchSummary && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-primary-soft)]/20">
                  <span className="font-semibold text-[var(--color-text-primary)]">Tổng kết lô</span>
                  <span className="font-bold text-[var(--color-primary)]">
                    {batchSummary}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[var(--color-border)] px-5 py-3.5 bg-[var(--color-surface-muted)]/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] transition"
          >
            Đóng
          </button>

          {safeActionUrl && (
            <button
              type="button"
              onClick={handleNavigateToEditor}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[var(--color-primary)] hover:opacity-90 shadow-xs transition"
            >
              <span>Mở Video & Trình chỉnh sửa</span>
              <ExternalLink size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
