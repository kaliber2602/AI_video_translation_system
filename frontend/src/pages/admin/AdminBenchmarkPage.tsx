import { useEffect, useState } from "react";
import {
  Activity,
  Copy,
  Cpu,
  Download,
  Loader2,
  Server,
  ShieldAlert,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import {
  getAdminBenchmarkMetrics,
  runAdminBenchmarkProbe,
} from "../../services/admin.service";
import type {
  BenchmarkDashboardResponse,
  LatencyVsUsersPoint,
} from "../../types/admin";
import { toast } from "../../lib/toast";

export default function AdminBenchmarkPage() {
  const [data, setData] = useState<BenchmarkDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [probeConcurrency, setProbeConcurrency] = useState<number>(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTestTool, setActiveTestTool] = useState<"locust" | "k6">("locust");
  const [hoveredLatencyPoint, setHoveredLatencyPoint] = useState<LatencyVsUsersPoint | null>(null);

  useEffect(() => {
    fetchMetrics(false);
    let interval: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchMetrics(true);
      }, 10000); // 10s auto-refresh
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchMetrics = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getAdminBenchmarkMetrics();
      setData(res);
    } catch (err) {
      console.error("[AdminBenchmarkPage] Error loading metrics:", err);
      if (!silent) toast.error("Không thể tải chỉ số benchmark.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRunProbe = async (concurrency?: number) => {
    const target = concurrency ?? probeConcurrency;
    try {
      setProbing(true);
      const res = await runAdminBenchmarkProbe(target);
      toast.success(res.message);
      setData(res.sampled_metrics);
    } catch (err) {
      console.error("[AdminBenchmarkPage] Error running probe:", err);
      toast.error("Lỗi khi chạy đo lường tải thực tế.");
    } finally {
      setProbing(false);
    }
  };

  const copyMarkdownTable = () => {
    if (!data) return;
    const rows = data.concurrency_matrix.map(
      (m) =>
        `| ${m.scenario_name} | ${m.concurrent_videos} | ${m.cpu_percent}% | ${m.ram_used_gb} GB | ${m.vram_used_mb} MB (${m.vram_percent}%) | ${m.stt_rtf > 0 ? m.stt_rtf : "N/A"} | ${m.trans_words_per_sec > 0 ? m.trans_words_per_sec + " từ/s" : "N/A"} | ${m.avg_latency_sec > 0 ? m.avg_latency_sec + "s" : "N/A"} | ${m.oom_risk} |`
    );

    const markdown = [
      "### Bảng Ma Trận Hiệu Năng & Năng Lực Tải Hệ Thống",
      "| Kịch bản | Số Tác Vụ | % CPU | RAM | VRAM GPU | STT RTF | Thông lượng dịch | Độ trễ TB | Nguy cơ OOM |",
      "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |",
      ...rows,
      "",
      `*Thông số phần cứng đo lường: ${data.hardware.gpu_name || "NVIDIA GPU"} (Tổng VRAM: ${data.hardware.vram_total_mb || 8188} MB, CPU: ${data.hardware.cpu_count} Cores, RAM: ${data.hardware.ram_total_gb} GB).*`,
    ].join("\n");

    navigator.clipboard.writeText(markdown);
    toast.success("Đã sao chép bảng Markdown vào bộ nhớ tạm!");
  };

  const exportJsonReport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vidnova_benchmark_report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã tải xuống file dữ liệu Benchmark JSON.");
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            Đang đo lường tài nguyên phần cứng & telemetry thời gian thực...
          </p>
        </div>
      </div>
    );
  }

  const hw = data?.hardware;
  const tp = data?.throughput;
  const cap = data?.capacity;
  const matrix = data?.concurrency_matrix || [];
  const stages = data?.pipeline_stages || [];
  const latencyCurve = data?.latency_curve || [];
  const telemetryHistory = data?.telemetry_history || [];

  return (
    <div className="space-y-8 pb-12">
      {/* =======================================================
          TOP HEADER & CONTROLS
      ======================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Đo Lường & Giám Sát Hiệu Năng Hệ Thống
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Theo dõi thời gian thực mức tiêu hao tài nguyên phần cứng (CPU, RAM, GPU VRAM), đo độ trễ thực tế và đánh giá ngưỡng bão hòa xử lý AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Concurrency Selector for Probe */}
          <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 text-xs">
            <span className="px-2 text-[var(--color-text-secondary)] font-medium">Tải:</span>
            {[1, 3, 5].map((c) => (
              <button
                key={c}
                onClick={() => setProbeConcurrency(c)}
                className={`rounded px-2.5 py-1 font-semibold transition ${
                  probeConcurrency === c
                    ? "bg-[var(--color-primary)] text-white shadow-xs"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {c} tasks
              </button>
            ))}
          </div>

          <button
            onClick={() => handleRunProbe(probeConcurrency)}
            disabled={probing}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition"
          >
            {probing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Đo tải thực tế ({probeConcurrency})
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              autoRefresh
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoRefresh ? "animate-pulse bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            {autoRefresh ? "Tự làm mới (10s)" : "Tạm dừng"}
          </button>

          <button
            onClick={copyMarkdownTable}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition"
          >
            <Copy className="h-3.5 w-3.5" />
            Sao chép Markdown
          </button>

          <button
            onClick={exportJsonReport}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất JSON
          </button>
        </div>
      </div>

      {/* =======================================================
          SECTION 1: HARDWARE TELEMETRY & VRAM CAPACITY CARDS
      ======================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* CPU */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Sử dụng CPU Máy Chủ
            </span>
            <div className="rounded-md bg-blue-500/10 p-2 text-blue-500">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--color-text-primary)]">
              {hw?.cpu_percent ?? 0}%
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {hw?.cpu_count ?? 8} logical cores
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 ${
                (hw?.cpu_percent ?? 0) > 85
                  ? "bg-red-500"
                  : (hw?.cpu_percent ?? 0) > 65
                  ? "bg-amber-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(100, hw?.cpu_percent ?? 0)}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Bộ Nhớ RAM Hệ Thống
            </span>
            <div className="rounded-md bg-purple-500/10 p-2 text-purple-500">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--color-text-primary)]">
              {hw?.ram_used_gb ?? 0}
              <span className="text-base font-normal text-[var(--color-text-secondary)]">
                /{hw?.ram_total_gb ?? 16} GB
              </span>
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
              ({hw?.ram_percent ?? 0}%)
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 ${
                (hw?.ram_percent ?? 0) > 85
                  ? "bg-red-500"
                  : (hw?.ram_percent ?? 0) > 70
                  ? "bg-amber-500"
                  : "bg-purple-500"
              }`}
              style={{ width: `${Math.min(100, hw?.ram_percent ?? 0)}%` }}
            />
          </div>
        </div>

        {/* GPU VRAM */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Bộ Nhớ GPU VRAM (CUDA)
            </span>
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-500">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {hw?.gpu_available ? (
              <>
                <span className="text-3xl font-extrabold text-[var(--color-text-primary)]">
                  {hw.vram_used_mb?.toFixed(0)}
                  <span className="text-base font-normal text-[var(--color-text-secondary)]">
                    /{hw.vram_total_mb?.toFixed(0)} MB
                  </span>
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  ({hw.vram_percent}%)
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-zinc-400">
                Không phát hiện GPU CUDA
              </span>
            )}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 ${
                (hw?.vram_percent ?? 0) > 90
                  ? "bg-red-500"
                  : (hw?.vram_percent ?? 0) > 75
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, hw?.vram_percent ?? 0)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-text-secondary)] truncate">
            {hw?.gpu_name || "CPU Emulation"}
          </p>
        </div>

        {/* CAPACITY & OOM RISK */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Ngưỡng Bão Hòa & Rủi Ro OOM
            </span>
            <div
              className={`rounded-md p-2 ${
                cap?.cuda_oom_risk_level === "SAFE"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : cap?.cuda_oom_risk_level === "MODERATE"
                  ? "bg-blue-500/10 text-blue-500"
                  : cap?.cuda_oom_risk_level === "HIGH"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              {cap?.cuda_oom_risk_level === "SAFE" ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--color-text-primary)]">
              {cap?.max_safe_concurrent_tasks ?? 4}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              tasks song song tối đa
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                cap?.cuda_oom_risk_level === "SAFE"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : cap?.cuda_oom_risk_level === "MODERATE"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  : cap?.cuda_oom_risk_level === "HIGH"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              }`}
            >
              Trạng thái: {cap?.cuda_oom_risk_level || "SAFE"}
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              (Đang chạy: {cap?.current_running_tasks ?? 0})
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-text-secondary)] line-clamp-1">
            {cap?.recommendation}
          </p>
        </div>
      </div>

      {/* =======================================================
          SECTION 2: THROUGHPUT & SPEED METRICS
      ======================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* STT RTF */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              STT Real-Time Factor (RTF)
            </span>
            <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              Whisper
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text-primary)]">
              {tp && tp.stt_rtf > 0 ? tp.stt_rtf : "--"}
            </span>
            {tp && tp.stt_speed_multiplier > 0 && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ({tp.stt_speed_multiplier}x real-time)
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
            {tp && tp.stt_rtf > 0
              ? `Xử lý 1s âm thanh mất ${tp.stt_rtf}s`
              : "Sẽ tính tự động khi có video hoàn thành STT"}
          </p>
        </div>

        {/* Translation throughput */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Thông Lượng Dịch Thuật
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              NLLB-200
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text-primary)]">
              {tp && tp.translation_words_per_sec > 0
                ? `${tp.translation_words_per_sec}`
                : "--"}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">từ / giây</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
            Tốc độ dịch song ngữ GPU CTranslate2
          </p>
        </div>

        {/* TTS speed */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Tốc Độ Lồng Tiếng (TTS)
            </span>
            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
              Neural Edge
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text-primary)]">
              {tp && tp.tts_chars_per_sec > 0 ? `${tp.tts_chars_per_sec}` : "--"}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">ký tự / giây</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
            Tốc độ sinh giọng nói AI đa ngữ
          </p>
        </div>

        {/* Total Completed Jobs */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Tác Vụ Hoàn Thành Thực Tế
            </span>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              Database
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text-primary)]">
              {tp?.total_completed_jobs ?? 0}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">video jobs</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
            Độ trễ trung bình:{" "}
            {tp && tp.avg_pipeline_duration_sec > 0
              ? `${tp.avg_pipeline_duration_sec}s`
              : "Chưa có dữ liệu"}
          </p>
        </div>
      </div>

      {/* =======================================================
          SECTION 3: LIVE TELEMETRY TIMELINE CHART (REAL TIME)
      ======================================================== */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Lịch Sử Giám Sát Tài Nguyên Thực Tế Theo Thời Gian (Live Telemetry)
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Chuỗi thời gian thực ghi nhận trực tiếp từ máy chủ mỗi 10 giây (CPU, RAM và GPU VRAM).
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              CPU (%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              RAM (%)
            </span>
            {hw?.gpu_available && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                VRAM GPU (%)
              </span>
            )}
          </div>
        </div>

        <div className="mt-6">
          {telemetryHistory.length < 2 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)] mb-2" />
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                Đang thu thập các mẫu tài nguyên thời gian thực...
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                Biểu đồ đường sẽ xuất hiện tự động sau khi có ít nhất 2 mẫu đo lường liên tiếp.
              </p>
            </div>
          ) : (
            <div className="relative h-56 w-full">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 600 180">
                {/* Horizontal Grid */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 160 - (val / 100) * 140;
                  return (
                    <g key={val}>
                      <line
                        x1="45"
                        y1={y}
                        x2="590"
                        y2={y}
                        stroke="currentColor"
                        strokeDasharray="3 3"
                        className="text-zinc-200 dark:text-zinc-800"
                        strokeWidth="1"
                      />
                      <text
                        x="38"
                        y={y + 3}
                        textAnchor="end"
                        className="fill-zinc-400 text-[9px] font-mono"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* Draw CPU line */}
                {(() => {
                  const n = telemetryHistory.length;
                  const stepX = (590 - 55) / Math.max(1, n - 1);
                  const cpuPoints = telemetryHistory
                    .map((pt, i) => `${55 + i * stepX},${160 - (Math.min(100, pt.cpu_percent) / 100) * 140}`)
                    .join(" ");
                  const ramPoints = telemetryHistory
                    .map((pt, i) => `${55 + i * stepX},${160 - (Math.min(100, pt.ram_percent) / 100) * 140}`)
                    .join(" ");
                  const vramPoints = hw?.gpu_available
                    ? telemetryHistory
                        .map((pt, i) => `${55 + i * stepX},${160 - (Math.min(100, pt.vram_percent ?? 0) / 100) * 140}`)
                        .join(" ")
                    : null;

                  return (
                    <>
                      {/* RAM Line */}
                      <polyline
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={ramPoints}
                      />
                      {/* VRAM Line */}
                      {vramPoints && (
                        <polyline
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={vramPoints}
                        />
                      )}
                      {/* CPU Line */}
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={cpuPoints}
                      />
                      {/* Dots for latest point */}
                      {n > 0 && (
                        <>
                          <circle
                            cx={55 + (n - 1) * stepX}
                            cy={160 - (Math.min(100, telemetryHistory[n - 1].cpu_percent) / 100) * 140}
                            r="4"
                            fill="#3b82f6"
                          />
                          <circle
                            cx={55 + (n - 1) * stepX}
                            cy={160 - (Math.min(100, telemetryHistory[n - 1].ram_percent) / 100) * 140}
                            r="4"
                            fill="#a855f7"
                          />
                          {hw?.gpu_available && (
                            <circle
                              cx={55 + (n - 1) * stepX}
                              cy={160 - (Math.min(100, telemetryHistory[n - 1].vram_percent ?? 0) / 100) * 140}
                              r="4"
                              fill="#f59e0b"
                            />
                          )}
                        </>
                      )}
                    </>
                  );
                })()}

                {/* X-axis labels */}
                {telemetryHistory.map((pt, idx) => {
                  if (idx % Math.ceil(telemetryHistory.length / 6) !== 0 && idx !== telemetryHistory.length - 1) {
                    return null;
                  }
                  const stepX = (590 - 55) / Math.max(1, telemetryHistory.length - 1);
                  const x = 55 + idx * stepX;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y="175"
                      textAnchor="middle"
                      className="fill-zinc-400 text-[9px] font-mono"
                    >
                      {pt.timestamp}
                    </text>
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* =======================================================
          SECTION 4: BIỂU ĐỒ ĐỘ TRỄ THỰC TẾ & GIAI ĐOẠN PIPELINE
      ======================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ĐỘ TRỄ THEO MỨC TẢI ĐỒNG THỜI */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Độ Trễ Phản Hồi theo Mức Tải Đồng Thời (Latency vs Concurrency)
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Đo đạc độ trễ thực tế P50 và P95 khi thực hiện các yêu cầu đồng thời.
              </p>
            </div>

            {latencyCurve.length > 0 && (
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  P50
                </span>
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  P95
                </span>
              </div>
            )}
          </div>

          <div className="mt-6">
            {latencyCurve.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center">
                <Clock className="h-10 w-10 text-[var(--color-text-muted)] opacity-40 mb-3" />
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Chưa có kết quả kiểm thử độ trễ tải
                </p>
                <p className="mt-1 max-w-sm text-xs text-[var(--color-text-secondary)]">
                  Hệ thống không sử dụng dữ liệu giả. Hãy chọn số tác vụ đồng thời và bấm đo lường để gửi các luồng truy vấn thực tế.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {[1, 3, 5].map((conc) => (
                    <button
                      key={conc}
                      onClick={() => handleRunProbe(conc)}
                      disabled={probing}
                      className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] transition disabled:opacity-50"
                    >
                      Đo tải {conc} tasks
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative h-64 w-full">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 500 220">
                  {/* Grid Lines */}
                  {[0, 50, 100, 150, 200].map((y, idx) => (
                    <g key={idx}>
                      <line
                        x1="45"
                        y1={y + 10}
                        x2="480"
                        y2={y + 10}
                        stroke="currentColor"
                        strokeDasharray="3 3"
                        className="text-zinc-200 dark:text-zinc-800"
                        strokeWidth="1"
                      />
                    </g>
                  ))}

                  {/* Latency Points & Lines */}
                  {(() => {
                    const maxLatency = Math.max(
                      ...latencyCurve.map((p) => Math.max(p.p95_latency_sec, p.p50_latency_sec)),
                      0.01
                    );
                    const maxUsers = Math.max(...latencyCurve.map((p) => p.concurrent_users), 5);

                    const getX = (users: number) => 50 + ((users - 1) / Math.max(1, maxUsers - 1)) * 420;
                    const getY = (val: number) => 200 - (val / maxLatency) * 180;

                    const p50Points = latencyCurve.map((p) => `${getX(p.concurrent_users)},${getY(p.p50_latency_sec)}`).join(" ");
                    const p95Points = latencyCurve.map((p) => `${getX(p.concurrent_users)},${getY(p.p95_latency_sec)}`).join(" ");

                    return (
                      <>
                        {latencyCurve.length > 1 && (
                          <>
                            <polyline fill="none" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="4 2" points={p95Points} />
                            <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={p50Points} />
                          </>
                        )}
                        {latencyCurve.map((pt, i) => {
                          const x = getX(pt.concurrent_users);
                          const y50 = getY(pt.p50_latency_sec);
                          const y95 = getY(pt.p95_latency_sec);
                          return (
                            <g key={i}>
                              <circle
                                cx={x}
                                cy={y50}
                                r="5"
                                fill="#3b82f6"
                                className="cursor-pointer transition hover:r-7"
                                onMouseEnter={() => setHoveredLatencyPoint(pt)}
                                onMouseLeave={() => setHoveredLatencyPoint(null)}
                              />
                              <circle
                                cx={x}
                                cy={y95}
                                r="5"
                                fill="#a855f7"
                                className="cursor-pointer transition hover:r-7"
                                onMouseEnter={() => setHoveredLatencyPoint(pt)}
                                onMouseLeave={() => setHoveredLatencyPoint(null)}
                              />
                              <text x={x} y="215" textAnchor="middle" className="fill-zinc-400 text-[10px] font-mono">
                                {pt.concurrent_users}U
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                {/* Hover Tooltip */}
                {hoveredLatencyPoint && (
                  <div className="absolute right-4 top-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs shadow-xl backdrop-blur-md">
                    <p className="font-bold text-[var(--color-text-primary)]">
                      Tải đồng thời: {hoveredLatencyPoint.concurrent_users} Users
                    </p>
                    <p className="text-blue-500 mt-1">
                      P50 Latency: {(hoveredLatencyPoint.p50_latency_sec * 1000).toFixed(1)} ms
                    </p>
                    <p className="text-purple-500">
                      P95 Latency: {(hoveredLatencyPoint.p95_latency_sec * 1000).toFixed(1)} ms
                    </p>
                    <p className="text-zinc-400 text-[10px] mt-1">
                      Throughput: {hoveredLatencyPoint.throughput_req_min} req/min
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* THỜI GIAN THEO GIAI ĐOẠN PIPELINE */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Thời Gian Xử Lý Theo Từng Giai Đoạn Pipeline
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Dữ liệu thực tế tổng hợp từ nhật ký thực thi (pipeline_task_logs).
              </p>
            </div>
          </div>

          <div className="mt-6">
            {stages.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center">
                <Cpu className="h-10 w-10 text-[var(--color-text-muted)] opacity-40 mb-3" />
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Chưa có nhật ký tác vụ AI (0 tác vụ)
                </p>
                <p className="mt-1 max-w-sm text-xs text-[var(--color-text-secondary)]">
                  Cơ sở dữ liệu chưa ghi nhận video nào hoàn thành qua các bước Demucs, Whisper STT, NLLB Translate hoặc TTS. Số liệu sẽ tự động tổng hợp ngay khi có video được xử lý trong Workspace.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stages.map((stg) => (
                  <div
                    key={stg.stage_key}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3.5 transition hover:border-purple-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {stg.stage_name}
                      </span>
                      <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-mono font-bold text-[var(--color-text-primary)]">
                        {stg.avg_duration_sec}s
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                      {stg.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =======================================================
          SECTION 5: MA TRẬN NĂNG LỰC TẢI 1, 3, 5 VIDEO ĐỒNG THỜI
      ======================================================== */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              Ma Trận Dự Báo & Giới Hạn Năng Lực Phần Cứng (1, 3, 5 Tác Vụ)
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Đánh giá mức tiêu hao tài nguyên phần cứng (CPU, RAM, GPU VRAM) và nguy cơ tràn bộ nhớ CUDA OOM theo mức tải song song.
            </p>
          </div>

          <button
            onClick={copyMarkdownTable}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            <Copy className="h-3.5 w-3.5 text-indigo-500" />
            Sao chép bảng Markdown
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-bold">Kịch bản</th>
                <th className="py-3 px-4 font-bold text-center">Tác vụ đồng thời</th>
                <th className="py-3 px-4 font-bold text-center">% CPU</th>
                <th className="py-3 px-4 font-bold text-center">RAM (GB)</th>
                <th className="py-3 px-4 font-bold text-center">VRAM GPU (MB)</th>
                <th className="py-3 px-4 font-bold text-center">STT RTF</th>
                <th className="py-3 px-4 font-bold text-center">Thông lượng dịch</th>
                <th className="py-3 px-4 font-bold text-center">Độ trễ TB</th>
                <th className="py-3 px-4 font-bold">Nguy cơ CUDA OOM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {matrix.map((row, idx) => (
                <tr
                  key={idx}
                  className="transition hover:bg-[var(--color-surface-hover)]"
                >
                  <td className="py-3.5 px-4 font-bold text-[var(--color-text-primary)]">
                    {row.scenario_name}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold">
                    {row.concurrent_videos}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold">
                    {row.cpu_percent}%
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold">
                    {row.ram_used_gb} GB
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {row.vram_used_mb} MB
                    </span>{" "}
                    <span className="text-[10px] text-zinc-400">
                      ({row.vram_percent}%)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    {row.stt_rtf > 0 ? row.stt_rtf : "--"}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    {row.trans_words_per_sec > 0
                      ? `${row.trans_words_per_sec} từ/s`
                      : "--"}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    {row.avg_latency_sec > 0 ? `${row.avg_latency_sec}s` : "--"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                        row.status === "optimal"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : row.status === "warning"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      }`}
                    >
                      {row.status === "optimal" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {row.oom_risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =======================================================
          SECTION 6: STRESS TESTING SCRIPTS (LOCUST & K6)
      ======================================================== */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              Kịch Bản Kiểm Thử Tải Ngoài Hệ Thống (Stress Test Tooling)
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Chạy trực tiếp từ dòng lệnh để kiểm thử tải đồng thời nhiều tài khoản độc lập và ghi nhận số liệu thực tế.
            </p>
          </div>

          <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
            <button
              onClick={() => setActiveTestTool("locust")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTestTool === "locust"
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Locust (Python)
            </button>
            <button
              onClick={() => setActiveTestTool("k6")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTestTool === "k6"
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              k6 (JavaScript)
            </button>
          </div>
        </div>

        <div className="mt-4">
          {activeTestTool === "locust" ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100 dark:border dark:border-zinc-800">
                <div className="flex items-center justify-between pb-2 text-[10px] text-zinc-400">
                  <span>benchmark/locustfile.py</span>
                  <span>CLI Command</span>
                </div>
                <p className="text-emerald-400">
                  # 1. Cài đặt Locust
                  <br />
                  pip install locust
                  <br />
                  <br />
                  # 2. Khởi chạy kiểm thử tải giao diện Web UI (Mô phỏng 1 đến 20 users đồng thời)
                  <br />
                  locust -f benchmark/locustfile.py --host=http://localhost:8000
                  <br />
                  <br />
                  # 3. Hoặc chạy chế độ Headless và tự động xuất CSV
                  <br />
                  locust -f benchmark/locustfile.py --host=http://localhost:8000 --headless -u 10 -r 2 -t 3m --csv=benchmark/reports/locust_result
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Kịch bản giả lập đăng nhập độc lập từng user, tạo dự án và polling tiến trình xử lý video để ghi nhận phân vị độ trễ P50/P95.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100 dark:border dark:border-zinc-800">
                <div className="flex items-center justify-between pb-2 text-[10px] text-zinc-400">
                  <span>benchmark/stress_test.js</span>
                  <span>CLI Command</span>
                </div>
                <p className="text-purple-400">
                  # 1. Cài đặt k6 (qua Chocolatey trên Windows hoặc brew trên macOS)
                  <br />
                  choco install k6
                  <br />
                  <br />
                  # 2. Chạy kịch bản phân tầng 1 → 3 → 5 → 10 Virtual Users
                  <br />
                  k6 run benchmark/stress_test.js
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Kịch bản k6 tự động kiểm tra các chỉ tiêu SLA (P95 latency &lt; 2000ms cho API endpoints, tỷ lệ lỗi &lt; 1%).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
