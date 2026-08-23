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
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
        active
          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
      }`}
    >
      {icon}

      <span>
        {title}
      </span>
    </button>
  );
}
