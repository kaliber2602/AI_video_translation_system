import { Check, Save, RotateCcw } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";

export interface SettingsSectionHeaderProps {
  title: string;
  subtitle: string;
  isSaved?: boolean;
  onSave?: () => void;
  onReset?: () => void;
  actions?: React.ReactNode;
}

export default function SettingsSectionHeader({
  title,
  subtitle,
  isSaved = true,
  onSave,
  onReset,
  actions,
}: SettingsSectionHeaderProps) {
  const { t } = useTranslation(["common", "settings"]);

  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)] sm:text-sm">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {actions}

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] active:scale-95"
            title={t("common:reset", "Reset")}
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">{t("common:reset", "Reset")}</span>
          </button>
        )}

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-95 sm:text-sm ${
              isSaved
                ? "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40"
                : "bg-[var(--color-primary)] text-white shadow-md hover:bg-[var(--color-primary-hover)] hover:shadow-lg"
            }`}
          >
            {isSaved ? <Check size={16} /> : <Save size={16} />}
            <span>
              {isSaved
                ? t("common:saved", "Saved")
                : t("common:saveChanges", "Save Changes")}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
