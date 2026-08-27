import type React from "react";

export interface SettingsRowProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  align?: "center" | "start";
  className?: string;
}

export default function SettingsRow({
  icon,
  title,
  description,
  badge,
  children,
  align = "center",
  className = "",
}: SettingsRowProps) {
  return (
    <div
      className={`flex flex-col justify-between gap-3 py-3.5 sm:flex-row ${
        align === "center" ? "sm:items-center" : "sm:items-start"
      } ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon && (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[var(--color-text-primary)] sm:text-sm">
              {title}
            </span>
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
          {children}
        </div>
      )}
    </div>
  );
}
