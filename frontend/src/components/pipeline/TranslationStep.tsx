import { Languages, Save, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TranslationStep() {
  const { t } = useTranslation(["pipeline", "common"]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "03", total: "06" })}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.translation.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.translation.description")}
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-colors duration-200">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Languages size={19} />
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">Translation Editor</h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">English → Vietnamese</p>
            </div>
          </div>

          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <Sparkles size={15} />
            Re-translate
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Original Transcript
              </label>

              <textarea
                defaultValue="Natural language processing is a field of artificial intelligence that focuses on the interaction between computers and human language."
                className="min-h-[190px] w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm leading-6 text-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Vietnamese Translation
              </label>

              <textarea
                defaultValue="Xử lý ngôn ngữ tự nhiên là một lĩnh vực của trí tuệ nhân tạo, tập trung vào sự tương tác giữa máy tính và ngôn ngữ của con người."
                className="min-h-[190px] w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] p-4 text-sm leading-6 text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:items-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            Changes are automatically saved as a draft.
          </p>

          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)]"
          >
            <Save size={16} />
            {t("common:save")}
          </button>
        </div>
      </div>
    </div>
  );
}