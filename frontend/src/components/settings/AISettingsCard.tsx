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
  return (
    <SettingCard
      title="AI & Processing Settings"
      description="Configure AI features and processing options"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            Default AI Model
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
            Processing Priority
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
          title="Auto Translation"
          description="Automatically translate new videos"
          checked={autoTranslation}
          onChange={onAutoTranslationChange}
        />

        <ToggleRow
          title="Auto Summary"
          description="Generate summary for new videos"
          checked={autoSummary}
          onChange={onAutoSummaryChange}
        />
      </div>
    </SettingCard>
  );
}
