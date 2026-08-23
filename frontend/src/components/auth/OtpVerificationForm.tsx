import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";

interface OtpVerificationFormProps {
  email: string;
  onSubmit: (otp: string) => void;
}

export default function OtpVerificationForm({
  email,
  onSubmit,
}: OtpVerificationFormProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (value: string) => {
    const numericValue = value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(numericValue);
    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (otp.length !== 6) {
      setError(
        "Please enter the 6-digit verification code.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      onSubmit(otp);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-5"
    >
      <div>
        <label
          htmlFor="reset-otp"
          className="mb-1.5 block text-center text-xs font-semibold text-[var(--color-text-secondary)]"
        >
          Verification code
        </label>

        <input
          id="reset-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(event) =>
            handleChange(event.target.value)
          }
          disabled={isSubmitting}
          className="h-14 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-center text-2xl font-bold tracking-[0.45em] text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-text-muted)]/40 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:bg-slate-50"
        />

        {error && (
          <p className="mt-2 text-center text-xs font-semibold text-red-500">
            {error}
          </p>
        )}
      </div>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        We sent a verification code to{" "}
        <span className="font-semibold text-[var(--color-text-primary)]">
          {email}
        </span>
      </p>

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
            <span>Continuing...</span>
          </>
        ) : (
          <span>Verify code</span>
        )}
      </button>
    </form>
  );
}