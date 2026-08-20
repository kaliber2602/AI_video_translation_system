import {
  Apple,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../../services/auth.service";
import { setTokens } from "../../services/api/token";

export default function LoginForm() {
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================================
  // DEBUG - COMPONENT MOUNT
  // =====================================================

  console.log(
    "%c[LoginForm] Component rendered",
    "color: #22C7A9; font-weight: bold;"
  );

  // =====================================================
  // HANDLE SUBMIT
  // =====================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    // ---------------------------------------------------
    // 1. FORM SUBMIT
    // ---------------------------------------------------

    console.log(
      "%c========== LOGIN SUBMIT START ==========",
      "color: #22C7A9; font-weight: bold;"
    );

    console.log(
      "[LoginForm] Submit event:",
      event
    );

    event.preventDefault();

    console.log(
      "[LoginForm] preventDefault() executed"
    );

    // ---------------------------------------------------
    // 2. CURRENT FORM DATA
    // ---------------------------------------------------

    console.log(
      "[LoginForm] Email:",
      email
    );

    console.log(
      "[LoginForm] Password length:",
      password.length
    );

    console.log(
      "[LoginForm] Remember me:",
      rememberMe
    );

    setError("");

    // ---------------------------------------------------
    // 3. CLIENT VALIDATION
    // ---------------------------------------------------

    console.log(
      "[LoginForm] Starting validation..."
    );

    if (!email.trim()) {
      console.warn(
        "[LoginForm] Validation failed: email is empty"
      );

      setError(
        "Please enter your email."
      );

      return;
    }

    console.log(
      "[LoginForm] Email validation passed"
    );

    if (!password) {
      console.warn(
        "[LoginForm] Validation failed: password is empty"
      );

      setError(
        "Please enter your password."
      );

      return;
    }

    console.log(
      "[LoginForm] Password validation passed"
    );

    // ---------------------------------------------------
    // 4. VALIDATION SUCCESS
    // ---------------------------------------------------

    console.log(
      "%c[LoginForm] Validation PASSED",
      "color: green; font-weight: bold;"
    );

    // ---------------------------------------------------
    // 5. PREPARE REQUEST DATA
    // ---------------------------------------------------

    const requestData = {
      email: email.trim().toLowerCase(),
      password,
    };

    console.log(
      "[LoginForm] Request data prepared:",
      {
        email: requestData.email,
        passwordLength:
          requestData.password.length,
      }
    );

    // ---------------------------------------------------
    // 6. CALL API
    // ---------------------------------------------------

    try {
      setLoading(true);

      console.log(
        "%c[LoginForm] Calling login()...",
        "color: #2196F3; font-weight: bold;"
      );

      const startTime = performance.now();

      const result = await login(
        requestData
      );

      const endTime = performance.now();

      console.log(
        `%c[LoginForm] login() resolved in ${(
          endTime - startTime
        ).toFixed(2)} ms`,
        "color: green; font-weight: bold;"
      );

      // -------------------------------------------------
      // 7. API RESPONSE
      // -------------------------------------------------

      console.log(
        "[LoginForm] Login response:",
        result
      );

      console.log(
        "[LoginForm] access_token exists:",
        Boolean(result?.access_token)
      );

      console.log(
        "[LoginForm] refresh_token exists:",
        Boolean(result?.refresh_token)
      );

      console.log(
        "[LoginForm] token_type:",
        result?.token_type
      );

      // -------------------------------------------------
      // 8. VALIDATE RESPONSE
      // -------------------------------------------------

      if (!result?.access_token) {
        console.error(
          "[LoginForm] Missing access_token in response"
        );

        throw new Error(
          "Login response does not contain access_token."
        );
      }

      if (!result?.refresh_token) {
        console.error(
          "[LoginForm] Missing refresh_token in response"
        );

        throw new Error(
          "Login response does not contain refresh_token."
        );
      }

      // -------------------------------------------------
      // 9. SAVE TOKENS
      // -------------------------------------------------

      console.log(
        "%c[LoginForm] Saving tokens...",
        "color: #9C27B0; font-weight: bold;"
      );

      setTokens(
        result.access_token,
        result.refresh_token
      );

      console.log(
        "[LoginForm] Tokens saved successfully"
      );

      // -------------------------------------------------
      // 10. CHECK TOKEN STORAGE
      // -------------------------------------------------

      try {
        const accessToken =
          localStorage.getItem(
            "access_token"
          );

        const refreshToken =
          localStorage.getItem(
            "refresh_token"
          );

        console.log(
          "[LoginForm] localStorage access_token exists:",
          Boolean(accessToken)
        );

        console.log(
          "[LoginForm] localStorage refresh_token exists:",
          Boolean(refreshToken)
        );
      } catch (storageError) {
        console.warn(
          "[LoginForm] Could not inspect localStorage:",
          storageError
        );
      }

      // -------------------------------------------------
      // 11. NAVIGATION
      // -------------------------------------------------

      console.log(
        "%c[LoginForm] Login successful",
        "color: green; font-weight: bold;"
      );

      console.log(
        "[LoginForm] Navigating to /workspace..."
      );

      navigate("/workspace");

      console.log(
        "[LoginForm] navigate('/workspace') called"
      );

    } catch (error: unknown) {
      // -------------------------------------------------
      // 12. API ERROR
      // -------------------------------------------------

      console.error(
        "%c========== LOGIN ERROR ==========",
        "color: red; font-weight: bold;"
      );

      console.error(
        "[LoginForm] Raw error:",
        error
      );

      // -------------------------------------------------
      // Axios error inspection
      // -------------------------------------------------

      const axiosError =
        error as any;

      console.error(
        "[LoginForm] Error name:",
        axiosError?.name
      );

      console.error(
        "[LoginForm] Error message:",
        axiosError?.message
      );

      console.error(
        "[LoginForm] Error code:",
        axiosError?.code
      );

      console.error(
        "[LoginForm] Error response:",
        axiosError?.response
      );

      console.error(
        "[LoginForm] Error response status:",
        axiosError?.response?.status
      );

      console.error(
        "[LoginForm] Error response data:",
        axiosError?.response?.data
      );

      console.error(
        "[LoginForm] Error request:",
        axiosError?.request
      );

      console.error(
        "[LoginForm] Error config:",
        axiosError?.config
      );

      // -------------------------------------------------
      // FastAPI detail
      // -------------------------------------------------

      const detail =
        axiosError?.response?.data?.detail;

      console.log(
        "[LoginForm] FastAPI detail:",
        detail
      );

      // -------------------------------------------------
      // FastAPI validation error
      // -------------------------------------------------

      if (Array.isArray(detail)) {
        console.warn(
          "[LoginForm] FastAPI validation error"
        );

        const messages = detail
          .map(
            (item: any) =>
              item?.msg
          )
          .filter(Boolean);

        console.log(
          "[LoginForm] Validation messages:",
          messages
        );

        setError(
          messages.length > 0
            ? messages.join(", ")
            : "Login failed."
        );

        return;
      }

      // -------------------------------------------------
      // FastAPI custom error
      // -------------------------------------------------

      if (typeof detail === "string") {
        console.warn(
          "[LoginForm] FastAPI custom error:",
          detail
        );

        setError(detail);

        return;
      }

      // -------------------------------------------------
      // Network error
      // -------------------------------------------------

      if (
        axiosError?.code ===
        "ERR_NETWORK"
      ) {
        console.error(
          "[LoginForm] Network error"
        );

        setError(
          "Unable to connect to the server."
        );

        return;
      }

      // -------------------------------------------------
      // Timeout
      // -------------------------------------------------

      if (
        axiosError?.code ===
        "ECONNABORTED"
      ) {
        console.error(
          "[LoginForm] Request timeout"
        );

        setError(
          "The server took too long to respond."
        );

        return;
      }

      // -------------------------------------------------
      // HTTP status errors
      // -------------------------------------------------

      if (
        axiosError?.response?.status === 401
      ) {
        console.warn(
          "[LoginForm] HTTP 401 Unauthorized"
        );

        setError(
          "Invalid email or password."
        );

        return;
      }

      if (
        axiosError?.response?.status === 422
      ) {
        console.warn(
          "[LoginForm] HTTP 422 Validation Error"
        );

        setError(
          "Please check your email and password."
        );

        return;
      }

      if (
        axiosError?.response?.status >= 500
      ) {
        console.error(
          "[LoginForm] Backend server error"
        );

        setError(
          "Server error. Please try again later."
        );

        return;
      }

      // -------------------------------------------------
      // Unknown error
      // -------------------------------------------------

      console.error(
        "[LoginForm] Unknown login error"
      );

      setError(
        axiosError?.message ||
          "Invalid email or password."
      );

    } finally {
      // -------------------------------------------------
      // 13. FINALLY
      // -------------------------------------------------

      console.log(
        "[LoginForm] Setting loading = false"
      );

      setLoading(false);

      console.log(
        "%c========== LOGIN SUBMIT END ==========",
        "color: #22C7A9; font-weight: bold;"
      );
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
          Welcome Back
        </h2>

        <p className="mt-3 text-center text-slate-500">
          Sign in to continue to{" "}
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
              Email
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
                  console.log(
                    "[LoginForm] Email changed:",
                    event.target.value
                  );

                  setEmail(
                    event.target.value
                  );

                  setError("");
                }}
                placeholder="name@example.com"
                disabled={loading}
                className="ml-3 flex-1 bg-transparent outline-none disabled:opacity-60"
              />

            </div>
          </div>

          {/* Password */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
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
                  console.log(
                    "[LoginForm] Password changed. Length:",
                    event.target.value.length
                  );

                  setPassword(
                    event.target.value
                  );

                  setError("");
                }}
                placeholder="••••••••"
                disabled={loading}
                className="ml-3 flex-1 bg-transparent outline-none disabled:opacity-60"
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  console.log(
                    "[LoginForm] Toggle password visibility"
                  );

                  setShowPassword(
                    (prev) => !prev
                  );
                }}
                className="text-slate-400 hover:text-slate-600"
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
                  console.log(
                    "[LoginForm] Remember me:",
                    event.target.checked
                  );

                  setRememberMe(
                    event.target.checked
                  );
                }}
                disabled={loading}
                className="accent-[#22C7A9]"
              />

              Remember me
            </label>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                console.log(
                  "[LoginForm] Forgot password clicked"
                );
              }}
              className="font-medium text-[#22C7A9] hover:underline"
            >
              Forgot Password?
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
            onClick={() => {
              console.log(
                "%c[LoginForm] Sign In button clicked",
                "color: orange; font-weight: bold;"
              );
            }}
            className="h-14 w-full rounded-xl bg-[#22C7A9] font-semibold text-white transition hover:bg-[#19b69a] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

        </form>

        {/* Divider */}

        <div className="my-10 flex items-center gap-4">

          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-sm text-slate-400">
            Or continue with
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
            className="flex h-14 items-center justify-center rounded-xl border border-slate-200 transition hover:border-[#22C7A9] hover:bg-[#F7FFFD]"
          >
            <Apple />
          </button>

        </div>

        {/* Footer */}

        <p className="mt-10 text-center text-sm text-slate-500">

          Don't have an account?

          <button
            type="button"
            onClick={() => {
              console.log(
                "[LoginForm] Navigate to /register"
              );

              navigate("/register");
            }}
            className="ml-2 font-semibold text-[#22C7A9] hover:underline"
          >
            Create one
          </button>

        </p>

      </div>
    </div>
  );
}