import { useState } from "react";
import {
  Sparkles,
  HardDrive,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "../../lib/toast";
import {
  createPaymentTransaction,
  simulateDemoSuccess,
  simulateDemoFail,
} from "../../services/payment.service";
import type { PaymentTransaction, PaymentMethod } from "../../types/payment";
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
  onPaymentSuccess,
}: DemoCheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("STRIPE");
  const [isCreatingTxn, setIsCreatingTxn] = useState(false);
  const [isProcessingDemo, setIsProcessingDemo] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState<PaymentTransaction | null>(null);
  const [simulationResult, setSimulationResult] = useState<{
    status: "success" | "failed";
    message: string;
  } | null>(null);

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
      setSimulationResult(null);

      const txn = await createPaymentTransaction({
        product_type: product.type,
        product_id: product.data.id,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
      });

      if ((paymentMethod === "VNPAY" || paymentMethod === "STRIPE") && txn.metadata?.payment_url) {
        const gatewayName = paymentMethod === "STRIPE" ? "Stripe Checkout" : "VNPay Gateway";
        toast.info(`Redirecting to ${gatewayName}`, `Opening secure payment gateway for ${txn.transaction_code}...`);
        window.location.href = txn.metadata.payment_url;
        return;
      }

      setActiveTransaction(txn);
      toast.info("Payment Transaction Created", `Transaction ${txn.transaction_code} is pending.`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Could not initialize checkout.";
      toast.error("Checkout Failed", msg);
    } finally {
      setIsCreatingTxn(false);
    }
  };

  const handleSimulateSuccess = async () => {
    if (!activeTransaction) return;
    try {
      setIsProcessingDemo(true);
      const res = await simulateDemoSuccess(activeTransaction.id);
      setActiveTransaction(res.transaction);
      setSimulationResult({
        status: "success",
        message: res.message || "Payment processed successfully! Entitlements activated.",
      });
      toast.success("Payment Successful", res.message);
      if (onPaymentSuccess) {
        onPaymentSuccess(res.transaction, res.activated_entitlement);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Payment simulation failed.";
      toast.error("Simulation Error", msg);
    } finally {
      setIsProcessingDemo(false);
    }
  };

  const handleSimulateFail = async () => {
    if (!activeTransaction) return;
    try {
      setIsProcessingDemo(true);
      const res = await simulateDemoFail(activeTransaction.id);
      setActiveTransaction(res.transaction);
      setSimulationResult({
        status: "failed",
        message: res.message || "Payment was marked as failed.",
      });
      toast.warning("Payment Failed", "Transaction status updated to failed.");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Payment simulation failed.";
      toast.error("Simulation Error", msg);
    } finally {
      setIsProcessingDemo(false);
    }
  };

  const handleResetModal = () => {
    setActiveTransaction(null);
    setSimulationResult(null);
    onClose();
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
                Secure checkout & instant entitlement activation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetModal}
            className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
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

          {/* 2. Transaction Active or Setup */}
          {!activeTransaction ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-2">
                  Select Payment Gateway
                </label>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {/* Option 1: Stripe */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("STRIPE")}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      paymentMethod === "STRIPE"
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 ring-1 ring-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        Stripe Cards
                      </span>
                      <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">
                        Global USD
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                      Visa, MasterCard, Amex, Apple Pay.
                    </p>
                  </button>

                  {/* Option 2: VNPay */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("VNPAY")}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      paymentMethod === "VNPAY"
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 ring-1 ring-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        VNPay (VND)
                      </span>
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                        Vietnam
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                      ATM, Banking QR & Thẻ Việt Nam.
                    </p>
                  </button>

                  {/* Option 3: Sandbox Simulator */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("DEMO")}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      paymentMethod === "DEMO"
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 ring-1 ring-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        Simulator
                      </span>
                      <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                        Dev / Staging
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                      Instant simulate success/fail.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-[var(--color-background)] p-3 text-xs text-[var(--color-text-muted)]">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span>PCI-DSS compliant hosted checkouts. No raw card data stored in VidNova.</span>
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
                    {paymentMethod === "STRIPE"
                      ? "Opening Stripe Checkout..."
                      : paymentMethod === "VNPAY"
                      ? "Redirecting to VNPay..."
                      : "Creating Transaction..."}
                  </>
                ) : (
                  <>
                    {paymentMethod === "STRIPE"
                      ? "Proceed to Stripe Checkout"
                      : paymentMethod === "VNPAY"
                      ? "Proceed to VNPay Gateway"
                      : "Open Payment Simulator"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Transaction Code Details */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Transaction Code</span>
                  <span className="font-mono font-bold text-[var(--color-text-primary)]">
                    {activeTransaction.transaction_code}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                      activeTransaction.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : activeTransaction.status === "failed"
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {activeTransaction.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Total Charged</span>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    ${activeTransaction.amount} {activeTransaction.currency}
                  </span>
                </div>
              </div>

              {/* Simulation Result Alert */}
              {simulationResult && (
                <div
                  className={`flex items-start gap-3 rounded-2xl p-4 text-xs ${
                    simulationResult.status === "success"
                      ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                  }`}
                >
                  {simulationResult.status === "success" ? (
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle size={18} className="shrink-0 text-rose-600" />
                  )}
                  <div>
                    <h5 className="font-bold">
                      {simulationResult.status === "success"
                        ? "Payment Approved & Activated"
                        : "Payment Simulation Failed"}
                    </h5>
                    <p className="mt-0.5 leading-relaxed">{simulationResult.message}</p>
                  </div>
                </div>
              )}

              {/* Demo Action Buttons */}
              {activeTransaction.status === "pending" && (
                <div className="space-y-3">
                  <p className="text-xs text-center font-medium text-[var(--color-text-secondary)]">
                    Simulate Payment Gateway Webhook / Callback:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleSimulateSuccess}
                      disabled={isProcessingDemo}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      {isProcessingDemo ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      Simulate Success
                    </button>

                    <button
                      type="button"
                      onClick={handleSimulateFail}
                      disabled={isProcessingDemo}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      {isProcessingDemo ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <XCircle size={15} />
                      )}
                      Simulate Failure
                    </button>
                  </div>
                </div>
              )}

              {/* Close Button when done */}
              {activeTransaction.status !== "pending" && (
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="w-full rounded-2xl bg-[var(--color-surface-muted)] py-3 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition"
                >
                  Done & Close
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
