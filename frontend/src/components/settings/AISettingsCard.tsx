import { useTranslation } from "react-i18next";
import SelectBox from "./SelectBox";
import SettingCard from "./SettingCard";
import ToggleRow from "./ToggleRow";

export interface AISettingsCardProps {
  autoTranslation: boolean;
  autoSummary: boolean;
  onAutoTranslationChange: (value: boolean) => void;
  onAutoSummaryChange: (value: boolean) => void;
}

export default function AISettingsCard({
  autoTranslation,
  autoSummary,
  onAutoTranslationChange,
  onAutoSummaryChange,
}: AISettingsCardProps) {
  const { t } = useTranslation(["settings"]);

  return (
    <SettingCard
      title={t("settings:ai.title")}
      description={t("settings:ai.description")}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t("settings:ai.defaultModel")}
          </label>

          <SelectBox value="VidNova Smart (Recommended)">
            <option>
              VidNova Smart (Recommended)
            </option>

            <option>
              Fast Translation
            </option>

            <option>
              High Quality
            </option>
          </SelectBox>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t("settings:ai.processingPriority")}
          </label>

          <SelectBox value="Balanced">
            <option>
              Balanced
            </option>

            <option>
              Fast
            </option>

            <option>
              Quality
            </option>
          </SelectBox>
        </div>

        <ToggleRow
          title={t("settings:ai.autoTranslation")}
          description={t("settings:ai.autoTranslationDesc")}
          checked={autoTranslation}
          onChange={onAutoTranslationChange}
        />

        <ToggleRow
          title={t("settings:ai.autoSummary")}
          description={t("settings:ai.autoSummaryDesc")}
          checked={autoSummary}
          onChange={onAutoSummaryChange}
        />
      </div>
    </SettingCard>
  );
}
