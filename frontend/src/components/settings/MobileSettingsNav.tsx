import {
  Bell,
  CreditCard,
  Lock,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SettingsSection } from "../../types/settings";

export interface MobileSettingsNavProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export default function MobileSettingsNav({
  activeSection,
  onSectionChange,
}: MobileSettingsNavProps) {
  const { t } = useTranslation(["settings"]);

  const items = [
    { id: "general", icon: <SlidersHorizontal size={15} />, label: t("settings:sidebar.general", "General") },
    { id: "billing", icon: <CreditCard size={15} />, label: t("settings:sidebar.billing", "Billing & Subscription") },
    { id: "notifications", icon: <Bell size={15} />, label: t("settings:sidebar.notifications", "Notifications") },
    { id: "security", icon: <Lock size={15} />, label: t("settings:sidebar.security", "Security") },
    { id: "privacy", icon: <Shield size={15} />, label: t("settings:sidebar.privacy", "Data & Privacy") },
  ] as const;

  return (
    <div className="block lg:hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-2.5 backdrop-blur-md sticky top-[84px] z-10">
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {items.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id as SettingsSection)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
