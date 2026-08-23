import { LayoutGrid, Sparkles, Table, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ViewMode = "grid" | "freedom" | "list" | "card";

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
      id: "grid",
      label: t("workspace:views.grid"),
      icon: LayoutGrid,
    },
    {
      id: "freedom",
      label: t("workspace:views.freedom"),
      icon: Sparkles,
    },
    {
      id: "list",
      label: t("workspace:views.list"),
      icon: Table,
    },
    {
      id: "card",
      label: t("workspace:views.card"),
      icon: CreditCard,
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("workspace:views.switcherAria")}
      className="inline-flex h-11 items-center gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1 shadow-inner transition-colors duration-200"
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
            className={`group relative flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold spring-pill ${
              isActive
                ? "bg-[var(--color-primary)] text-white shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--color-primary)_65%,transparent)] font-bold scale-[1.02]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]/80 hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Icon
              size={15}
              className={`transition-transform duration-200 ${
                isActive ? "scale-110 text-white" : "text-current group-hover:scale-105"
              }`}
            />
            <span className="hidden sm:inline-block tracking-tight">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
