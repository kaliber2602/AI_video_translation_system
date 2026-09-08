import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  CheckCircle2,
  Database,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";

import {
  getAdminStorage,
  runAdminCleanup,
  getAdminDatabaseStats,
  runAdminDiagnostics,
} from "../../services/admin.service";
import { toast } from "../../lib/toast";
import type {
  AdminStorageStatsResponse,
  AdminDatabaseStatsResponse,
  AdminDiagnosticsResponse,
} from "../../types/admin";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";

export default function AdminToolsPage() {
  const { t } = useTranslation(["admin", "common"]);

  // Storage state
  const [storageData, setStorageData] = useState<AdminStorageStatsResponse | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [cleanupTarget, setCleanupTarget] = useState("temp");
  const [cleanupDays, setCleanupDays] = useState(7);
  const [cleaning, setCleaning] = useState(false);
  const [isCleanupConfirmOpen, setIsCleanupConfirmOpen] = useState(false);

  // Database stats state
  const [dbStats, setDbStats] = useState<AdminDatabaseStatsResponse | null>(null);
  const [dbLoading, setDbLoading] = useState(true);

  // Diagnostics state
  const [diagnostics, setDiagnostics] = useState<AdminDiagnosticsResponse | null>(null);
  const [diagRunning, setDiagRunning] = useState(false);

  useEffect(() => {
    loadToolsData();
  }, []);

  const loadToolsData = async () => {
    try {
      setStorageLoading(true);
      setDbLoading(true);
      const [sData, dData] = await Promise.all([
        getAdminStorage().catch(() => null),
        getAdminDatabaseStats().catch(() => null),
      ]);
      if (sData) setStorageData(sData);
      if (dData) setDbStats(dData);
    } catch (err) {
      console.error("[AdminToolsPage] Error:", err);
    } finally {
      setStorageLoading(false);
      setDbLoading(false);
    }
  };

  const handleRunCleanup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCleanupConfirmOpen(true);
  };

  const handleExecuteCleanup = async () => {
    try {
      setCleaning(true);
      const res = await runAdminCleanup({
        target: cleanupTarget,
        older_than_days: cleanupDays,
      });
      toast.success(res.message);
      // Refresh storage
      const sData = await getAdminStorage();
      setStorageData(sData);
    } catch (err) {
      toast.error("Lỗi khi dọn dẹp file tạm.");
    } finally {
      setCleaning(false);
      setIsCleanupConfirmOpen(false);
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      setDiagRunning(true);
      const res = await runAdminDiagnostics();
      setDiagnostics(res);
      if (res.overall_status === "healthy") {
        toast.success("Tất cả các bài kiểm tra chẩn đoán đều PASS!");
      } else {
        toast.error("Phát hiện lỗi trong quá trình chẩn đoán hệ thống.");
      }
    } catch (err) {
      toast.error("Không thể chạy kiểm tra chẩn đoán.");
    } finally {
      setDiagRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            {t("admin:tools.title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t("admin:tools.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadToolsData}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} className={storageLoading || dbLoading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Grid: Storage Cleaner & Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Storage & Cache Cleaner */}
        <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <HardDrive size={18} className="text-[var(--color-primary)]" />
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                  {t("admin:tools.storageCleanerTitle")}
                </h2>
              </div>
              <span className="font-mono text-xs font-bold text-teal-600">
                Tổng: {storageData?.total_size_human || "0 B"} ({storageData?.total_file_count || 0} files)
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">
              {t("admin:tools.storageDescription")}
            </p>

            {/* Storage directory breakdown */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {storageData?.directories.map((dir) => (
                <div
                  key={dir.directory}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                >
                  <p className="font-bold text-[var(--color-text-primary)]">{dir.directory}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                    <span className="font-mono font-bold text-teal-600">{dir.size_human}</span>
                    <span>{dir.file_count} files</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cleanup Trigger Form */}
          <form onSubmit={handleRunCleanup} className="border-t border-[var(--color-border)] pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                  {t("admin:tools.targetDirectory")}
                </label>
                <select
                  value={cleanupTarget}
                  onChange={(e) => setCleanupTarget(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-bold"
                >
                  <option value="temp">Tất cả tệp tạm (Uploads & Outputs)</option>
                  <option value="uploads">Chỉ thư mục Uploads</option>
                  <option value="outputs">Chỉ thư mục Outputs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                  {t("admin:tools.olderThanDays")}
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-bold font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cleaning}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-xs font-bold text-red-600 hover:bg-red-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {cleaning ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              <span>{cleaning ? "Đang quét dọn..." : t("admin:tools.runCleanup")}</span>
            </button>
          </form>
        </div>

        {/* 2. System Diagnostics Ping */}
        <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-[var(--color-primary)]" />
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                  {t("admin:tools.diagnosticsTitle")}
                </h2>
              </div>
              {diagnostics && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                    diagnostics.overall_status === "healthy"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {diagnostics.overall_status}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">
              Chạy kiểm tra ping round-trip, kiểm tra kết nối socket và quyền ghi ổ đĩa cho các dịch vụ cốt lõi.
            </p>

            {/* Diagnostics Results List */}
            <div className="mt-4 space-y-2.5">
              {diagnostics ? (
                diagnostics.checks.map((chk) => (
                  <div
                    key={chk.service}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {chk.status === "PASS" ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : chk.status === "WARN" ? (
                        <Wrench size={16} className="text-amber-500" />
                      ) : (
                        <XCircle size={16} className="text-red-500" />
                      )}
                      <div>
                        <p className="font-bold text-[var(--color-text-primary)]">{chk.service}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-xs">
                          {chk.details}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 font-mono font-bold text-[11px]">
                        {chk.duration_ms}ms
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-muted)]">
                  Nhấn nút bên dưới để bắt đầu kiểm tra chẩn đoán hệ thống.
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={diagRunning}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition cursor-pointer disabled:opacity-50"
          >
            {diagRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{diagRunning ? "Đang chẩn đoán..." : t("admin:tools.runDiagnostics")}</span>
          </button>
        </div>
      </div>

      {/* 3. PostgreSQL Database Statistics Table */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-[var(--color-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              {t("admin:tools.dbStatsTitle")}
            </h2>
          </div>
          <span className="font-mono text-xs font-bold text-[var(--color-text-secondary)]">
            DB Size: <span className="text-teal-600">{dbStats?.total_database_size || "—"}</span>
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3">Tên Bảng (Table)</th>
                <th className="px-4 py-3">Số Lượng Bản Ghi (Rows)</th>
                <th className="px-4 py-3 text-right">Dung Lượng (Size)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {dbLoading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[var(--color-primary)]" />
                    Đang tải chỉ số database...
                  </td>
                </tr>
              ) : (
                dbStats?.tables.map((tbl) => (
                  <tr key={tbl.table_name} className="hover:bg-[var(--color-surface-muted)]/50 transition">
                    <td className="px-4 py-2.5 font-mono font-bold text-[var(--color-text-primary)]">
                      {tbl.table_name}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-teal-600">
                      {tbl.row_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-right text-[var(--color-text-secondary)]">
                      {tbl.total_size}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isCleanupConfirmOpen}
        onClose={() => setIsCleanupConfirmOpen(false)}
        onConfirm={handleExecuteCleanup}
        title="Dọn dẹp hệ thống lưu trữ"
        message={`Bạn có chắc chắn muốn dọn dẹp các tệp tạm trong mục "${cleanupTarget}" cũ hơn ${cleanupDays} ngày không? Hành động này sẽ giải phóng dung lượng đĩa.`}
        confirmLabel="Bắt đầu dọn dẹp"
        cancelLabel="Hủy"
        isDestructive
        isLoading={cleaning}
      />
    </div>
  );
}
