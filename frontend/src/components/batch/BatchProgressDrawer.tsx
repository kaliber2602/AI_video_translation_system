import { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";
import Button from "../common/Button";
import { toast } from "../../lib/toast";
import {
  getProjectBatches,
  getBatchDetails,
  cancelBatchJob,
  type BatchJobSummary,
  type BatchJobDetail,
} from "../../services/batch.service";

interface BatchProgressDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  activeBatchId?: string | null;
  onSelectVideo?: (videoId: number) => void;
}

export default function BatchProgressDrawer({
  isOpen,
  onClose,
  projectId,
  activeBatchId: initialBatchId,
  onSelectVideo,
}: BatchProgressDrawerProps) {
  const [batches, setBatches] = useState<BatchJobSummary[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(initialBatchId || null);
  const [activeBatch, setActiveBatch] = useState<BatchJobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const pollingRef = useRef<any>(null);

  // Sync initialBatchId when changed
  useEffect(() => {
    if (initialBatchId) {
      setSelectedBatchId(initialBatchId);
    }
  }, [initialBatchId]);

  // Load project batches list
  const loadBatches = useCallback(async () => {
    if (!projectId) return;
    try {
      const list = await getProjectBatches(projectId);
      setBatches(list);
      if (list.length > 0 && !selectedBatchId) {
        setSelectedBatchId(list[0].id);
      }
    } catch (err) {
      // quiet fail or log
    }
  }, [projectId, selectedBatchId]);

  // Load specific batch details
  const loadBatchDetails = useCallback(async (batchId: string, showSpinner = false) => {
    if (!batchId) return;
    if (showSpinner) setIsLoading(true);
    try {
      const data = await getBatchDetails(batchId);
      setActiveBatch(data);
    } catch (err) {
      // quiet fail on background polling
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  // Initial load on open
  useEffect(() => {
    if (isOpen) {
      loadBatches();
    }
  }, [isOpen, loadBatches]);

  // Load and poll selected batch
  useEffect(() => {
    if (!isOpen || !selectedBatchId) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    loadBatchDetails(selectedBatchId, true);

    // Setup polling interval
    pollingRef.current = setInterval(() => {
      loadBatchDetails(selectedBatchId, false);
      loadBatches();
    }, 3500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, selectedBatchId, loadBatchDetails, loadBatches]);

  // Stop polling when active batch is finished
  useEffect(() => {
    if (activeBatch && (activeBatch.status === "completed" || activeBatch.status === "failed" || activeBatch.status === "cancelled")) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [activeBatch]);

  const handleCancelBatch = async () => {
    if (!selectedBatchId) return;
    try {
      setIsCancelling(true);
      await cancelBatchJob(selectedBatchId);
      toast.success("Đã gửi yêu cầu hủy tiến trình hàng loạt");
      loadBatchDetails(selectedBatchId, false);
      loadBatches();
    } catch (err: any) {
      toast.error("Không thể hủy tiến trình");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={12} />
            Hoàn tất
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <RefreshCw size={12} className="animate-spin" />
            Đang xử lý
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Clock size={12} />
            Đang chờ
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <AlertCircle size={12} />
            Thất bại
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            <Ban size={12} />
            Đã hủy
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <aside
          aria-label="Tiến độ xử lý hàng loạt"
          className="w-screen max-w-md bg-[var(--color-surface)] shadow-2xl border-l border-[var(--color-border)] flex flex-col justify-between"
        >
          {/* Header */}
          <div className="border-b border-[var(--color-border)] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Tiến độ Batch AI
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Quản lý tiến trình xử lý video hàng loạt
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedBatchId) loadBatchDetails(selectedBatchId, true);
                  loadBatches();
                }}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                title="Làm mới"
              >
                <RefreshCw size={15} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Batch Selector if multiple */}
          {batches.length > 1 && (
            <div className="border-b border-[var(--color-border)] px-4 py-2 bg-[var(--color-surface-muted)]/40 flex items-center gap-2 overflow-x-auto">
              {batches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBatchId(b.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                    b.id === selectedBatchId
                      ? "bg-[var(--color-primary)] text-white shadow-xs"
                      : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  {b.name.length > 20 ? b.name.slice(0, 18) + "..." : b.name}
                </button>
              ))}
            </div>
          )}

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="rounded-full bg-purple-500/10 p-4 text-purple-600 dark:text-purple-400 mb-3">
                  <Sparkles size={28} />
                </div>
                <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Chưa có đợt xử lý hàng loạt nào
                </h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xs">
                  Chọn các video trong dự án và nhấn "Xử lý hàng loạt (Batch AI)" để kích hoạt tiến trình tự động.
                </p>
              </div>
            ) : isLoading && !activeBatch ? (
              <div className="flex h-48 items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-[var(--color-primary)]" />
              </div>
            ) : !activeBatch ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-[var(--color-text-muted)]">
                Không tìm thấy dữ liệu đợt xử lý
              </div>
            ) : (
              <>
                {/* Active Batch Summary Card */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                        {activeBatch.name}
                      </h4>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Tạo lúc: {activeBatch.created_at ? new Date(activeBatch.created_at).toLocaleTimeString() : "--:--"}
                      </p>
                    </div>
                    {getStatusBadge(activeBatch.status)}
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-[var(--color-text-secondary)]">Tiến độ chung:</span>
                      <span className="text-[var(--color-primary)]">{activeBatch.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                        style={{ width: `${activeBatch.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Counter */}
                  <div className="grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-2.5 text-center text-xs">
                    <div>
                      <span className="text-[var(--color-text-muted)] block text-[11px]">Tổng số</span>
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {activeBatch.total_videos}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)] block text-[11px]">Thành công</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {activeBatch.completed_videos}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)] block text-[11px]">Thất bại</span>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {activeBatch.failed_videos}
                      </span>
                    </div>
                  </div>

                  {/* Cancel Button if running */}
                  {(activeBatch.status === "processing" || activeBatch.status === "queued") && (
                    <div className="pt-1">
                      <Button
                        variant="danger"
                        size="sm"
                        className="w-full text-xs"
                        onClick={handleCancelBatch}
                        disabled={isCancelling}
                        icon={<Ban size={13} />}
                      >
                        {isCancelling ? "Đang hủy..." : "Hủy toàn bộ tiến trình này"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Video Items List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                    Danh sách video ({activeBatch.items.length})
                  </h4>

                  <div className="space-y-2">
                    {activeBatch.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-primary)]/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Item Index / Icon */}
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-xs font-semibold text-[var(--color-text-muted)]">
                            {idx + 1}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate max-w-[200px]">
                              {item.video_title || `Video #${item.video_id}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {getStatusBadge(item.status)}
                              {item.status === "processing" && (
                                <span className="text-[11px] font-medium text-[var(--color-primary)]">
                                  {item.progress}%
                                </span>
                              )}
                            </div>

                            {item.error_message && (
                              <p className="text-[10px] text-red-500 mt-1 truncate max-w-[220px]">
                                {item.error_message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Video Action link */}
                        {item.status === "completed" && onSelectVideo && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectVideo(item.video_id);
                              onClose();
                            }}
                            className="rounded-lg p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 cursor-pointer"
                            title="Xem video"
                          >
                            <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Note */}
          <div className="border-t border-[var(--color-border)] p-3 bg-[var(--color-surface-muted)]/20 text-center">
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Tự động đồng bộ thời gian thực mỗi 3.5s
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
