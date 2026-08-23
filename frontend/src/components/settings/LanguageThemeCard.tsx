import { THEME_OPTIONS, type Theme } from "../../config/theme";
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
  return (
    <SettingCard
      title="Language & Theme"
      description="Set your language and regional preferences"
    >
      <div className="space-y-5">
        {/* Visual Theme Selector */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">
            Color Theme Palette
          </label>
          <ThemeSelector
            currentTheme={theme}
            onThemeSelect={onThemeChange}
          />
        </div>

        {/* Theme Quick Select Dropdown */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            Theme Mode Select
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
            Language
          </label>

          <SelectBox value="🇺🇸  English">
            <option>
              🇺🇸 English
            </option>

            <option>
              🇻🇳 Vietnamese
            </option>
          </SelectBox>
        </div>

        {/* Date Format */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            Date Format
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
          Save Changes
        </button>
      </div>
    </SettingCard>
  );
}
