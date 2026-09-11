import { useState } from "react";
import {
  Sparkles,
  HardDrive,
  Loader2,
  X,
  ShieldCheck,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { toast } from "../../lib/toast";
import { createPaymentTransaction } from "../../services/payment.service";
import type { PaymentTransaction } from "../../types/payment";
import type { BillingCycle, Plan, StorageAddon } from "../../types/subscription";

export interface DemoCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    type: "PLAN" | "STORAGE_ADDON";
    data: Plan | StorageAddon;
  } | null;
  billingCycle: BillingCycle;
  onPaymentSuccess?: (transaction: PaymentTransaction, entitlement: any) => void;
}

export default function DemoCheckoutModal({
  isOpen,
  onClose,
  product,
  billingCycle,
}: DemoCheckoutModalProps) {
  const [isCreatingTxn, setIsCreatingTxn] = useState(false);

  if (!isOpen || !product) return null;

  const isPlan = product.type === "PLAN";
  const planData = isPlan ? (product.data as Plan) : null;
  const addonData = !isPlan ? (product.data as StorageAddon) : null;

  const productName = isPlan ? planData?.name : addonData?.name;
  const price = isPlan
    ? billingCycle === "monthly"
      ? planData?.price_monthly
      : planData?.price_yearly
    : billingCycle === "monthly"
    ? addonData?.price_monthly
    : addonData?.price_yearly;

  const handleStartCheckout = async () => {
    try {
      setIsCreatingTxn(true);

      const txn = await createPaymentTransaction({
        product_type: product.type,
        product_id: product.data.id,
        billing_cycle: billingCycle,
        payment_method: "VNPAY",
      });

      if (txn.metadata?.payment_url) {
        toast.info("Redirecting to VNPay", `Opening secure VNPay payment gateway for ${txn.transaction_code}...`);
        window.location.href = txn.metadata.payment_url;
        return;
      }

      toast.info("Payment Transaction Created", `Transaction ${txn.transaction_code} is pending.`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Could not initialize VNPay checkout.";
      toast.error("Checkout Failed", msg);
    } finally {
      setIsCreatingTxn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface-muted)]/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              {isPlan ? <Sparkles size={20} /> : <HardDrive size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {isPlan ? "Upgrade Subscription" : "Add Storage Add-on"}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Secure checkout via VNPay & instant entitlement activation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 1. Order Summary Card */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  Selected Item
                </span>
                <h4 className="text-lg font-black text-[var(--color-text-primary)]">
                  {productName}
                </h4>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Billing: <span className="font-semibold capitalize text-[var(--color-text-secondary)]">{billingCycle}</span>
                  {billingCycle === "yearly" && " (Billed Annually)"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[var(--color-primary)]">
                  ${price}
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  USD / {billingCycle === "yearly" ? "year" : "month"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Payment Gateway Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-2">
                Payment Method
              </label>
              <div className="flex items-center justify-between rounded-2xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 p-4 ring-1 ring-[var(--color-primary)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)]">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        VNPay Gateway
                      </span>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        Official Gateway
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Supports VNPAY-QR, Domestic ATM & International Cards (Visa / Master / JCB).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-[var(--color-background)] p-3 text-xs text-[var(--color-text-muted)]">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <span>PCI-DSS compliant VNPay hosted checkout. No card numbers are stored on our servers.</span>
            </div>

            <button
              type="button"
              onClick={handleStartCheckout}
              disabled={isCreatingTxn}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary)]/20 transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer"
            >
              {isCreatingTxn ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Connecting to VNPay...</span>
                </>
              ) : (
                <>
                  <span>Proceed to VNPay Checkout</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

