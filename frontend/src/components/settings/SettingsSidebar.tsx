import {
  Bell,
  Bot,
  Globe,
  Lock,
  Palette,
  Shield,
  SlidersHorizontal,
  User,
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
    { id: "account", icon: <User size={17} />, title: t("settings:sidebar.account") },
    { id: "general", icon: <SlidersHorizontal size={17} />, title: t("settings:sidebar.general") },
    { id: "workspace", icon: <Globe size={17} />, title: t("settings:sidebar.workspace") },
    { id: "ai", icon: <Bot size={17} />, title: t("settings:sidebar.ai") },
    { id: "translation", icon: <Globe size={17} />, title: t("settings:sidebar.translation") },
    { id: "billing", icon: <Palette size={17} />, title: t("settings:sidebar.billing") },
    { id: "notifications", icon: <Bell size={17} />, title: t("settings:sidebar.notifications") },
    { id: "integrations", icon: <SlidersHorizontal size={17} />, title: t("settings:sidebar.integrations") },
    { id: "security", icon: <Lock size={17} />, title: t("settings:sidebar.security") },
    { id: "privacy", icon: <Shield size={17} />, title: t("settings:sidebar.privacy") },
  ] as const;

  return (
    <aside className="hidden w-[215px] shrink-0 sidebar-glass px-3.5 py-6 transition-colors duration-200 lg:block">
      <nav className="space-y-1.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`animate-scale-in stagger-${(index % 6) + 1}`}
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
