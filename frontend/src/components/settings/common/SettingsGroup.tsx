import type React from "react";

export interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SettingsGroup({
  title,
  description,
  children,
  className = "",
}: SettingsGroupProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {(title || description) && (
        <div className="pb-1">
          {title && (
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="divide-y divide-[var(--color-border)]/60 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-4 py-1">
        {children}
      </div>
    </div>
  );
}
