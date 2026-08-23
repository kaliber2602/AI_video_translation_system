import {
  Bell,
  ChevronDown,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getMe,
  logout,
} from "../../services/auth.service";
import { toast } from "../../lib/toast";

import { clearTokens } from "../../services/api/token";

import type { UserResponse } from "../../types/auth";

export default function WorkspaceTopbar() {
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [currentUser, setCurrentUser] =
    useState<UserResponse | null>(null);

  const [loadingUser, setLoadingUser] =
    useState(true);

  // =========================================================
  // Load current user
  // =========================================================

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        console.log(
          "[TOPBAR] Loading current user..."
        );

        const user = await getMe();

        console.log(
          "[TOPBAR] Current user:",
          user
        );

        setCurrentUser(user);
      } catch (error) {
        console.error(
          "[TOPBAR] Failed to load current user:",
          error
        );
      } finally {
        setLoadingUser(false);
      }
    };

    loadCurrentUser();
  }, []);

  // =========================================================
  // Helpers
  // =========================================================

  const getInitials = (
    fullName: string
  ): string => {
    const initials = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    return initials || "U";
  };

  const getAvatarSrc = (
    avatar: string | null | undefined
  ): string | null => {
    if (!avatar) {
      return null;
    }

    // Already a complete data URL.
    if (avatar.startsWith("data:image/")) {
      return avatar;
    }

    // Raw Base64 stored by backend.
    return `data:image/jpeg;base64,${avatar}`;
  };

  // =========================================================
  // Navigation
  // =========================================================

  const handleSettings = () => {
    setProfileOpen(false);
    navigate("/workspace/settings");
  };

  const handleWorkspace = () => {
    setProfileOpen(false);
    navigate("/workspace");
  };

  // =========================================================
  // Logout
  // =========================================================
  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    console.log(
      "%c========== LOGOUT START ==========",
      "color: orange; font-weight: bold;"
    );

    try {
      setLoggingOut(true);
      setProfileOpen(false);

      console.log(
        "[LOGOUT] Calling logout API..."
      );

      await logout();

      console.log(
        "[LOGOUT] Logout API success."
      );
    } catch (error) {
      console.error(
        "[LOGOUT] Logout API failed:",
        error
      );
    } finally {
      console.log(
        "[LOGOUT] Clearing access token and refresh token..."
      );

      clearTokens();

      console.log(
        "[LOGOUT] Tokens cleared."
      );

      // =====================================================
      // GOODBYE TOAST
      // =====================================================

      toast.info(
        `Goodbye, ${displayName}!`,
        "See you next time."
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));

      navigate("/login", {
        replace: true,
      });

      setLoggingOut(false);

      console.log(
        "%c========== LOGOUT END ==========",
        "color: orange; font-weight: bold;"
      );
    }
  };

  // =========================================================
  // User display data
  // =========================================================

  const displayName =
    currentUser?.full_name || "User";

  const displayEmail =
    currentUser?.email || "";
  const displayRole =
    currentUser?.role || "User";

  const avatarLetter =
    getInitials(displayName);

  const avatarSrc =
    getAvatarSrc(currentUser?.avatar);

  // =========================================================
  // Render
  // =========================================================

  return (
    <header className="sticky top-0 z-2 flex h-[84px] items-center border-b border-[var(--color-border-muted)] bg-[var(--color-surface)]/90 px-6 backdrop-blur-xl transition-colors duration-200 lg:px-8">

      {/* =====================================================
          LOGO
      ====================================================== */}

      <button
        type="button"
        onClick={handleWorkspace}
        className="flex w-[220px] shrink-0 items-center gap-3 text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
          >
            <circle
              cx="7"
              cy="16"
              r="3"
              fill="currentColor"
            />

            <circle
              cx="24"
              cy="8"
              r="3"
              fill="currentColor"
            />

            <circle
              cx="24"
              cy="24"
              r="3"
              fill="currentColor"
            />

            <path
              d="M9.5 15L21.5 9"
              stroke="currentColor"
              strokeWidth="2"
            />

            <path
              d="M9.5 17L21.5 23"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text-primary)]">
            VIDNOVA
          </h1>

          <p className="text-[10px] font-semibold tracking-[5px] text-[var(--color-primary)]">
            SINCE 2026
          </p>
        </div>
      </button>

      {/* =====================================================
          GLOBAL SEARCH
      ====================================================== */}

      <div className="mx-auto flex w-full max-w-[540px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2.5 shadow-sm">
        <Search
          size={19}
          className="text-[var(--color-text-muted)]"
        />

        <input
          type="text"
          placeholder="Search anything..."
          className="flex-1 bg-transparent px-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
        />

        <Search
          size={18}
          className="text-[var(--color-text-muted)]"
        />
      </div>

      {/* =====================================================
          ACTIONS
      ====================================================== */}

      <div className="ml-auto flex items-center gap-4">

        {/* NEW PROJECT */}

        <button
          type="button"
          onClick={() => navigate("/workspace")}
          className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={18} />
          New Project
        </button>

        {/* NOTIFICATION */}

        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition hover:bg-[var(--color-surface-muted)]"
        >
          <Bell
            size={19}
            className="text-[var(--color-text-secondary)]"
          />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
        </button>

        {/* =================================================
            PROFILE
        ================================================== */}

        <div className="relative">

          <button
            type="button"
            disabled={
              loggingOut || loadingUser
            }
            onClick={() =>
              setProfileOpen(
                (prev) => !prev
              )
            }
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
          >

            {/* TOPBAR AVATAR */}

            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[var(--color-avatar-bg)] text-sm font-bold text-[var(--color-avatar-text)]">

              {loadingUser ? (
                "..."
              ) : avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={`${displayName} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                avatarLetter
              )}

            </div>

            <ChevronDown
              size={17}
              className={`text-[var(--color-text-muted)] transition ${profileOpen
                  ? "rotate-180"
                  : ""
                }`}
            />

          </button>

          {/* =================================================
              DROPDOWN
          ================================================== */}

          {profileOpen && (
            <>

              {/* BACKDROP */}

              <button
                type="button"
                aria-label="Close profile menu"
                onClick={() =>
                  setProfileOpen(false)
                }
                className="fixed inset-0 z-40 cursor-default"
              />

              {/* DROPDOWN */}

              <div className="absolute right-0 top-[58px] z-50 w-[250px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">

                {/* =================================================
                    PROFILE HEADER
                ================================================== */}

                <div className="border-b border-[var(--color-border)] p-4">

                  <div className="flex items-center gap-3">

                    {/* DROPDOWN AVATAR */}

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-avatar-bg)] text-sm font-bold text-[var(--color-avatar-text)]">

                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={`${displayName} avatar`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        avatarLetter
                      )}

                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                        {displayName}
                      </p>

                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {displayEmail}
                      </p>

                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {displayRole}
                      </p>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    MENU
                ================================================== */}

                <div className="p-2">

                  <button
                    type="button"
                    onClick={handleWorkspace}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    <User size={17} />
                    My Workspace
                  </button>

                  <button
                    type="button"
                    onClick={handleSettings}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    <Settings size={17} />
                    Settings
                  </button>

                </div>

                {/* =================================================
                    LOGOUT
                ================================================== */}

                <div className="border-t border-[var(--color-border)] p-2">

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--color-danger)] transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    <LogOut size={17} />

                    {loggingOut
                      ? "Logging out..."
                      : "Log out"}

                  </button>

                </div>

              </div>
            </>
          )}

        </div>

      </div>
    </header>
  );
}