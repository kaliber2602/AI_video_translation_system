import {
  Clock3,
  Globe2,
  Play,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function HomeStats() {
  const { t } = useTranslation(["home"]);

  const stats = [
    {
      icon: Users,
      value: "10,000+",
      label: t("home:stats.users"),
    },
    {
      icon: Play,
      value: "50,000+",
      label: t("home:stats.videos"),
    },
    {
      icon: Globe2,
      value: "100+",
      label: t("home:stats.languages"),
    },
    {
      icon: Clock3,
      value: "98%",
      label: t("home:stats.accuracy"),
    },
  ];

  return (
    <section className="px-5 py-6 lg:px-8">
      <div className="mx-auto grid max-w-[1400px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-colors duration-200 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className={`flex items-center gap-4 px-7 py-5 ${
                index !== 0
                  ? "border-t border-[var(--color-border)] sm:border-t-0 sm:border-l"
                  : ""
              } ${
                index === 2
                  ? "lg:border-l"
                  : ""
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm">
                <Icon size={20} />
              </div>

              <div>
                <p className="text-lg font-black text-[var(--color-primary)]">
                  {stat.value}
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}