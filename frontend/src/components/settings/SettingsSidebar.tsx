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
  return (
    <aside className="hidden w-[215px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 transition-colors duration-200 lg:block">
      <nav className="space-y-1">
        <SettingItem
          icon={<User size={17} />}
          title="Account"
          active={activeSection === "account"}
          onClick={() => onSectionChange("account")}
        />

        <SettingItem
          icon={<SlidersHorizontal size={17} />}
          title="General"
          active={activeSection === "general"}
          onClick={() => onSectionChange("general")}
        />

        <SettingItem
          icon={<Globe size={17} />}
          title="Workspace"
          active={activeSection === "workspace"}
          onClick={() => onSectionChange("workspace")}
        />

        <SettingItem
          icon={<Bot size={17} />}
          title="AI & Processing"
          active={activeSection === "ai"}
          onClick={() => onSectionChange("ai")}
        />

        <SettingItem
          icon={<Globe size={17} />}
          title="Translation & Voice"
          active={activeSection === "translation"}
          onClick={() => onSectionChange("translation")}
        />

        <SettingItem
          icon={<Palette size={17} />}
          title="Billing & Subscription"
          active={activeSection === "billing"}
          onClick={() => onSectionChange("billing")}
        />

        <SettingItem
          icon={<Bell size={17} />}
          title="Notifications"
          active={activeSection === "notifications"}
          onClick={() => onSectionChange("notifications")}
        />

        <SettingItem
          icon={<SlidersHorizontal size={17} />}
          title="Integrations"
          active={activeSection === "integrations"}
          onClick={() => onSectionChange("integrations")}
        />

        <SettingItem
          icon={<Lock size={17} />}
          title="Security"
          active={activeSection === "security"}
          onClick={() => onSectionChange("security")}
        />

        <SettingItem
          icon={<Shield size={17} />}
          title="Data & Privacy"
          active={activeSection === "privacy"}
          onClick={() => onSectionChange("privacy")}
        />
      </nav>
    </aside>
  );
}
