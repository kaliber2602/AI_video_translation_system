import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api/axios";

export default function StripeReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<{
    is_success: boolean;
    message: string;
    transaction_code?: string;
    amount_usd?: number;
    session_id?: string;
  } | null>(null);

  useEffect(() => {
    const verifyStripeReturn = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(
          `/api/payments/stripe/return?${searchParams.toString()}`
        );
        const data = response.data;

        setResult({
          is_success: data.is_success ?? (data.status === "completed"),
          message: data.message || "Payment processed.",
          transaction_code: data.transaction_code || searchParams.get("txn") || undefined,
          amount_usd: data.amount_usd || (data.transaction?.amount ?? undefined),
          session_id: data.session_id || searchParams.get("session_id") || undefined,
        });
      } catch (err: any) {
        console.error("[StripeReturn] Verification error:", err);
        setResult({
          is_success: false,
          message: err?.response?.data?.detail || "Stripe payment verification failed or was cancelled.",
          transaction_code: searchParams.get("txn") || undefined,
          session_id: searchParams.get("session_id") || undefined,
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyStripeReturn();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-2xl transition-all">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 size={48} className="animate-spin text-[var(--color-primary)]" />
            <h3 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">
              Verifying Stripe Payment...
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Confirming global checkout session and activating your workspace limits.
            </p>
          </div>
        ) : result?.is_success ? (
          <div className="space-y-6 text-center">
            {/* Success Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
              <CheckCircle2 size={48} />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                <ShieldCheck size={14} /> Stripe Checkout Verified
              </span>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                Payment Successful!
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Your subscription tier and cloud storage quota have been upgraded.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-5 text-left text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                <span className="text-[var(--color-text-muted)]">Transaction Code</span>
                <span className="font-mono font-bold text-[var(--color-text-primary)]">
                  {result.transaction_code || "N/A"}
                </span>
              </div>

              {result.amount_usd !== undefined && (
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <span className="text-[var(--color-text-muted)]">Total Paid (USD)</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    ${result.amount_usd.toFixed(2)} USD
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                <span className="text-[var(--color-text-muted)]">Payment Gateway</span>
                <span className="font-bold text-[var(--color-text-primary)]">
                  Stripe (International Cards)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Status</span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-bold uppercase text-[10px] text-emerald-600">
                  COMPLETED
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/workspace/settings")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary)]/20 transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
              >
                <span>Go to Workspace & Billing</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/pricing")}
                className="w-full rounded-2xl bg-[var(--color-surface-muted)] py-3 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition cursor-pointer"
              >
                Back to Pricing Catalog
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            {/* Failed Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 ring-8 ring-rose-500/5">
              <XCircle size={48} />
            </div>

            <div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                Payment Incomplete
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {result?.message || "The Stripe checkout session was not completed or was cancelled."}
              </p>
            </div>

            {result?.transaction_code && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs">
                <span className="text-[var(--color-text-muted)]">Transaction Reference:</span>
                <span className="block font-mono font-bold text-[var(--color-text-primary)] mt-1">
                  {result.transaction_code}
                </span>
              </div>
            )}

            {/* Retry Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/pricing")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/workspace/settings")}
                className="w-full rounded-2xl bg-[var(--color-surface-muted)] py-3 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition cursor-pointer"
              >
                Return to Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
