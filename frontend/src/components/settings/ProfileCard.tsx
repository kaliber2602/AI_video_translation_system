import { useRef, type ChangeEvent } from "react";
import { Pencil, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UserResponse } from "../../types/auth";
import { getAvatarSrc, getInitials } from "./helpers";
import SettingCard from "./SettingCard";

export interface ProfileCardProps {
  user: UserResponse | null;
  profileEditing: boolean;
  isUploadingAvatar: boolean;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleProfileEditing: () => void;
  onInputChange: () => void;
}

export default function ProfileCard({
  user,
  profileEditing,
  isUploadingAvatar,
  onAvatarChange,
  onToggleProfileEditing,
  onInputChange,
}: ProfileCardProps) {
  const { t } = useTranslation(["settings", "common"]);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleOpenAvatarPicker = () => {
    if (isUploadingAvatar) {
      return;
    }
    avatarInputRef.current?.click();
  };

  const avatarSrc = getAvatarSrc(user?.avatar);

  return (
    <SettingCard
      title={t("settings:profile.title")}
      description={t("settings:profile.description")}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* AVATAR */}
        <div className="relative h-24 w-24 shrink-0">
          <button
            type="button"
            onClick={handleOpenAvatarPicker}
            disabled={isUploadingAvatar}
            className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[var(--color-avatar-bg)] text-2xl font-black text-[var(--color-avatar-text)] shadow-sm transition-transform duration-200 ease-out hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={`${user?.full_name ?? "User"} avatar`}
                className="h-full w-full object-cover"
              />
            ) : user ? (
              getInitials(user.full_name)
            ) : (
              <UserIcon size={32} />
            )}

            {/* Hover overlay hint */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-180 ease-out group-hover:opacity-100">
              <Pencil size={20} className="text-white" />
            </div>
          </button>

          {/* Edit button */}
          <button
            type="button"
            onClick={handleOpenAvatarPicker}
            disabled={isUploadingAvatar}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-primary)] text-white shadow-sm transition-all duration-200 ease-out hover:scale-110 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={t("settings:profile.changeAvatar")}
          >
            <Pencil size={12} />
          </button>

          {/* Hidden input */}
          <input
            ref={avatarInputRef}
            id="avatar-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onAvatarChange}
          />
        </div>

        {/* PROFILE INFORMATION */}
        <div className="min-w-0 w-full flex-1 space-y-3.5">
          {/* NAME */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              {t("settings:profile.name")}
            </label>
            <input
              value={user?.full_name ?? ""}
              disabled={!profileEditing}
              onChange={onInputChange}
              className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3.5 text-xs font-medium text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:opacity-80 disabled:bg-[var(--color-disabled-background)]"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              {t("settings:profile.email")}
            </label>
            <input
              value={user?.email ?? ""}
              disabled={!profileEditing}
              onChange={onInputChange}
              className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3.5 text-xs font-medium text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:opacity-80 disabled:bg-[var(--color-disabled-background)]"
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
              {t("settings:profile.role")}
            </label>
            <input
              value={user?.role ?? ""}
              disabled
              readOnly
              className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-disabled-background)] px-3.5 text-xs text-[var(--color-text-muted)]"
            />
          </div>

          {/* EDIT PROFILE */}
          <button
            type="button"
            onClick={onToggleProfileEditing}
            className="h-10 w-full rounded-xl border border-[var(--color-primary)] text-xs font-bold text-[var(--color-primary)] transition-all duration-200 ease-out hover:bg-[var(--color-primary-soft)] active:scale-[0.985]"
          >
            {profileEditing
              ? t("settings:profile.doneEditing")
              : t("settings:profile.editProfile")}
          </button>
        </div>
      </div>
    </SettingCard>
  );
}
