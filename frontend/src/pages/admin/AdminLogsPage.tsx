import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";

import {
  getAdminActivityLogs,
  getAdminCreditLogs,
} from "../../services/admin.service";
import { toast } from "../../lib/toast";
import type {
  AdminActivityLogResponse,
  AdminCreditAuditResponse,
} from "../../types/admin";

export default function AdminLogsPage() {
  const { t } = useTranslation(["admin", "common"]);

  const [activeTab, setActiveTab] = useState<"activity" | "credits">("activity");
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogResponse[]>([]);
  const [creditLogs, setCreditLogs] = useState<AdminCreditAuditResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [activeTab, offset]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      if (activeTab === "activity") {
        const res = await getAdminActivityLogs({ limit, offset });
        setActivityLogs(res.items);
        setTotal(res.total);
      } else {
        const res = await getAdminCreditLogs({ limit, offset });
        setCreditLogs(res.items);
        setTotal(res.total);
      }
    } catch (err) {
      console.error("[AdminLogsPage] Error:", err);
      toast.error("Không thể tải danh sách nhật ký.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            {t("admin:logs.title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t("admin:logs.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-[var(--color-border)] pb-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab("activity");
            setOffset(0);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "activity"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Activity size={16} />
          <span>{t("admin:logs.tabActivity")}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("credits");
            setOffset(0);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "credits"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Zap size={16} />
          <span>{t("admin:logs.tabCredits")}</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="overflow-x-auto">
          {activeTab === "activity" ? (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Người dùng</th>
                  <th className="px-4 py-3.5">{t("admin:logs.action")}</th>
                  <th className="px-4 py-3.5">{t("admin:logs.target")}</th>
                  <th className="px-4 py-3.5">{t("admin:logs.metadata")}</th>
                  <th className="px-4 py-3.5">{t("admin:logs.timestamp")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--color-primary)]" />
                      Đang tải nhật ký hoạt động...
                    </td>
                  </tr>
                ) : activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                      Chưa có nhật ký hoạt động nào.
                    </td>
                  </tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--color-surface-muted)]/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-muted)]">
                        #{log.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        {log.user_email || `User #${log.user_id}`}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {log.target_type ? `${log.target_type} #${log.target_id || ""}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-[var(--color-text-muted)] max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Người dùng</th>
                  <th className="px-4 py-3.5">{t("admin:logs.service")}</th>
                  <th className="px-4 py-3.5">{t("admin:logs.deducted")}</th>
                  <th className="px-4 py-3.5">{t("admin:logs.description")}</th>
                  <th className="px-4 py-3.5">{t("admin:logs.timestamp")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--color-primary)]" />
                      Đang tải kiểm toán tín chỉ...
                    </td>
                  </tr>
                ) : creditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                      Chưa có nhật ký tín chỉ nào.
                    </td>
                  </tr>
                ) : (
                  creditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--color-surface-muted)]/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-muted)]">
                        #{log.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        {log.user_email || `User #${log.user_id}`}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold uppercase text-[10px] text-teal-600">
                        {log.service_type}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        <span
                          className={
                            log.credits_deducted > 0
                              ? "text-red-500"
                              : "text-emerald-500"
                          }
                        >
                          {log.credits_deducted > 0 ? `-${log.credits_deducted}` : `+${Math.abs(log.credits_deducted)}`} credits
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-sm truncate">
                        {log.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-secondary)]">
            <span>
              Hiển thị {offset + 1} - {Math.min(offset + limit, total)} trên {total} bản ghi
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-bold disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-bold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
