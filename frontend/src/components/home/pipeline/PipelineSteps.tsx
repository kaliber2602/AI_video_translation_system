import {
  UploadCloud,
  FileText,
  Languages,
  Captions,
  Volume2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PipelineSteps() {
  const { t } = useTranslation(["pipeline", "home"]);

  const steps = [
    {
      id: "upload",
      number: "01",
      icon: UploadCloud,
      title: t("pipeline:steps.upload.title"),
      description: t("pipeline:steps.upload.description"),
      accent: "from-teal-500/20 to-teal-500/5",
    },
    {
      id: "transcript",
      number: "02",
      icon: FileText,
      title: t("pipeline:steps.transcript.title"),
      description: t("pipeline:steps.transcript.description"),
      accent: "from-blue-500/20 to-blue-500/5",
    },
    {
      id: "translation",
      number: "03",
      icon: Languages,
      title: t("pipeline:steps.translation.title"),
      description: t("pipeline:steps.translation.description"),
      accent: "from-indigo-500/20 to-indigo-500/5",
    },
    {
      id: "subtitle",
      number: "04",
      icon: Captions,
      title: t("pipeline:steps.subtitle.title"),
      description: t("pipeline:steps.subtitle.description"),
      accent: "from-purple-500/20 to-purple-500/5",
    },
    {
      id: "dubbing",
      number: "05",
      icon: Volume2,
      title: t("pipeline:steps.dubbing.title"),
      description: t("pipeline:steps.dubbing.description"),
      accent: "from-emerald-500/20 to-emerald-500/5",
    },
    {
      id: "reviewExport",
      number: "06",
      icon: CheckCircle2,
      title: t("pipeline:steps.reviewExport.title"),
      description: t("pipeline:steps.reviewExport.description"),
      accent: "from-amber-500/20 to-amber-500/5",
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">
            Stage 1 • Overview
          </span>
          <h3 className="mt-1 text-xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
            {t("home:pipelineSection.cardsSubtitle")}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[var(--color-primary)] hover:shadow-xl"
            >
              {/* Top ambient glow */}
              <div
                className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b ${step.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />

              <div className="relative z-10">
                {/* Header with Number & Icon */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-black tracking-tighter text-[var(--color-primary)]/80 transition-colors group-hover:text-[var(--color-primary)]">
                    {step.number}
                  </span>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition-transform duration-300 ease-out group-hover:scale-110 group-hover:bg-[var(--color-primary)] group-hover:text-white">
                    <Icon size={18} />
                  </div>
                </div>

                {/* Step Title */}
                <h4 className="mt-4 text-sm font-black tracking-tight text-[var(--color-text-primary)]">
                  {step.title}
                </h4>

                {/* Step Description */}
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {step.description}
                </p>
              </div>

              {/* Bottom Step Indicator Arrow */}
              {idx < steps.length - 1 && (
                <div className="relative z-10 mt-4 hidden items-center text-[10px] font-bold text-[var(--color-text-muted)] lg:flex">
                  <span className="transition-transform group-hover:translate-x-1">
                    <ArrowRight size={13} className="text-[var(--color-primary)]" />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
