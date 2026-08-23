import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AuthBackLink from "../components/auth/AuthBackLink";
import ForgotPasswordForm from "../components/auth/ForgotPasswordForm";
import ForgotPasswordHero from "../components/auth/ForgotPasswordHero";
import { forgotPassword } from "../services/auth.service";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const handleSubmit = async (email: string) => {
    const response = await forgotPassword({
      email,
    });

    if (!response.reset_token) {
      throw new Error(
        "Unable to start the password reset process.",
      );
    }

    navigate("/verify-otp", {
      state: {
        email,
        resetToken: response.reset_token,
      },
    });
  };

  return (
    <main
      data-theme="default_theme"
      className="min-h-screen bg-[#f7fcfc] px-4 py-8 sm:px-6 lg:flex lg:items-center lg:justify-center lg:py-12 page-enter"
    >
      <div className="flex w-full max-w-[920px] overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <ForgotPasswordHero />

        <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-[54%] lg:px-14">
          <div className="mb-2 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#22c7a9] text-white">
              <Mail size={21} />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Forgot your password?
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
              Enter the email associated with your account
              and we&apos;ll send you a verification code.
            </p>
          </div>

          <ForgotPasswordForm
            onSubmit={handleSubmit}
          />

          <div className="mt-8">
            <AuthBackLink
              to="/login"
              label="Back to Sign In"
            />
          </div>
        </div>
      </div>
    </main>
  );
}