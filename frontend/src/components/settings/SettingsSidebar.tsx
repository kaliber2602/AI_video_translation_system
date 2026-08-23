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

  return (
    <aside className="hidden w-[215px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 transition-colors duration-200 lg:block">
      <nav className="space-y-1">
        <SettingItem
          icon={<User size={17} />}
          title={t("settings:sidebar.account")}
          active={activeSection === "account"}
          onClick={() => onSectionChange("account")}
        />

        <SettingItem
          icon={<SlidersHorizontal size={17} />}
          title={t("settings:sidebar.general")}
          active={activeSection === "general"}
          onClick={() => onSectionChange("general")}
        />

        <SettingItem
          icon={<Globe size={17} />}
          title={t("settings:sidebar.workspace")}
          active={activeSection === "workspace"}
          onClick={() => onSectionChange("workspace")}
        />

        <SettingItem
          icon={<Bot size={17} />}
          title={t("settings:sidebar.ai")}
          active={activeSection === "ai"}
          onClick={() => onSectionChange("ai")}
        />

        <SettingItem
          icon={<Globe size={17} />}
          title={t("settings:sidebar.translation")}
          active={activeSection === "translation"}
          onClick={() => onSectionChange("translation")}
        />

        <SettingItem
          icon={<Palette size={17} />}
          title={t("settings:sidebar.billing")}
          active={activeSection === "billing"}
          onClick={() => onSectionChange("billing")}
        />

        <SettingItem
          icon={<Bell size={17} />}
          title={t("settings:sidebar.notifications")}
          active={activeSection === "notifications"}
          onClick={() => onSectionChange("notifications")}
        />

        <SettingItem
          icon={<SlidersHorizontal size={17} />}
          title={t("settings:sidebar.integrations")}
          active={activeSection === "integrations"}
          onClick={() => onSectionChange("integrations")}
        />

        <SettingItem
          icon={<Lock size={17} />}
          title={t("settings:sidebar.security")}
          active={activeSection === "security"}
          onClick={() => onSectionChange("security")}
        />

        <SettingItem
          icon={<Shield size={17} />}
          title={t("settings:sidebar.privacy")}
          active={activeSection === "privacy"}
          onClick={() => onSectionChange("privacy")}
        />
      </nav>
    </aside>
  );
}
