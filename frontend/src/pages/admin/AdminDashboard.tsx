import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  Folder,
  HardDrive,
  Layers,
  Loader2,
  PlayCircle,
  RefreshCw,
  Server,
  Users,
  Video,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";

import { getSystemHealth, getSystemMetrics } from "../../services/admin.service";
import type { SystemHealthResponse, SystemMetricsResponse } from "../../types/admin";

export default function AdminDashboard() {
  const { t } = useTranslation(["admin", "common"]);

  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [metrics, setMetrics] = useState<SystemMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [hData, mData] = await Promise.all([
        getSystemHealth().catch(() => null),
        getSystemMetrics().catch(() => null),
      ]);
      if (hData) setHealth(hData);
      if (mData) setMetrics(mData);
    } catch (err) {
      console.error("[AdminDashboard] Error loading data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Đang tải dữ liệu giám sát...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: t("admin:dashboard.kpi.totalUsers"),
      value: metrics?.total_users ?? 0,
      subtext: `${metrics?.active_users ?? 0} đang hoạt động • ${metrics?.admin_users ?? 0} admin`,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      link: "/admin/users",
    },
    {
      title: t("admin:dashboard.kpi.totalProjects"),
      value: metrics?.total_projects ?? 0,
      subtext: "Dự án trên nền tảng",
      icon: Folder,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      link: "/admin/jobs",
    },
    {
      title: t("admin:dashboard.kpi.totalVideos"),
      value: metrics?.total_videos ?? 0,
      subtext: "Video đã tải lên",
      icon: Video,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      link: "/admin/jobs",
    },
    {
      title: t("admin:dashboard.kpi.totalJobs"),
      value: metrics?.total_jobs ?? 0,
      subtext: `${metrics?.jobs_by_status.processing ?? 0} đang chạy • ${metrics?.jobs_by_status.failed ?? 0} lỗi`,
      icon: Cpu,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      link: "/admin/jobs",
    },
    {
      title: t("admin:dashboard.kpi.totalRevenue"),
      value: `$${(metrics?.total_revenue_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      subtext: "Doanh thu tích lũy Stripe & VNPay",
      icon: DollarSign,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      link: "/admin/finance",
    },
    {
      title: t("admin:dashboard.kpi.creditsConsumed"),
      value: (metrics?.total_credits_consumed ?? 0).toLocaleString(),
      subtext: "AI consumable credits đã dùng",
      icon: Zap,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      link: "/admin/logs",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            {t("admin:dashboard.title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t("admin:dashboard.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          <span>{refreshing ? "Đang làm mới..." : t("admin:health.refreshTelemetry")}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              to={kpi.link}
              className="group relative flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm hover:border-[var(--color-primary)]/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    {kpi.title}
                  </p>
                  <p className="mt-2 text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
                    {kpi.value}
                  </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon size={22} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                <span>{kpi.subtext}</span>
                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition text-[var(--color-primary)]" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Grid: Services Telemetry & Job Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services Status Card */}
        <div className="lg:col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-[var(--color-primary)]" />
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                {t("admin:dashboard.servicesTitle")}
              </h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                health?.overall_status === "healthy"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              {health?.overall_status === "healthy" ? "All Online" : "Degraded"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {health?.services.map((svc) => (
              <div
                key={svc.name}
                className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">{svc.name}</span>
                  {svc.status === "healthy" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                      <CheckCircle2 size={13} />
                      OK
                    </span>
                  ) : svc.status === "warning" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500">
                      <AlertTriangle size={13} />
                      WARN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500">
                      <XCircle size={13} />
                      ERR
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                  <span className="truncate pr-2">{svc.message || "Running"}</span>
                  {svc.latency_ms !== undefined && (
                    <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-mono font-bold text-[var(--color-text-secondary)]">
                      {svc.latency_ms}ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Disk usage meters */}
          <div className="mt-6 border-t border-[var(--color-border)] pt-4">
            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              {t("admin:dashboard.storageTitle")}
            </h3>
            <div className="space-y-3">
              {health?.disk_usage.map((disk) => (
                <div key={disk.path} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[var(--color-text-primary)]">{disk.path}</span>
                    <span className="font-mono text-[var(--color-text-muted)]">
                      {(disk.used_bytes / (1024 ** 3)).toFixed(1)} GB / {(disk.total_bytes / (1024 ** 3)).toFixed(1)} GB ({disk.percent_used}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        disk.percent_used > 85
                          ? "bg-red-500"
                          : disk.percent_used > 70
                          ? "bg-amber-500"
                          : "bg-[var(--color-primary)]"
                      }`}
                      style={{ width: `${Math.min(disk.percent_used, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Jobs Status Breakdown & Quick Actions */}
        <div className="space-y-6">
          {/* Jobs Status Summary Card */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-[var(--color-primary)]" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Tình Trạng Tiến Trình AI</h3>
              </div>
              <Link to="/admin/jobs" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                Xem tất cả
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] p-2.5 px-3">
                <span className="flex items-center gap-2 text-xs font-bold text-blue-500">
                  <PlayCircle size={14} />
                  Đang xử lý (Processing)
                </span>
                <span className="font-mono font-bold text-sm">{metrics?.jobs_by_status.processing ?? 0}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] p-2.5 px-3">
                <span className="flex items-center gap-2 text-xs font-bold text-amber-500">
                  <Clock size={14} />
                  Trong hàng đợi (Queued)
                </span>
                <span className="font-mono font-bold text-sm">{metrics?.jobs_by_status.queued ?? 0}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] p-2.5 px-3">
                <span className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                  <CheckCircle2 size={14} />
                  Thành công (Completed)
                </span>
                <span className="font-mono font-bold text-sm">{metrics?.jobs_by_status.completed ?? 0}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] p-2.5 px-3">
                <span className="flex items-center gap-2 text-xs font-bold text-red-500">
                  <XCircle size={14} />
                  Thất bại (Failed)
                </span>
                <span className="font-mono font-bold text-sm">{metrics?.jobs_by_status.failed ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              {t("admin:dashboard.quickActionsTitle")}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/admin/tools"
                className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] p-3 text-center hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)] transition"
              >
                <HardDrive size={18} className="text-[var(--color-primary)] mb-1" />
                <span className="text-xs font-bold">{t("admin:dashboard.cleanupCache")}</span>
              </Link>

              <Link
                to="/admin/tools"
                className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] p-3 text-center hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)] transition"
              >
                <Wrench size={18} className="text-[var(--color-primary)] mb-1" />
                <span className="text-xs font-bold">{t("admin:dashboard.runDiagnostics")}</span>
              </Link>

              <Link
                to="/admin/models"
                className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] p-3 text-center hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)] transition"
              >
                <Layers size={18} className="text-[var(--color-primary)] mb-1" />
                <span className="text-xs font-bold">{t("admin:dashboard.manageModels")}</span>
              </Link>

              <Link
                to="/admin/users"
                className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] p-3 text-center hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)] transition"
              >
                <Users size={18} className="text-[var(--color-primary)] mb-1" />
                <span className="text-xs font-bold">{t("admin:dashboard.viewUsers")}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
