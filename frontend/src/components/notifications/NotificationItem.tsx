import { useState } from "react";
import { Check, ExternalLink, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { NotificationItem as NotificationItemType } from "../../types/notification";
import {
  formatRelativeTime,
  getNotificationMeta,
  sanitizeInternalActionUrl,
} from "./notificationMeta";

interface NotificationItemProps {
  notification: NotificationItemType;
  onMarkAsRead: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onCloseDropdown?: () => void;
  onOpenDetail?: (notification: NotificationItemType) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onCloseDropdown,
  onOpenDetail,
}: NotificationItemProps) {
  const { t, i18n } = useTranslation(["notifications", "common"]);
  const navigate = useNavigate();

  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const eventName = notification.metadata?.event as string | undefined;
  const meta = getNotificationMeta(notification.type, eventName);
  const safeActionUrl = sanitizeInternalActionUrl(notification.action_url);

  const handleOpen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!notification.is_read) {
      handleMarkRead();
    }
    if (onOpenDetail) {
      onOpenDetail(notification);
    } else if (safeActionUrl) {
      if (onCloseDropdown) onCloseDropdown();
      navigate(safeActionUrl);
    }
  };

  const handleItemClick = async () => {
    handleOpen();
  };

  const handleMarkRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (notification.is_read || isMarkingRead) return;

    try {
      setIsMarkingRead(true);
      await onMarkAsRead(notification.id);
    } catch (err) {
      console.error("[NotificationItem] Failed to mark read:", err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await onDelete(notification.id);
    } catch (err) {
      console.error("[NotificationItem] Failed to delete notification:", err);
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="article"
      aria-label={notification.title}
      onClick={handleItemClick}
      className={`group relative flex items-start gap-3 p-3.5 transition-colors duration-150 cursor-pointer border-b border-[var(--color-border)]/50 last:border-b-0 hover:bg-[var(--color-surface-muted)]/70 ${
        notification.is_read
          ? "bg-[var(--color-surface)] opacity-90"
          : "bg-[var(--color-primary-soft)]/20 dark:bg-[var(--color-primary-soft)]/15"
      }`}
    >
      {/* Type Icon Badge */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-2xs mt-0.5 ${meta.badgeBg} ${meta.badgeText}`}
      >
        {meta.icon}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4
            className={`text-xs sm:text-sm leading-snug line-clamp-1 ${
              notification.is_read
                ? "font-medium text-[var(--color-text-primary)]"
                : "font-bold text-[var(--color-text-primary)]"
            }`}
          >
            {notification.title}
          </h4>

          {/* Unread indicator badge */}
          {!notification.is_read && (
            <span
              className="h-2 w-2 rounded-full bg-[var(--color-primary)] shrink-0"
              aria-label={t("notifications:unreadIndicator", "Unread")}
            />
          )}
        </div>

        {/* Message (plain text, never rendered as raw HTML) */}
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed break-words">
          {notification.message}
        </p>

        {/* Footer info: Relative timestamp */}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span>{formatRelativeTime(notification.created_at, i18n.language)}</span>
        </div>
      </div>

      {/* Row action buttons cluster - ALWAYS VISIBLE in an action grid/row */}
      <div
        className="shrink-0 flex items-center gap-1 self-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Open detail / view button */}
        <button
          type="button"
          onClick={handleOpen}
          title={t("notifications:viewAction", "Open details")}
          aria-label={t("notifications:viewAction", "Open details")}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-soft)]/20 transition shadow-2xs"
        >
          <ExternalLink size={13} />
        </button>

        {/* Mark read button */}
        {!notification.is_read && (
          <button
            type="button"
            onClick={handleMarkRead}
            disabled={isMarkingRead}
            title={t("notifications:markRead", "Mark as read")}
            aria-label={t("notifications:markRead", "Mark as read")}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition disabled:opacity-50 shadow-2xs"
          >
            <Check size={13} />
          </button>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          title={t("notifications:deleteNotification", "Delete")}
          aria-label={t("notifications:deleteNotification", "Delete")}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)]/40 transition disabled:opacity-50 shadow-2xs"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
