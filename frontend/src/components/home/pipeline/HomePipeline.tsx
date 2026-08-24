import { Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import PipelineSteps from "./PipelineSteps";
import PipelineDiagram from "./PipelineDiagram";

export default function HomePipeline() {
  const { t } = useTranslation(["home"]);

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-[var(--color-background)] px-5 py-20 transition-colors duration-200 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1400px]">
        {/* Main Section Header */}
        <div className="mx-auto max-w-[840px] text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3.5 py-1.5 text-xs font-bold text-[var(--color-primary)] shadow-sm">
            <Workflow size={14} />
            <span>{t("home:pipelineSection.badge")}</span>
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
            {t("home:pipelineSection.title")}
          </h2>

          <p className="mx-auto mt-4 max-w-[640px] text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
            {t("home:pipelineSection.subtitle")}
          </p>
        </div>

        {/* TẦNG 1: 6 PIPELINE OVERVIEW CARDS */}
        <PipelineSteps />

        {/* TẦNG 2: VISUAL PIPELINE DIAGRAM */}
        <PipelineDiagram />
      </div>
    </section>
  );
}
