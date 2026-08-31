import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Save,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import UploadStep from "../components/pipeline/UploadStep";
import TranscriptStep from "../components/pipeline/TranscriptStep";
import TranslationStep from "../components/pipeline/TranslationStep";
import SubtitleStep from "../components/pipeline/SubtitleStep";
import DubbingStep from "../components/pipeline/DubbingStep";
import ReviewExportStep from "../components/pipeline/ReviewExportStep";

function renderStep(step: string) {
  switch (step) {
    case "upload":
      return <UploadStep />;

    case "transcript":
      return <TranscriptStep />;

    case "translation":
      return <TranslationStep />;

    case "subtitle":
      return <SubtitleStep />;

    case "dubbing":
      return <DubbingStep />;

    case "review-export":
      return <ReviewExportStep />;

    default:
      return <UploadStep />;
  }
}

export default function VideoPipeline() {
  const { t } = useTranslation(["pipeline", "common"]);
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState("translation");
  const [isSaved, setIsSaved] = useState(true);

  const pipelineSteps = [
    {
      id: "upload",
      number: "01",
      title: t("pipeline:steps.upload.title"),
      description: t("pipeline:steps.upload.description"),
    },
    {
      id: "transcript",
      number: "02",
      title: t("pipeline:steps.transcript.title"),
      description: t("pipeline:steps.transcript.description"),
    },
    {
      id: "translation",
      number: "03",
      title: t("pipeline:steps.translation.title"),
      description: t("pipeline:steps.translation.description"),
    },
    {
      id: "subtitle",
      number: "04",
      title: t("pipeline:steps.subtitle.title"),
      description: t("pipeline:steps.subtitle.description"),
    },
    {
      id: "dubbing",
      number: "05",
      title: t("pipeline:steps.dubbing.title"),
      description: t("pipeline:steps.dubbing.description"),
    },
    {
      id: "review-export",
      number: "06",
      title: t("pipeline:steps.reviewExport.title"),
      description: t("pipeline:steps.reviewExport.description"),
    },
  ];

  const activeStepIndex = pipelineSteps.findIndex(
    (step) => step.id === activeStep,
  );

  const progress = Math.round(
    ((activeStepIndex + 1) / pipelineSteps.length) * 100,
  );

  const handleStepChange = (stepId: string) => {
    setActiveStep(stepId);
    setIsSaved(false);
  };

  const handleSave = () => {
    setIsSaved(true);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200 page-enter">
      <header className="flex min-h-[64px] sm:min-h-[76px] items-center justify-between gap-3 sm:gap-4 border-b border-[var(--color-border)] liquid-glass px-3.5 py-3 backdrop-blur-xl transition-colors duration-200 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate("/workspace")}
            aria-label={t("common:back")}
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-all duration-200 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <ArrowLeft size={17} />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="truncate text-sm font-bold text-[var(--color-text-primary)] sm:text-lg">
                NLP Introduction
              </h1>

              <span className="rounded-full bg-[#FFF2D8] px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-[#C68A1C] dark:bg-amber-950/50 dark:text-amber-300">
                {t("pipeline:header.inProgress")}
              </span>
            </div>

            <p className="mt-0.5 truncate text-[11px] sm:text-xs text-[var(--color-text-muted)]">
              NLP Tutorials / nlp-introduction.mp4
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] xl:flex">
            <Clock3 size={15} />

            <span>
              {isSaved ? t("pipeline:header.savedJustNow") : t("pipeline:header.unsavedChanges")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-200 ease-out active:scale-95 sm:px-4 ${
              isSaved
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                : "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
            }`}
          >
            <Save size={15} />

            <span className="hidden sm:inline">
              {isSaved ? t("common:saved") : t("common:save")}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 p-3.5 sm:gap-6 sm:p-6 lg:flex-row lg:p-8">
        <div className="overflow-x-auto lg:hidden">
          <div className="flex min-w-max gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)]">
            {pipelineSteps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isCompleted = index < activeStepIndex;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepChange(step.id)}
                  className={`flex min-w-[130px] items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ease-out ${
                    isActive
                      ? "bg-[var(--color-primary-soft)] shadow-2xs"
                      : "hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out ${
                      isCompleted
                        ? "bg-[var(--color-primary)] text-white"
                        : isActive
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={14} />
                    ) : isActive ? (
                      <Circle size={12} fill="currentColor" />
                    ) : (
                      <span className="text-[10px] font-bold">
                        {step.number}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-xs font-bold ${
                        isActive
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {step.title}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-[var(--color-text-muted)]">
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="hidden w-[280px] shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] lg:block">
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Video Pipeline
            </p>

            <h2 className="mt-1 text-base font-black text-[var(--color-text-primary)]">
              Processing Steps
            </h2>
          </div>

          <div className="space-y-1.5">
            {pipelineSteps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isCompleted = index < activeStepIndex;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepChange(step.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                    isActive
                      ? "bg-[var(--color-primary-soft)] shadow-2xs"
                      : "hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out ${
                      isCompleted
                        ? "bg-[var(--color-primary)] text-white"
                        : isActive
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]"
                          : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={16} />
                    ) : isActive ? (
                      <Circle size={13} fill="currentColor" />
                    ) : (
                      <span className="text-xs font-bold">
                        {step.number}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold ${
                        isActive
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {step.title}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                      {step.description}
                    </p>
                  </div>

                  {isActive && (
                    <ChevronRight
                      size={15}
                      className="ml-auto text-[var(--color-primary)]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                {t("pipeline:header.overallProgress")}
              </span>

              <span className="text-xs font-black text-[var(--color-primary)]">
                {progress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-2.5 text-[11px] leading-4 text-[var(--color-text-muted)]">
              {t("pipeline:header.autoSaveNotice")}
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div key={activeStep} className="animate-fade-in">
            {renderStep(activeStep)}
          </div>
        </section>
      </main>
    </div>
  );
}