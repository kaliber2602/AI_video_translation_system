import {
  Check,
  FileText,
  MoreHorizontal,
  Play,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const outputFiles = [
  {
    label: "SRT",
    className: "text-[var(--color-primary)] bg-[var(--color-primary-soft)]",
  },
  {
    label: "TXT",
    className: "text-[var(--color-text-secondary)] bg-[var(--color-surface-muted)]",
  },
  {
    label: "DOCX",
    className: "text-[#527BD2] bg-[#EDF2FF] dark:bg-[#1E293B]",
  },
  {
    label: "MD",
    className: "text-[#805FC7] bg-[#F1ECFF] dark:bg-[#261E35]",
  },
  {
    label: "PDF",
    className: "text-[#D45C5C] bg-[#FFF0F0] dark:bg-[#331818]",
  },
];

export default function HomeProductPreview() {
  const { t } = useTranslation(["home"]);

  const processingSteps = [
    {
      label: t("home:preview.stepUploaded"),
      time: "09:20",
      completed: true,
    },
    {
      label: t("home:preview.stepSpeechToText"),
      time: "09:21",
      completed: true,
    },
    {
      label: t("home:preview.stepTranslate"),
      time: "09:22",
      completed: true,
    },
    {
      label: t("home:preview.stepDubbing"),
      time: "09:25",
      completed: true,
    },
    {
      label: t("home:preview.stepExtract"),
      time: "09:28",
      completed: true,
    },
    {
      label: t("home:preview.stepCompleted"),
      time: "09:30",
      completed: true,
    },
  ];

  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle,rgba(24,195,170,0.16),transparent_68%)] blur-xl" />

      <div className="relative overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition-colors duration-200">
        {/* App Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-soft)]">
              <div className="h-4 w-4 rounded-full bg-[var(--color-primary)]" />
            </div>

            <span className="text-[11px] font-black tracking-[0.15em] text-[var(--color-text-primary)]">
              VIDNOVA
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Settings"
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
            >
              <Settings size={13} />
            </button>

            <button
              type="button"
              aria-label="More"
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid gap-4 md:grid-cols-[1fr_150px]">
          {/* Main video */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                  {t("home:preview.videoTitle")}
                </h3>

                <p className="mt-1 text-[9px] text-[var(--color-text-muted)]">
                  AI Introduction.mp4
                </p>
              </div>

              <button
                type="button"
                className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[9px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
              >
                {t("home:preview.share")}
              </button>
            </div>

            {/* Video */}
            <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-[#14201D] via-[#33483F] to-[#728C80]">
              {/* Simulated video background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.20),transparent_20%),linear-gradient(145deg,#15221E,#526C61)]" />

              {/* Person silhouette */}
              <div className="absolute bottom-[18%] left-1/2 h-[48%] w-[28%] -translate-x-1/2 rounded-[45%_45%_20%_20%] bg-gradient-to-b from-[#D7A27E] via-[#A86F54] to-[#3D3936]" />

              <div className="absolute left-1/2 top-[26%] h-[18%] w-[17%] -translate-x-1/2 rounded-full bg-[#D8A17C]" />

              {/* Subtitle */}
              <div className="absolute bottom-8 left-1/2 w-[90%] -translate-x-1/2 text-center text-[10px] font-medium text-white drop-shadow-md">
                Today, we'll explore the future
                <br />
                of artificial intelligence.
              </div>

              {/* Play */}
              <button
                type="button"
                aria-label="Play video"
                className="absolute left-3 bottom-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[var(--color-primary)]"
              >
                <Play size={10} fill="currentColor" />
              </button>

              {/* Timeline */}
              <div className="absolute bottom-3 left-11 right-3">
                <div className="h-1 rounded-full bg-white/30">
                  <div className="h-full w-[17%] rounded-full bg-[var(--color-primary)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Processing */}
          <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-3">
            <h4 className="mb-3 text-[10px] font-bold text-[var(--color-text-secondary)]">
              {t("home:preview.pipelineTitle")}
            </h4>

            <div className="space-y-3">
              {processingSteps.map((step) => (
                <div
                  key={step.label}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Check size={9} strokeWidth={3} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[8px] font-semibold text-[var(--color-text-secondary)]">
                      {step.label}
                    </p>
                  </div>

                  <span className="text-[7px] text-[var(--color-text-muted)]">
                    {step.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Output files */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {outputFiles.map((file) => (
            <div
              key={file.label}
              className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)] py-3"
            >
              <div
                className={`mb-1 flex h-7 w-7 items-center justify-center rounded-lg ${file.className}`}
              >
                <FileText size={13} />
              </div>

              <span className="text-[8px] font-bold text-[var(--color-text-secondary)]">
                {file.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}