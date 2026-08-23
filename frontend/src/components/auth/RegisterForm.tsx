import { useState } from "react";
import {
  Apple,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { register } from "../../services/auth.service";
import { toast } from "../../lib/toast";

export default function RegisterForm() {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    // Client validation
    if (!form.fullName.trim()) {
      setError(t("auth:validation.fullNameRequired"));
      return;
    }

    if (form.fullName.trim().length < 2) {
      setError("Full name must contain at least 2 characters.");
      return;
    }

    if (!form.email.trim()) {
      setError(t("auth:validation.emailRequired"));
      return;
    }

    if (!form.password) {
      setError(t("auth:validation.passwordRequired"));
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(t("auth:validation.passwordsDoNotMatch"));
      return;
    }

    try {
      setLoading(true);

      await register({
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      toast.success(
        t("common:success"),
        "Account created successfully."
      );
      navigate("/login");
    } catch (error: any) {
      const detail = error?.response?.data?.detail;

      if (Array.isArray(detail)) {
        const messages = detail
          .map((item: any) => item?.msg)
          .filter(Boolean);
        toast.error(
          t("common:error"),
          messages.length > 0 ? messages.join(", ") : t("common:validationError")
        );
        return;
      }

      if (typeof detail === "string") {
        toast.error(t("common:error"), detail);
        return;
      }

      if (error?.code === "ERR_NETWORK") {
        toast.error(t("common:error"), t("common:networkError"));
        return;
      }

      toast.error(t("common:error"), t("common:serverError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4"
    >
      {/* Full Name */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
          {t("auth:fullName")}
        </label>

        <div className="relative">
          <User
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />

          <input
            type="text"
            value={form.fullName}
            onChange={(e) =>
              handleChange("fullName", e.target.value)
            }
            placeholder={t("auth:fullNamePlaceholder")}
            disabled={loading}
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-4 text-xs text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:bg-slate-50"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
          {t("auth:email")}
        </label>

        <div className="relative">
          <Mail
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />

          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              handleChange("email", e.target.value)
            }
            placeholder={t("auth:emailPlaceholder")}
            disabled={loading}
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-4 text-xs text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:bg-slate-50"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
          {t("auth:password")}
        </label>

        <div className="relative">
          <LockKeyhole
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />

          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={form.password}
            onChange={(e) =>
              handleChange("password", e.target.value)
            }
            placeholder={t("auth:passwordPlaceholder")}
            disabled={loading}
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-11 text-xs text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:bg-slate-50"
          />

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setShowPassword((prev) => !prev)
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

      {/* Confirm Password */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
          {t("auth:confirmPassword")}
        </label>

        <div className="relative">
          <LockKeyhole
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />

          <input
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            value={form.confirmPassword}
            onChange={(e) =>
              handleChange("confirmPassword", e.target.value)
            }
            placeholder={t("auth:passwordPlaceholder")}
            disabled={loading}
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-11 text-xs text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:bg-slate-50"
          />

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setShowConfirmPassword((prev) => !prev)
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

      {/* Terms */}
      <div className="flex items-start gap-2 pt-1">
        <input
          id="terms"
          type="checkbox"
          required
          disabled={loading}
          className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
        />

        <label
          htmlFor="terms"
          className="text-xs leading-5 text-[var(--color-text-muted)]"
        >
          I agree to the{" "}
          <button
            type="button"
            className="font-semibold text-[var(--color-primary)] hover:underline"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            className="font-semibold text-[var(--color-primary)] hover:underline"
          >
            Privacy Policy
          </button>
          .
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Register */}
      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white shadow-[0_8px_20px_rgba(21,194,168,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>{t("auth:creatingAccount")}</span>
          </>
        ) : (
          <span>{t("auth:createAccount")}</span>
        )}
      </button>

      {/* Divider */}
      <div className="my-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
          {t("auth:orContinueWith")}
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Social */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-secondary)] transition-all duration-200 ease-out hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
        >
          Microsoft
        </button>

        <button
          type="button"
          disabled={loading}
          aria-label="Sign up with Apple"
          className="flex h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-all duration-200 ease-out hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
        >
          <Apple size={17} />
        </button>
      </div>

      {/* Login */}
      <div className="pt-2 text-center text-xs text-[var(--color-text-muted)]">
        {t("auth:alreadyHaveAccount")}{" "}
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            navigate("/login")
          }
          className="font-bold text-[var(--color-primary)] hover:underline"
        >
          {t("auth:signInLink")}
        </button>
      </div>
    </form>
  );
}