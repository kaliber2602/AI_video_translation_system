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
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-all duration-240 ease-out hover:border-[var(--color-primary)]/40 hover:shadow-md">
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
