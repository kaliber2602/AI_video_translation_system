import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  CreditCard,
  Globe,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { getAdminPayments, getAdminPaymentStats } from "../../services/admin.service";
import { toast } from "../../lib/toast";
import type {
  AdminPaymentStatsResponse,
  AdminPaymentTransactionResponse,
} from "../../types/admin";

export default function AdminFinancePage() {
  const { t } = useTranslation(["admin", "common"]);

  const [stats, setStats] = useState<AdminPaymentStatsResponse | null>(null);
  const [transactions, setTransactions] = useState<AdminPaymentTransactionResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(15);
  const [offset, setOffset] = useState(0);
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinanceData();
  }, [offset, gatewayFilter, statusFilter]);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const [statsData, txsData] = await Promise.all([
        getAdminPaymentStats().catch(() => null),
        getAdminPayments({
          limit,
          offset,
          gateway: gatewayFilter !== "all" ? gatewayFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
      ]);

      if (statsData) setStats(statsData);
      setTransactions(txsData.items);
      setTotal(txsData.total);
    } catch (err) {
      console.error("[AdminFinancePage] Error:", err);
      toast.error("Không thể tải thông tin thanh toán.");
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
            {t("admin:finance.title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t("admin:finance.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadFinanceData}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            {t("admin:finance.totalRevenue")}
          </p>
          <p className="mt-2 text-3xl font-black text-teal-600 dark:text-teal-400">
            ${(stats?.total_revenue_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">Tổng doanh thu thanh toán thành công</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            {t("admin:finance.transactionsCount")}
          </p>
          <p className="mt-2 text-3xl font-black text-[var(--color-text-primary)]">
            {stats?.total_transactions_count ?? 0}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">Giao dịch qua tất cả các cổng</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            {t("admin:finance.completed")}
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-500">
            {stats?.completed_count ?? 0}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">Thanh toán hoàn tất</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            Thất bại / Chờ xử lý
          </p>
          <p className="mt-2 text-3xl font-black text-amber-500">
            {stats?.pending_count ?? 0} / {stats?.failed_count ?? 0}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">Pending / Failed</p>
        </div>
      </div>

      {/* Gateway Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div>
            <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-extrabold uppercase text-purple-600">
              Cổng Stripe
            </span>
            <p className="mt-2 text-xl font-bold">
              ${((stats?.gateway_breakdown?.stripe?.total_amount) ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {(stats?.gateway_breakdown?.stripe?.count) ?? 0} giao dịch
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
            <CreditCard size={24} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div>
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-extrabold uppercase text-blue-600">
              Cổng VNPay
            </span>
            <p className="mt-2 text-xl font-bold">
              ${((stats?.gateway_breakdown?.vnpay?.total_amount) ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {(stats?.gateway_breakdown?.vnpay?.count) ?? 0} giao dịch
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <Globe size={24} />
          </div>
        </div>
      </div>

      {/* Transactions Filter */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--color-text-muted)]">Cổng:</span>
            <select
              value={gatewayFilter}
              onChange={(e) => {
                setGatewayFilter(e.target.value);
                setOffset(0);
              }}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-bold"
            >
              <option value="all">Tất cả</option>
              <option value="stripe">Stripe</option>
              <option value="vnpay">VNPay</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--color-text-muted)]">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-bold"
            >
              <option value="all">Tất cả</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3.5">{t("admin:finance.transactionCode")}</th>
                <th className="px-4 py-3.5">{t("admin:finance.user")}</th>
                <th className="px-4 py-3.5">{t("admin:finance.amount")}</th>
                <th className="px-4 py-3.5">{t("admin:finance.gateway")}</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5">{t("admin:finance.date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--color-primary)]" />
                    Đang tải lịch sử giao dịch...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    Chưa có giao dịch thanh toán nào phù hợp.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[var(--color-surface-muted)]/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-primary)]">
                      {tx.transaction_code}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      {tx.user_email}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-teal-600">
                      ${tx.amount.toFixed(2)} {tx.currency}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-[var(--color-surface-muted)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--color-text-secondary)]">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          tx.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : tx.status === "pending"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {tx.status === "completed" ? (
                          <CheckCircle2 size={10} />
                        ) : (
                          <XCircle size={10} />
                        )}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono text-[11px]">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-secondary)]">
            <span>
              Hiển thị {offset + 1} - {Math.min(offset + limit, total)} trên {total} giao dịch
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
