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
      className="mt-8 space-y-6"
    >
      <div>
        <label
          htmlFor="reset-otp"
          className="mb-2 block text-sm font-medium text-slate-700"
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
          className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-2xl font-semibold tracking-[0.45em] text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-[#22c7a9] focus:ring-4 focus:ring-[#22c7a9]/10 disabled:bg-slate-50"
        />

        {error && (
          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      <p className="text-center text-sm text-slate-500">
        We sent a verification code to{" "}
        <span className="font-medium text-slate-700">
          {email}
        </span>
      </p>

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
            Continuing...
          </>
        ) : (
          "Verify code"
        )}
      </button>
    </form>
  );
}