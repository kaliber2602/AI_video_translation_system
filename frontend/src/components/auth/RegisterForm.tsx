import { useState } from "react";
import {
  Apple,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { register } from "../../services/auth.service";

export default function RegisterForm() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const [loading, setLoading] =
    useState(false);

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

    // -----------------------------
    // Client validation
    // -----------------------------

    if (!form.fullName.trim()) {
      setError(
        "Please enter your full name."
      );
      return;
    }

    if (form.fullName.trim().length < 2) {
      setError(
        "Full name must contain at least 2 characters."
      );
      return;
    }

    if (!form.email.trim()) {
      setError(
        "Please enter your email."
      );
      return;
    }

    if (!form.password) {
      setError(
        "Please enter a password."
      );
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (!/[A-Z]/.test(form.password)) {
      setError(
        "Password must contain an uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(form.password)) {
      setError(
        "Password must contain a lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(form.password)) {
      setError(
        "Password must contain a number."
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(form.password)) {
      setError(
        "Password must contain a special character."
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    // -----------------------------
    // API
    // -----------------------------

    try {
      setLoading(true);

      await register({
        full_name:
          form.fullName.trim(),

        email:
          form.email.trim().toLowerCase(),

        password:
          form.password,
      });

      // Register thành công
      navigate("/login");

    } catch (error: any) {
      console.error(
        "Register error:",
        error
      );

      const detail =
        error?.response?.data?.detail;

      // FastAPI validation error
      if (Array.isArray(detail)) {
        const messages = detail
          .map(
            (item: any) =>
              item?.msg
          )
          .filter(Boolean);

        setError(
          messages.length > 0
            ? messages.join(", ")
            : "Registration failed."
        );

        return;
      }

      // FastAPI custom error
      if (typeof detail === "string") {
        setError(detail);
        return;
      }

      // Network error
      if (
        error?.code ===
        "ERR_NETWORK"
      ) {
        setError(
          "Unable to connect to the server."
        );

        return;
      }

      setError(
        "Registration failed. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8"
    >
      {/* Full Name */}

      <div>
        <label className="mb-2 block text-xs font-semibold text-[#344454]">
          Full Name
        </label>

        <div className="relative">
          <User
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AAABD]"
          />

          <input
            type="text"
            value={form.fullName}
            onChange={(e) =>
              handleChange(
                "fullName",
                e.target.value
              )
            }
            placeholder="Nguyen Anh Tuan"
            disabled={loading}
            className="h-12 w-full rounded-xl border border-[#DDE6EC] bg-white pl-11 pr-4 text-sm text-[#344454] outline-none transition placeholder:text-[#9AA6B5] focus:border-[#20C5AE] focus:ring-4 focus:ring-[#20C5AE]/10 disabled:bg-slate-50"
          />
        </div>
      </div>

      {/* Email */}

      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold text-[#344454]">
          Email
        </label>

        <div className="relative">
          <Mail
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AAABD]"
          />

          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              handleChange(
                "email",
                e.target.value
              )
            }
            placeholder="name@example.com"
            disabled={loading}
            className="h-12 w-full rounded-xl border border-[#DDE6EC] bg-white pl-11 pr-4 text-sm text-[#344454] outline-none transition placeholder:text-[#9AA6B5] focus:border-[#20C5AE] focus:ring-4 focus:ring-[#20C5AE]/10 disabled:bg-slate-50"
          />
        </div>
      </div>

      {/* Password */}

      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold text-[#344454]">
          Password
        </label>

        <div className="relative">
          <LockKeyhole
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AAABD]"
          />

          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={form.password}
            onChange={(e) =>
              handleChange(
                "password",
                e.target.value
              )
            }
            placeholder="At least 8 characters"
            disabled={loading}
            className="h-12 w-full rounded-xl border border-[#DDE6EC] bg-white pl-11 pr-12 text-sm text-[#344454] outline-none transition placeholder:text-[#9AA6B5] focus:border-[#20C5AE] focus:ring-4 focus:ring-[#20C5AE]/10 disabled:bg-slate-50"
          />

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setShowPassword(
                (prev) => !prev
              )
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8FA0B0] transition hover:text-[#18BFA7]"
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Confirm Password */}

      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold text-[#344454]">
          Confirm Password
        </label>

        <div className="relative">
          <LockKeyhole
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AAABD]"
          />

          <input
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            value={
              form.confirmPassword
            }
            onChange={(e) =>
              handleChange(
                "confirmPassword",
                e.target.value
              )
            }
            placeholder="Re-enter your password"
            disabled={loading}
            className="h-12 w-full rounded-xl border border-[#DDE6EC] bg-white pl-11 pr-12 text-sm text-[#344454] outline-none transition placeholder:text-[#9AA6B5] focus:border-[#20C5AE] focus:ring-4 focus:ring-[#20C5AE]/10 disabled:bg-slate-50"
          />

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setShowConfirmPassword(
                (prev) => !prev
              )
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8FA0B0] transition hover:text-[#18BFA7]"
          >
            {showConfirmPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Terms */}

      <div className="mt-5 flex items-start gap-2">
        <input
          id="terms"
          type="checkbox"
          required
          disabled={loading}
          className="mt-0.5 h-4 w-4 rounded border-[#CBD8E1] accent-[#18C3AA]"
        />

        <label
          htmlFor="terms"
          className="text-xs leading-5 text-[#718398]"
        >
          I agree to the{" "}
          <button
            type="button"
            className="font-semibold text-[#18BFA7] hover:underline"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            className="font-semibold text-[#18BFA7] hover:underline"
          >
            Privacy Policy
          </button>
          .
        </label>
      </div>

      {/* Error */}

      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
          {error}
        </div>
      )}

      {/* Register */}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 h-12 w-full rounded-xl bg-[#20C5AE] text-sm font-bold text-white shadow-[0_8px_22px_rgba(32,197,174,0.24)] transition hover:-translate-y-0.5 hover:bg-[#12B49D] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Creating Account..."
          : "Create Account"}
      </button>

      {/* Divider */}

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#E2E8EC]" />

        <span className="text-xs text-[#8B9AAA]">
          Or continue with
        </span>

        <div className="h-px flex-1 bg-[#E2E8EC]" />
      </div>

      {/* Social */}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          className="flex h-11 items-center justify-center rounded-xl border border-[#DDE6EC] bg-white text-sm font-medium text-[#536475] transition hover:border-[#20C5AE] hover:bg-[#F7FCFB]"
        >
          Microsoft
        </button>

        <button
          type="button"
          disabled={loading}
          className="flex h-11 items-center justify-center rounded-xl border border-[#DDE6EC] bg-white text-[#263344] transition hover:border-[#20C5AE] hover:bg-[#F7FCFB]"
        >
          <Apple size={19} />
        </button>
      </div>

      {/* Login */}

      <div className="mt-7 text-center text-xs text-[#718398]">
        Already have an account?{" "}

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            navigate("/login")
          }
          className="font-semibold text-[#18BFA7] hover:underline"
        >
          Sign in
        </button>
      </div>
    </form>
  );
}