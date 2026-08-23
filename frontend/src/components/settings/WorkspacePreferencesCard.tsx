import { useTranslation } from "react-i18next";
import SettingCard from "./SettingCard";
import ToggleRow from "./ToggleRow";

export interface WorkspacePreferencesCardProps {
  autoSave: boolean;
  showTranscripts: boolean;
  aiSuggestions: boolean;
  compactView: boolean;
  onAutoSaveChange: (value: boolean) => void;
  onShowTranscriptsChange: (value: boolean) => void;
  onAiSuggestionsChange: (value: boolean) => void;
  onCompactViewChange: (value: boolean) => void;
}

export default function WorkspacePreferencesCard({
  autoSave,
  showTranscripts,
  aiSuggestions,
  compactView,
  onAutoSaveChange,
  onShowTranscriptsChange,
  onAiSuggestionsChange,
  onCompactViewChange,
}: WorkspacePreferencesCardProps) {
  const { t } = useTranslation(["settings"]);

  return (
    <SettingCard
      title={t("settings:preferences.title")}
      description={t("settings:preferences.description")}
    >
      <div className="divide-y divide-[var(--color-border)]">
        <ToggleRow
          title={t("settings:preferences.autoSave")}
          description={t("settings:preferences.autoSaveDesc")}
          checked={autoSave}
          onChange={onAutoSaveChange}
        />

        <ToggleRow
          title={t("settings:preferences.showTranscripts")}
          description={t("settings:preferences.showTranscriptsDesc")}
          checked={showTranscripts}
          onChange={onShowTranscriptsChange}
        />

        <ToggleRow
          title={t("settings:preferences.aiSuggestions")}
          description={t("settings:preferences.aiSuggestionsDesc")}
          checked={aiSuggestions}
          onChange={onAiSuggestionsChange}
        />

        <ToggleRow
          title={t("settings:preferences.compactView")}
          description={t("settings:preferences.compactViewDesc")}
          checked={compactView}
          onChange={onCompactViewChange}
        />
      </div>
    </SettingCard>
  );
}
