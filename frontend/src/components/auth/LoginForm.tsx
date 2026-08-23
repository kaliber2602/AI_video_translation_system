import {
  Apple,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { login } from "../../services/auth.service";
import { setTokens } from "../../services/api/token";
import AuthBrand from "./AuthBrand";

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
    <div className="flex w-full justify-center px-4 sm:px-8">
      <div className="w-full max-w-[430px]">
        {/* Brand Header */}
        <div className="mb-8 flex justify-center">
          <AuthBrand />
        </div>

        {/* Title */}
        <h2 className="text-center text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
          {t("auth:welcomeBack")}
        </h2>

        <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
          {t("auth:signInSubtitle")}{" "}
          <span className="font-semibold text-[var(--color-primary)]">
            VidNova
          </span>
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              {t("auth:email")}
            </label>

            <div className="flex h-12 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3.5 transition-all duration-200 ease-out focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary)]/10">
              <Mail
                size={18}
                className="text-[var(--color-text-muted)]"
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
                className="ml-3 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              {t("auth:password")}
            </label>

            <div className="flex h-12 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3.5 transition-all duration-200 ease-out focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary)]/10">
              <Lock
                size={18}
                className="text-[var(--color-text-muted)]"
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
                className="ml-3 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none disabled:opacity-60"
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setShowPassword((prev) => !prev);
                }}
                className="text-[var(--color-text-muted)] transition-colors duration-150 ease-out hover:text-[var(--color-text-primary)]"
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
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => {
                  setRememberMe(event.target.checked);
                }}
                disabled={loading}
                className="accent-[var(--color-primary)] h-4 w-4 rounded"
              />
              <span>{t("auth:rememberMe")}</span>
            </label>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                navigate("/forgot-password");
              }}
              className="font-semibold text-[var(--color-primary)] transition hover:underline"
            >
              {t("auth:forgotPassword")}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white shadow-[0_8px_20px_rgba(21,194,168,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{t("auth:signingIn")}</span>
              </>
            ) : (
              <span>{t("auth:signIn")}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {t("auth:orContinueWith")}
          </span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        {/* Social */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-secondary)] transition-all duration-200 ease-out hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
          >
            Microsoft
          </button>

          <button
            type="button"
            aria-label="Sign in with Apple"
            className="flex h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-all duration-200 ease-out hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
          >
            <Apple size={18} />
          </button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
          {t("auth:dontHaveAccount")}
          <button
            type="button"
            onClick={() => {
              navigate("/register");
            }}
            className="ml-1.5 font-bold text-[var(--color-primary)] hover:underline"
          >
            {t("auth:createOne")}
          </button>
        </p>
      </div>
    </div>
  );
}