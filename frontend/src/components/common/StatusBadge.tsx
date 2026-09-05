export type StatusType =
  | "completed"
  | "processing"
  | "editing"
  | "queued"
  | "running"
  | "failed"
  | "error"
  | "active"
  | "inactive"
  | "pending"
  | "success";

interface StatusConfig {
  bg: string;
  text: string;
  dot: string;
  defaultLabel: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  completed: {
    bg: "bg-[var(--color-success-soft)]",
    text: "text-[var(--color-success)]",
    dot: "bg-[var(--color-success)]",
    defaultLabel: "Completed",
  },
  success: {
    bg: "bg-[var(--color-success-soft)]",
    text: "text-[var(--color-success)]",
    dot: "bg-[var(--color-success)]",
    defaultLabel: "Success",
  },
  active: {
    bg: "bg-[var(--color-success-soft)]",
    text: "text-[var(--color-success)]",
    dot: "bg-[var(--color-success)]",
    defaultLabel: "Active",
  },
  processing: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500 animate-pulse",
    defaultLabel: "Processing",
  },
  running: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500 animate-pulse",
    defaultLabel: "Running",
  },
  editing: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    defaultLabel: "Editing",
  },
  queued: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-400",
    defaultLabel: "Queued",
  },
  pending: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    defaultLabel: "Pending",
  },
  failed: {
    bg: "bg-red-500/10 dark:bg-red-500/20",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    defaultLabel: "Failed",
  },
  error: {
    bg: "bg-red-500/10 dark:bg-red-500/20",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    defaultLabel: "Error",
  },
  inactive: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-500 dark:text-slate-400",
    dot: "bg-slate-400",
    defaultLabel: "Inactive",
  },
};

export interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

export default function StatusBadge({
  status,
  label,
  size = "md",
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const normalizedKey = status.toLowerCase();
  const config = statusConfigs[normalizedKey] || {
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-400",
    defaultLabel: status,
  };

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold tracking-tight transition-colors duration-180 ${config.bg} ${config.text} ${sizeClass} ${className}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />}
      <span>{label || config.defaultLabel}</span>
    </span>
  );
}
