import { useState } from "react";
import type { FormEvent } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Loader2,
} from "lucide-react";

interface ResetPasswordFormProps {
  onSubmit: (password: string) => Promise<void>;
}

export default function ResetPasswordForm({
  onSubmit,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset your password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4"
    >
      {/* New Password */}
      <div>
        <label
          htmlFor="new-password"
          className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]"
        >
          New password
        </label>

        <div className="relative">
          <Lock
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />

          <input
            id="new-password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            disabled={isSubmitting}
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-11 text-xs text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:bg-slate-50"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(!showPassword)
            }
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] transition-colors duration-150 ease-out hover:text-[var(--color-text-primary)]"
            aria-label="Toggle password visibility"
          >
            {showPassword ? (
              <EyeOff size={17} />
            ) : (
              <Eye size={17} />
            )}
          </button>
        </div>
      </div>

      {/* Confirm New Password */}
      <div>
        <label
          htmlFor="confirm-password"
          className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]"
        >
          Confirm new password
        </label>

        <div className="relative">
          <Lock
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />

          <input
            id="confirm-password"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value,
              )
            }
            disabled={isSubmitting}
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-11 text-xs text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:bg-slate-50"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                !showConfirmPassword,
              )
            }
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] transition-colors duration-150 ease-out hover:text-[var(--color-text-primary)]"
            aria-label="Toggle confirm password visibility"
          >
            {showConfirmPassword ? (
              <EyeOff size={17} />
            ) : (
              <Eye size={17} />
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-500">
          {error}
        </p>
      )}

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
            <span>Resetting...</span>
          </>
        ) : (
          <span>Reset password</span>
        )}
      </button>
    </form>
  );
}