import {
  Bell,
  CreditCard,
  Lock,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SettingsSection } from "../../types/settings";
import SettingItem from "./SettingItem";

export interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export default function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  const { t } = useTranslation(["settings"]);

  const items = [
    { id: "general", icon: <SlidersHorizontal size={17} />, title: t("settings:sidebar.general", "General") },
    { id: "billing", icon: <CreditCard size={17} />, title: t("settings:sidebar.billing", "Billing & Subscription") },
    { id: "notifications", icon: <Bell size={17} />, title: t("settings:sidebar.notifications", "Notifications") },
    { id: "security", icon: <Lock size={17} />, title: t("settings:sidebar.security", "Security") },
    { id: "privacy", icon: <Shield size={17} />, title: t("settings:sidebar.privacy", "Data & Privacy") },
  ] as const;

  return (
    <aside className="hidden w-[230px] shrink-0 sidebar-glass px-3.5 py-6 transition-colors duration-200 lg:block">
      <nav className="space-y-1.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`animate-scale-in stagger-${(index % 5) + 1}`}
          >
            <SettingItem
              icon={item.icon}
              title={item.title}
              active={activeSection === item.id}
              onClick={() => onSectionChange(item.id as SettingsSection)}
            />
          </div>
        ))}
      </nav>
    </aside>
  );
}
