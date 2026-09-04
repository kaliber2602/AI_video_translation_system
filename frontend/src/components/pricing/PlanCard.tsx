import { Check, HardDrive, Sparkles, Sliders, ShieldCheck, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BillingCycle, Plan } from "../../types/subscription";

export interface PlanCardProps {
  plan: Plan;
  billingCycle: BillingCycle;
  isCurrentPlan?: boolean;
  onSelectPlan?: (plan: Plan) => void;
}

export default function PlanCard({
  plan,
  billingCycle,
  isCurrentPlan = false,
  onSelectPlan,
}: PlanCardProps) {
  const { t } = useTranslation(["pricing", "common"]);

  const price = billingCycle === "monthly" ? plan.price_monthly : Math.round(plan.price_yearly / 12);
  const isFree = plan.code === "free";
  const isPopular = plan.is_popular;

  // Categorize resources
  const storageResource = plan.resources.find((r) => r.resource_type === "STORAGE" && r.resource_key === "storage_bytes");
  const creditsResource = plan.resources.find((r) => r.resource_type === "CONSUMABLE" && r.resource_key === "ai_credits_monthly");
  const limits = plan.resources.filter((r) => r.resource_type === "LIMIT");

  // Format Storage value
  const formatStorage = (bytesStr?: string) => {
    if (!bytesStr) return isFree ? "5 GB" : plan.code === "pro" ? "100 GB" : "1 TB";
    const bytes = parseInt(bytesStr, 10);
    if (bytes >= 1099511627776) return `${Math.round(bytes / (1024 ** 4))} TB`;
    return `${Math.round(bytes / (1024 ** 3))} GB`;
  };

  // Format AI Credits
  const formatCredits = (creditsStr?: string) => {
    if (!creditsStr) return isFree ? "1,000" : plan.code === "pro" ? "10,000" : "100,000";
    const num = parseInt(creditsStr, 10);
    return num.toLocaleString();
  };

  // Map Limits for clean presentation
  const limitValues: Record<string, string> = {
    max_file_size_bytes: "500 MB",
    max_video_duration_seconds: "30 min",
    max_upload_resolution: "1080p",
    max_processing_resolution: "720p",
    max_streaming_resolution: "720p",
    max_concurrent_jobs: "1",
    max_projects: "5",
  };

  limits.forEach((l) => {
    if (l.resource_key === "max_file_size_bytes") {
      const bytes = parseInt(l.limit_value, 10);
      limitValues[l.resource_key] = bytes >= 1073741824 ? `${Math.round(bytes / 1073741824)} GB` : `${Math.round(bytes / 1048576)} MB`;
    } else if (l.resource_key === "max_video_duration_seconds") {
      const sec = parseInt(l.limit_value, 10);
      limitValues[l.resource_key] = sec >= 3600 ? `${Math.round(sec / 3600)}h` : `${Math.round(sec / 60)} min`;
    } else {
      limitValues[l.resource_key] = l.limit_value;
    }
  });

  // Feature items list
  const featureList = [
    t("pricing:comparison.rows.translation"),
    t("pricing:comparison.rows.tts"),
    t("pricing:comparison.rows.diarization"),
    t("pricing:comparison.rows.subtitles"),
    t("pricing:comparison.rows.editor"),
    t("pricing:comparison.rows.exportDocs"),
    t("pricing:comparison.rows.hls"),
  ];

  if (plan.code === "business") {
    featureList.push(
      t("pricing:comparison.rows.batch"),
      t("pricing:comparison.rows.api"),
      t("pricing:comparison.rows.priority"),
      t("pricing:comparison.rows.team")
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-between rounded-3xl border bg-[var(--color-surface)] p-6 transition-all duration-300 sm:p-8 ${
        isPopular
          ? "border-[var(--color-primary)] shadow-[0_16px_40px_rgba(21,194,168,0.14)] lg:-translate-y-2 ring-2 ring-[var(--color-primary)]/20"
          : "border-[var(--color-border)] shadow-[var(--shadow-card)] hover:border-[var(--color-primary)]/50 hover:shadow-lg"
      }`}
    >
      {/* Popular Star Badge */}
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
            <Star size={12} className="fill-current" />
            {t("pricing:plans.pro.popular")}
          </span>
        </div>
      )}

      <div>
        {/* Plan Name & Tagline */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">
            {plan.name}
          </h3>
          {isCurrentPlan && (
            <span className="rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-primary)]">
              {t("pricing:plans.currentPlan")}
            </span>
          )}
        </div>

        <p className="mt-2 min-h-[38px] text-xs leading-relaxed text-[var(--color-text-muted)]">
          {plan.description || t(`pricing:plans.${plan.code}.tagline`, "")}
        </p>

        {/* Pricing Block */}
        <div className="mt-5 border-y border-[var(--color-border)] py-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black tracking-tight text-[var(--color-text-primary)]">
              ${price}
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              {t("pricing:plans.pricePerMonth")}
            </span>
          </div>
          {billingCycle === "yearly" && !isFree && (
            <p className="mt-1 text-[11px] font-medium text-[var(--color-primary)]">
              ${plan.price_yearly} {t("pricing:plans.billedYearly")}
            </p>
          )}
        </div>

        {/* 1. STORAGE */}
        <div className="mt-5 rounded-2xl bg-[var(--color-background)] p-3.5 transition-colors">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            <HardDrive size={15} className="text-[var(--color-primary)]" />
            <span>{t("pricing:sections.storage")}</span>
          </div>
          <div className="mt-2 text-lg font-black text-[var(--color-text-primary)]">
            {formatStorage(storageResource?.limit_value)}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            + {t("pricing:storageAddons.badge")}
          </div>
        </div>

        {/* 2. CONSUMABLE AI CREDITS */}
        <div className="mt-3.5 rounded-2xl bg-[var(--color-background)] p-3.5 transition-colors">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            <Sparkles size={15} className="text-[var(--color-primary)]" />
            <span>{t("pricing:sections.consumable")}</span>
          </div>
          <div className="mt-2 text-lg font-black text-[var(--color-text-primary)]">
            {formatCredits(creditsResource?.limit_value)} {t("pricing:comparison.rows.credits")}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            ~ {formatCredits(creditsResource?.limit_value)} {t("pricing:comparison.rows.minutes")}
          </div>
        </div>

        {/* 3. LIMITS */}
        <div className="mt-5 space-y-2 text-xs text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            <Sliders size={14} className="text-[var(--color-primary)]" />
            <span>{t("pricing:sections.limits")}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[var(--color-border)]/60">
            <span>{t("pricing:comparison.rows.maxFile")}</span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {limitValues.max_file_size_bytes}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[var(--color-border)]/60">
            <span>{t("pricing:comparison.rows.maxDuration")}</span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {limitValues.max_video_duration_seconds}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[var(--color-border)]/60">
            <span>{t("pricing:comparison.rows.uploadRes")}</span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {limitValues.max_upload_resolution}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[var(--color-border)]/60">
            <span>{t("pricing:comparison.rows.processingRes")}</span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {limitValues.max_processing_resolution}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[var(--color-border)]/60">
            <span>{t("pricing:comparison.rows.concurrency")}</span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {limitValues.max_concurrent_jobs}
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span>{t("pricing:comparison.rows.projects")}</span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {limitValues.max_projects}
            </span>
          </div>
        </div>

        {/* 4. FEATURES (All active) */}
        <div className="mt-5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            <ShieldCheck size={14} className="text-[var(--color-primary)]" />
            <span>{t("pricing:sections.features")}</span>
          </div>

          {featureList.map((feat) => (
            <div key={feat} className="flex items-center gap-2 text-[var(--color-text-secondary)]">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Check size={11} strokeWidth={3} />
              </div>
              <span className="text-xs">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8">
        <button
          type="button"
          disabled={isCurrentPlan}
          onClick={() => onSelectPlan && onSelectPlan(plan)}
          className={`w-full rounded-2xl py-3.5 text-sm font-bold transition-all duration-200 ${
            isCurrentPlan
              ? "border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-muted)] cursor-default"
              : isPopular
              ? "bg-[var(--color-primary)] text-white shadow-[0_8px_20px_rgba(21,194,168,0.3)] hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer"
          }`}
        >
          {isCurrentPlan
            ? t("pricing:plans.currentPlan")
            : t(`pricing:plans.${plan.code}.cta`, "Get Started")}
        </button>
      </div>
    </div>
  );
}
