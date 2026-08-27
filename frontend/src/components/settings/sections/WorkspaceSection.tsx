import { useState } from "react";
import { FolderGit2, Users, Eye, Save, Sparkles, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SelectBox from "../SelectBox";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsRow from "../common/SettingsRow";
import SettingsBadge from "../common/SettingsBadge";
import SettingsInput from "../common/SettingsInput";
import Toggle from "../Toggle";
import { INITIAL_MOCK_SETTINGS } from "../mock/settingsMockData";

export interface WorkspaceSectionProps {
  autoSave?: boolean;
  showTranscripts?: boolean;
  aiSuggestions?: boolean;
  compactView?: boolean;
  onAutoSaveChange?: (val: boolean) => void;
  onShowTranscriptsChange?: (val: boolean) => void;
  onAiSuggestionsChange?: (val: boolean) => void;
  onCompactViewChange?: (val: boolean) => void;
}

export default function WorkspaceSection({
  autoSave: propAutoSave,
  showTranscripts: propShowTranscripts,
  aiSuggestions: propAiSuggestions,
  compactView: propCompactView,
  onAutoSaveChange,
  onShowTranscriptsChange,
  onAiSuggestionsChange,
  onCompactViewChange,
}: WorkspaceSectionProps) {
  const { t } = useTranslation(["settings", "common"]);

  // Local state for Workspace info
  const [workspaceName, setWorkspaceName] = useState(INITIAL_MOCK_SETTINGS.workspace.name);
  const [workspaceSlug, setWorkspaceSlug] = useState(INITIAL_MOCK_SETTINGS.workspace.slug);
  const [defaultResolution, setDefaultResolution] = useState(INITIAL_MOCK_SETTINGS.workspace.defaultExportResolution);
  const [defaultAspect, setDefaultAspect] = useState(INITIAL_MOCK_SETTINGS.workspace.defaultAspectRatio);
  const [defaultRole, setDefaultRole] = useState(INITIAL_MOCK_SETTINGS.workspace.defaultMemberRole);
  const [defaultLayout, setDefaultLayout] = useState(INITIAL_MOCK_SETTINGS.workspace.defaultLayout);
  const [autoPlayHover, setAutoPlayHover] = useState(INITIAL_MOCK_SETTINGS.workspace.autoPlayHover);

  // Editor switches (with prop overrides)
  const [localAutoSave, setLocalAutoSave] = useState(propAutoSave ?? INITIAL_MOCK_SETTINGS.workspace.autoSave);
  const [localShowTranscripts, setLocalShowTranscripts] = useState(
    propShowTranscripts ?? INITIAL_MOCK_SETTINGS.workspace.showTranscripts
  );
  const [localAiSuggestions, setLocalAiSuggestions] = useState(
    propAiSuggestions ?? INITIAL_MOCK_SETTINGS.workspace.aiSuggestions
  );
  const [localCompactView, setLocalCompactView] = useState(
    propCompactView ?? INITIAL_MOCK_SETTINGS.workspace.compactView
  );

  const [isSaved, setIsSaved] = useState(true);

  const autoSave = propAutoSave ?? localAutoSave;
  const showTranscripts = propShowTranscripts ?? localShowTranscripts;
  const aiSuggestions = propAiSuggestions ?? localAiSuggestions;
  const compactView = propCompactView ?? localCompactView;

  const markDirty = () => setIsSaved(false);

  const handleSave = () => {
    setIsSaved(true);
    toast.success(
      t("settings:toast.settingsSaved", "Settings saved"),
      t("settings:toast.workspaceSavedDesc", "Workspace parameters and editor defaults updated.")
    );
  };

  const handleReset = () => {
    setWorkspaceName("VidNova Creative Studio");
    setWorkspaceSlug("vidnova-creative-studio");
    setDefaultResolution("1080p");
    setDefaultAspect("16:9");
    setDefaultRole("editor");
    setDefaultLayout("grid");
    setAutoPlayHover(true);
    setLocalAutoSave(true);
    setLocalShowTranscripts(true);
    setLocalAiSuggestions(true);
    setLocalCompactView(false);
    setIsSaved(true);
    toast.info("Reset to defaults", "Workspace defaults restored.");
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:workspace.title", "Workspace & Project Defaults")}
        subtitle={t(
          "settings:workspace.subtitle",
          "Configure workspace identity, team member invite roles, render resolutions, and timeline editor preferences."
        )}
        isSaved={isSaved}
        onSave={handleSave}
        onReset={handleReset}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 1: WORKSPACE IDENTITY & SLUG */}
        <SettingCard
          title={t("settings:workspace.identityTitle", "Workspace Identity")}
          description="Your studio branding, custom workspace URL, and default member permissions."
        >
          <div className="space-y-4">
            <div>
              <SettingsInput
                label={t("settings:workspace.nameLabel", "Studio / Workspace Name")}
                value={workspaceName}
                onChange={(val) => {
                  setWorkspaceName(val);
                  markDirty();
                }}
              />
            </div>

            <div>
              <SettingsInput
                label={t("settings:workspace.slugLabel", "Custom Workspace URL Slug")}
                value={workspaceSlug}
                helperText="Direct URL: vidnova.ai/w/"
                allowCopy
                onChange={(val) => {
                  setWorkspaceSlug(val);
                  markDirty();
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                <Users size={14} className="text-[var(--color-primary)]" />
                Default Collaborator Invite Role (project_members)
              </label>
              <SelectBox
                value={defaultRole}
                onChange={(val) => {
                  setDefaultRole(val as any);
                  markDirty();
                }}
              >
                <option value="viewer">Viewer (Can watch video & preview subtitles)</option>
                <option value="commenter">Commenter (Can leave timeline feedback)</option>
                <option value="editor">Editor (Can edit translations & glossaries) - Recommended</option>
                <option value="admin">Admin (Full project management & deletion)</option>
              </SelectBox>
            </div>
          </div>
        </SettingCard>

        {/* CARD 2: PROJECT DEFAULTS & RESOLUTIONS (plan_resources) */}
        <SettingCard
          title={t("settings:workspace.defaultsTitle", "Project Pipeline Defaults")}
          description="Default rendering resolutions, aspect ratios, and studio view layouts."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  {t("settings:workspace.resolution", "Default Render Output")}
                </label>
                <SelectBox
                  value={defaultResolution}
                  onChange={(val) => {
                    setDefaultResolution(val);
                    markDirty();
                  }}
                >
                  <option value="720p">720p HD (Fast export)</option>
                  <option value="1080p">1080p Full HD (Pro default)</option>
                  <option value="4K">4K Ultra HD (Business)</option>
                </SelectBox>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  {t("settings:workspace.aspectRatio", "Default Aspect Ratio")}
                </label>
                <SelectBox
                  value={defaultAspect}
                  onChange={(val) => {
                    setDefaultAspect(val);
                    markDirty();
                  }}
                >
                  <option value="16:9">16:9 (Landscape / YouTube)</option>
                  <option value="9:16">9:16 (Vertical / TikTok / Shorts)</option>
                  <option value="1:1">1:1 (Square / Instagram)</option>
                </SelectBox>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                Default Projects Gallery View
              </label>
              <SelectBox
                value={defaultLayout}
                onChange={(val) => {
                  setDefaultLayout(val as any);
                  markDirty();
                }}
              >
                <option value="grid">Grid Card Cards (Visual thumbnails)</option>
                <option value="table">Table List View (Detailed metrics)</option>
              </SelectBox>
            </div>

            <div className="divide-y divide-[var(--color-border)]/60 pt-1">
              <SettingsRow
                icon={<Eye size={16} />}
                title="Hover Video Video Preview"
                description="Automatically play muted video clips when hovering over project cards."
              >
                <Toggle
                  checked={autoPlayHover}
                  onChange={(val) => {
                    setAutoPlayHover(val);
                    markDirty();
                  }}
                />
              </SettingsRow>
            </div>
          </div>
        </SettingCard>

        {/* CARD 3: TIMELINE EDITOR ERGONOMICS (Full width on lg) */}
        <div className="lg:col-span-2">
          <SettingCard
            title={t("settings:workspace.editorTitle", "Subtitle & Dubbing Editor Preferences")}
            description="Customize editor ergonomics, transcript synchronization, and auto-save interval."
          >
            <div className="divide-y divide-[var(--color-border)]/60">
              <SettingsRow
                icon={<Save size={16} />}
                title={t("settings:workspace.autoSave", "Continuous Cloud Auto-Save")}
                description={t(
                  "settings:workspace.autoSaveDesc",
                  "Continuously sync subtitle and translation segment edits every 5 seconds."
                )}
                badge={<SettingsBadge variant="success" size="sm">5s Interval</SettingsBadge>}
              >
                <Toggle
                  checked={autoSave}
                  onChange={(val) => {
                    onAutoSaveChange ? onAutoSaveChange(val) : setLocalAutoSave(val);
                    markDirty();
                  }}
                />
              </SettingsRow>

              <SettingsRow
                icon={<FolderGit2 size={16} />}
                title={t("settings:workspace.showTranscripts", "Split-Screen Transcript Pane")}
                description={t(
                  "settings:workspace.showTranscriptsDesc",
                  "Show source Whisper transcription side-by-side with translated target segments."
                )}
              >
                <Toggle
                  checked={showTranscripts}
                  onChange={(val) => {
                    onShowTranscriptsChange ? onShowTranscriptsChange(val) : setLocalShowTranscripts(val);
                    markDirty();
                  }}
                />
              </SettingsRow>

              <SettingsRow
                icon={<Sparkles size={16} />}
                title={t("settings:workspace.aiSuggestions", "Real-Time AI Glossary & Context Suggestions")}
                description={t(
                  "settings:workspace.aiSuggestionsDesc",
                  "Highlight preserved terms from project glossary with one-click corrections."
                )}
              >
                <Toggle
                  checked={aiSuggestions}
                  onChange={(val) => {
                    onAiSuggestionsChange ? onAiSuggestionsChange(val) : setLocalAiSuggestions(val);
                    markDirty();
                  }}
                />
              </SettingsRow>

              <SettingsRow
                icon={<LayoutGrid size={16} />}
                title={t("settings:workspace.compactView", "Compact Timeline Waveform View")}
                description={t(
                  "settings:workspace.compactViewDesc",
                  "Minimize waveform track height to view more subtitle rows simultaneously."
                )}
              >
                <Toggle
                  checked={compactView}
                  onChange={(val) => {
                    onCompactViewChange ? onCompactViewChange(val) : setLocalCompactView(val);
                    markDirty();
                  }}
                />
              </SettingsRow>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );
}
