import { useState, useEffect, type ChangeEvent } from "react";
import { User, Globe, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../app/providers/ThemeContext";
import { useLanguage } from "../../../app/providers/LanguageContext";
import { THEME_OPTIONS, type Theme } from "../../../config/theme";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../../../i18n/types";
import { toast } from "../../../lib/toast";
import type { UserResponse } from "../../../types/auth";
import { updateProfile } from "../../../services/auth.service";
import { getUserSettings, patchUserSettings } from "../../../services/settings.service";
import { getAvatarSrc, getInitials } from "../helpers";
import SettingCard from "../SettingCard";
import ThemeSelector from "../ThemeSelector";
import SelectBox from "../SelectBox";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsInput from "../common/SettingsInput";
import { INITIAL_MOCK_SETTINGS } from "../mock/settingsMockData";

export interface GeneralSectionProps {
  user: UserResponse | null;
  isUploadingAvatar?: boolean;
  onAvatarChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const SYSTEM_FONT_OPTIONS = [
  { value: "Inter", label: "Inter", stack: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { value: "Be Vietnam Pro", label: "Be Vietnam Pro (Tối ưu Tiếng Việt)", stack: '"Be Vietnam Pro", sans-serif' },
  { value: "Roboto", label: "Roboto", stack: '"Roboto", sans-serif' },
  { value: "Open Sans", label: "Open Sans", stack: '"Open Sans", sans-serif' },
  { value: "Lexend", label: "Lexend (Dễ đọc & Công thái học)", stack: '"Lexend", sans-serif' },
];

export function applySystemFont(fontFamilyName: string) {
  const fontObj = SYSTEM_FONT_OPTIONS.find((f) => f.value === fontFamilyName) || SYSTEM_FONT_OPTIONS[0];
  document.documentElement.style.setProperty("--system-font-family", fontObj.stack);
  localStorage.setItem("vidnova_system_font", fontObj.value);
}

export function getDetectedClientTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const now = new Date();
    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
    const mins = String(Math.abs(offsetMinutes) % 60);
    const gmtStr = mins === "0" ? `GMT${sign}${parseInt(hours, 10)}` : `GMT${sign}${hours}:${mins.padStart(2, "0")}`;
    return `${tz} (${gmtStr})`;
  } catch {
    return "Asia/Ho_Chi_Minh (GMT+7)";
  }
}

export default function GeneralSection({
  user,
  isUploadingAvatar,
  onAvatarChange,
}: GeneralSectionProps) {
  const { t } = useTranslation(["settings", "common"]);
  const { theme, setTheme } = useTheme();
  const { language, changeLanguage } = useLanguage();

  // Local state for General settings
  const [fullName, setFullName] = useState(user?.full_name || "Alex Morgan");
  const [email, setEmail] = useState(user?.email || "alex.morgan@vidnova.ai");
  const [bio, setBio] = useState(INITIAL_MOCK_SETTINGS.general.bio);
  const [timezone] = useState<string>(() => getDetectedClientTimezone());
  const [dateFormat, setDateFormat] = useState(INITIAL_MOCK_SETTINGS.general.dateFormat);
  const [fontFamily, setFontFamily] = useState<string>(() => {
    return localStorage.getItem("vidnova_system_font") || "Inter";
  });
  const [isSaved, setIsSaved] = useState(true);

  // Sync user prop if loaded later
  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    if (user?.email) setEmail(user.email);
  }, [user]);

  // Load preferences from backend and apply saved font
  useEffect(() => {
    const fetchGeneralSettings = async () => {
      try {
        const data = await getUserSettings();
        if (data?.preferences?.general) {
          const g = data.preferences.general;
          if (g.bio !== undefined) setBio(g.bio);
          if (g.dateFormat !== undefined) setDateFormat(g.dateFormat);
          if (g.fontFamily !== undefined) {
            setFontFamily(g.fontFamily);
            applySystemFont(g.fontFamily);
          } else {
            const savedLocalFont = localStorage.getItem("vidnova_system_font") || "Inter";
            applySystemFont(savedLocalFont);
          }
        } else {
          const savedLocalFont = localStorage.getItem("vidnova_system_font") || "Inter";
          applySystemFont(savedLocalFont);
        }
      } catch (err) {
        console.error("[GeneralSection] Failed to load general preferences:", err);
      }
    };
    fetchGeneralSettings();
  }, []);

  const avatarSrc = getAvatarSrc(user?.avatar);

  const handleFieldChange = () => {
    setIsSaved(false);
  };

  const handleFontChange = (selectedFont: string) => {
    setFontFamily(selectedFont);
    applySystemFont(selectedFont);
    handleFieldChange();
    toast.info("Typography Updated", `System font set to ${selectedFont}`);
  };

  const handleSave = async () => {
    try {
      await Promise.all([
        updateProfile({ full_name: fullName }),
        patchUserSettings({
          preferences: {
            general: {
              bio,
              timezone,
              dateFormat,
              fontFamily,
            },
          },
        }),
      ]);
      applySystemFont(fontFamily);
      setIsSaved(true);
      toast.success(
        t("settings:toast.settingsSaved", "Settings saved"),
        t("settings:toast.generalSavedDesc", "Your general preferences have been updated.")
      );
    } catch (err: any) {
      console.error("[GeneralSection] Failed to save settings:", err);
      toast.error(
        t("common:error", "Error"),
        err?.response?.data?.detail || "Failed to save general settings."
      );
    }
  };

  const handleReset = async () => {
    setBio(INITIAL_MOCK_SETTINGS.general.bio);
    setDateFormat(INITIAL_MOCK_SETTINGS.general.dateFormat);
    setFontFamily("Inter");
    applySystemFont("Inter");
    try {
      await patchUserSettings({
        preferences: {
          general: {
            bio: INITIAL_MOCK_SETTINGS.general.bio,
            timezone,
            dateFormat: INITIAL_MOCK_SETTINGS.general.dateFormat,
            fontFamily: "Inter",
          },
        },
      });
      setIsSaved(true);
      toast.info("Reset to defaults", "General settings restored.");
    } catch (err: any) {
      console.error("[GeneralSection] Failed to reset preferences:", err);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:general.title", "General Settings")}
        subtitle={t(
          "settings:general.subtitle",
          "Manage your profile, visual appearance, system typography, and regional preferences."
        )}
        isSaved={isSaved}
        onSave={handleSave}
        onReset={handleReset}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 1: PERSONAL PROFILE */}
        <SettingCard
          title={t("settings:general.profileTitle", "Profile Information")}
          description={t(
            "settings:general.profileDesc",
            "Update your personal photo, display name."
          )}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-2">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--color-avatar-bg)] text-xl font-bold text-[var(--color-avatar-text)] shadow-sm">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {user ? getInitials(user.full_name) : <User size={24} />}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {fullName}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {user?.role || "Content Creator"} • Pro Account
                </p>
                {onAvatarChange && (
                  <label className="inline-block cursor-pointer text-xs font-semibold text-[var(--color-primary)] hover:underline">
                    <span>{isUploadingAvatar ? "Uploading..." : "Change avatar"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onAvatarChange}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                )}
              </div>
            </div>

            <SettingsInput
              label={t("settings:profile.name", "Full Name")}
              value={fullName}
              onChange={(val) => {
                setFullName(val);
                handleFieldChange();
              }}
            />

            <SettingsInput
              label={t("settings:profile.email", "Email Address")}
              type="email"
              value={email}
              onChange={(val) => {
                setEmail(val);
                handleFieldChange();
              }}
            />
          </div>
        </SettingCard>

        {/* CARD 2: APPEARANCE, THEME & SYSTEM TYPOGRAPHY */}
        <SettingCard
          title={t("settings:languageTheme.title", "Appearance & System Typography")}
          description="Personalize visual palette, dark mode contrast, and application-wide font."
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">
                {t("settings:languageTheme.paletteLabel", "Color Palette")}
              </label>
              <ThemeSelector
                currentTheme={theme}
                onThemeSelect={(newTheme) => {
                  setTheme(newTheme);
                  handleFieldChange();
                  toast.info("Theme updated", `Switched to ${newTheme}`);
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                {t("settings:languageTheme.themeModeLabel", "Theme Mode Select")}
              </label>
              <SelectBox
                value={theme}
                onChange={(val) => {
                  setTheme(val as Theme);
                  handleFieldChange();
                }}
              >
                {THEME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectBox>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                <Type size={14} className="text-[var(--color-primary)]" />
                <span>System Typography (Application Font)</span>
              </label>
              <SelectBox
                value={fontFamily}
                onChange={(val) => handleFontChange(val)}
              >
                {SYSTEM_FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </SelectBox>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                Active font renders automatically across workspace headers, editors, and dialogs.
              </p>
            </div>
          </div>
        </SettingCard>

        {/* CARD 3: LANGUAGE & REGIONAL (Full width on lg) */}
        <div className="lg:col-span-2">
          <SettingCard
            title={t("settings:general.regionalTitle", "Language & Regional Preferences")}
            description={t(
              "settings:general.regionalDesc",
              "Configure default interface language, client timezone, and calendar formats."
            )}
          >
            <div className="grid gap-5 md:grid-cols-3">
              {/* Language */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <Globe size={14} className="text-[var(--color-primary)]" />
                  {t("settings:languageTheme.languageLabel", "Interface Language")}
                </label>
                <SelectBox
                  value={language}
                  onChange={(val) => {
                    changeLanguage(val as SupportedLanguage);
                    handleFieldChange();
                    toast.success("Language switched", `Interface set to ${val.toUpperCase()}`);
                  }}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.label} ({lang.nativeLabel})
                    </option>
                  ))}
                </SelectBox>
              </div>

              {/* Timezone (Auto-detected Client Timezone) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  {t("settings:general.timezoneLabel", "Timezone (Client Detected)")}
                </label>
                <div className="flex h-10 w-full items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-3 text-xs font-semibold text-[var(--color-text-primary)]">
                  <span>{timezone}</span>
                </div>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                  Automatically synchronized from client system environment.
                </p>
              </div>

              {/* Date Format */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  {t("settings:languageTheme.dateFormatLabel", "Date Format")}
                </label>
                <SelectBox
                  value={dateFormat}
                  onChange={(val) => {
                    setDateFormat(val);
                    handleFieldChange();
                  }}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
                </SelectBox>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );
}
