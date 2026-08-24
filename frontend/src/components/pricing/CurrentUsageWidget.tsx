import { HardDrive, Sparkles, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UserSubscriptionSummary } from "../../types/subscription";

export interface CurrentUsageWidgetProps {
  summary: UserSubscriptionSummary;
}

export default function CurrentUsageWidget({ summary }: CurrentUsageWidgetProps) {
  const { t } = useTranslation(["pricing"]);
  const { subscription, effective_quota } = summary;
  const { storage, credits } = effective_quota;

  return (
    <div className="mx-auto mb-14 max-w-[1400px]">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-primary)]/30 bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-card)] transition-colors">
        {/* Background ambient glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Header left */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
              <UserCheck size={14} />
              <span>{t("pricing:currentUsage.title")}</span>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <h3 className="text-2xl font-black text-[var(--color-text-primary)]">
                {subscription?.plan_name || "Free"}
              </h3>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                Active
              </span>
            </div>
          </div>

          {/* Progress Bars Grid */}
          <div className="grid flex-1 gap-6 sm:grid-cols-2 lg:max-w-[700px]">
            {/* Storage bar */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-primary)]">
                <span className="flex items-center gap-1.5">
                  <HardDrive size={15} className="text-[var(--color-primary)]" />
                  {t("pricing:currentUsage.storageUsed")}
                </span>
                <span>
                  {storage.used_gb} / {storage.total_gb} GB ({storage.usage_percent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(2, storage.usage_percent))}%` }}
                />
              </div>

              <div className="mt-2 flex flex-wrap justify-between gap-1 text-[11px] text-[var(--color-text-muted)]">
                <span>
                  {storage.included_gb} GB {t("pricing:currentUsage.storageIncluded")}
                </span>
                {storage.addon_gb > 0 && (
                  <span className="font-semibold text-[var(--color-secondary)]">
                    +{storage.addon_gb} GB {t("pricing:currentUsage.storageAddon")}
                  </span>
                )}
              </div>
            </div>

            {/* AI Credits bar */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-primary)]">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-[var(--color-primary)]" />
                  {t("pricing:currentUsage.creditsUsed")}
                </span>
                <span>
                  {credits.converted_minutes_used} / {credits.converted_minutes_total} min
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-secondary)] transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        2,
                        credits.converted_minutes_total > 0
                          ? Math.round((credits.converted_minutes_used / credits.converted_minutes_total) * 100)
                          : 0
                      )
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-2 text-right text-[11px] font-semibold text-[var(--color-primary)]">
                {credits.converted_minutes_remaining} {t("pricing:currentUsage.creditsRemaining")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
