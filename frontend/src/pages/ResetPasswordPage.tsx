import { useState } from "react";
import {
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import AuthBackLink from "../components/auth/AuthBackLink";
import ResetPasswordForm from "../components/auth/ResetPasswordForm";

import { resetPassword } from "../services/auth.service";

import type {
  PasswordResetRouteState,
} from "../types/auth";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Fallback to sessionStorage if page is refreshed
  const savedSession = sessionStorage.getItem("vidnova_reset_session");
  const parsedSession = savedSession ? JSON.parse(savedSession) : null;
  const effectiveState = (location.state as PasswordResetRouteState | null) || parsedSession;

  const [isSuccess, setIsSuccess] =
    useState(false);

  if (
    !effectiveState?.email ||
    !effectiveState?.resetToken ||
    !effectiveState?.otp
  ) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4"
      >
        <div className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Invalid reset session
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            Please start the password recovery process
            again.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/forgot-password")
            }
            className="mt-6 h-11 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
          >
            Start again
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = async (
    newPassword: string,
  ) => {
    await resetPassword({
      otp: effectiveState.otp!,
      reset_token: effectiveState.resetToken,
      new_password: newPassword,
    });

    // Clear saved session upon successful reset
    sessionStorage.removeItem("vidnova_reset_session");
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 py-8 page-enter"
      >
        <div className="w-full max-w-[520px] rounded-2xl sm:rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] px-5 py-8 text-center shadow-[var(--shadow-card)] sm:px-10 sm:py-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <CheckCircle2
              size={32}
            />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Password reset successful
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            Your password has been changed successfully.
            You can now sign in with your new password.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/login")
            }
            className="mt-8 h-12 w-full rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
          >
            Continue to Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 py-8 page-enter"
    >
      <div className="w-full max-w-[520px] rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] px-6 py-10 shadow-[var(--shadow-card)] sm:px-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Lock
            size={24}
          />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Create a new password
        </h1>

        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Choose a strong password for your account.
        </p>

        <ResetPasswordForm
          onSubmit={handleSubmit}
        />

        <div className="mt-8">
          <AuthBackLink
            to="/login"
            label="Back to Sign In"
          />
        </div>
      </div>
    </main>
  );
}