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
  return (
    <SettingCard
      title="Notifications"
      description="Manage how you receive updates"
    >
      <div className="divide-y divide-[#EEF2F1]">
        <ToggleRow
          title="Email Notifications"
          description="Receive important updates via email"
          checked={emailNotifications}
          onChange={onEmailNotificationsChange}
        />

        <ToggleRow
          title="Processing Updates"
          description="Get notified when processing is complete"
          checked={processingUpdates}
          onChange={onProcessingUpdatesChange}
        />

        <ToggleRow
          title="Tips & News"
          description="Receive product tips and new features"
          checked={tipsNews}
          onChange={onTipsNewsChange}
        />
      </div>
    </SettingCard>
  );
}
