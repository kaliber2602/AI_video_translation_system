import { Check, Save } from "lucide-react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Theme } from "../../config/theme";
import type { UserResponse } from "../../types/auth";
import AISettingsCard from "./AISettingsCard";
import LanguageThemeCard from "./LanguageThemeCard";
import NotificationsCard from "./NotificationsCard";
import ProfileCard from "./ProfileCard";
import StorageUsageCard from "./StorageUsageCard";
import WorkspacePreferencesCard from "./WorkspacePreferencesCard";

export interface AccountSettingsSectionProps {
  user: UserResponse | null;
  profileEditing: boolean;
  isUploadingAvatar: boolean;
  isSaved: boolean;
  theme: Theme;
  autoSave: boolean;
  showTranscripts: boolean;
  aiSuggestions: boolean;
  compactView: boolean;
  autoTranslation: boolean;
  autoSummary: boolean;
  emailNotifications: boolean;
  processingUpdates: boolean;
  tipsNews: boolean;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleProfileEditing: () => void;
  onInputChange: () => void;
  onThemeChange: (theme: Theme) => void;
  onSave: () => void;
  onAutoSaveChange: (value: boolean) => void;
  onShowTranscriptsChange: (value: boolean) => void;
  onAiSuggestionsChange: (value: boolean) => void;
  onCompactViewChange: (value: boolean) => void;
  onAutoTranslationChange: (value: boolean) => void;
  onAutoSummaryChange: (value: boolean) => void;
  onEmailNotificationsChange: (value: boolean) => void;
  onProcessingUpdatesChange: (value: boolean) => void;
  onTipsNewsChange: (value: boolean) => void;
}

export default function AccountSettingsSection({
  user,
  profileEditing,
  isUploadingAvatar,
  isSaved,
  theme,
  autoSave,
  showTranscripts,
  aiSuggestions,
  compactView,
  autoTranslation,
  autoSummary,
  emailNotifications,
  processingUpdates,
  tipsNews,
  onAvatarChange,
  onToggleProfileEditing,
  onInputChange,
  onThemeChange,
  onSave,
  onAutoSaveChange,
  onShowTranscriptsChange,
  onAiSuggestionsChange,
  onCompactViewChange,
  onAutoTranslationChange,
  onAutoSummaryChange,
  onEmailNotificationsChange,
  onProcessingUpdatesChange,
  onTipsNewsChange,
}: AccountSettingsSectionProps) {
  const { t } = useTranslation(["settings", "common"]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {t("settings:accountSettingsTitle")}
          </h2>

          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t("settings:accountSettingsSubtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            isSaved
              ? "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
              : "bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-hover)]"
          }`}
        >
          {isSaved ? (
            <Check size={16} />
          ) : (
            <Save size={16} />
          )}

          {isSaved
            ? t("common:saved")
            : t("common:saveChanges")}
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="animate-fade-up stagger-1">
          <ProfileCard
            user={user}
            profileEditing={profileEditing}
            isUploadingAvatar={isUploadingAvatar}
            onAvatarChange={onAvatarChange}
            onToggleProfileEditing={onToggleProfileEditing}
            onInputChange={onInputChange}
          />
        </div>

        <div className="animate-fade-up stagger-2">
          <LanguageThemeCard
            theme={theme}
            onThemeChange={onThemeChange}
            onSave={onSave}
          />
        </div>

        <div className="animate-fade-up stagger-3">
          <WorkspacePreferencesCard
            autoSave={autoSave}
            showTranscripts={showTranscripts}
            aiSuggestions={aiSuggestions}
            compactView={compactView}
            onAutoSaveChange={onAutoSaveChange}
            onShowTranscriptsChange={onShowTranscriptsChange}
            onAiSuggestionsChange={onAiSuggestionsChange}
            onCompactViewChange={onCompactViewChange}
          />
        </div>

        <div className="animate-fade-up stagger-4">
          <AISettingsCard
            autoTranslation={autoTranslation}
            autoSummary={autoSummary}
            onAutoTranslationChange={onAutoTranslationChange}
            onAutoSummaryChange={onAutoSummaryChange}
          />
        </div>

        <div className="animate-fade-up stagger-5">
          <StorageUsageCard />
        </div>

        <div className="animate-fade-up stagger-6">
          <NotificationsCard
            emailNotifications={emailNotifications}
            processingUpdates={processingUpdates}
            tipsNews={tipsNews}
            onEmailNotificationsChange={onEmailNotificationsChange}
            onProcessingUpdatesChange={onProcessingUpdatesChange}
            onTipsNewsChange={onTipsNewsChange}
          />
        </div>
      </div>
    </>
  );
}
