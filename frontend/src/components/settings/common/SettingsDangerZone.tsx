import type React from "react";
import { AlertTriangle } from "lucide-react";

export interface SettingsDangerZoneProps {
  title: string;
  description: string;
  actionText: string;
  onAction: () => void;
  warningNote?: string;
  children?: React.ReactNode;
}

export default function SettingsDangerZone({
  title,
  description,
  actionText,
  onAction,
  warningNote,
  children,
}: SettingsDangerZoneProps) {
  return (
    <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 transition-all duration-200 hover:border-rose-500/50">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={20} />
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">
              {title}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
              {description}
            </p>
            {warningNote && (
              <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                ⚠️ {warningNote}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-rose-700 active:scale-95 sm:self-center"
        >
          {actionText}
        </button>
      </div>

      {children && <div className="mt-4 pt-4 border-t border-rose-500/20">{children}</div>}
    </section>
  );
}
