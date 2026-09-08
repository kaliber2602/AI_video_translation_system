import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BellOff,
  CheckCheck,
  Filter,
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
} from "../services/notification.service";
import type {
  NotificationItem as NotificationItemType,
} from "../types/notification";
import { useNotifications } from "../app/providers/NotificationContext";
import NotificationItem from "../components/notifications/NotificationItem";

export default function NotificationsPage() {
  const { t } = useTranslation(["notifications", "common", "settings"]);
  const navigate = useNavigate();
  const { unreadCount, decrementUnreadCount, resetUnreadCount, fetchUnreadCount } =
    useNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [items, setItems] = useState<NotificationItemType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  const pageSize = 20;

  const fetchList = useCallback(
    async (targetPage: number = 1) => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await getNotifications({
          page: targetPage,
          page_size: pageSize,
          unread_only: activeTab === "unread",
          type: selectedType === "all" ? undefined : selectedType,
        });

        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.total_pages);
      } catch (err: any) {
        console.error("[NotificationsPage] Failed to fetch notifications:", err);
        setError(t("notifications:loadError", "Failed to load notifications."));
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, selectedType, t]
  );

  useEffect(() => {
    fetchList(1);
  }, [activeTab, selectedType, fetchList]);

  const handleMarkRead = async (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item
      )
    );
    decrementUnreadCount(1);

    try {
      await markAsRead(id);
    } catch (err) {
      console.error("[NotificationsPage] markAsRead error:", err);
      fetchUnreadCount();
      fetchList(page);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;

    setIsMarkingAll(true);
    setItems((prev) =>
      prev.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() }))
    );
    resetUnreadCount();

    try {
      await markAllAsRead();
    } catch (err) {
      console.error("[NotificationsPage] markAllAsRead error:", err);
      fetchUnreadCount();
      fetchList(page);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDelete = async (id: number) => {
    const target = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    if (target && !target.is_read) {
      decrementUnreadCount(1);
    }

    try {
      await deleteNotification(id);
    } catch (err) {
      console.error("[NotificationsPage] delete error:", err);
      fetchList(page);
      fetchUnreadCount();
    }
  };

  const typesList: { id: string; label: string }[] = [
    { id: "all", label: t("notifications:allTypes", "All Types") },
    { id: "pipeline", label: t("notifications:types.pipeline", "Pipeline") },
    { id: "collaboration", label: t("notifications:types.collaboration", "Collaboration") },
    { id: "billing", label: t("notifications:types.billing", "Billing") },
    { id: "quota", label: t("notifications:types.quota", "Quota") },
    { id: "security", label: t("notifications:types.security", "Security") },
    { id: "system", label: t("notifications:types.system", "System") },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex h-[76px] items-center border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 sm:px-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/workspace")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            aria-label={t("common:back", "Back")}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
              {t("notifications:centerTitle", "Notification Center")}
            </h1>
            <p className="hidden sm:block text-xs text-[var(--color-text-muted)]">
              {t("notifications:centerSubtitle", "Manage all your project, billing, and system alerts")}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50 shadow-xs"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">
                {t("notifications:markAllRead", "Mark all read")}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/workspace/settings?tab=notifications")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] shadow-xs"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">
              {t("settings:sidebar.notifications", "Preferences")}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs">
          {/* Tabs: All / Unread */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "all"
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              {t("notifications:all", "All")}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "unread"
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              <span>{t("notifications:unread", "Unread")}</span>
              {unreadCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    activeTab === "unread"
                      ? "bg-white text-[var(--color-primary)]"
                      : "bg-[var(--color-primary)] text-white"
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Type Filter dropdown / pills */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--color-text-muted)]" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {typesList.map((tItem) => (
                <option key={tItem.id} value={tItem.id}>
                  {tItem.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => fetchList(page)}
              disabled={isLoading}
              title={t("common:refresh", "Refresh")}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Notification Items Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden divide-y divide-[var(--color-border)]/50">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="flex items-start gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-xl bg-[var(--color-surface-muted)] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-[var(--color-surface-muted)]" />
                    <div className="h-3 w-4/5 rounded bg-[var(--color-surface-muted)]" />
                    <div className="h-2 w-1/5 rounded bg-[var(--color-surface-muted)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-[var(--color-danger)] mb-3">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchList(page)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition"
              >
                <RefreshCw size={13} />
                <span>{t("common:retry", "Retry")}</span>
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] mb-3 shadow-2xs">
                <BellOff size={26} />
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {activeTab === "unread"
                  ? t("notifications:noUnreadTitle", "No unread notifications")
                  : t("notifications:emptyTitle", "No notifications yet")}
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-sm leading-relaxed">
                {activeTab === "unread"
                  ? t("notifications:noUnreadDesc", "You are completely caught up with your notifications.")
                  : t("notifications:emptyDesc", "Status updates for projects, payments, and pipelines will appear here.")}
              </p>
            </div>
          ) : (
            items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Pagination Bar */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("notifications:pageInfo", {
                page,
                totalPages,
                total,
                defaultValue: `Page ${page} of ${totalPages} (${total} total)`,
              })}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchList(page - 1)}
                disabled={page <= 1}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-40"
              >
                {t("common:previous", "Previous")}
              </button>

              <button
                type="button"
                onClick={() => fetchList(page + 1)}
                disabled={page >= totalPages}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-40"
              >
                {t("common:next", "Next")}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
