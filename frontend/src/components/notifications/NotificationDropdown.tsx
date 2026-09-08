import { useCallback, useEffect, useRef, useState } from "react";
import {
  BellOff,
  CheckCheck,
  ExternalLink,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  deleteNotification,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "../../services/notification.service";
import type { NotificationItem as NotificationItemType } from "../../types/notification";
import { useNotifications } from "../../app/providers/NotificationContext";
import NotificationItem from "./NotificationItem";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({
  isOpen,
  onClose,
}: NotificationDropdownProps) {
  const { t } = useTranslation(["notifications", "common", "settings"]);
  const navigate = useNavigate();
  const { unreadCount, decrementUnreadCount, resetUnreadCount, fetchUnreadCount } =
    useNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<NotificationItemType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications for the selected tab/page
  const fetchList = useCallback(
    async (targetPage: number = 1, append: boolean = false) => {
      try {
        if (targetPage === 1) setIsLoading(true);
        else setIsLoadingMore(true);
        setError(null);

        const res = await getNotifications({
          page: targetPage,
          page_size: 15,
          unread_only: activeTab === "unread",
        });

        if (append) {
          setItems((prev) => [...prev, ...res.items]);
        } else {
          setItems(res.items);
        }

        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.total_pages);
      } catch (err: any) {
        console.error("[NotificationDropdown] Failed to load notifications:", err);
        setError(t("notifications:loadError", "Failed to load notifications."));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [activeTab, t]
  );

  // Re-fetch whenever dropdown opens or active tab switches
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchList(1, false);
    }
  }, [isOpen, activeTab, fetchList]);

  // Click outside & Escape key listeners
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Action: Mark single notification as read
  const handleMarkRead = async (id: number) => {
    // Optimistic local update
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item
      )
    );
    decrementUnreadCount(1);

    try {
      await markAsRead(id);
    } catch (err) {
      console.error("[NotificationDropdown] markAsRead error:", err);
      // Rollback on failure
      fetchUnreadCount();
      fetchList(1, false);
    }
  };

  // Action: Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;

    // Optimistic local update
    setIsMarkingAll(true);
    setItems((prev) =>
      prev.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() }))
    );
    resetUnreadCount();

    try {
      await markAllAsRead();
    } catch (err) {
      console.error("[NotificationDropdown] markAllAsRead error:", err);
      fetchUnreadCount();
      fetchList(1, false);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Action: Delete notification
  const handleDelete = async (id: number) => {
    const target = items.find((i) => i.id === id);
    // Optimistic local removal
    setItems((prev) => prev.filter((item) => item.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    if (target && !target.is_read) {
      decrementUnreadCount(1);
    }

    try {
      await deleteNotification(id);
    } catch (err) {
      console.error("[NotificationDropdown] delete error:", err);
      fetchList(1, false);
      fetchUnreadCount();
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore) {
      fetchList(page + 1, true);
    }
  };

  const handleOpenSettings = () => {
    onClose();
    navigate("/workspace/settings?tab=notifications");
  };

  const handleOpenFullPage = () => {
    onClose();
    navigate("/workspace/notifications");
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label={t("notifications:title", "Notifications")}
      aria-modal="false"
      className="absolute right-0 top-full mt-2 z-50 flex w-screen max-w-[calc(100vw-1.5rem)] sm:w-[420px] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-muted)]/40">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
            {t("notifications:title", "Notifications")}
          </h3>

          {unreadCount > 0 && (
            <span className="flex h-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 text-[11px] font-bold text-white shadow-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              title={t("notifications:markAllRead", "Mark all as read")}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition disabled:opacity-50"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">
                {t("notifications:markAllRead", "Mark all read")}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchList(1, false)}
            disabled={isLoading}
            title={t("common:refresh", "Refresh")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* =====================================================
          FILTER TABS (All / Unread)
      ====================================================== */}
      <div className="flex items-center border-b border-[var(--color-border)] px-4 bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 py-2.5 text-xs font-semibold transition border-b-2 -mb-px mr-4 ${
            activeTab === "all"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <span>{t("notifications:all", "All")}</span>
          <span className="text-[11px] opacity-75">({total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("unread")}
          className={`flex items-center gap-1.5 py-2.5 text-xs font-semibold transition border-b-2 -mb-px ${
            activeTab === "unread"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <span>{t("notifications:unread", "Unread")}</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.2 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* =====================================================
          CONTENT LIST
      ====================================================== */}
      <div className="max-h-[380px] overflow-y-auto overscroll-contain divide-y divide-[var(--color-border)]/40">
        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-xl bg-[var(--color-surface-muted)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-[var(--color-surface-muted)]" />
                  <div className="h-3 w-3/4 rounded bg-[var(--color-surface-muted)]" />
                  <div className="h-2 w-1/4 rounded bg-[var(--color-surface-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="p-8 text-center">
            <p className="text-xs text-[var(--color-danger)] font-medium mb-3">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchList(1, false)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition"
            >
              <RefreshCw size={12} />
              <span>{t("common:retry", "Retry")}</span>
            </button>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] mb-3">
              <BellOff size={22} />
            </div>
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
              {activeTab === "unread"
                ? t("notifications:noUnreadTitle", "No unread notifications")
                : t("notifications:emptyTitle", "No notifications yet")}
            </h4>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)] max-w-xs leading-relaxed">
              {activeTab === "unread"
                ? t("notifications:noUnreadDesc", "You are completely caught up with your notifications.")
                : t("notifications:emptyDesc", "Status updates for projects, payments, and pipelines will appear here.")}
            </p>
          </div>
        ) : (
          /* Items List */
          items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkRead}
              onDelete={handleDelete}
              onCloseDropdown={onClose}
            />
          ))
        )}

        {/* Load More Button */}
        {!isLoading && page < totalPages && (
          <div className="p-2 text-center bg-[var(--color-surface-muted)]/20">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-50"
            >
              {isLoadingMore
                ? t("common:loading", "Loading...")
                : t("notifications:loadMore", "Load more notifications")}
            </button>
          </div>
        )}
      </div>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2.5 bg-[var(--color-surface-muted)]/30 text-xs text-[var(--color-text-muted)]">
        <button
          type="button"
          onClick={handleOpenSettings}
          className="inline-flex items-center gap-1.5 hover:text-[var(--color-text-primary)] transition"
        >
          <Settings size={13} />
          <span>{t("settings:sidebar.notifications", "Preferences")}</span>
        </button>

        <button
          type="button"
          onClick={handleOpenFullPage}
          className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)] hover:underline"
        >
          <span>{t("notifications:viewAll", "View all")}</span>
          <ExternalLink size={11} />
        </button>
      </div>
    </div>
  );
}
