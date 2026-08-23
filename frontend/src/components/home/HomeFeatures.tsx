import {
  Captions,
  FileText,
  Languages,
  ListVideo,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function HomeFeatures() {
  const { t } = useTranslation(["home"]);

  const features = [
    {
      icon: Languages,
      title: t("home:features.translation.title"),
      description: t("home:features.translation.description"),
    },
    {
      icon: Captions,
      title: t("home:features.subtitles.title"),
      description: t("home:features.subtitles.description"),
    },
    {
      icon: FileText,
      title: t("home:features.documents.title"),
      description: t("home:features.documents.description"),
    },
    {
      icon: ListVideo,
      title: t("home:features.timeline.title"),
      description: t("home:features.timeline.description"),
    },
    {
      icon: Sparkles,
      title: t("home:features.summary.title"),
      description: t("home:features.summary.description"),
    },
  ];

  return (
    <section
      id="features"
      className="bg-[var(--color-background)] px-5 py-8 transition-colors duration-200 lg:px-8"
    >
      <div className="mx-auto grid max-w-[1400px] gap-4 md:grid-cols-2 lg:grid-cols-5">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <article
              key={feature.title}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-primary)]"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition group-hover:scale-105">
                <Icon size={22} />
              </div>

              <h3 className="mt-5 text-sm font-bold text-[var(--color-text-primary)]">
                {feature.title}
              </h3>

              <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
                {feature.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}