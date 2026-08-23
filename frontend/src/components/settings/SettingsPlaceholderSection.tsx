import { SlidersHorizontal } from "lucide-react";
import type { SettingsSection } from "../../types/settings";

export interface SettingsPlaceholderSectionProps {
  activeSection: SettingsSection;
}

const SECTION_TITLES: Record<Exclude<SettingsSection, "account">, string> = {
  ai: "AI & Processing",
  general: "General Settings",
  workspace: "Workspace Preferences",
  translation: "Translation & Voice",
  billing: "Billing & Subscription",
  notifications: "Notifications",
  integrations: "Integrations",
  security: "Security",
  privacy: "Data & Privacy",
};

export default function SettingsPlaceholderSection({
  activeSection,
}: SettingsPlaceholderSectionProps) {
  const title =
    activeSection !== "account"
      ? SECTION_TITLES[activeSection]
      : "";

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)] transition-colors duration-200">
      <div className="flex h-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <SlidersHorizontal size={28} />
        </div>

        <h2 className="mt-5 text-xl font-bold text-[var(--color-text-primary)]">
          {title}
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
          This settings section is ready for configuration. The detailed controls
          can be connected to the backend later.
        </p>
      </div>
    </section>
  );
}
