import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProjectErrorStateProps {
  onRetry?: () => void;
}

export default function ProjectErrorState({ onRetry }: ProjectErrorStateProps) {
  const { t } = useTranslation(["workspace"]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200/80 bg-red-50/40 px-6 py-16 text-center shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle size={28} />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--color-text-primary)]">
        {t("workspace:states.errorTitle")}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
        {t("workspace:states.errorDesc")}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
        >
          <RotateCcw size={14} />
          <span>{t("workspace:states.retry")}</span>
        </button>
      )}
    </div>
  );
}
