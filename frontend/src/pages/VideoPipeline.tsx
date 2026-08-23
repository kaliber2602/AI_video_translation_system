import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Save,
} from "lucide-react";


import UploadStep from "../components/pipeline/UploadStep";
import TranscriptStep from "../components/pipeline/TranscriptStep";
import TranslationStep from "../components/pipeline/TranslationStep";
import SubtitleStep from "../components/pipeline/SubtitleStep";
import DubbingStep from "../components/pipeline/DubbingStep";
import ReviewExportStep from "../components/pipeline/ReviewExportStep";

const pipelineSteps = [
  {
    id: "upload",
    number: "01",
    title: "Upload",
    description: "Original video",
  },
  {
    id: "transcript",
    number: "02",
    title: "Transcript",
    description: "Speech to text",
  },
  {
    id: "translation",
    number: "03",
    title: "Translation",
    description: "Review translated text",
  },
  {
    id: "subtitle",
    number: "04",
    title: "Subtitle",
    description: "Create subtitles",
  },
  {
    id: "dubbing",
    number: "05",
    title: "Dubbing",
    description: "Generate voice",
  },
  {
    id: "review-export",
    number: "06",
    title: "Review & Export",
    description: "Review and generate outputs",
  },
];

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
  const [activeStep, setActiveStep] = useState("translation");
  const [isSaved, setIsSaved] = useState(true);

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
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200">
      <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-4 backdrop-blur-xl transition-colors duration-200 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-[var(--color-text-primary)] sm:text-lg">
                NLP Introduction
              </h1>

              <span className="rounded-full bg-[#FFF2D8] px-3 py-1 text-xs font-semibold text-[#C68A1C]">
                In Progress
              </span>
            </div>

            <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
              NLP Tutorials / nlp-introduction.mp4
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 text-xs text-[var(--color-text-muted)] xl:flex">
            <Clock3 size={15} />

            <span>
              {isSaved ? "Saved just now" : "Unsaved changes"}
            </span>
          </div>

          <button
            onClick={handleSave}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
              isSaved
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                : "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
            }`}
          >
            <Save size={16} />

            <span className="hidden sm:inline">
              {isSaved ? "Saved" : "Save"}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row lg:p-8">
        <div className="overflow-x-auto lg:hidden">
          <div className="flex min-w-max gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)]">
            {pipelineSteps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isCompleted = index < activeStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepChange(step.id)}
                  className={`flex min-w-[130px] items-center gap-2 rounded-xl px-3 py-3 text-left transition ${
                    isActive
                      ? "bg-[var(--color-primary-soft)]"
                      : "hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isCompleted
                        ? "bg-[var(--color-primary)] text-white"
                        : isActive
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={15} />
                    ) : isActive ? (
                      <Circle size={13} fill="currentColor" />
                    ) : (
                      <span className="text-[10px] font-bold">
                        {step.number}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-xs font-semibold ${
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
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Video Pipeline
            </p>

            <h2 className="mt-2 text-lg font-bold text-[var(--color-text-primary)]">
              Processing Steps
            </h2>
          </div>

          <div className="space-y-2">
            {pipelineSteps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isCompleted = index < activeStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepChange(step.id)}
                  className={`relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                    isActive
                      ? "bg-[var(--color-primary-soft)]"
                      : "hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isCompleted
                        ? "bg-[var(--color-primary)] text-white"
                        : isActive
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={17} />
                    ) : isActive ? (
                      <Circle size={15} fill="currentColor" />
                    ) : (
                      <span className="text-xs font-bold">
                        {step.number}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        isActive
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {step.title}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {step.description}
                    </p>
                  </div>

                  {isActive && (
                    <ChevronRight
                      size={16}
                      className="ml-auto text-[var(--color-primary)]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl bg-[var(--color-surface-muted)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Overall Progress
              </span>

              <span className="text-xs font-bold text-[var(--color-primary)]">
                {progress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
              Your progress is automatically saved while you work.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          {renderStep(activeStep)}
        </section>
      </main>
    </div>
  );
}