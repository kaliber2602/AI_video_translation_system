import { ArrowLeft, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { UserResponse } from "../../types/auth";
import { getAvatarSrc, getInitials } from "./helpers";

export interface SettingsHeaderProps {
  user: UserResponse | null;
  isLoadingUser: boolean;
}

export default function SettingsHeader({
  user,
  isLoadingUser,
}: SettingsHeaderProps) {
  const { t } = useTranslation(["settings", "navigation", "common"]);
  const navigate = useNavigate();
  const avatarSrc = getAvatarSrc(user?.avatar);

  return (
    <header className="sticky top-0 z-20 flex h-[84px] items-center liquid-glass px-6 backdrop-blur-xl transition-colors duration-200 lg:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={() =>
            navigate("/workspace")
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          aria-label={t("common:back")}
        >
          <ArrowLeft size={18} />
        </button>

        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
            {t("settings:headerTitle")}
          </h1>

          <p className="text-xs text-[var(--color-text-muted)]">
            {t("settings:headerSubtitle")}
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2.5 md:flex">
          <span className="text-sm text-[var(--color-text-muted)]">
            {t("common:searchPlaceholder")}
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/workspace")
          }
          className="hidden items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] sm:flex"
        >
          + {t("navigation:newProject")}
        </button>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
          aria-label="Notifications"
        >
          <Bell
            size={18}
            className="text-[var(--color-text-secondary)]"
          />
        </button>

        {/* Topbar Avatar */}
        <button
          type="button"
          onClick={() =>
            navigate("/workspace")
          }
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--color-avatar-bg)] text-sm font-bold text-[var(--color-avatar-text)]"
        >
          {isLoadingUser ? (
            "U"
          ) : avatarSrc ? (
            <img
              src={avatarSrc}
              alt={`${user?.full_name ?? "User"} avatar`}
              className="h-full w-full object-cover"
            />
          ) : user ? (
            getInitials(user.full_name)
          ) : (
            "U"
          )}
        </button>
      </div>
    </header>
  );
}
