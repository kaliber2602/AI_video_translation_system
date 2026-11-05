import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  Folder,
  Layers,
  Loader2,
  PlayCircle,
  RefreshCw,
  Server,
  ShieldAlert,
  Users,
  Video,
  XCircle,
  Zap,
} from "lucide-react";

import {
  getSystemHealth,
  getSystemMetrics,
  getQueueOrchestration,
  cancelAllStuckJobs,
} from "../../services/admin.service";
import type {
  SystemHealthResponse,
  SystemMetricsResponse,
  CeleryInterventionOverview,
} from "../../types/admin";

export default function AdminDashboard() {
  const { t } = useTranslation(["admin", "common"]);

  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [metrics, setMetrics] = useState<SystemMetricsResponse | null>(null);
  const [orchestration, setOrchestration] = useState<CeleryInterventionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [cancellingStuck, setCancellingStuck] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Real-time Auto Refresh Loop (Every 10 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const [hData, mData, oData] = await Promise.all([
        getSystemHealth().catch(() => null),
        getSystemMetrics().catch(() => null),
        getQueueOrchestration().catch(() => null),
      ]);
      if (hData) setHealth(hData);
      if (mData) setMetrics(mData);
      if (oData) setOrchestration(oData);
    } catch (err) {
      console.error("[AdminDashboard] Error loading data:", err);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleCancelStuck = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy tất cả tác vụ bị treo quá 30 phút?")) {
      return;
    }
    try {
      setCancellingStuck(true);
      const res = await cancelAllStuckJobs();
      setActionNotice(res.message);
      await loadData();
    } catch (err) {
      alert("Lỗi can thiệp tác vụ: " + String(err));
    } finally {
      setCancellingStuck(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            {t("admin:common.loading", "Đang tải dữ liệu giám sát...")}
          </p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: t("admin:dashboard.kpi.totalUsers"),
      value: metrics?.total_users ?? 0,
      subtext: `${metrics?.active_users ?? 0} ${t("admin:common.active", "hoạt động")} • ${metrics?.admin_users ?? 0} admin`,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      link: "/admin/users",
    },
    {
      title: t("admin:dashboard.kpi.totalProjects"),
      value: metrics?.total_projects ?? 0,
      subtext: t("admin:dashboard.kpi.totalProjects"),
      icon: Folder,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      link: "/admin/jobs",
    },
    {
      title: t("admin:dashboard.kpi.totalVideos"),
      value: metrics?.total_videos ?? 0,
      subtext: t("admin:dashboard.kpi.totalVideos"),
      icon: Video,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      link: "/admin/jobs",
    },
    {
      title: t("admin:dashboard.kpi.totalJobs"),
      value: metrics?.total_jobs ?? 0,
      subtext: `${metrics?.jobs_by_status.processing ?? 0} ${t("admin:jobs.status")} • ${metrics?.jobs_by_status.failed ?? 0} err`,
      icon: Cpu,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      link: "/admin/jobs",
    },
    {
      title: t("admin:dashboard.kpi.totalRevenue", "Doanh Thu VNPay"),
      value: (metrics?.total_revenue_vnd ?? 0) > 0
        ? `${Math.round(metrics?.total_revenue_vnd ?? 0).toLocaleString("vi-VN")} ₫`
        : "0 ₫",
      subtext: "Cổng thanh toán VNPay (VND)",
      icon: DollarSign,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      link: "/admin/finance",
    },
    {
      title: t("admin:dashboard.kpi.creditsConsumed", "Tổng Từ Đã Xử Lý"),
      value: `${(metrics?.total_words_consumed ?? ((metrics?.total_credits_consumed ?? 0) * 10)).toLocaleString()} từ`,
      subtext: t("admin:dashboard.kpi.creditsConsumedSub", "Định mức từ (Word Quota) đã tiêu hao"),
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

        <div className="flex items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
              autoRefresh
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
            }`}
            title="Tự động cập nhật dữ liệu mỗi 10 giây"
          >
            <span className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            <span>Auto 10s: {autoRefresh ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? t("admin:common.refreshing", "Đang làm mới...") : t("admin:health.refreshTelemetry")}</span>
          </button>
          <a
            href="http://localhost:3001/d/vidnova-admin-overview/vidnova-system-admin-telemetry?kiosk=tv"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
          >
            <ArrowUpRight size={14} />
            <span>Mở Grafana Console</span>
          </a>
        </div>
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

          {/* Hardware Telemetry (GPU & Host CPU/RAM) */}
          <div className="mt-6 border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Phần Cứng & Tăng Tốc GPU (NVIDIA Telemetry)
              </h3>
              {health?.gpu_status?.available ? (
                <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  GPU Online ({health.gpu_status.device_name})
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  GPU Chế Độ CPU Fallback
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <span className="text-[11px] text-[var(--color-text-muted)] block font-medium">Host CPU</span>
                <span className="text-base font-black font-mono text-[var(--color-text-primary)]">
                  {health?.cpu_percent !== undefined && health?.cpu_percent !== null ? `${health.cpu_percent}%` : "N/A"}
                </span>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <span className="text-[11px] text-[var(--color-text-muted)] block font-medium">Host RAM</span>
                <span className="text-base font-black font-mono text-[var(--color-text-primary)]">
                  {health?.memory_percent !== undefined && health?.memory_percent !== null ? `${health.memory_percent}%` : "N/A"}
                </span>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <span className="text-[11px] text-[var(--color-text-muted)] block font-medium">VRAM Đã Dùng</span>
                <span className="text-base font-black font-mono text-[var(--color-text-primary)]">
                  {health?.gpu_status?.used_memory_mb !== undefined && health?.gpu_status?.used_memory_mb !== null
                    ? `${health.gpu_status.used_memory_mb} MB`
                    : "0 MB"}
                </span>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <span className="text-[11px] text-[var(--color-text-muted)] block font-medium">Nhiệt Độ GPU</span>
                <span className="text-base font-black font-mono text-[var(--color-text-primary)]">
                  {health?.gpu_status?.temperature_c !== undefined && health?.gpu_status?.temperature_c !== null
                    ? `${health.gpu_status.temperature_c}°C`
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Chatbot Engine Status (Ollama + FAISS) */}
          <div className="mt-6 border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-blue-500" />
                <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Trạng Thái Chatbot & RAG Engine (Ollama + FAISS)
                </h3>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  health?.chatbot_status?.ollama_online
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {health?.chatbot_status?.ollama_online ? "Ollama Active" : "Heuristic Fallback"}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Ollama Model:</span>
                <span className="font-mono font-bold text-[var(--color-text-primary)]">
                  {health?.chatbot_status?.active_model || "qwen2.5:3b"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Chỉ mục FAISS Vectors:</span>
                <span className="font-mono font-bold text-[var(--color-text-primary)]">
                  {health?.chatbot_status?.faiss_indexed_projects ?? 0} project indexes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Tổng tin nhắn Q&A:</span>
                <span className="font-mono font-bold text-[var(--color-text-primary)]">
                  {health?.chatbot_status?.total_chat_messages ?? 0} tin nhắn
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Tốc độ sinh token (Token/s):</span>
                <span className="font-mono font-bold text-emerald-500">
                  {health?.chatbot_status?.last_tokens_per_second ? `${health.chatbot_status.last_tokens_per_second} tokens/s` : "Sẵn sàng (105+ tokens/s)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Tổng token đã sinh:</span>
                <span className="font-mono font-bold text-purple-400">
                  {health?.chatbot_status?.total_tokens_generated ? `${health.chatbot_status.total_tokens_generated.toLocaleString()} tokens` : "0 tokens"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] italic pt-1">
                {health?.chatbot_status?.message}
              </p>
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
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {t("admin:jobs.title", "Tình Trạng Tiến Trình AI")}
                </h3>
              </div>
              <Link to="/admin/jobs" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                {t("admin:common.viewAll", "Xem tất cả")}
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] p-2.5 px-3">
                <span className="flex items-center gap-2 text-xs font-bold text-blue-500">
                  <PlayCircle size={14} />
                  Processing
                </span>
                <span className="font-mono font-bold text-sm">{metrics?.jobs_by_status.processing ?? 0}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] p-2.5 px-3">
                <span className="flex items-center gap-2 text-xs font-bold text-amber-500">
                  <Clock size={14} />
                  Queued
                </span>
                <span className="font-mono font-bold text-sm">{metrics?.jobs_by_status.queued ?? 0}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] p-2.5 px-3">
                <span className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                  <CheckCircle2 size={14} />
                  Completed
                </span>
                <span className="font-mono font-bold text-sm">{metrics?.jobs_by_status.completed ?? 0}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] p-2.5 px-3">
                <span className="flex items-center gap-2 text-xs font-bold text-red-500">
                  <XCircle size={14} />
                  Failed
                </span>
                <span className="font-mono font-bold text-sm">{metrics?.jobs_by_status.failed ?? 0}</span>
              </div>
            </div>
          </div>

          {/* UC-04.5 Heavy Job Queues & Worker Interventions */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-500" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Điều Phối & Can Thiệp Hàng Đợi (UC-04.5)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--color-text-secondary)]">
                {orchestration?.connected_workers.length ?? 0} Workers Online
              </span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">Tổng Job Chờ Trong Queue:</span>
                <span className="font-mono font-bold text-[var(--color-primary)]">
                  {orchestration?.total_queued ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">Tác vụ treo (&gt; 30 phút):</span>
                <span className="font-mono font-bold text-red-500">
                  {orchestration?.stuck_jobs_count ?? 0}
                </span>
              </div>

              {actionNotice && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold">
                  {actionNotice}
                </div>
              )}

              <button
                type="button"
                onClick={handleCancelStuck}
                disabled={cancellingStuck || (orchestration?.stuck_jobs_count ?? 0) === 0}
                className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 px-3 py-2 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {cancellingStuck ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ShieldAlert size={14} />
                )}
                Hủy Tác Vụ Treo ({orchestration?.stuck_jobs_count ?? 0})
              </button>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              {t("admin:dashboard.quickActionsTitle")}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/admin/jobs"
                className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] p-3 text-center hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)] transition"
              >
                <Activity size={18} className="text-[var(--color-primary)] mb-1" />
                <span className="text-xs font-bold">Quản Lý Tiến Trình</span>
              </Link>

              <Link
                to="/admin/finance"
                className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] p-3 text-center hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)] transition"
              >
                <DollarSign size={18} className="text-[var(--color-primary)] mb-1" />
                <span className="text-xs font-bold">Doanh Thu VNPay</span>
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
