import { HardDrive, Plus, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BillingCycle, StorageAddon } from "../../types/subscription";

export interface StorageAddonSectionProps {
  addons: StorageAddon[];
  billingCycle: BillingCycle;
}

export default function StorageAddonSection({
  addons,
  billingCycle,
}: StorageAddonSectionProps) {
  const { t } = useTranslation(["pricing"]);

  return (
    <div className="mx-auto mt-16 max-w-[1400px]">
      {/* Header */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-10 shadow-[var(--shadow-card)] transition-colors">
        <div className="max-w-[700px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 px-3.5 py-1 text-xs font-bold text-[var(--color-secondary)]">
            <Layers size={14} />
            <span>{t("pricing:storageAddons.badge")}</span>
          </div>

          <h3 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            {t("pricing:storageAddons.title")}
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)] sm:text-sm">
            {t("pricing:storageAddons.subtitle")}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-background)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary)]">
            <span>ℹ️</span>
            <span>{t("pricing:storageAddons.effectiveFormula")}</span>
          </div>
        </div>

        {/* Addon Cards Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {addons.map((addon) => {
            const price = billingCycle === "monthly" ? addon.price_monthly : Math.round(addon.price_yearly / 12);

            return (
              <div
                key={addon.code}
                className="group relative flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition-transform duration-200 group-hover:scale-110">
                      <HardDrive size={20} />
                    </div>
                    <span className="flex items-center gap-0.5 rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                      <Plus size={10} /> Add-on
                    </span>
                  </div>

                  <h4 className="mt-4 text-lg font-black tracking-tight text-[var(--color-text-primary)]">
                    {addon.name}
                  </h4>

                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    +{addon.storage_gb} GB cloud storage
                  </p>
                </div>

                <div className="mt-6 border-t border-[var(--color-border)] pt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[var(--color-text-primary)]">
                      ${price}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                      {t("pricing:storageAddons.pricePerMonth")}
                    </span>
                  </div>

                  {billingCycle === "yearly" && (
                    <div className="mt-1 text-[11px] font-medium text-[var(--color-primary)]">
                      ${addon.price_yearly} {t("pricing:storageAddons.pricePerYear")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
