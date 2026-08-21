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
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to process your request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 w-full space-y-6"
    >
      <div>
        <label
          htmlFor="forgot-password-email"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Email address
        </label>

        <div className="relative">
          <Mail
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
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
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#22c7a9] focus:ring-4 focus:ring-[#22c7a9]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-[#22c7a9]/5 p-4">
        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-[#22c7a9]"
        />

        <p className="text-sm leading-5 text-slate-500">
          A six-digit verification code will be sent to
          your email address.
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#22c7a9] px-5 text-sm font-semibold text-white shadow-lg shadow-[#22c7a9]/20 transition-all hover:bg-[#1fb397] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2
              size={18}
              className="animate-spin"
            />
            Sending...
          </>
        ) : (
          "Send verification code"
        )}
      </button>
    </form>
  );
}