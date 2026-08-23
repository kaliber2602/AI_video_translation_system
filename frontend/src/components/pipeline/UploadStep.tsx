import { useState } from "react";
import {
  CheckCircle2,
  FileVideo,
  Languages,
  UploadCloud,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function UploadStep() {
  const { t } = useTranslation(["pipeline", "common"]);
  const [targetLanguage, setTargetLanguage] = useState("vi");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {t("pipeline:header.stepBadge", { current: "01", total: "06" })}
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
          {t("pipeline:steps.upload.pageTitle")}
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("pipeline:steps.upload.pageDescription")}
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-colors duration-200">
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 text-center transition hover:border-[var(--color-primary)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <UploadCloud size={30} />
          </div>

          <h3 className="mt-5 text-lg font-bold text-[var(--color-text-primary)]">
            {t("pipeline:steps.upload.dropzoneTitle")}
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
            {t("pipeline:steps.upload.dropzoneDescription")}
          </p>

          <button
            type="button"
            className="mt-6 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)]"
          >
            {t("pipeline:steps.upload.browseFiles")}
          </button>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <FileVideo size={21} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
              nlp-introduction.mp4
            </p>

            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              820 MB · {t("pipeline:steps.upload.uploadedTag")}
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div className="h-full w-full rounded-full bg-[var(--color-primary)]" />
            </div>
          </div>

          <CheckCircle2 size={20} className="text-[var(--color-primary)]" />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Languages size={19} />
          </div>

          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {t("pipeline:steps.upload.translationLanguage")}
            </h3>

            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {t("pipeline:steps.upload.autoDetectionNote")}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
            {t("pipeline:steps.upload.translateTo")}
          </label>

          <select
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
          >
            <option value="vi">Vietnamese</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
          </select>

          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {t("pipeline:steps.upload.translateToHint")}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Languages size={17} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              {t("pipeline:steps.upload.autoDetectEnabled")}
            </p>

            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {t("pipeline:steps.upload.autoDetectDescription")}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.2)] transition hover:bg-[var(--color-primary-hover)]"
        >
          {t("pipeline:steps.upload.continueButton")}
        </button>
      </div>
    </div>
  );
}