import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/providers/LanguageContext";
import { THEME_OPTIONS, type Theme } from "../../config/theme";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../../i18n/types";
import SelectBox from "./SelectBox";
import SettingCard from "./SettingCard";
import ThemeSelector from "./ThemeSelector";

export interface LanguageThemeCardProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSave: () => void;
}

export default function LanguageThemeCard({
  theme,
  onThemeChange,
  onSave,
}: LanguageThemeCardProps) {
  const { t } = useTranslation(["settings", "common"]);
  const { language, changeLanguage } = useLanguage();

  return (
    <SettingCard
      title={t("settings:languageTheme.title")}
      description={t("settings:languageTheme.description")}
    >
      <div className="space-y-5">
        {/* Visual Theme Selector */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">
            {t("settings:languageTheme.paletteLabel")}
          </label>
          <ThemeSelector
            currentTheme={theme}
            onThemeSelect={onThemeChange}
          />
        </div>

        {/* Theme Quick Select Dropdown */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t("settings:languageTheme.themeModeLabel")}
          </label>

          <SelectBox
            value={theme}
            onChange={(value) => {
              onThemeChange(value as Theme);
            }}
          >
            {THEME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectBox>
        </div>

        {/* Language Select */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t("settings:languageTheme.languageLabel")}
          </label>

          <SelectBox
            value={language}
            onChange={(val) => {
              changeLanguage(val as SupportedLanguage);
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label} ({lang.nativeLabel})
              </option>
            ))}
          </SelectBox>
        </div>

        {/* Date Format */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t("settings:languageTheme.dateFormatLabel")}
          </label>

          <SelectBox value="DD/MM/YYYY">
            <option>
              DD/MM/YYYY
            </option>

            <option>
              MM/DD/YYYY
            </option>

            <option>
              YYYY-MM-DD
            </option>
          </SelectBox>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          className="h-10 w-full rounded-lg bg-[var(--color-primary)] text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] shadow-sm"
        >
          {t("settings:languageTheme.saveChanges")}
        </button>
      </div>
    </SettingCard>
  );
}
