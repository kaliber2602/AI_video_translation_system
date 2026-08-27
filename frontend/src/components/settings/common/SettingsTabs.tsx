import type React from "react";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface SettingsTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export default function SettingsTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = "",
  size = "md",
}: SettingsTabsProps<T>) {
  const sizeClasses = {
    sm: "p-1 gap-1 text-xs",
    md: "p-1.5 gap-1.5 text-xs sm:text-sm",
  };

  const itemSizeClasses = {
    sm: "px-3 py-1 rounded-lg",
    md: "px-3.5 py-1.5 rounded-xl font-semibold",
  };

  return (
    <div
      className={`inline-flex items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 ${sizeClasses[size]} ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 transition-all duration-200 ${
              itemSizeClasses[size]
            } ${
              isActive
                ? "bg-[var(--color-primary)] text-white shadow-sm font-bold scale-[1.02]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
