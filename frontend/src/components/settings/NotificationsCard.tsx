import { useTranslation } from "react-i18next";
import SettingCard from "./SettingCard";
import ToggleRow from "./ToggleRow";

export interface NotificationsCardProps {
  emailNotifications: boolean;
  processingUpdates: boolean;
  tipsNews: boolean;
  onEmailNotificationsChange: (value: boolean) => void;
  onProcessingUpdatesChange: (value: boolean) => void;
  onTipsNewsChange: (value: boolean) => void;
}

export default function NotificationsCard({
  emailNotifications,
  processingUpdates,
  tipsNews,
  onEmailNotificationsChange,
  onProcessingUpdatesChange,
  onTipsNewsChange,
}: NotificationsCardProps) {
  const { t } = useTranslation(["settings"]);

  return (
    <SettingCard
      title={t("settings:notifications.title")}
      description={t("settings:notifications.description")}
    >
      <div className="divide-y divide-[var(--color-border)]">
        <ToggleRow
          title={t("settings:notifications.emailNotifications")}
          description={t("settings:notifications.emailNotificationsDesc")}
          checked={emailNotifications}
          onChange={onEmailNotificationsChange}
        />

        <ToggleRow
          title={t("settings:notifications.processingUpdates")}
          description={t("settings:notifications.processingUpdatesDesc")}
          checked={processingUpdates}
          onChange={onProcessingUpdatesChange}
        />

        <ToggleRow
          title={t("settings:notifications.tipsNews")}
          description={t("settings:notifications.tipsNewsDesc")}
          checked={tipsNews}
          onChange={onTipsNewsChange}
        />
      </div>
    </SettingCard>
  );
}
