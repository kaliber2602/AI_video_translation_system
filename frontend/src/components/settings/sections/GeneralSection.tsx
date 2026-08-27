import { useState, type ChangeEvent } from "react";
import { User, Sparkles, Globe, Sliders } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../app/providers/ThemeContext";
import { useLanguage } from "../../../app/providers/LanguageContext";
import { THEME_OPTIONS, type Theme } from "../../../config/theme";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../../../i18n/types";
import { toast } from "../../../lib/toast";
import type { UserResponse } from "../../../types/auth";
import { getAvatarSrc, getInitials } from "../helpers";
import SettingCard from "../SettingCard";
import ThemeSelector from "../ThemeSelector";
import SelectBox from "../SelectBox";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsInput from "../common/SettingsInput";
import SettingsRow from "../common/SettingsRow";
import Toggle from "../Toggle";
import { INITIAL_MOCK_SETTINGS } from "../mock/settingsMockData";

export interface GeneralSectionProps {
  user: UserResponse | null;
  isUploadingAvatar?: boolean;
  onAvatarChange?: (e: ChangeEvent<HTMLInputElement>) => void;
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
  const [timezone, setTimezone] = useState(INITIAL_MOCK_SETTINGS.general.timezone);
  const [dateFormat, setDateFormat] = useState(INITIAL_MOCK_SETTINGS.general.dateFormat);
  const [density, setDensity] = useState(INITIAL_MOCK_SETTINGS.general.interfaceDensity);
  const [reducedMotion, setReducedMotion] = useState(INITIAL_MOCK_SETTINGS.general.reducedMotion);
  const [isSaved, setIsSaved] = useState(true);

  const avatarSrc = getAvatarSrc(user?.avatar);

  const handleFieldChange = () => {
    setIsSaved(false);
  };

  const handleSave = () => {
    setIsSaved(true);
    toast.success(
      t("settings:toast.settingsSaved", "Settings saved"),
      t("settings:toast.generalSavedDesc", "Your general preferences have been updated.")
    );
  };

  const handleReset = () => {
    setBio(INITIAL_MOCK_SETTINGS.general.bio);
    setTimezone(INITIAL_MOCK_SETTINGS.general.timezone);
    setDateFormat(INITIAL_MOCK_SETTINGS.general.dateFormat);
    setDensity(INITIAL_MOCK_SETTINGS.general.interfaceDensity);
    setReducedMotion(INITIAL_MOCK_SETTINGS.general.reducedMotion);
    setIsSaved(true);
    toast.info("Reset to defaults", "General settings restored.");
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:general.title", "General Settings")}
        subtitle={t(
          "settings:general.subtitle",
          "Manage your profile, visual appearance, language, and regional preferences."
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
            "Update your personal photo, display name, and public biography."
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

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                {t("settings:general.bioLabel", "Biography")}
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  handleFieldChange();
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] p-3 text-xs text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        </SettingCard>

        {/* CARD 2: APPEARANCE & THEME */}
        <SettingCard
          title={t("settings:languageTheme.title", "Appearance & Theme")}
          description={t(
            "settings:general.appearanceDesc",
            "Personalize visual palette, dark mode contrast, and interface density."
          )}
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

            <div className="divide-y divide-[var(--color-border)]/60 pt-1">
              <SettingsRow
                icon={<Sliders size={16} />}
                title={t("settings:general.compactMode", "Compact Interface Density")}
                description={t(
                  "settings:general.compactModeDesc",
                  "Use condensed paddings and smaller typography."
                )}
              >
                <Toggle
                  checked={density === "compact"}
                  onChange={(checked) => {
                    setDensity(checked ? "compact" : "comfortable");
                    handleFieldChange();
                  }}
                />
              </SettingsRow>

              <SettingsRow
                icon={<Sparkles size={16} />}
                title={t("settings:general.reducedMotion", "Reduced Motion")}
                description={t(
                  "settings:general.reducedMotionDesc",
                  "Minimize spring animations and transition effects."
                )}
              >
                <Toggle
                  checked={reducedMotion}
                  onChange={(checked) => {
                    setReducedMotion(checked);
                    handleFieldChange();
                  }}
                />
              </SettingsRow>
            </div>
          </div>
        </SettingCard>

        {/* CARD 3: LANGUAGE & REGIONAL (Full width on lg) */}
        <div className="lg:col-span-2">
          <SettingCard
            title={t("settings:general.regionalTitle", "Language & Regional Preferences")}
            description={t(
              "settings:general.regionalDesc",
              "Configure default interface language, timezone, and calendar formats."
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

              {/* Timezone */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  {t("settings:general.timezoneLabel", "Timezone")}
                </label>
                <SelectBox
                  value={timezone}
                  onChange={(val) => {
                    setTimezone(val);
                    handleFieldChange();
                  }}
                >
                  <option value="UTC+07:00 (Indochina Time - Bangkok, Hanoi, Jakarta)">
                    UTC+07:00 (Indochina Time - Hanoi, BKK)
                  </option>
                  <option value="UTC+08:00 (Singapore, Beijing, Hong Kong)">
                    UTC+08:00 (Singapore, Beijing)
                  </option>
                  <option value="UTC+09:00 (Tokyo, Seoul)">
                    UTC+09:00 (Tokyo, Seoul)
                  </option>
                  <option value="UTC+00:00 (London, GMT)">
                    UTC+00:00 (London, GMT)
                  </option>
                  <option value="UTC-05:00 (New York, EST)">
                    UTC-05:00 (New York, EST)
                  </option>
                  <option value="UTC-08:00 (San Francisco, PST)">
                    UTC-08:00 (San Francisco, PST)
                  </option>
                </SelectBox>
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
