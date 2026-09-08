import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useTheme } from "../app/providers/ThemeContext";
import { toast } from "../lib/toast";
import {
  getMe,
  updateAvatar,
} from "../services/auth.service";
import type { UserResponse } from "../types/auth";
import type { SettingsSection } from "../types/settings";
import SettingsLayout from "../layouts/SettingsLayout";

const VALID_SECTIONS: SettingsSection[] = [
  "account",
  "general",
  "workspace",
  "ai",
  "translation",
  "billing",
  "notifications",
  "integrations",
  "security",
  "privacy",
];

export default function Setting() {
  const { t } = useTranslation(["settings", "auth", "common"]);
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();

  // =========================================================
  // User
  // =========================================================

  const [user, setUser] =
    useState<UserResponse | null>(null);

  const [isLoadingUser, setIsLoadingUser] =
    useState(true);

  const [isUploadingAvatar, setIsUploadingAvatar] =
    useState(false);

  // =========================================================
  // Settings
  // =========================================================

  const getInitialSection = (): SettingsSection => {
    const tab = searchParams.get("tab") || searchParams.get("section");
    if (tab && VALID_SECTIONS.includes(tab as SettingsSection)) {
      return tab as SettingsSection;
    }
    return "account";
  };

  const [activeSection, setActiveSection] =
    useState<SettingsSection>(getInitialSection);

  useEffect(() => {
    const tab = searchParams.get("tab") || searchParams.get("section");
    if (tab && VALID_SECTIONS.includes(tab as SettingsSection)) {
      setActiveSection(tab as SettingsSection);
    }
  }, [searchParams]);

  const [isSaved, setIsSaved] =
    useState(true);

  const [autoSave, setAutoSave] =
    useState(true);

  const [showTranscripts, setShowTranscripts] =
    useState(true);

  const [aiSuggestions, setAiSuggestions] =
    useState(true);

  const [compactView, setCompactView] =
    useState(false);

  const [autoTranslation, setAutoTranslation] =
    useState(true);

  const [autoSummary, setAutoSummary] =
    useState(true);

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [processingUpdates, setProcessingUpdates] =
    useState(true);

  const [tipsNews, setTipsNews] =
    useState(true);

  const [profileEditing, setProfileEditing] =
    useState(false);

  // =========================================================
  // Load Current User
  // =========================================================

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoadingUser(true);

        const currentUser =
          await getMe();

        setUser(currentUser);
      } catch (error) {
        console.error(
          "[SETTINGS] Failed to load current user:",
          error
        );
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  // =========================================================
  // Helpers & Handlers
  // =========================================================

  const markChanged = () => {
    setIsSaved(false);
  };

  const handleSave = () => {
    setIsSaved(true);
    toast.success(
      t("settings:toast.settingsSaved"),
      t("settings:toast.settingsSavedDesc")
    );
  };

  const handleSectionChange = (
    section: SettingsSection
  ) => {
    setActiveSection(section);
  };

  const handleToggleProfileEditing = () => {
    setProfileEditing((prev) => !prev);
  };

  // =========================================================
  // Avatar Upload
  // =========================================================

  const handleAvatarChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    // -------------------------------------------------------
    // Validate File Type
    // -------------------------------------------------------

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        t("common:error"),
        t("auth:validation.invalidImage")
      );

      event.target.value = "";
      return;
    }

    // -------------------------------------------------------
    // Validate File Size
    // -------------------------------------------------------

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error(
        t("common:error"),
        t("auth:validation.imageTooLarge")
      );

      event.target.value = "";
      return;
    }

    // -------------------------------------------------------
    // Upload
    // -------------------------------------------------------

    try {
      setIsUploadingAvatar(true);

      const updatedUser =
        await updateAvatar(file);

      console.log(
        "[SETTINGS] Avatar updated:",
        updatedUser
      );

      // -----------------------------------------------------
      // Update User State
      // -----------------------------------------------------

      setUser((previousUser) => {
        if (!previousUser) {
          return updatedUser;
        }

        return {
          ...previousUser,
          ...updatedUser,
          avatar: updatedUser.avatar,
        };
      });

      toast.success(
        t("settings:profile.avatarUpdated"),
        t("settings:profile.avatarUpdatedSuccess")
      );

    } catch (error: any) {
      console.error(
        "[SETTINGS] Failed to update avatar:",
        error
      );

      const backendMessage =
        error?.response?.data?.detail;

      toast.error(
        t("settings:profile.updateFailed"),
        backendMessage ||
          t("settings:profile.unableToUpdateAvatar")
      );

    } finally {
      setIsUploadingAvatar(false);

      // Allow selecting same file again
      event.target.value = "";
    }
  };

  return (
    <SettingsLayout
      user={user}
      isLoadingUser={isLoadingUser}
      isUploadingAvatar={isUploadingAvatar}
      activeSection={activeSection}
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
      profileEditing={profileEditing}
      onSectionChange={handleSectionChange}
      onAvatarChange={handleAvatarChange}
      onToggleProfileEditing={handleToggleProfileEditing}
      onInputChange={markChanged}
      onThemeChange={(newTheme) => {
        setTheme(newTheme);
        markChanged();
      }}
      onSave={handleSave}
      onAutoSaveChange={(value) => {
        setAutoSave(value);
        markChanged();
      }}
      onShowTranscriptsChange={(value) => {
        setShowTranscripts(value);
        markChanged();
      }}
      onAiSuggestionsChange={(value) => {
        setAiSuggestions(value);
        markChanged();
      }}
      onCompactViewChange={(value) => {
        setCompactView(value);
        markChanged();
      }}
      onAutoTranslationChange={(value) => {
        setAutoTranslation(value);
        markChanged();
      }}
      onAutoSummaryChange={(value) => {
        setAutoSummary(value);
        markChanged();
      }}
      onEmailNotificationsChange={(value) => {
        setEmailNotifications(value);
        markChanged();
      }}
      onProcessingUpdatesChange={(value) => {
        setProcessingUpdates(value);
        markChanged();
      }}
      onTipsNewsChange={(value) => {
        setTipsNews(value);
        markChanged();
      }}
    />
  );
}