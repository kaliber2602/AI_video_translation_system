import type React from "react";

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "purple"
  | "neutral";

export interface SettingsBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

export default function SettingsBadge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
}: SettingsBadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    default:
      "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border)]",
    primary:
      "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20",
    success:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    warning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    danger:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    purple:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    neutral:
      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: "bg-[var(--color-text-muted)]",
    primary: "bg-[var(--color-primary)]",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    purple: "bg-purple-500",
    neutral: "bg-slate-500",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] font-semibold gap-1.5 rounded-full",
    md: "px-2.5 py-1 text-xs font-semibold gap-2 rounded-lg",
  };

  return (
    <span
      className={`inline-flex items-center tracking-tight transition-colors ${sizeStyles[size]} ${variantStyles[variant]}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 animate-pulse ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
