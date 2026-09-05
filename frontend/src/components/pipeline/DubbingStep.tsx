import { Mic2, Play, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function DubbingStep() {
  const { t } = useTranslation(["pipeline", "common"]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "04", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.dubbing.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.dubbing.description")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-colors duration-200">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Mic2 size={19} />
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">Voice Settings</h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Vietnamese voice generation</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">
                Voice
              </label>

              <select className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]">
                <option>Vietnamese Female — Natural</option>
                <option>Vietnamese Male — Professional</option>
                <option>Vietnamese Female — Energetic</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">
                Speaking Style
              </label>

              <select className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]">
                <option>Natural</option>
                <option>Professional</option>
                <option>Energetic</option>
                <option>Calm</option>
              </select>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              <Volume2 size={17} />
              Generate Voice
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-colors duration-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Audio Preview
          </p>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              aria-label="Play audio"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play size={19} fill="currentColor" />
            </button>

            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                <div className="h-full w-[38%] rounded-full bg-[var(--color-primary)]" />
              </div>

              <div className="mt-2 flex justify-between text-xs font-medium text-[var(--color-text-muted)]">
                <span>00:04</span>
                <span>00:12</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}