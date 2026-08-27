import { useState } from "react";
import {
  Bell,
  Zap,
  ShieldAlert,
  Users,
  MessageSquare,
  HardDrive,
  CheckCircle2,
  Send,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsRow from "../common/SettingsRow";
import SettingsBadge from "../common/SettingsBadge";
import Toggle from "../Toggle";
import { INITIAL_MOCK_SETTINGS } from "../mock/settingsMockData";

export interface NotificationsSectionProps {
  emailNotifications?: boolean;
  processingUpdates?: boolean;
  tipsNews?: boolean;
  onEmailNotificationsChange?: (val: boolean) => void;
  onProcessingUpdatesChange?: (val: boolean) => void;
  onTipsNewsChange?: (val: boolean) => void;
}

export default function NotificationsSection({
  emailNotifications: propEmailNotifications,
  processingUpdates: propProcessingUpdates,
  tipsNews: propTipsNews,
  onEmailNotificationsChange,
  onProcessingUpdatesChange,
  onTipsNewsChange,
}: NotificationsSectionProps) {
  const { t } = useTranslation(["settings", "common"]);

  // Aligned with database user_notification_preferences
  const [emailPipelineSuccess, setEmailPipelineSuccess] = useState(
    propEmailNotifications ?? INITIAL_MOCK_SETTINGS.notifications.emailOnPipelineSuccess
  );
  const [emailPipelineFailed, setEmailPipelineFailed] = useState(
    INITIAL_MOCK_SETTINGS.notifications.emailOnPipelineFailed
  );
  const [emailQuotaWarning, setEmailQuotaWarning] = useState(
    INITIAL_MOCK_SETTINGS.notifications.emailOnQuotaWarning
  );
  const [emailProjectInvitation, setEmailProjectInvitation] = useState(
    INITIAL_MOCK_SETTINGS.notifications.emailOnProjectInvitation
  );
  const [emailCommentMention, setEmailCommentMention] = useState(
    INITIAL_MOCK_SETTINGS.notifications.emailOnCommentMention
  );

  const [inappPipelineSuccess, setInappPipelineSuccess] = useState(
    propProcessingUpdates ?? INITIAL_MOCK_SETTINGS.notifications.inappOnPipelineSuccess
  );
  const [inappPipelineFailed, setInappPipelineFailed] = useState(
    INITIAL_MOCK_SETTINGS.notifications.inappOnPipelineFailed
  );
  const [inappQuotaWarning, setInappQuotaWarning] = useState(
    INITIAL_MOCK_SETTINGS.notifications.inappOnQuotaWarning
  );
  const [inappProjectInvitation, setInappProjectInvitation] = useState(
    INITIAL_MOCK_SETTINGS.notifications.inappOnProjectInvitation
  );
  const [inappCommentMention, setInappCommentMention] = useState(
    INITIAL_MOCK_SETTINGS.notifications.inappOnCommentMention
  );

  const [productUpdates, setProductUpdates] = useState(
    propTipsNews ?? INITIAL_MOCK_SETTINGS.notifications.productUpdates
  );
  const [browserPush, setBrowserPush] = useState(
    INITIAL_MOCK_SETTINGS.notifications.browserPush
  );

  const [isSaved, setIsSaved] = useState(true);

  const markDirty = () => setIsSaved(false);

  const handleSave = () => {
    setIsSaved(true);
    toast.success(
      t("settings:toast.settingsSaved", "Settings saved"),
      t(
        "settings:toast.notificationsSavedDesc",
        "Notification delivery preferences and channel alerts updated."
      )
    );
  };

  const handleReset = () => {
    setEmailPipelineSuccess(true);
    setEmailPipelineFailed(true);
    setEmailQuotaWarning(true);
    setEmailProjectInvitation(true);
    setEmailCommentMention(true);
    setInappPipelineSuccess(true);
    setInappPipelineFailed(true);
    setInappQuotaWarning(true);
    setInappProjectInvitation(true);
    setInappCommentMention(true);
    setProductUpdates(true);
    setBrowserPush(false);
    setIsSaved(true);
    toast.info("Reset to defaults", "Notification preferences restored.");
  };

  const handleTestAlert = () => {
    toast.success(
      "Test Notification Triggered",
      "Pipeline Job #9a8f completed: 'Marketing Launch 2026' translated into Vietnamese."
    );
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:notifications.title", "Notifications & Alerts")}
        subtitle={t(
          "settings:notifications.subtitle",
          "Configure granular Email and In-App notification channels for translation pipelines, quotas, and collaboration."
        )}
        isSaved={isSaved}
        onSave={handleSave}
        onReset={handleReset}
        actions={
          <button
            type="button"
            onClick={handleTestAlert}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] active:scale-95 shadow-sm"
          >
            <Send size={13} className="text-[var(--color-primary)]" />
            <span>Send Test Alert</span>
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 1: EMAIL NOTIFICATION CHANNELS (user_notification_preferences) */}
        <SettingCard
          title="Email Notification Channels"
          description="High-priority status updates delivered to alex.morgan@vidnova.ai."
        >
          <div className="divide-y divide-[var(--color-border)]/60">
            <SettingsRow
              icon={<CheckCircle2 size={16} />}
              title="Pipeline Success Alerts"
              description="Receive an email when video transcription, translation, and dubbing finish."
            >
              <Toggle
                checked={emailPipelineSuccess}
                onChange={(val) => {
                  setEmailPipelineSuccess(val);
                  if (onEmailNotificationsChange) onEmailNotificationsChange(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<ShieldAlert size={16} />}
              title="Pipeline Failure & Codec Errors"
              description="Instant priority alert if video separation or voice synthesis fails."
            >
              <Toggle
                checked={emailPipelineFailed}
                onChange={(val) => {
                  setEmailPipelineFailed(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<HardDrive size={16} />}
              title="Quota Warning (85% Limit)"
              description="Alert when storage capacity or monthly AI credits reach 85%."
            >
              <Toggle
                checked={emailQuotaWarning}
                onChange={(val) => {
                  setEmailQuotaWarning(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<Users size={16} />}
              title="Project Collaboration Invitations"
              description="Email when invited to collaborate on a new video translation project."
            >
              <Toggle
                checked={emailProjectInvitation}
                onChange={(val) => {
                  setEmailProjectInvitation(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<MessageSquare size={16} />}
              title="Timeline Comments & Mentions"
              description="Notify when team members leave timecoded review comments on your video."
            >
              <Toggle
                checked={emailCommentMention}
                onChange={(val) => {
                  setEmailCommentMention(val);
                  markDirty();
                }}
              />
            </SettingsRow>
          </div>
        </SettingCard>

        {/* CARD 2: IN-APP & REAL-TIME ALERTS (user_notification_preferences) */}
        <SettingCard
          title="In-App & Bell Center Alerts"
          description="Real-time banner badges in the top application header and desktop push."
        >
          <div className="divide-y divide-[var(--color-border)]/60">
            <SettingsRow
              icon={<Zap size={16} />}
              title="In-App Pipeline Progress Updates"
              description="Live toast notification when background rendering step changes."
            >
              <Toggle
                checked={inappPipelineSuccess}
                onChange={(val) => {
                  setInappPipelineSuccess(val);
                  if (onProcessingUpdatesChange) onProcessingUpdatesChange(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<ShieldAlert size={16} />}
              title="In-App Failure Warnings"
              description="Show red error toasts in notification tray on job failure."
            >
              <Toggle
                checked={inappPipelineFailed}
                onChange={(val) => {
                  setInappPipelineFailed(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<HardDrive size={16} />}
              title="In-App Storage Warning"
              description="Badge notification when cloud storage exceeds 85%."
            >
              <Toggle
                checked={inappQuotaWarning}
                onChange={(val) => {
                  setInappQuotaWarning(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<Users size={16} />}
              title="In-App Team Activity"
              description="Notify when members accept project invitations or edit glossaries."
            >
              <Toggle
                checked={inappProjectInvitation}
                onChange={(val) => {
                  setInappProjectInvitation(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<MessageSquare size={16} />}
              title="In-App Comment Mentions"
              description="Show unread indicator when mentioned in timeline annotations."
            >
              <Toggle
                checked={inappCommentMention}
                onChange={(val) => {
                  setInappCommentMention(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<Sparkles size={16} />}
              title="Product Releases & Model Updates"
              description="Receive notifications about newly released AI models and features."
            >
              <Toggle
                checked={productUpdates}
                onChange={(val) => {
                  setProductUpdates(val);
                  if (onTipsNewsChange) onTipsNewsChange(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<Bell size={16} />}
              title="Browser Desktop Push Notifications"
              description="Enable Web Push alerts even when the VidNova tab is in background."
              badge={browserPush ? <SettingsBadge variant="success" size="sm">Active</SettingsBadge> : undefined}
            >
              <Toggle
                checked={browserPush}
                onChange={(val) => {
                  setBrowserPush(val);
                  markDirty();
                  if (val) {
                    toast.info("Browser Push", "Simulated browser push permission granted.");
                  }
                }}
              />
            </SettingsRow>
          </div>
        </SettingCard>
      </div>
    </div>
  );
}
