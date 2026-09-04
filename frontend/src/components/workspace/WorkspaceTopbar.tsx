import {
  Bell,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  getMe,
  logout,
} from "../../services/auth.service";
import { getMySubscriptionSummary } from "../../services/subscription.service";
import { toast } from "../../lib/toast";

import { clearTokens } from "../../services/api/token";

import type { UserResponse } from "../../types/auth";
import type { UserSubscriptionSummary } from "../../types/subscription";

interface WorkspaceTopbarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onToggleMobileSidebar?: () => void;
}

export default function WorkspaceTopbar({
  isCollapsed = false,
  onToggleCollapse,
  onToggleMobileSidebar,
}: WorkspaceTopbarProps = {}) {
  const { t } = useTranslation(["navigation", "common", "workspace", "settings"]);
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [currentUser, setCurrentUser] =
    useState<UserResponse | null>(null);
  const [subscriptionSummary, setSubscriptionSummary] =
    useState<UserSubscriptionSummary | null>(null);

  const [loadingUser, setLoadingUser] =
    useState(true);

  // =========================================================
  // Load current user & subscription
  // =========================================================

  useEffect(() => {
    const loadCurrentUserAndSubscription = async () => {
      try {
        console.log(
          "[TOPBAR] Loading current user & subscription..."
        );

        const [user, sub] = await Promise.all([
          getMe().catch(() => null),
          getMySubscriptionSummary().catch(() => null),
        ]);

        if (user) setCurrentUser(user);
        if (sub) setSubscriptionSummary(sub);
      } catch (error) {
        console.error(
          "[TOPBAR] Failed to load user or subscription:",
          error
        );
      } finally {
        setLoadingUser(false);
      }
    };

    loadCurrentUserAndSubscription();

    const handleSubscriptionRefresh = () => {
      getMySubscriptionSummary()
        .then((sub) => setSubscriptionSummary(sub))
        .catch((err) => console.error("[TOPBAR] Refresh error:", err));
    };

    window.addEventListener("subscription-updated", handleSubscriptionRefresh);
    return () => {
      window.removeEventListener("subscription-updated", handleSubscriptionRefresh);
    };
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

      navigate("/", {
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

  const currentPlan = subscriptionSummary?.subscription;
  const planCode = currentPlan?.plan_code || "free";
  const planName = currentPlan?.plan_name || (planCode === "pro" ? "Pro" : planCode === "business" ? "Business" : "Free");

  // =========================================================
  // Render
  // =========================================================

  return (
    <header className="sticky top-0 z-30 flex h-[72px] sm:h-[84px] items-center border-b border-[var(--color-border-muted)] liquid-glass px-4 sm:px-6 backdrop-blur-xl transition-colors duration-200 lg:px-8">

      {/* Mobile Sidebar Hamburger Button */}
      {onToggleMobileSidebar && (
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Open navigation menu"
          className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] shadow-xs transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:scale-95 lg:hidden"
        >
          <Menu size={20} />
        </button>
      )}

      {/* =====================================================
          LOGO
      ====================================================== */}

      <button
        type="button"
        onClick={handleWorkspace}
        className="flex shrink-0 items-center gap-2.5 sm:gap-3 text-left lg:w-[220px]"
      >
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="none"
            className="sm:h-7 sm:w-7"
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
          <h1 className="text-lg sm:text-[22px] font-bold tracking-tight text-[var(--color-text-primary)]">
            VIDNOVA
          </h1>

          <p className="hidden sm:block text-[10px] font-semibold tracking-[5px] text-[var(--color-primary)]">
            SINCE 2026
          </p>
        </div>
      </button>

      {/* =====================================================
          GLOBAL SEARCH
      ====================================================== */}

      <div className="mx-3 sm:mx-auto hidden md:flex w-full max-w-[540px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 sm:py-2.5 shadow-sm">
        <Search
          size={18}
          className="text-[var(--color-text-muted)] shrink-0"
        />

        <input
          type="text"
          placeholder={t("common:searchPlaceholder")}
          className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
        />
      </div>

      {/* =====================================================
          ACTIONS
      ====================================================== */}

      <div className="ml-auto flex items-center gap-2 sm:gap-4">

        {/* NOTIFICATION */}

        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition hover:bg-[var(--color-surface-muted)]"
          aria-label="Notifications"
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
            className="flex items-center gap-2 sm:gap-3 rounded-2xl p-1 sm:px-2.5 sm:py-1.5 transition hover:bg-[var(--color-surface-muted)] disabled:opacity-60 border border-transparent hover:border-[var(--color-border)]"
          >

            {/* TOPBAR AVATAR + TIER BADGE */}
            <div className="relative">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center overflow-hidden rounded-full bg-[var(--color-avatar-bg)] text-sm font-bold text-[var(--color-avatar-text)] shadow-xs">
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

              {planCode === "pro" && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs ring-2 ring-[var(--color-surface)]"
                  title="Pro Tier"
                >
                  <Crown size={9} />
                </span>
              )}
              {planCode === "business" && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-white shadow-xs ring-2 ring-[var(--color-surface)]"
                  title="Business Tier"
                >
                  <Sparkles size={9} />
                </span>
              )}
            </div>

            {/* User info on desktop */}
            <div className="hidden sm:flex flex-col items-start text-left">
              <span className="text-xs font-bold leading-tight text-[var(--color-text-primary)]">
                {displayName}
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  planCode === "pro"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : planCode === "business"
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                {planName} Plan
              </span>
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

              <div className="absolute right-0 top-[58px] z-50 w-[270px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] animate-dropdown-reveal">

                {/* =================================================
                    PROFILE HEADER
                ================================================== */}

                <div className="border-b border-[var(--color-border)] p-4">

                  <div className="flex items-start gap-3">

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

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                        {displayName}
                      </p>

                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {displayEmail}
                      </p>

                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        Role: <span className="font-semibold capitalize text-[var(--color-text-secondary)]">{displayRole}</span>
                      </p>

                      {/* Account Plan Tier Badge */}
                      <div className="mt-2 flex items-center gap-1.5">
                        {planCode === "pro" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 shadow-xs">
                            <Crown size={11} className="text-emerald-500" />
                            Pro Plan
                          </span>
                        ) : planCode === "business" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-purple-600 dark:text-purple-400 shadow-xs">
                            <Sparkles size={11} className="text-purple-500" />
                            Business Plan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-muted)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                            <Zap size={11} className="text-[var(--color-primary)]" />
                            Free Plan
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </div>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    MENU
                ================================================== */}

                <div className="p-2 space-y-0.5">

                  <button
                    type="button"
                    onClick={handleWorkspace}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    <User size={17} />
                    {t("navigation:myWorkspace")}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/workspace/settings");
                    }}
                    disabled={loggingOut}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard size={17} />
                      <span>{t("settings:sections.billing.title", "Billing & Plans")}</span>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase rounded-md px-1.5 py-0.5 ${
                        planCode === "pro"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : planCode === "business"
                          ? "bg-purple-500/15 text-purple-600"
                          : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {planName}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSettings}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    <Settings size={17} />
                    {t("navigation:settings")}
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
                      ? t("navigation:loggingOut")
                      : t("navigation:logout")}

                  </button>

                </div>

              </div>
            </>
          )}

        </div>

      </div>

      {/* =====================================================
          NAVBAR COLLAPSE TOGGLE BUTTON (CENTERED ON BOTTOM LINE)
      ====================================================== */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand navbar" : "Collapse navbar"}
          title={isCollapsed ? t("workspace:expandNavbar", "Hiện thanh điều hướng") : t("workspace:collapseNavbar", "Thu gọn thanh điều hướng")}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex h-6 items-center gap-1 rounded-full border border-color-mix(in srgb, var(--color-primary) 35%, var(--color-border)) bg-[var(--color-surface)] px-2.5 text-[11px] font-bold text-[var(--color-text-secondary)] shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] active:scale-95 z-40 group cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronDown
              size={14}
              className="text-[var(--color-primary)] group-hover:text-white transition-transform duration-200 group-hover:translate-y-0.5"
            />
          ) : (
            <ChevronUp
              size={13}
              className="transition-transform duration-200 group-hover:-translate-y-0.5"
            />
          )}
        </button>
      )}
    </header>
  );
}