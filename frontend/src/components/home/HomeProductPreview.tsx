import {
  Check,
  FileText,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import image from "../../assets/1.png";
import logoTopbar from "../../assets/logo-topbar.png";
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
          <div className="flex items-center">
            <img
              src={logoTopbar}
              alt="VIDNOVA"
              width={220}
              height={48}
              className="h-10 sm:h-12 w-auto max-w-[220px] object-contain select-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Preview editor settings"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition cursor-pointer"
            >
              <Settings size={16} />
            </button>

            <button
              type="button"
              aria-label="More preview options"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition cursor-pointer"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid gap-4 md:grid-cols-[1fr_165px]">
          {/* Main video */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div role="heading" aria-level={2} className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
                  {t("home:preview.videoTitle")}
                </div>

                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  AI Introduction.mp4
                </p>
              </div>

              <button
                type="button"
                aria-label="Share video link"
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition cursor-pointer"
              >
                {t("home:preview.share")}
              </button>
            </div>

            {/* Video */}
            <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-[#14201D] via-[#33483F] to-[#728C80]">
              <img
                src={image}
                alt="Preview video"
                width={640}
                height={360}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Processing */}
          <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-3">
            <div role="heading" aria-level={3} className="mb-3 text-xs font-bold text-[var(--color-text-primary)]">
              {t("home:preview.pipelineTitle")}
            </div>

            <div className="space-y-2.5">
              {processingSteps.map((step) => (
                <div
                  key={step.label}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Check size={10} strokeWidth={3} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
                      {step.label}
                    </p>
                  </div>

                  <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
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
                <FileText size={14} />
              </div>

              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                {file.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}