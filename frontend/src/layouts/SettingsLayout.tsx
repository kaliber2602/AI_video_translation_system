import type { ChangeEvent } from "react";
import type { Theme } from "../config/theme";
import type { UserResponse } from "../types/auth";
import type { SettingsSection } from "../types/settings";
import SettingsHeader from "../components/settings/SettingsHeader";
import SettingsSidebar from "../components/settings/SettingsSidebar";
import MobileSettingsNav from "../components/settings/MobileSettingsNav";
import AccountSettingsSection from "../components/settings/AccountSettingsSection";
import GeneralSection from "../components/settings/sections/GeneralSection";
import WorkspaceSection from "../components/settings/sections/WorkspaceSection";
import AIProcessingSection from "../components/settings/sections/AIProcessingSection";
import TranslationVoiceSection from "../components/settings/sections/TranslationVoiceSection";
import BillingSection from "../components/settings/sections/BillingSection";
import NotificationsSection from "../components/settings/sections/NotificationsSection";
import IntegrationsSection from "../components/settings/sections/IntegrationsSection";
import SecuritySection from "../components/settings/sections/SecuritySection";
import DataPrivacySection from "../components/settings/sections/DataPrivacySection";

export interface SettingsLayoutProps {
  user: UserResponse | null;
  isLoadingUser: boolean;
  isUploadingAvatar: boolean;
  activeSection: SettingsSection;
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
  profileEditing: boolean;
  onSectionChange: (section: SettingsSection) => void;
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

export default function SettingsLayout({
  user,
  isLoadingUser,
  isUploadingAvatar,
  activeSection,
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
  profileEditing,
  onSectionChange,
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
}: SettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200 page-enter">
      <SettingsHeader
        user={user}
        isLoadingUser={isLoadingUser}
      />

      <MobileSettingsNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      <div className="mx-auto flex w-full max-w-[1600px]">
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />

        <main className="min-w-0 flex-1 p-5 sm:p-7 lg:p-8">
          <div key={activeSection} className="animate-fade-up">
            {activeSection === "account" && (
              <AccountSettingsSection
                user={user}
                profileEditing={profileEditing}
                isUploadingAvatar={isUploadingAvatar}
                isSaved={isSaved}
                theme={theme}
                autoSave={autoSave}
                showTranscripts={showTranscripts}
                aiSuggestions={aiSuggestions}
                compactView={compactView}
                autoTranslation={autoTranslation}
                autoSummary={autoSummary}
                emailNotifications={emailNotifications}
                processingUpdates={processingUpdates}
                tipsNews={tipsNews}
                onAvatarChange={onAvatarChange}
                onToggleProfileEditing={onToggleProfileEditing}
                onInputChange={onInputChange}
                onThemeChange={onThemeChange}
                onSave={onSave}
                onAutoSaveChange={onAutoSaveChange}
                onShowTranscriptsChange={onShowTranscriptsChange}
                onAiSuggestionsChange={onAiSuggestionsChange}
                onCompactViewChange={onCompactViewChange}
                onAutoTranslationChange={onAutoTranslationChange}
                onAutoSummaryChange={onAutoSummaryChange}
                onEmailNotificationsChange={onEmailNotificationsChange}
                onProcessingUpdatesChange={onProcessingUpdatesChange}
                onTipsNewsChange={onTipsNewsChange}
              />
            )}

            {activeSection === "general" && (
              <GeneralSection
                user={user}
                isUploadingAvatar={isUploadingAvatar}
                onAvatarChange={onAvatarChange}
              />
            )}

            {activeSection === "workspace" && (
              <WorkspaceSection
                autoSave={autoSave}
                showTranscripts={showTranscripts}
                aiSuggestions={aiSuggestions}
                compactView={compactView}
                onAutoSaveChange={onAutoSaveChange}
                onShowTranscriptsChange={onShowTranscriptsChange}
                onAiSuggestionsChange={onAiSuggestionsChange}
                onCompactViewChange={onCompactViewChange}
              />
            )}

            {activeSection === "ai" && (
              <AIProcessingSection
                autoTranslation={autoTranslation}
                autoSummary={autoSummary}
                onAutoTranslationChange={onAutoTranslationChange}
                onAutoSummaryChange={onAutoSummaryChange}
              />
            )}

            {activeSection === "translation" && (
              <TranslationVoiceSection />
            )}

            {activeSection === "billing" && (
              <BillingSection />
            )}

            {activeSection === "notifications" && (
              <NotificationsSection
                emailNotifications={emailNotifications}
                processingUpdates={processingUpdates}
                tipsNews={tipsNews}
                onEmailNotificationsChange={onEmailNotificationsChange}
                onProcessingUpdatesChange={onProcessingUpdatesChange}
                onTipsNewsChange={onTipsNewsChange}
              />
            )}

            {activeSection === "integrations" && (
              <IntegrationsSection />
            )}

            {activeSection === "security" && (
              <SecuritySection />
            )}

            {activeSection === "privacy" && (
              <DataPrivacySection />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
