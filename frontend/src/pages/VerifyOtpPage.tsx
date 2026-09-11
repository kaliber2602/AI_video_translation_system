import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import AuthBackLink from "../components/auth/AuthBackLink";
import OtpVerificationForm from "../components/auth/OtpVerificationForm";

import type {
  PasswordResetRouteState,
} from "../types/auth";

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Fallback to sessionStorage if user reloads page
  const savedSession = sessionStorage.getItem("vidnova_reset_session");
  const parsedSession = savedSession ? JSON.parse(savedSession) : null;
  const effectiveState = (location.state as PasswordResetRouteState | null) || parsedSession;

  useEffect(() => {
    if (location.state) {
      sessionStorage.setItem("vidnova_reset_session", JSON.stringify(location.state));
    }
  }, [location.state]);

  if (!effectiveState?.email || !effectiveState?.resetToken) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4"
      >
        <div className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Reset session expired
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            Please request a new password reset code.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/forgot-password")
            }
            className="mt-6 h-11 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
          >
            Request a new code
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = (otp: string) => {
    const nextState: PasswordResetRouteState = {
      email: effectiveState.email,
      resetToken: effectiveState.resetToken,
      otp,
    };
    sessionStorage.setItem("vidnova_reset_session", JSON.stringify(nextState));
    navigate("/reset-password", {
      state: nextState,
    });
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 py-8 page-enter"
    >
      <div className="w-full max-w-[520px] rounded-2xl sm:rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] px-5 py-8 shadow-[var(--shadow-card)] sm:px-10 sm:py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <ShieldCheck
            size={24}
          />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Verify your email
        </h1>

        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Enter the six-digit code we sent to your
          email address.
        </p>

        <OtpVerificationForm
          email={effectiveState.email}
          onSubmit={handleSubmit}
        />

        <div className="mt-8">
          <AuthBackLink
            to="/forgot-password"
            label="Use a different email"
          />
        </div>
      </div>
    </main>
  );
}