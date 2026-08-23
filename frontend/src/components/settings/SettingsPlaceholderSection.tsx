import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SettingsSection } from "../../types/settings";

export interface SettingsPlaceholderSectionProps {
  activeSection: SettingsSection;
}

export default function SettingsPlaceholderSection({
  activeSection,
}: SettingsPlaceholderSectionProps) {
  const { t } = useTranslation(["settings"]);

  const title =
    activeSection !== "account"
      ? t(`settings:sidebar.${activeSection}` as any)
      : "";

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)] transition-colors duration-200 animate-fade-up">
      <div className="flex h-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <SlidersHorizontal size={28} />
        </div>

        <h2 className="mt-5 text-xl font-bold text-[var(--color-text-primary)]">
          {title}
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
          {t("settings:placeholder.description")}
        </p>
      </div>
    </section>
  );
}
