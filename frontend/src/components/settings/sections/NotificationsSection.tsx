import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  HardDrive,
  MessageSquare,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import Toggle from "../Toggle";
import {
  createTestAlert,
  getPreferences,
  updatePreferences,
} from "../../../services/notification.service";
import type {
  NotificationPreferences,
  NotificationPreferencesPatch,
} from "../../../types/notification";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_on_pipeline_success: true,
  email_on_pipeline_failed: true,
  email_on_quota_warning: true,
  email_on_project_invitation: true,
  email_on_comment_mention: true,
  inapp_on_pipeline_success: true,
  inapp_on_pipeline_failed: true,
  inapp_on_quota_warning: true,
  inapp_on_project_invitation: true,
  inapp_on_comment_mention: true,
};

export default function NotificationsSection() {
  const { t } = useTranslation(["notifications", "settings", "common"]);

  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [initialPreferences, setInitialPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // 1. Fetch preferences from backend on mount
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getPreferences();
      setPreferences(data);
      setInitialPreferences(data);
      setIsSaved(true);
    } catch (err: any) {
      console.error("[NotificationsSection] Failed to load preferences:", err);
      toast.error(
        t("common:error", "Error"),
        t("notifications:preferences.loadError", "Could not load notification preferences.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // 2. Handle partial toggle updates
  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    setIsSaved(false);

    // Persist change through real backend PATCH endpoint
    try {
      const patch: NotificationPreferencesPatch = { [key]: value };
      const res = await updatePreferences(patch);
      setPreferences(res);
      setInitialPreferences(res);
      setIsSaved(true);
    } catch (err: any) {
      console.error("[NotificationsSection] Failed to update preference:", err);
      toast.error(
        t("common:error", "Error"),
        t("notifications:preferences.saveError", "Failed to update preference.")
      );
      // Rollback on error
      setPreferences(initialPreferences);
    }
  };

  // 3. Handle explicit Save
  const handleSaveAll = async () => {
    if (isSaving || isSaved) return;

    try {
      setIsSaving(true);
      const res = await updatePreferences(preferences);
      setPreferences(res);
      setInitialPreferences(res);
      setIsSaved(true);
      toast.success(
        t("settings:toast.settingsSaved", "Settings saved"),
        t(
          "notifications:preferences.saveSuccess",
          "Notification preferences updated successfully."
        )
      );
    } catch (err: any) {
      console.error("[NotificationsSection] Failed to save preferences:", err);
      toast.error(
        t("common:error", "Error"),
        t("notifications:preferences.saveError", "Failed to update notification preferences.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Handle Reset
  const handleReset = () => {
    setPreferences(initialPreferences);
    setIsSaved(true);
    toast.info(t("common:info", "Info"), t("settings:toast.resetDesc", "Preferences reset."));
  };

  // 5. Handle Test Alert (triggers real POST /api/notifications/test-alert)
  const handleTestAlert = async () => {
    if (isSendingTest) return;

    try {
      setIsSendingTest(true);
      await createTestAlert({
        type: "system",
        title: "Test Notification",
        message: "This is a simulated verification alert generated from Settings.",
      });

      toast.success(
        t("notifications:preferences.testAlertSuccess", "Test notification generated in-app."),
        t("notifications:centerSubtitle", "Check the notification bell in the topbar.")
      );

      // Dispatch event to trigger bell counter refresh across the app
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    } catch (err: any) {
      console.error("[NotificationsSection] Failed to send test alert:", err);
      toast.error(
        t("common:error", "Error"),
        t("notifications:preferences.testAlertError", "Failed to generate test notification.")
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 rounded-2xl bg-[var(--color-surface-muted)] animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 rounded-2xl bg-[var(--color-surface-muted)] animate-pulse" />
          <div className="h-64 rounded-2xl bg-[var(--color-surface-muted)] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("notifications:preferences.title", "Notification Channels & Preferences")}
        subtitle={t(
          "notifications:preferences.subtitle",
          "Choose which alerts reach your email inbox and which appear as in-app badges."
        )}
        isSaved={isSaved}
        onSave={handleSaveAll}
        onReset={handleReset}
        actions={
          <button
            type="button"
            onClick={handleTestAlert}
            disabled={isSendingTest}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] active:scale-95 shadow-xs disabled:opacity-50"
          >
            <Send
              size={13}
              className={`text-[var(--color-primary)] ${isSendingTest ? "animate-spin" : ""}`}
            />
            <span>
              {isSendingTest
                ? t("common:loading", "Sending...")
                : t("notifications:preferences.sendTestAlert", "Send Test Alert")}
            </span>
          </button>
        }
      />

      {/* Grid of Logical Groups: Pipeline, Quota, Collaboration */}
      <div className="grid gap-6">
        {/* =====================================================
            1. VIDEO PIPELINE PROCESSING
        ====================================================== */}
        <SettingCard
          title={t("notifications:preferences.pipelineGroup", "Video Pipeline Processing")}
          description={t(
            "notifications:preferences.pipelineGroupDesc",
            "Granular alerts for automated speech recognition, neural translation, and voice dubbing."
          )}
        >
          <div className="divide-y divide-[var(--color-border)]/60">
            {/* Pipeline Success */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
                    {t("notifications:preferences.pipelineSuccess", "Pipeline Completed Successfully")}
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {t(
                      "notifications:preferences.pipelineSuccessDesc",
                      "Alert when transcription, translation, and dubbing finish rendering."
                    )}
                  </p>
                </div>
              </div>

              {/* In-App & Email Channel Toggles */}
              <div className="flex items-center gap-4 shrink-0 sm:pl-4">
                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.inAppChannel", "In-App")}</span>
                  <Toggle
                    checked={preferences.inapp_on_pipeline_success}
                    onChange={(val) => handleToggle("inapp_on_pipeline_success", val)}
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.emailChannel", "Email")}</span>
                  <Toggle
                    checked={preferences.email_on_pipeline_success}
                    onChange={(val) => handleToggle("email_on_pipeline_success", val)}
                  />
                </label>
              </div>
            </div>

            {/* Pipeline Failure */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
                    {t("notifications:preferences.pipelineFailed", "Pipeline Errors & Processing Failures")}
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {t(
                      "notifications:preferences.pipelineFailedDesc",
                      "Immediate alert when an audio separation, translation, or codec step fails."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 sm:pl-4">
                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.inAppChannel", "In-App")}</span>
                  <Toggle
                    checked={preferences.inapp_on_pipeline_failed}
                    onChange={(val) => handleToggle("inapp_on_pipeline_failed", val)}
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.emailChannel", "Email")}</span>
                  <Toggle
                    checked={preferences.email_on_pipeline_failed}
                    onChange={(val) => handleToggle("email_on_pipeline_failed", val)}
                  />
                </label>
              </div>
            </div>
          </div>
        </SettingCard>

        {/* =====================================================
            2. STORAGE & USAGE QUOTAS
        ====================================================== */}
        <SettingCard
          title={t("notifications:preferences.quotaGroup", "Storage & Credit Limits")}
          description={t(
            "notifications:preferences.quotaGroupDesc",
            "Threshold warnings to prevent interrupted video processing jobs."
          )}
        >
          <div className="py-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <HardDrive size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
                    {t("notifications:preferences.quotaWarning", "Quota Warning Threshold (85%)")}
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {t(
                      "notifications:preferences.quotaWarningDesc",
                      "Alert when storage volume or monthly AI processing credits reach 85%."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 sm:pl-4">
                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.inAppChannel", "In-App")}</span>
                  <Toggle
                    checked={preferences.inapp_on_quota_warning}
                    onChange={(val) => handleToggle("inapp_on_quota_warning", val)}
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.emailChannel", "Email")}</span>
                  <Toggle
                    checked={preferences.email_on_quota_warning}
                    onChange={(val) => handleToggle("email_on_quota_warning", val)}
                  />
                </label>
              </div>
            </div>
          </div>
        </SettingCard>

        {/* =====================================================
            3. TEAM & COLLABORATION
        ====================================================== */}
        <SettingCard
          title={t("notifications:preferences.collaborationGroup", "Projects & Collaboration")}
          description={t(
            "notifications:preferences.collaborationGroupDesc",
            "Notifications regarding team invitations, shared workspaces, and video comments."
          )}
        >
          <div className="divide-y divide-[var(--color-border)]/60">
            {/* Project Invitation */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <Users size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
                    {t("notifications:preferences.projectInvitation", "Project Invitation")}
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {t(
                      "notifications:preferences.projectInvitationDesc",
                      "Notify when team members invite you to collaborate on a video project."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 sm:pl-4">
                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.inAppChannel", "In-App")}</span>
                  <Toggle
                    checked={preferences.inapp_on_project_invitation}
                    onChange={(val) => handleToggle("inapp_on_project_invitation", val)}
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.emailChannel", "Email")}</span>
                  <Toggle
                    checked={preferences.email_on_project_invitation}
                    onChange={(val) => handleToggle("email_on_project_invitation", val)}
                  />
                </label>
              </div>
            </div>

            {/* Comment Mention */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
                    {t("notifications:preferences.commentMention", "Timeline Review Comments & Mentions")}
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {t(
                      "notifications:preferences.commentMentionDesc",
                      "Notify when collaborators leave timecoded feedback or mention your account."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 sm:pl-4">
                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.inAppChannel", "In-App")}</span>
                  <Toggle
                    checked={preferences.inapp_on_comment_mention}
                    onChange={(val) => handleToggle("inapp_on_comment_mention", val)}
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
                  <span>{t("notifications:preferences.emailChannel", "Email")}</span>
                  <Toggle
                    checked={preferences.email_on_comment_mention}
                    onChange={(val) => handleToggle("email_on_comment_mention", val)}
                  />
                </label>
              </div>
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  );
}
