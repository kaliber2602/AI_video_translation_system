import type React from "react";

export interface SettingCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function SettingCard({
  title,
  description,
  children,
}: SettingCardProps) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-colors duration-200">
      <div className="mb-5">
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">
          {title}
        </h2>

        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}
