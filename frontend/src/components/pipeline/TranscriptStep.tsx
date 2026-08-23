import { CheckCircle2, Download, FileText, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TranscriptStep() {
  const { t } = useTranslation(["pipeline", "common"]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "02", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.transcript.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.transcript.description")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[#17232D] p-5">
          <div className="flex aspect-video items-center justify-center rounded-xl bg-[#293B46]">
            <button
              type="button"
              aria-label="Play video"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-xl transition hover:scale-110"
            >
              <Play size={22} fill="currentColor" />
            </button>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-white">NLP Introduction</p>
            <p className="mt-1 text-xs text-[#9CAEB4]">00:00:00 / 00:12:15</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-colors duration-200">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <FileText size={19} />
              </div>

              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">Transcript</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">English · Auto-generated</p>
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <Download size={14} />
              {t("common:export")}
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-4">
              <div className="mb-2 flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>00:00:00</span>
                <span>00:00:08</span>
              </div>

              <textarea
                defaultValue="Natural language processing is a field of artificial intelligence that focuses on the interaction between computers and human language."
                className="min-h-[130px] w-full resize-none bg-transparent text-sm leading-6 text-[var(--color-text-primary)] outline-none"
              />
            </div>

            <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-4">
              <div className="mb-2 flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>00:00:09</span>
                <span>00:00:18</span>
              </div>

              <textarea
                defaultValue="This field combines computational linguistics with machine learning to understand and process human language."
                className="min-h-[100px] w-full resize-none bg-transparent text-sm leading-6 text-[var(--color-text-primary)] outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-[var(--color-primary)] font-medium">
            <CheckCircle2 size={16} />
            Transcript is ready for translation
          </div>
        </div>
      </div>
    </div>
  );
}