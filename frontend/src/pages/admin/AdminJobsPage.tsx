import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCode,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  StopCircle,
  X,
  XCircle,
} from "lucide-react";

import {
  getAdminJobs,
  getAdminJobDetail,
  retryAdminJob,
  cancelAdminJob,
} from "../../services/admin.service";
import { toast } from "../../lib/toast";
import type {
  AdminJobResponse,
  AdminJobDetailResponse,
} from "../../types/admin";

export default function AdminJobsPage() {
  const { t } = useTranslation(["admin", "common"]);

  const [jobs, setJobs] = useState<AdminJobResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(15);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Selected job for logs modal
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<AdminJobDetailResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    loadJobs();
  }, [offset, statusFilter]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await getAdminJobs({
        limit,
        offset,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search.trim() ? search.trim() : undefined,
      });
      setJobs(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("[AdminJobsPage] Error fetching jobs:", err);
      toast.error("Không thể tải danh sách tiến trình.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    loadJobs();
  };

  const handleOpenLogs = async (jobId: string) => {
    setSelectedJobId(jobId);
    try {
      setLogsLoading(true);
      const data = await getAdminJobDetail(jobId);
      setJobDetail(data);
    } catch (err) {
      console.error("[AdminJobsPage] Error loading job details:", err);
      toast.error("Không thể tải log chi tiết của job.");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      const res = await retryAdminJob(jobId);
      if (res.success) {
        toast.success(res.message || "Đã yêu cầu chạy lại tiến trình.");
        loadJobs();
      }
    } catch (err) {
      toast.error("Thất bại khi chạy lại tiến trình.");
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy tiến trình đang xử lý này không?")) return;
    try {
      const res = await cancelAdminJob(jobId);
      if (res.success) {
        toast.success(res.message || "Đã hủy tiến trình.");
        loadJobs();
      }
    } catch (err) {
      toast.error("Không thể hủy tiến trình.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={12} />
            Completed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
            <Loader2 size={12} className="animate-spin" />
            Processing
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Clock size={12} />
            Queued
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">
            <XCircle size={12} />
            Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-bold text-gray-500">
            <StopCircle size={12} />
            Cancelled
          </span>
        );
      default:
        return <span className="text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            {t("admin:jobs.title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t("admin:jobs.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadJobs}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin:jobs.searchPlaceholder")}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-2 pl-9 pr-4 text-xs font-medium text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-[var(--color-text-muted)] whitespace-nowrap">
            {t("admin:jobs.filterStatus")}:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none transition cursor-pointer"
          >
            <option value="all">Tất cả (All)</option>
            <option value="processing">Processing (Đang chạy)</option>
            <option value="queued">Queued (Hàng đợi)</option>
            <option value="completed">Completed (Thành công)</option>
            <option value="failed">Failed (Lỗi)</option>
            <option value="cancelled">Cancelled (Đã hủy)</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3.5">{t("admin:jobs.jobId")}</th>
                <th className="px-4 py-3.5">{t("admin:jobs.video")}</th>
                <th className="px-4 py-3.5">{t("admin:jobs.requester")}</th>
                <th className="px-4 py-3.5">{t("admin:jobs.step")}</th>
                <th className="px-4 py-3.5">{t("admin:jobs.progress")}</th>
                <th className="px-4 py-3.5">{t("admin:jobs.status")}</th>
                <th className="px-4 py-3.5">{t("admin:jobs.duration")}</th>
                <th className="px-4 py-3.5 text-right">{t("admin:jobs.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--color-primary)]" />
                    Đang tải danh sách tiến trình...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    {t("admin:jobs.empty")}
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[var(--color-surface-muted)]/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-primary)]">
                      {job.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)] max-w-xs truncate">
                      {job.video_title}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{job.user_email}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-purple-600 dark:text-purple-400">
                      {job.current_step || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] text-[11px]">
                      {new Date(job.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenLogs(job.id)}
                          className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition cursor-pointer"
                        >
                          Logs
                        </button>
                        {job.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => handleRetry(job.id)}
                            title="Chạy lại job này"
                            className="rounded-lg bg-amber-500/10 p-1 text-amber-600 hover:bg-amber-500/20 transition cursor-pointer"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {(job.status === "processing" || job.status === "queued") && (
                          <button
                            type="button"
                            onClick={() => handleCancel(job.id)}
                            title="Hủy job"
                            className="rounded-lg bg-red-500/10 p-1 text-red-500 hover:bg-red-500/20 transition cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
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
              Hiển thị {offset + 1} - {Math.min(offset + limit, total)} trên tổng số {total} tiến trình
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-bold disabled:opacity-40 cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-bold disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =======================================================
          JOB DETAILS & TASK LOGS DRAWER / MODAL
      ======================================================== */}
      {selectedJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => {
              setSelectedJobId(null);
              setJobDetail(null);
            }}
          />
          <div className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl z-10 overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <div>
                <div className="flex items-center gap-2">
                  <FileCode size={18} className="text-[var(--color-primary)]" />
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    {t("admin:jobs.modalTitle")}
                  </h3>
                </div>
                <p className="font-mono text-xs text-[var(--color-text-muted)] mt-0.5">
                  Job ID: {selectedJobId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedJobId(null);
                  setJobDetail(null);
                }}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {logsLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
                </div>
              ) : !jobDetail ? (
                <p className="text-sm text-red-500">Không tìm thấy thông tin job.</p>
              ) : (
                <>
                  {/* Job Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs">
                    <div>
                      <span className="text-[var(--color-text-muted)]">Video:</span>
                      <p className="font-bold truncate">{jobDetail.job.video_title}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">User:</span>
                      <p className="font-bold truncate">{jobDetail.job.user_email}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">Trạng thái:</span>
                      <div className="mt-0.5">{getStatusBadge(jobDetail.job.status)}</div>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">Tiến độ:</span>
                      <p className="font-bold">{jobDetail.job.progress}%</p>
                    </div>
                  </div>

                  {jobDetail.job.error_message && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Error Message:</span>
                        <p className="mt-0.5 font-mono break-all">{jobDetail.job.error_message}</p>
                      </div>
                    </div>
                  )}

                  {/* Task Logs Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                      Nhật ký thực thi từng bước ({jobDetail.task_logs.length} tasks)
                    </h4>

                    {jobDetail.task_logs.length === 0 ? (
                      <div className="rounded-xl border border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-muted)]">
                        Chưa có log thực thi chi tiết cho tiến trình này.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {jobDetail.task_logs.map((tl) => (
                          <div
                            key={tl.id}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs"
                          >
                            <div className="flex items-center justify-between font-mono">
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                Step: {tl.step_name}
                              </span>
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  tl.status === "success"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : tl.status === "running"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-red-500/10 text-red-600"
                                }`}
                              >
                                {tl.status}
                              </span>
                            </div>

                            <div className="mt-2 flex gap-4 text-[11px] text-[var(--color-text-muted)]">
                              <span>Worker: {tl.worker_id || "default"}</span>
                              {tl.duration_ms !== undefined && (
                                <span>Duration: {tl.duration_ms}ms</span>
                              )}
                              <span>Retries: {tl.retry_count}</span>
                            </div>

                            {tl.log_output && (
                              <div className="mt-2 rounded-lg bg-black/90 p-2.5 font-mono text-[11px] text-green-400 max-h-40 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{tl.log_output}</pre>
                              </div>
                            )}

                            {tl.error_trace && (
                              <div className="mt-2 rounded-lg bg-red-950/80 p-2.5 font-mono text-[11px] text-red-300 max-h-40 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{tl.error_trace}</pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <button
                type="button"
                onClick={() => {
                  setSelectedJobId(null);
                  setJobDetail(null);
                }}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
