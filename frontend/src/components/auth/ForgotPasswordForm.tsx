import { useState } from "react";
import type { FormEvent } from "react";
import {
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
}

export default function ForgotPasswordForm({
  onSubmit,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(normalizedEmail);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process your request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 w-full space-y-5"
    >
      <div>
        <label
          htmlFor="forgot-password-email"
          className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]"
        >
          Email address
        </label>

        <div className="relative">
          <Mail
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />

          <input
            id="forgot-password-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            disabled={isSubmitting}
            required
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-4 text-xs text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        {error && (
          <p className="mt-2 text-xs font-semibold text-red-500">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-primary-soft)]/50 p-3.5">
        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-[var(--color-primary)]"
        />

        <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
          A six-digit verification code will be sent to
          your email address.
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(21,194,168,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2
              size={16}
              className="animate-spin"
            />
            <span>Sending...</span>
          </>
        ) : (
          <span>Send verification code</span>
        )}
      </button>
    </form>
  );
}