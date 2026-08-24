import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BillingCycle } from "../../types/subscription";

export interface PricingHeaderProps {
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
}

export default function PricingHeader({
  billingCycle,
  onBillingCycleChange,
}: PricingHeaderProps) {
  const { t } = useTranslation(["pricing"]);

  return (
    <div className="mx-auto max-w-[840px] text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3.5 py-1.5 text-xs font-bold text-[var(--color-primary)] shadow-sm">
        <Sparkles size={14} className="text-[var(--color-primary)]" />
        <span>{t("pricing:badge")}</span>
      </div>

      {/* Main Title */}
      <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
        {t("pricing:title")}
      </h2>

      {/* Subtitle */}
      <p className="mx-auto mt-4 max-w-[620px] text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
        {t("pricing:subtitle")}
      </p>

      {/* Billing Cycle Switcher */}
      <div className="mt-8 inline-flex items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => onBillingCycleChange("monthly")}
          className={`relative rounded-xl px-5 py-2 text-xs font-bold transition-all duration-200 ${
            billingCycle === "monthly"
              ? "bg-[var(--color-primary)] text-white shadow-sm"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          {t("pricing:billing.monthly")}
        </button>

        <button
          type="button"
          onClick={() => onBillingCycleChange("yearly")}
          className={`relative flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition-all duration-200 ${
            billingCycle === "yearly"
              ? "bg-[var(--color-primary)] text-white shadow-sm"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <span>{t("pricing:billing.yearly")}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
              billingCycle === "yearly"
                ? "bg-white/20 text-white"
                : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
            }`}
          >
            {t("pricing:billing.savePercent")}
          </span>
        </button>
      </div>
    </div>
  );
}
