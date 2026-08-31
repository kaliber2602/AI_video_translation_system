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

  const state =
    location.state as PasswordResetRouteState | null;

  if (!state?.email || !state?.resetToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7fcfc] px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-bold text-slate-900">
            Reset session expired
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Please request a new password reset code.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/forgot-password")
            }
            className="mt-6 h-11 rounded-xl bg-[#22c7a9] px-6 text-sm font-semibold text-white"
          >
            Request a new code
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = (otp: string) => {
    navigate("/reset-password", {
      state: {
        email: state.email,
        resetToken: state.resetToken,
        otp,
      } satisfies PasswordResetRouteState,
    });
  };

  return (
    <main
      data-theme="default_theme"
      className="flex min-h-screen items-center justify-center bg-[#f7fcfc] px-4 py-8 page-enter"
    >
      <div className="w-full max-w-[520px] rounded-2xl sm:rounded-3xl bg-white px-5 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-10 sm:py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22c7a9]/10">
          <ShieldCheck
            size={24}
            className="text-[#22c7a9]"
          />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
          Verify your email
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter the six-digit code we sent to your
          email address.
        </p>

        <OtpVerificationForm
          email={state.email}
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