import {
  Apple,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { login } from "../../services/auth.service";
import { setTokens } from "../../services/api/token";

export default function LoginForm() {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // HANDLE SUBMIT
  // =====================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    // ---------------------------------------------------
    // Client Validation
    // ---------------------------------------------------

    if (!email.trim()) {
      setError(t("auth:validation.emailRequired"));
      return;
    }

    if (!password) {
      setError(t("auth:validation.passwordRequired"));
      return;
    }

    // ---------------------------------------------------
    // CALL API
    // ---------------------------------------------------

    try {
      setLoading(true);

      const requestData = {
        email: email.trim().toLowerCase(),
        password,
      };

      const result = await login(requestData);

      if (!result?.access_token || !result?.refresh_token) {
        throw new Error("Login response does not contain required tokens.");
      }

      setTokens(result.access_token, result.refresh_token);

      navigate("/workspace", {
        state: {
          showWelcome: true,
        },
      });
    } catch (error: unknown) {
      const axiosError = error as any;
      const detail = axiosError?.response?.data?.detail;

      if (Array.isArray(detail)) {
        const messages = detail
          .map((item: any) => item?.msg)
          .filter(Boolean);
        setError(messages.length > 0 ? messages.join(", ") : t("common:unauthorized"));
        return;
      }

      if (typeof detail === "string") {
        setError(detail);
        return;
      }

      if (axiosError?.code === "ERR_NETWORK") {
        setError(t("common:networkError"));
        return;
      }

      if (axiosError?.code === "ECONNABORTED") {
        setError(t("common:timeoutError"));
        return;
      }

      if (axiosError?.response?.status === 401) {
        setError(t("common:unauthorized"));
        return;
      }

      if (axiosError?.response?.status === 422) {
        setError(t("common:validationError"));
        return;
      }

      if (axiosError?.response?.status >= 500) {
        setError(t("common:serverError"));
        return;
      }

      setError(axiosError?.message || t("common:unauthorized"));
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="flex w-full justify-center px-14">
      <div className="w-full max-w-[430px]">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
            LOGO
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-4xl font-bold text-slate-900">
          {t("auth:welcomeBack")}
        </h2>

        <p className="mt-3 text-center text-slate-500">
          {t("auth:signInSubtitle")}{" "}
          <span className="font-semibold">
            VidNova
          </span>
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-12 space-y-6"
        >
          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {t("auth:email")}
            </label>

            <div className="flex h-14 items-center rounded-xl border border-slate-200 bg-white px-4 transition-all duration-200 focus-within:border-[#22C7A9] focus-within:ring-2 focus-within:ring-[#22C7A9]/20">
              <Mail
                size={20}
                className="text-slate-400"
              />

              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder={t("auth:emailPlaceholder")}
                disabled={loading}
                className="ml-3 flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {t("auth:password")}
            </label>

            <div className="flex h-14 items-center rounded-xl border border-slate-200 bg-white px-4 transition-all duration-200 focus-within:border-[#22C7A9] focus-within:ring-2 focus-within:ring-[#22C7A9]/20">
              <Lock
                size={20}
                className="text-slate-400"
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder={t("auth:passwordPlaceholder")}
                disabled={loading}
                className="ml-3 flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-60"
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setShowPassword((prev) => !prev);
                }}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Remember */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => {
                  setRememberMe(event.target.checked);
                }}
                disabled={loading}
                className="accent-[#22C7A9]"
              />
              {t("auth:rememberMe")}
            </label>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                navigate("/forgot-password");
              }}
              className="font-medium text-[#22C7A9] hover:underline"
            >
              {t("auth:forgotPassword")}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Sign In */}
          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-xl bg-[#22C7A9] font-semibold text-white transition hover:bg-[#19b69a] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? t("auth:signingIn")
              : t("auth:signIn")}
          </button>
        </form>

        {/* Divider */}
        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-sm text-slate-400">
            {t("auth:orContinueWith")}
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Social */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className="flex h-14 items-center justify-center rounded-xl border border-slate-200 transition hover:border-[#22C7A9] hover:bg-[#F7FFFD]"
          >
            Microsoft
          </button>

          <button
            type="button"
            aria-label="Sign in with Apple"
            className="flex h-14 items-center justify-center rounded-xl border border-slate-200 transition hover:border-[#22C7A9] hover:bg-[#F7FFFD]"
          >
            <Apple />
          </button>
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-sm text-slate-500">
          {t("auth:dontHaveAccount")}
          <button
            type="button"
            onClick={() => {
              navigate("/register");
            }}
            className="ml-2 font-semibold text-[#22C7A9] hover:underline"
          >
            {t("auth:createOne")}
          </button>
        </p>
      </div>
    </div>
  );
}