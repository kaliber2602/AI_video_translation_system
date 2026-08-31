import { Fragment } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PricingComparisonTable() {
  const { t } = useTranslation(["pricing"]);

  const rows = [
    // Category 1: Quota
    {
      category: t("pricing:comparison.categories.resources"),
      items: [
        { name: t("pricing:comparison.rows.storage"), free: "5 GB", pro: "100 GB", business: "1 TB" },
        { name: t("pricing:comparison.rows.credits"), free: "1,000", pro: "10,000", business: "100,000" },
        { name: t("pricing:comparison.rows.minutes"), free: "~1,000 min", pro: "~10,000 min", business: "~100,000 min" },
      ],
    },
    // Category 2: Limits
    {
      category: t("pricing:comparison.categories.limits"),
      items: [
        { name: t("pricing:comparison.rows.maxFile"), free: "500 MB", pro: "5 GB", business: "20 GB" },
        { name: t("pricing:comparison.rows.maxDuration"), free: "30 min", pro: "4 hours", business: "12 hours" },
        { name: t("pricing:comparison.rows.uploadRes"), free: "1080p", pro: "4K", business: "4K" },
        { name: t("pricing:comparison.rows.processingRes"), free: "720p", pro: "1080p", business: "4K" },
        { name: t("pricing:comparison.rows.streamingRes"), free: "720p", pro: "1080p", business: "4K" },
        { name: t("pricing:comparison.rows.exportRes"), free: "720p", pro: "1080p", business: "4K" },
        { name: t("pricing:comparison.rows.concurrency"), free: "1 job", pro: "3 jobs", business: "10 jobs" },
        { name: t("pricing:comparison.rows.projects"), free: "5", pro: "50", business: "500" },
      ],
    },
    // Category 3: Features (All open)
    {
      category: t("pricing:comparison.categories.features"),
      items: [
        { name: t("pricing:comparison.rows.translation"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.tts"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.diarization"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.subtitles"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.editor"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.exportDocs"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.hls"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.batch"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.api"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.priority"), free: true, pro: true, business: true },
        { name: t("pricing:comparison.rows.team"), free: true, pro: true, business: true },
      ],
    },
  ];

  const renderCell = (val: string | boolean) => {
    if (typeof val === "boolean") {
      return val ? (
        <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Check size={14} strokeWidth={3} />
        </div>
      ) : (
        <span className="text-[var(--color-text-muted)]">-</span>
      );
    }
    return <span className="font-semibold text-[var(--color-text-primary)]">{val}</span>;
  };

  return (
    <div className="mx-auto mt-20 max-w-[1400px]">
      <div className="text-center">
        <h3 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
          {t("pricing:comparison.title")}
        </h3>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)] sm:text-sm">
          {t("pricing:comparison.subtitle")}
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
                <th className="py-5 px-6 font-bold text-[var(--color-text-primary)] w-[36%]">
                  {t("pricing:comparison.featureCol")}
                </th>
                <th className="py-5 px-4 text-center font-bold text-[var(--color-text-primary)] w-[21%]">
                  Free
                </th>
                <th className="py-5 px-4 text-center font-bold text-[var(--color-primary)] w-[21%] bg-[var(--color-primary-soft)]/30">
                  Pro ★
                </th>
                <th className="py-5 px-4 text-center font-bold text-[var(--color-text-primary)] w-[22%]">
                  Business
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((section) => (
                <Fragment key={section.category}>
                  {/* Category Header Row */}
                  <tr className="bg-[var(--color-background)]/50">
                    <td
                      colSpan={4}
                      className="py-3 px-6 text-[11px] font-black uppercase tracking-wider text-[var(--color-primary)]"
                    >
                      {section.category}
                    </td>
                  </tr>

                  {/* Item Rows */}
                  {section.items.map((item) => (
                    <tr
                      key={item.name}
                      className="transition-colors hover:bg-[var(--color-background)]/40"
                    >
                      <td className="py-3.5 px-6 font-medium text-[var(--color-text-secondary)]">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderCell(item.free)}
                      </td>
                      <td className="py-3.5 px-4 text-center bg-[var(--color-primary-soft)]/10">
                        {renderCell(item.pro)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderCell(item.business)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
