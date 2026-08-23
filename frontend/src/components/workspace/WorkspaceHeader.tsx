import { useTranslation } from "react-i18next";

export default function WorkspaceHeader() {
  const { t } = useTranslation(["workspace"]);

  return (
    <section className="mb-8">
      <h1 className="text-[28px] font-bold tracking-[-0.6px] text-[var(--color-text-primary)]">
        {t("workspace:title")}
      </h1>

      <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
        {t("workspace:subtitle")}
      </p>
    </section>
  );
}