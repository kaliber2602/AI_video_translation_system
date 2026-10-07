import type { ChangeEvent } from "react";
import type { UserResponse } from "../types/auth";
import type { SettingsSection } from "../types/settings";
import SettingsHeader from "../components/settings/SettingsHeader";
import SettingsSidebar from "../components/settings/SettingsSidebar";
import MobileSettingsNav from "../components/settings/MobileSettingsNav";
import GeneralSection from "../components/settings/sections/GeneralSection";
import BillingSection from "../components/settings/sections/BillingSection";
import NotificationsSection from "../components/settings/sections/NotificationsSection";
import SecuritySection from "../components/settings/sections/SecuritySection";
import DataPrivacySection from "../components/settings/sections/DataPrivacySection";

export interface SettingsLayoutProps {
  user: UserResponse | null;
  isLoadingUser: boolean;
  isUploadingAvatar: boolean;
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  // Optional legacy props maintained for backward compatibility
  isSaved?: boolean;
  theme?: any;
  autoSave?: boolean;
  showTranscripts?: boolean;
  aiSuggestions?: boolean;
  compactView?: boolean;
  autoTranslation?: boolean;
  autoSummary?: boolean;
  emailNotifications?: boolean;
  processingUpdates?: boolean;
  tipsNews?: boolean;
  profileEditing?: boolean;
  onToggleProfileEditing?: () => void;
  onInputChange?: () => void;
  onThemeChange?: (theme: any) => void;
  onSave?: () => void;
  onAutoSaveChange?: (value: boolean) => void;
  onShowTranscriptsChange?: (value: boolean) => void;
  onAiSuggestionsChange?: (value: boolean) => void;
  onCompactViewChange?: (value: boolean) => void;
  onAutoTranslationChange?: (value: boolean) => void;
  onAutoSummaryChange?: (value: boolean) => void;
  onEmailNotificationsChange?: (value: boolean) => void;
  onProcessingUpdatesChange?: (value: boolean) => void;
  onTipsNewsChange?: (value: boolean) => void;
}

export default function SettingsLayout({
  user,
  isLoadingUser,
  isUploadingAvatar,
  activeSection,
  onSectionChange,
  onAvatarChange,
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
            {activeSection === "general" && (
              <GeneralSection
                user={user}
                isUploadingAvatar={isUploadingAvatar}
                onAvatarChange={onAvatarChange}
              />
            )}

            {activeSection === "billing" && (
              <BillingSection />
            )}

            {activeSection === "notifications" && (
              <NotificationsSection />
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
