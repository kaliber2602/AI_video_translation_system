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
  return (
    <SettingCard
      title="Workspace Preferences"
      description="Customize your workspace experience"
    >
      <div className="divide-y divide-[#EEF2F1]">
        <ToggleRow
          title="Auto Save"
          description="Automatically save your work"
          checked={autoSave}
          onChange={onAutoSaveChange}
        />

        <ToggleRow
          title="Show Transcripts by Default"
          description="Display transcripts in video workspace"
          checked={showTranscripts}
          onChange={onShowTranscriptsChange}
        />

        <ToggleRow
          title="Enable AI Suggestions"
          description="Get smart recommendations"
          checked={aiSuggestions}
          onChange={onAiSuggestionsChange}
        />

        <ToggleRow
          title="Compact View"
          description="Use compact layout in lists"
          checked={compactView}
          onChange={onCompactViewChange}
        />
      </div>
    </SettingCard>
  );
}
