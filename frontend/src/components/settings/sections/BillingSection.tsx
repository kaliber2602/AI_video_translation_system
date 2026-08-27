import { useState } from "react";
import { CreditCard, Sparkles, Download, Plus, Check, AlertCircle, HardDrive, Clock, PlusCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsBadge from "../common/SettingsBadge";
import SettingsTabs from "../common/SettingsTabs";
import SettingsModal from "../common/SettingsModal";
import SettingsInput from "../common/SettingsInput";
import { INITIAL_MOCK_SETTINGS, type PaymentCard, type InvoiceItem } from "../mock/settingsMockData";

export default function BillingSection() {
  const { t } = useTranslation(["settings", "common"]);

  const [billingCycle, setBillingCycle] = useState(INITIAL_MOCK_SETTINGS.billing.billingCycle);
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>(INITIAL_MOCK_SETTINGS.billing.paymentCards);
  const [invoices] = useState<InvoiceItem[]>(INITIAL_MOCK_SETTINGS.billing.invoices);

  // Modals
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isStorageAddonModalOpen, setIsStorageAddonModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Add card form state
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvc, setNewCardCvc] = useState("");
  const [newCardHolder, setNewCardHolder] = useState("");

  const handleDownloadInvoice = (invNumber: string) => {
    toast.success("Downloading Invoice", `Preparing ${invNumber}.pdf for download...`);
  };

  const handleAddCardSubmit = () => {
    if (!newCardNumber || !newCardExpiry || !newCardCvc) {
      toast.error("Missing Card Information", "Please enter valid credit card details.");
      return;
    }

    const last4 = newCardNumber.slice(-4) || "9988";
    const newCard: PaymentCard = {
      id: `card-${Date.now()}`,
      brand: "visa",
      last4,
      expiry: newCardExpiry,
      isDefault: false,
      holderName: newCardHolder || "Alex Morgan",
    };

    setPaymentCards([...paymentCards, newCard]);
    setIsAddCardModalOpen(false);
    setNewCardNumber("");
    setNewCardExpiry("");
    setNewCardCvc("");
    setNewCardHolder("");
    toast.success("Payment Method Added", `Visa ending in ${last4} was saved.`);
  };

  const handleSetDefaultCard = (id: string) => {
    setPaymentCards((cards) =>
      cards.map((c) => ({
        ...c,
        isDefault: c.id === id,
      }))
    );
    toast.success("Default Payment Updated", "Your primary payment card has been changed.");
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:billing.title", "Billing & Subscription")}
        subtitle={t(
          "settings:billing.subtitle",
          "Manage active tier subscription, monitor real-time pipeline quotas, invoices, and payment cards."
        )}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 1: CURRENT PLAN CARD */}
        <SettingCard
          title={t("settings:billing.planTitle", "Current Subscription")}
          description="Your workspace is currently subscribed to the VidNova Pro plan."
        >
          <div className="space-y-5">
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-[var(--color-text-primary)]">
                    VidNova Pro
                  </h4>
                  <SettingsBadge variant="success" size="sm" dot>
                    Active
                  </SettingsBadge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Renews on <b>Sep 27, 2026</b> via Visa •••• 4242
                </p>
              </div>

              <div className="text-right sm:self-center">
                <div className="text-2xl font-black text-[var(--color-primary)]">
                  ${billingCycle === "monthly" ? "12" : "120"}
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
                  { id: "monthly", label: "Monthly ($12/mo)" },
                  { id: "yearly", label: "Annual ($120/yr)", badge: "Save $24" },
                ]}
                activeTab={billingCycle}
                onChange={(tab) => {
                  setBillingCycle(tab as any);
                  toast.info("Cycle preference updated", `Switched to ${tab} billing.`);
                }}
                size="sm"
              />
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] active:scale-95"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Sparkles size={14} />
                  Change Plan Tier
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsStorageAddonModalOpen(true)}
                className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/20 px-3.5 py-2.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
              >
                <span className="flex items-center gap-1.5">
                  <PlusCircle size={14} />
                  +Add Storage
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
              >
                Cancel Plan
              </button>
            </div>
          </div>
        </SettingCard>

        {/* CARD 2: REAL-TIME QUOTAS & CONSUMABLES (Aligned with plan_resources) */}
        <SettingCard
          title={t("settings:billing.usageTitle", "Pipeline Quotas & AI Credits")}
          description="Real-time balance of monthly AI translation credits and storage allowances."
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
                  72.4 GB / 100 GB <span className="text-[var(--color-text-muted)]">(72.4%)</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full w-[72.4%] rounded-full bg-[var(--color-primary)] transition-all duration-500" />
              </div>
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                Pro Plan base 100 GB. Need more? Add +50GB to +1TB anytime.
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
                  6,420 / 10,000 <span className="text-[var(--color-text-muted)]">(64.2%)</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full w-[64.2%] rounded-full bg-blue-500 transition-all duration-500" />
              </div>
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                ~358 minutes of video translation remaining in this monthly cycle.
              </p>
            </div>

            {/* Job Concurrency & Projects Limit */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--color-border)]/60 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)] block text-[11px]">Max Concurrent Jobs</span>
                <span className="font-bold text-[var(--color-text-primary)]">3 Parallel Tasks</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block text-[11px]">Max Projects Capacity</span>
                <span className="font-bold text-[var(--color-text-primary)]">28 / 50 Active Projects</span>
              </div>
            </div>
          </div>
        </SettingCard>

        {/* CARD 3: PAYMENT METHODS */}
        <SettingCard
          title={t("settings:billing.paymentTitle", "Payment Methods")}
          description="Credit cards, Stripe, and localized payment gateways on file."
        >
          <div className="space-y-3">
            {paymentCards.map((card) => (
              <div
                key={card.id}
                className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                  card.isDefault
                    ? "border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/20"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {card.brand.toUpperCase()} •••• {card.last4}
                      </span>
                      {card.isDefault && (
                        <SettingsBadge variant="primary" size="sm">
                          Default
                        </SettingsBadge>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Expires {card.expiry} • {card.holderName}
                    </p>
                  </div>
                </div>

                {!card.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefaultCard(card.id)}
                    className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    Set Default
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setIsAddCardModalOpen(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/10"
            >
              <Plus size={14} />
              Add Payment Method (Stripe / VNPay / MoMo)
            </button>
          </div>
        </SettingCard>

        {/* CARD 4: INVOICE HISTORY */}
        <SettingCard
          title={t("settings:billing.invoicesTitle", "Invoices & Financial Audit")}
          description="Receipts for past subscription renewals and storage addons."
        >
          <div className="divide-y divide-[var(--color-border)]/60">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {inv.number}
                    </span>
                    <SettingsBadge variant="success" size="sm">
                      {inv.status.toUpperCase()}
                    </SettingsBadge>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    {inv.date} • {inv.plan}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {inv.amount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(inv.number)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                    title="Download PDF"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SettingCard>
      </div>

      {/* MODAL 1: PLAN TIERS (Exact database plans) */}
      <SettingsModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Subscription Plans Catalog"
        subtitle="Scale your monthly AI credits and storage allocation"
        icon={<Sparkles size={20} />}
        maxWidth="lg"
        footer={
          <button
            type="button"
            onClick={() => {
              setIsUpgradeModalOpen(false);
              toast.success("Plan Updated", "Your subscription tier was updated.");
            }}
            className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
          >
            Confirm Plan Selection
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {/* Free Tier */}
          <div className="rounded-xl border border-[var(--color-border)] p-4 text-left">
            <h5 className="font-bold text-sm text-[var(--color-text-primary)]">Free</h5>
            <p className="text-xl font-black mt-2 text-[var(--color-text-primary)]">$0</p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--color-text-muted)]">
              <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> 5 GB Cloud Storage</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> 1,000 AI Credits (~100 mins)</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> 720p HD Export</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> 1 Concurrent Job</li>
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 p-4 text-left relative">
            <div className="absolute top-2 right-2">
              <SettingsBadge variant="primary" size="sm">Current</SettingsBadge>
            </div>
            <h5 className="font-bold text-sm text-[var(--color-primary)]">VidNova Pro</h5>
            <p className="text-xl font-black mt-2 text-[var(--color-text-primary)]">$12<span className="text-xs font-normal">/mo</span></p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--color-text-primary)]">
              <li className="flex items-center gap-1.5"><Check size={12} className="text-[var(--color-primary)]" /> 100 GB Cloud Storage</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-[var(--color-primary)]" /> 10,000 AI Credits (~1,000 mins)</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-[var(--color-primary)]" /> 1080p Full HD Export</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-[var(--color-primary)]" /> 3 Concurrent Jobs</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-[var(--color-primary)]" /> Coqui XTTS Voice Cloning</li>
            </ul>
          </div>

          {/* Business Tier */}
          <div className="rounded-xl border border-[var(--color-border)] p-4 text-left">
            <h5 className="font-bold text-sm text-[var(--color-text-primary)]">Business</h5>
            <p className="text-xl font-black mt-2 text-[var(--color-text-primary)]">$49<span className="text-xs font-normal">/mo</span></p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--color-text-muted)]">
              <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> 1 TB Cloud Storage</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> 100,000 AI Credits (~10,000 mins)</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> 4K Ultra HD Export</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> 10 Concurrent Jobs</li>
              <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> ElevenLabs Voice API Key</li>
            </ul>
          </div>
        </div>
      </SettingsModal>

      {/* MODAL 2: STORAGE ADD-ONS (Exact database storage_addons) */}
      <SettingsModal
        isOpen={isStorageAddonModalOpen}
        onClose={() => setIsStorageAddonModalOpen(false)}
        title="Add Storage Add-On"
        subtitle="Expand your cloud footage storage capacity seamlessly"
        icon={<HardDrive size={20} />}
        maxWidth="md"
      >
        <div className="space-y-3">
          {[
            { code: "addon_50gb", name: "+50 GB Storage", price: "$2.00/mo" },
            { code: "addon_200gb", name: "+200 GB Storage", price: "$6.00/mo" },
            { code: "addon_500gb", name: "+500 GB Storage", price: "$10.00/mo" },
            { code: "addon_1tb", name: "+1 TB Storage", price: "$15.00/mo" },
          ].map((addon) => (
            <div
              key={addon.code}
              className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 text-xs"
            >
              <div>
                <span className="font-bold text-[var(--color-text-primary)]">{addon.name}</span>
                <p className="text-[11px] text-[var(--color-text-muted)]">Instant activation on current billing cycle</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStorageAddonModalOpen(false);
                  toast.success("Storage Add-on Activated", `Added ${addon.name} to workspace.`);
                }}
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 font-bold text-white hover:bg-[var(--color-primary-hover)]"
              >
                {addon.price}
              </button>
            </div>
          ))}
        </div>
      </SettingsModal>

      {/* MODAL 3: ADD PAYMENT CARD */}
      <SettingsModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        title="Add Payment Method"
        subtitle="Secured via Stripe with 256-bit encryption"
        icon={<CreditCard size={20} />}
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsAddCardModalOpen(false)}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCardSubmit}
              className="rounded-xl bg-[var(--color-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)]"
            >
              Save Card
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <SettingsInput
            label="Name on Card"
            placeholder="e.g. Alex Morgan"
            value={newCardHolder}
            onChange={setNewCardHolder}
          />
          <SettingsInput
            label="Card Number"
            placeholder="4242 •••• •••• 4242"
            value={newCardNumber}
            onChange={setNewCardNumber}
          />
          <div className="grid grid-cols-2 gap-3">
            <SettingsInput
              label="Expiry Date"
              placeholder="MM/YY"
              value={newCardExpiry}
              onChange={setNewCardExpiry}
            />
            <SettingsInput
              label="CVC / CVV"
              placeholder="123"
              type="password"
              value={newCardCvc}
              onChange={setNewCardCvc}
            />
          </div>
        </div>
      </SettingsModal>

      {/* MODAL 4: CANCEL CONFIRMATION */}
      <SettingsModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
        subtitle="Are you sure you want to cancel your VidNova Pro plan?"
        icon={<AlertCircle size={20} />}
        maxWidth="sm"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]"
            >
              Keep My Plan
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCancelModalOpen(false);
                toast.warning("Subscription Cancelled", "Access remains active until billing period end.");
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              Confirm Cancellation
            </button>
          </div>
        }
      >
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          If you cancel, your storage limit will downgrade to 5 GB and concurrent jobs to 1 stream on <b>Sep 27, 2026</b>.
        </p>
      </SettingsModal>
    </div>
  );
}
