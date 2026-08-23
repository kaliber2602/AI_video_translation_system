import { Captions, Check, Download } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SubtitleStep() {
  const { t } = useTranslation(["pipeline", "common"]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "05", total: "06" })}
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.subtitle.pageTitle")}
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.subtitle.pageDescription")}
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Captions size={19} />
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {t("pipeline:steps.subtitle.previewTitle")}
              </h3>

              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {t("pipeline:steps.subtitle.previewSubtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <Download size={15} />
            {t("pipeline:steps.subtitle.downloadSrt")}
          </button>
        </div>

        <div className="mt-6 flex aspect-video items-end justify-center rounded-2xl bg-[#1B2932] p-8">
          <div className="rounded-lg bg-black/70 px-5 py-3 text-center text-base font-medium text-white">
            Xử lý ngôn ngữ tự nhiên là một lĩnh vực của trí tuệ nhân tạo.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="text-sm text-[var(--color-text-secondary)]">
            {t("pipeline:steps.subtitle.format")}
            <select className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]">
              <option>SRT</option>
              <option>VTT</option>
              <option>ASS</option>
            </select>
          </label>

          <label className="text-sm text-[var(--color-text-secondary)]">
            {t("pipeline:steps.subtitle.fontSize")}
            <select className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]">
              <option>Medium</option>
              <option>Large</option>
              <option>Small</option>
            </select>
          </label>

          <label className="text-sm text-[var(--color-text-secondary)]">
            {t("pipeline:steps.subtitle.position")}
            <select className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]">
              <option>Bottom Center</option>
              <option>Top Center</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
          <Check size={17} />
          {t("pipeline:steps.subtitle.settingsSaved")}
        </div>
      </div>
    </div>
  );
}