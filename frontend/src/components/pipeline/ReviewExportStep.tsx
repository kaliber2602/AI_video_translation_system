import {
  Check,
  ChevronLeft,
  Download,
  FileAudio,
  FileText,
  Film,
  GripVertical,
  Play,
  Save,
  Settings2,
  Volume2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../common/Button";

const timelineTracks = [
  {
    id: "video",
    label: "Video",
    icon: Film,
    color: "bg-[var(--color-primary-soft)]",
    iconColor: "text-[var(--color-primary)]",
    blocks: [
      {
        label: "Original Video",
        start: "0%",
        width: "100%",
      },
    ],
  },
  {
    id: "subtitle",
    label: "Subtitle",
    icon: FileText,
    color: "bg-[#E9F0FF] dark:bg-[#1E293B]",
    iconColor: "text-[#6688D8]",
    blocks: [
      {
        label: "Hello everyone",
        start: "0%",
        width: "20%",
      },
      {
        label: "Welcome to NLP",
        start: "23%",
        width: "25%",
      },
      {
        label: "Today we learn...",
        start: "53%",
        width: "35%",
      },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    icon: Volume2,
    color: "bg-[#FFF1DE] dark:bg-[#2A2016]",
    iconColor: "text-[#D99A45]",
    blocks: [
      {
        label: "AI Voice Over",
        start: "0%",
        width: "100%",
      },
    ],
  },
  {
    id: "translation",
    label: "Translation",
    icon: FileText,
    color: "bg-[#F1E8FF] dark:bg-[#261E35]",
    iconColor: "text-[#9A6DD7]",
    blocks: [
      {
        label: "Translation 01",
        start: "0%",
        width: "20%",
      },
      {
        label: "Translation 02",
        start: "23%",
        width: "25%",
      },
      {
        label: "Translation 03",
        start: "53%",
        width: "35%",
      },
    ],
  },
];

export default function ReviewExportStep() {
  const { t } = useTranslation(["pipeline", "common"]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-[var(--color-primary)]">
            {t("pipeline:header.stepBadge", { current: "06", total: "06" })}
          </p>

          <h2 className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t("pipeline:steps.reviewExport.pageTitle")}
          </h2>

          <p className="mt-1.5 sm:mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-[var(--color-text-muted)]">
            {t("pipeline:steps.reviewExport.pageDescription")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-medium text-[var(--color-text-muted)]">
            <Check size={14} className="text-[var(--color-primary)]" />
            {t("pipeline:header.savedJustNow")}
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <Save size={15} />
            {t("common:save")}
          </button>
        </div>
      </div>

      {/* Main Preview + Export Options */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* Video Preview */}
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#17252B] shadow-[var(--shadow-card)]">
          <div className="relative flex aspect-video items-center justify-center bg-[#1D2D33]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,90,95,0.4),transparent_65%)]" />

            <button
              type="button"
              aria-label="Play video preview"
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-[0_10px_35px_rgba(0,0,0,0.2)] transition hover:scale-105"
            >
              <Play size={26} fill="currentColor" />
            </button>

            <div className="absolute bottom-5 left-5 right-5">
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[32%] rounded-full bg-[var(--color-primary)]" />
              </div>

              <div className="flex items-center justify-between text-xs text-white/80">
                <span>00:12</span>
                <span>12:45</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-white">
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Play"
                className="transition hover:text-[var(--color-primary)]"
              >
                <Play size={18} fill="currentColor" />
              </button>

              <span className="text-sm font-medium text-white/70">
                nlp-introduction.mp4
              </span>
            </div>

            <div className="flex items-center gap-4 text-white/60">
              <Volume2 size={17} />
              <Settings2 size={17} />
            </div>
          </div>
        </div>

        {/* Export Options */}
        <ExportOptions />
      </div>

      {/* Timeline */}
      <TimelineEditor />

      {/* Bottom Actions */}
      <div className="flex flex-col-reverse justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-5 sm:flex-row sm:items-center">
        <Button
          variant="secondary"
          size="md"
          icon={<ChevronLeft size={16} />}
        >
          {t("pipeline:steps.reviewExport.backToEditing")}
        </Button>

        <Button
          variant="primary"
          size="md"
          icon={<Download size={16} />}
        >
          {t("pipeline:steps.reviewExport.exportSelected")}
        </Button>
      </div>
    </div>
  );
}

function ExportOptions() {
  const { t } = useTranslation(["pipeline"]);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Download size={18} />
        </div>

        <div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            {t("pipeline:steps.reviewExport.exportOptionsTitle")}
          </h3>

          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {t("pipeline:steps.reviewExport.exportOptionsSubtitle")}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <ExportCheckbox
          label={t("pipeline:steps.reviewExport.finalVideo")}
          description={t("pipeline:steps.reviewExport.finalVideoDesc")}
          checked
          icon={<Film size={16} />}
        />

        <ExportCheckbox
          label={t("pipeline:steps.reviewExport.subtitleFile")}
          description={t("pipeline:steps.reviewExport.subtitleFileDesc")}
          checked
          icon={<FileText size={16} />}
        />

        <ExportCheckbox
          label={t("pipeline:steps.reviewExport.audioFile")}
          description={t("pipeline:steps.reviewExport.audioFileDesc")}
          icon={<FileAudio size={16} />}
        />

        <ExportCheckbox
          label={t("pipeline:steps.reviewExport.transcriptDoc")}
          description={t("pipeline:steps.reviewExport.transcriptDocDesc")}
          icon={<FileText size={16} />}
        />

        <ExportCheckbox
          label={t("pipeline:steps.reviewExport.translationDoc")}
          description={t("pipeline:steps.reviewExport.translationDocDesc")}
          icon={<FileText size={16} />}
        />
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-5">
        <label className="mb-2 block text-xs font-semibold text-[var(--color-text-muted)]">
          {t("pipeline:steps.reviewExport.videoFormat")}
        </label>

        <select className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]">
          <option>MP4</option>
          <option>MKV</option>
          <option>MOV</option>
        </select>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-xs font-semibold text-[var(--color-text-muted)]">
          {t("pipeline:steps.reviewExport.quality")}
        </label>

        <select className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]">
          <option>1080p</option>
          <option>720p</option>
          <option>4K</option>
        </select>
      </div>
    </div>
  );
}

function ExportCheckbox({
  label,
  description,
  checked = false,
  icon,
}: {
  label: string;
  description: string;
  checked?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]">
      <input
        type="checkbox"
        defaultChecked={checked}
        className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
      />

      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>

        <p className="mt-0.5 text-[11px] leading-4 text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
    </label>
  );
}

function TimelineEditor() {
  const { t } = useTranslation(["pipeline"]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-colors duration-200">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            {t("pipeline:steps.reviewExport.timelineTitle")}
          </h3>

          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {t("pipeline:steps.reviewExport.timelineSubtitle")}
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          <Settings2 size={14} />
          {t("pipeline:steps.reviewExport.timelineSettings")}
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[960px] p-5">
          <div className="ml-[150px] mb-4 flex justify-between text-[11px] text-[var(--color-text-muted)]">
            <span>00:00</span>
            <span>00:30</span>
            <span>01:00</span>
            <span>01:30</span>
            <span>02:00</span>
            <span>02:30</span>
          </div>

          <div className="space-y-3">
            {timelineTracks.map((track) => {
              const Icon = track.icon;

              return (
                <div key={track.id} className="flex items-center gap-4">
                  <div className="flex w-[130px] shrink-0 items-center gap-2">
                    <Icon size={16} className={track.iconColor} />

                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {track.label}
                    </span>
                  </div>

                  <div className="relative h-14 flex-1 rounded-xl bg-[var(--color-surface-muted)]">
                    <div className="absolute inset-y-0 left-[32%] z-20 w-[2px] bg-[var(--color-primary)]">
                      <div className="absolute -left-[5px] -top-1 h-3 w-3 rounded-full bg-[var(--color-primary)]" />
                    </div>

                    {track.blocks.map((block, index) => (
                      <div
                        key={`${track.id}-${index}`}
                        className={`absolute top-2 flex h-10 items-center gap-2 rounded-lg px-3 ${track.color} cursor-grab transition hover:brightness-95 active:cursor-grabbing`}
                        style={{
                          left: block.start,
                          width: block.width,
                        }}
                      >
                        <GripVertical
                          size={14}
                          className="shrink-0 text-[var(--color-text-muted)]"
                        />

                        <span className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
                          {block.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}