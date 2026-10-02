import { LayoutGrid, Table } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ViewMode = "card" | "list";

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function ViewSwitcher({
  viewMode,
  onViewModeChange,
}: ViewSwitcherProps) {
  const { t } = useTranslation(["workspace"]);

  const modes: { id: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    {
      id: "card",
      label: t("workspace:views.card", "Dạng thẻ"),
      icon: LayoutGrid,
    },
    {
      id: "list",
      label: t("workspace:views.list", "Danh sách"),
      icon: Table,
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("workspace:views.switcherAria")}
      className="inline-flex h-12 items-center gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1 shadow-inner transition-colors duration-200"
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = viewMode === mode.id;

        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={mode.label}
            title={mode.label}
            onClick={() => onViewModeChange(mode.id)}
            className={`group relative flex h-10 min-w-[42px] sm:min-w-[48px] items-center justify-center gap-1.5 rounded-xl px-3 sm:px-4 text-xs font-semibold spring-pill cursor-pointer ${
              isActive
                ? "bg-[var(--color-primary)] text-white shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--color-primary)_65%,transparent)] font-bold scale-[1.02]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]/80 hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Icon
              size={16}
              className={`transition-transform duration-200 ${
                isActive ? "scale-110 text-white" : "text-current group-hover:scale-105"
              }`}
            />
            <span className="hidden sm:inline-block tracking-tight font-medium">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
