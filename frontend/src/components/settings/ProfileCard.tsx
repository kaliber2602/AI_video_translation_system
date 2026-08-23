import { useRef, type ChangeEvent } from "react";
import { Pencil } from "lucide-react";
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
      title="Profile"
      description="Manage your personal information"
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* AVATAR */}
        <div className="relative h-24 w-24 shrink-0">
          <button
            type="button"
            onClick={handleOpenAvatarPicker}
            disabled={isUploadingAvatar}
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[var(--color-avatar-bg)] text-3xl font-bold text-[var(--color-avatar-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
              "U"
            )}
          </button>

          {/* Edit button */}
          <button
            type="button"
            onClick={handleOpenAvatarPicker}
            disabled={isUploadingAvatar}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-primary)] text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Change avatar"
          >
            <Pencil size={13} />
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
        <div className="min-w-0 w-full flex-1 space-y-3">
          {/* NAME */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Name
            </label>
            <input
              value={user?.full_name ?? ""}
              disabled={!profileEditing}
              onChange={onInputChange}
              className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 disabled:opacity-80"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Email
            </label>
            <input
              value={user?.email ?? ""}
              disabled={!profileEditing}
              onChange={onInputChange}
              className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 disabled:opacity-80"
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Role
            </label>
            <input
              value={user?.role ?? ""}
              disabled
              readOnly
              className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-disabled-background)] px-3 text-sm text-[var(--color-text-muted)]"
            />
          </div>

          {/* EDIT PROFILE */}
          <button
            type="button"
            onClick={onToggleProfileEditing}
            className="h-10 w-full rounded-lg border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
          >
            {profileEditing ? "Done Editing" : "Edit Profile"}
          </button>
        </div>
      </div>
    </SettingCard>
  );
}
