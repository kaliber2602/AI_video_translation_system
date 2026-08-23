import type React from "react";

export interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  onClick?: () => void;
}

export default function SettingItem({
  icon,
  title,
  active,
  onClick,
}: SettingItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-xs spring-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
        active
          ? "bg-[var(--color-primary)] text-white font-bold shadow-[0_6px_16px_-6px_color-mix(in_srgb,var(--color-primary)_70%,transparent)]"
          : "text-[var(--color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--color-primary-soft)_60%,var(--color-surface-muted))] hover:text-[var(--color-text-primary)] hover:translate-x-0.5"
      }`}
    >
      <span
        className={`transition-transform duration-200 ease-out ${
          active
            ? "scale-105 text-white"
            : "text-[var(--color-text-muted)] group-hover:scale-105"
        }`}
      >
        {icon}
      </span>

      <span className="truncate tracking-tight">{title}</span>

      {active && (
        <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-scale-in" />
      )}
    </button>
  );
}
