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

  const state =
    location.state as PasswordResetRouteState | null;

  const [isSuccess, setIsSuccess] =
    useState(false);

  if (
    !state?.email ||
    !state?.resetToken ||
    !state?.otp
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7fcfc] px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-bold text-slate-900">
            Invalid reset session
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Please start the password recovery process
            again.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/forgot-password")
            }
            className="mt-6 h-11 rounded-xl bg-[#22c7a9] px-6 text-sm font-semibold text-white"
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
      otp: state.otp!,
      reset_token: state.resetToken,
      new_password: newPassword,
    });

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7fcfc] px-4 py-8">
        <div className="w-full max-w-[520px] rounded-3xl bg-white px-6 py-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#22c7a9]/10">
            <CheckCircle2
              size={32}
              className="text-[#22c7a9]"
            />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            Password reset successful
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your password has been changed successfully.
            You can now sign in with your new password.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/login")
            }
            className="mt-8 h-12 w-full rounded-xl bg-[#22c7a9] px-5 text-sm font-semibold text-white shadow-lg shadow-[#22c7a9]/20 transition-colors hover:bg-[#1fb397]"
          >
            Continue to Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fcfc] px-4 py-8">
      <div className="w-full max-w-[520px] rounded-3xl bg-white px-6 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22c7a9]/10">
          <Lock
            size={24}
            className="text-[#22c7a9]"
          />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
          Create a new password
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
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