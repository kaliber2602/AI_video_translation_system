import { useEffect, useState } from "react";
import {
  CreditCard,
  Sparkles,
  Download,
  AlertCircle,
  HardDrive,
  Clock,
  PlusCircle,
  Layers,
  Receipt,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsBadge from "../common/SettingsBadge";
import SettingsTabs from "../common/SettingsTabs";
import SettingsModal from "../common/SettingsModal";
import DemoCheckoutModal from "../../pricing/DemoCheckoutModal";

import {
  getMySubscriptionSummary,
  getPricingCatalog,
} from "../../../services/subscription.service";
import {
  getMyPaymentTransactions,
} from "../../../services/payment.service";
import type {
  BillingCycle,
  Plan,
  StorageAddon,
  UserSubscriptionSummary,
} from "../../../types/subscription";
import type { PaymentTransaction } from "../../../types/payment";

export default function BillingSection() {
  const { t } = useTranslation(["settings", "common"]);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<StorageAddon[]>([]);
  const [userSummary, setUserSummary] = useState<UserSubscriptionSummary | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  // Modals
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isStorageAddonModalOpen, setIsStorageAddonModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Demo / Hosted Checkout state
  const [checkoutProduct, setCheckoutProduct] = useState<{
    type: "PLAN" | "STORAGE_ADDON";
    data: Plan | StorageAddon;
  } | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const loadBillingData = async () => {
    try {
      const [catalogRes, summaryRes, txnRes] = await Promise.allSettled([
        getPricingCatalog(),
        getMySubscriptionSummary(),
        getMyPaymentTransactions({ limit: 20 }),
      ]);

      if (catalogRes.status === "fulfilled") {
        setPlans(catalogRes.value.plans || []);
        setAddons(catalogRes.value.storage_addons || []);
      }

      if (summaryRes.status === "fulfilled") {
        setUserSummary(summaryRes.value);
        if (summaryRes.value.subscription?.billing_cycle) {
          setBillingCycle(summaryRes.value.subscription.billing_cycle as BillingCycle);
        }
      }

      if (txnRes.status === "fulfilled") {
        setTransactions(txnRes.value.transactions || []);
      }
    } catch (err) {
      console.error("[BillingSection] Error loading data:", err);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleSelectPlanToUpgrade = (plan: Plan) => {
    setIsUpgradeModalOpen(false);
    setCheckoutProduct({ type: "PLAN", data: plan });
    setIsCheckoutModalOpen(true);
  };

  const handleSelectAddonToPurchase = (addon: StorageAddon) => {
    setIsStorageAddonModalOpen(false);
    setCheckoutProduct({ type: "STORAGE_ADDON", data: addon });
    setIsCheckoutModalOpen(true);
  };

  // Derived Subscription Details
  const sub = userSummary?.subscription;
  const quota = userSummary?.effective_quota;
  const currentPlanCode = sub?.plan_code || "free";
  const currentPlanObj = plans.find((p) => p.code === currentPlanCode);

  const planPrice =
    currentPlanObj
      ? billingCycle === "monthly"
        ? currentPlanObj.price_monthly
        : currentPlanObj.price_yearly
      : 0;

  // Format Expiration Date
  const renewsDateFormatted = sub?.expires_at
    ? new Date(sub.expires_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Lifetime / No expiry";

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:billing.title", "Billing & Subscription")}
        subtitle={t(
          "settings:billing.subtitle",
          "Manage active tier subscription, monitor real-time pipeline quotas, invoices, and payment history."
        )}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 1: CURRENT PLAN CARD */}
        <SettingCard
          title={t("settings:billing.planTitle", "Current Subscription")}
          description="Your workspace active tier and billing renewal settings."
        >
          <div className="space-y-5">
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-[var(--color-text-primary)] capitalize">
                    {sub?.plan_name ? `VidNova ${sub.plan_name}` : "VidNova Free Tier"}
                  </h4>
                  <SettingsBadge variant="success" size="sm" dot>
                    {sub?.status ? sub.status.toUpperCase() : "ACTIVE"}
                  </SettingsBadge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Renews on <b>{renewsDateFormatted}</b> • {sub?.billing_cycle?.toUpperCase() || "MONTHLY"}
                </p>
              </div>

              <div className="text-right sm:self-center">
                <div className="text-2xl font-black text-[var(--color-primary)]">
                  ${planPrice}
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">
                    /{billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cycle Selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                {t("settings:billing.cycleLabel", "Billing Cycle")}
              </span>
              <SettingsTabs
                tabs={[
                  { id: "monthly", label: "Monthly" },
                  { id: "yearly", label: "Annual", badge: "Discounted" },
                ]}
                activeTab={billingCycle}
                onChange={(tab) => {
                  setBillingCycle(tab as any);
                  toast.info("Cycle preference updated", `Switched to ${tab} billing.`);
                }}
                size="sm"
              />
            </div>

            {/* Active Storage Add-ons summary */}
            {userSummary?.addons && userSummary.addons.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[var(--color-text-primary)] mb-1">
                  <Layers size={13} className="text-[var(--color-primary)]" />
                  <span>Active Storage Add-ons:</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {userSummary.addons.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary)]"
                    >
                      {a.addon_name} (+{roundGb(a.storage_bytes)} GB)
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] active:scale-95 cursor-pointer"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Sparkles size={14} />
                  Change Plan Tier
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsStorageAddonModalOpen(true)}
                className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/20 px-3.5 py-2.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <PlusCircle size={14} />
                  +Add Storage
                </span>
              </button>

              {currentPlanCode !== "free" && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 cursor-pointer"
                >
                  Cancel Plan
                </button>
              )}
            </div>
          </div>
        </SettingCard>

        {/* CARD 2: REAL-TIME QUOTAS & CONSUMABLES */}
        <SettingCard
          title={t("settings:billing.usageTitle", "Pipeline Quotas & AI Credits")}
          description="Authoritative real-time balance of storage allowance and monthly AI credits."
        >
          <div className="space-y-4">
            {/* Storage Quota */}
            <div>
              <div className="flex justify-between text-xs font-semibold pb-1">
                <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                  <HardDrive size={13} className="text-[var(--color-primary)]" />
                  Cloud Storage Allowance
                </span>
                <span className="text-[var(--color-text-primary)]">
                  {quota ? `${quota.storage.used_gb} GB / ${quota.storage.total_gb} GB` : "0 GB / 5 GB"}
                  <span className="text-[var(--color-text-muted)] ml-1">
                    ({quota ? `${quota.storage.usage_percent}%` : "0%"})
                  </span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                  style={{ width: `${Math.min(100, quota?.storage?.usage_percent || 0)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                Base plan {quota?.storage.included_gb || 5} GB + Addons {quota?.storage.addon_gb || 0} GB.
              </p>
            </div>

            {/* AI Credits Consumable */}
            <div>
              <div className="flex justify-between text-xs font-semibold pb-1">
                <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                  <Clock size={13} className="text-blue-500" />
                  Monthly AI Credits (Whisper / NLLB / XTTS)
                </span>
                <span className="text-[var(--color-text-primary)]">
                  {quota
                    ? `${quota.credits.used_credits.toLocaleString()} / ${quota.credits.total_credits.toLocaleString()}`
                    : "0 / 1,000"}
                  <span className="text-[var(--color-text-muted)] ml-1">
                    (
                    {quota && quota.credits.total_credits > 0
                      ? `${Math.round((quota.credits.used_credits / quota.credits.total_credits) * 100)}%`
                      : "0%"}
                    )
                  </span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: `${
                      quota && quota.credits.total_credits > 0
                        ? Math.min(100, (quota.credits.used_credits / quota.credits.total_credits) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                ~{quota?.credits.remaining_credits.toLocaleString() || "1,000"} minutes of video translation remaining.
              </p>
            </div>

            {/* Job Concurrency & Projects Limit */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--color-border)]/60 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)] block text-[11px]">Max Concurrent Jobs</span>
                <span className="font-bold text-[var(--color-text-primary)]">
                  {quota?.limits?.max_concurrent_jobs || 1} Parallel Tasks
                </span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block text-[11px]">Max Projects Capacity</span>
                <span className="font-bold text-[var(--color-text-primary)]">
                  {quota?.limits?.max_projects || 5} Max Projects
                </span>
              </div>
            </div>
          </div>
        </SettingCard>

        {/* CARD 3: PAYMENT GATEWAYS & SECURITY */}
        <SettingCard
          title={t("settings:billing.paymentTitle", "Payment Gateways")}
          description="PCI-DSS compliant hosted gateways. No raw card numbers stored in VidNova."
        >
          <div className="space-y-3">
            {/* Stripe Card */}
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-all hover:border-[var(--color-primary)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <CreditCard size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      Stripe Global Checkout
                    </span>
                    <SettingsBadge variant="primary" size="sm">
                      Global USD
                    </SettingsBadge>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Visa, MasterCard, American Express, Apple Pay
                  </p>
                </div>
              </div>
              <ShieldCheck size={16} className="text-blue-500" />
            </div>

            {/* VNPay Card */}
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-all hover:border-[var(--color-primary)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Globe size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      VNPay Vietnam Gateway
                    </span>
                    <SettingsBadge variant="success" size="sm">
                      VND
                    </SettingsBadge>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    ATM Napas, VNPAY-QR, Thẻ ngân hàng nội địa
                  </p>
                </div>
              </div>
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>

            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/10 cursor-pointer"
            >
              <Sparkles size={14} />
              Upgrade or Manage Plan via Gateway
            </button>
          </div>
        </SettingCard>

        {/* CARD 4: PAYMENT TRANSACTIONS & INVOICE HISTORY */}
        <SettingCard
          title="Payment Transactions & Financial Audit"
          description="Authoritative ledger of subscription upgrades and storage add-ons."
        >
          <div className="divide-y divide-[var(--color-border)]/60">
            {transactions.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                <Receipt className="mx-auto mb-2 text-[var(--color-text-muted)]" size={24} />
                No payment transactions on record yet.
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[var(--color-text-primary)]">
                        {tx.transaction_code}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : tx.status === "failed"
                            ? "bg-rose-500/10 text-rose-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString()} • {tx.product_name || tx.product_type} ({tx.payment_method})
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      ${tx.amount} {tx.currency}
                    </span>
                    <button
                      type="button"
                      onClick={() => toast.success("Invoice Ready", `Receipt for ${tx.transaction_code} generated.`)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                      title="Download PDF"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SettingCard>
      </div>

      {/* MODAL 1: PLAN TIERS */}
      <SettingsModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Subscription Plans Catalog"
        subtitle="Select a tier to scale your storage and monthly AI processing credits"
        icon={<Sparkles size={20} />}
        maxWidth="lg"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const isSelected = p.code === currentPlanCode;
            const price = billingCycle === "monthly" ? p.price_monthly : p.price_yearly;

            return (
              <div
                key={p.code}
                className={`rounded-2xl border p-4 text-left relative flex flex-col justify-between ${
                  p.is_popular
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 ring-1 ring-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                <div>
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <SettingsBadge variant="primary" size="sm">Current</SettingsBadge>
                    </div>
                  )}
                  <h5 className="font-bold text-sm text-[var(--color-text-primary)]">{p.name}</h5>
                  <p className="text-xl font-black mt-2 text-[var(--color-text-primary)]">
                    ${price}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">
                      /{billingCycle === "monthly" ? "mo" : "yr"}
                    </span>
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{p.description}</p>
                </div>

                <button
                  type="button"
                  disabled={isSelected}
                  onClick={() => handleSelectPlanToUpgrade(p)}
                  className={`mt-4 w-full rounded-xl py-2 text-xs font-bold transition ${
                    isSelected
                      ? "border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-default"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] cursor-pointer"
                  }`}
                >
                  {isSelected ? "Active Plan" : `Upgrade to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </SettingsModal>

      {/* MODAL 2: STORAGE ADD-ONS */}
      <SettingsModal
        isOpen={isStorageAddonModalOpen}
        onClose={() => setIsStorageAddonModalOpen(false)}
        title="Add Storage Add-On"
        subtitle="Expand cloud video storage capacity seamlessly"
        icon={<HardDrive size={20} />}
        maxWidth="md"
      >
        <div className="space-y-3">
          {addons.map((addon) => {
            const price = billingCycle === "monthly" ? addon.price_monthly : addon.price_yearly;

            return (
              <div
                key={addon.code}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 text-xs bg-[var(--color-surface)]"
              >
                <div>
                  <span className="font-bold text-[var(--color-text-primary)]">{addon.name}</span>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    +{addon.storage_gb} GB Instant allocation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectAddonToPurchase(addon)}
                  className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 font-bold text-white hover:bg-[var(--color-primary-hover)] cursor-pointer"
                >
                  ${price}/{billingCycle === "monthly" ? "mo" : "yr"}
                </button>
              </div>
            );
          })}
        </div>
      </SettingsModal>

      {/* MODAL 3: CANCEL CONFIRMATION */}
      <SettingsModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
        subtitle="Are you sure you want to downgrade your VidNova plan?"
        icon={<AlertCircle size={20} />}
        maxWidth="sm"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] cursor-pointer"
            >
              Keep My Plan
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCancelModalOpen(false);
                toast.warning("Subscription Cancelled", "Plan features remain active until period end.");
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
            >
              Confirm Cancellation
            </button>
          </div>
        }
      >
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          If you cancel, your storage limit will revert to Free 5 GB on <b>{renewsDateFormatted}</b>.
        </p>
      </SettingsModal>

      {/* DEMO / HOSTED CHECKOUT MODAL */}
      <DemoCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        product={checkoutProduct}
        billingCycle={billingCycle}
        onPaymentSuccess={() => {
          loadBillingData();
        }}
      />
    </div>
  );
}

function roundGb(bytes: number): number {
  return Math.round(bytes / (1024 ** 3));
}
