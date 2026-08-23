import { FolderGit2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WorkspaceHeaderProps {
  totalProjects?: number;
  matchingCount?: number;
  isFiltered?: boolean;
}

export default function WorkspaceHeader({
  totalProjects = 0,
  matchingCount = 0,
  isFiltered = false,
}: WorkspaceHeaderProps) {
  const { t } = useTranslation(["workspace"]);

  return (
    <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            {t("workspace:title")}
          </h1>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-bold text-[var(--color-primary)] shadow-2xs">
            <FolderGit2 size={13} />
            <span>
              {isFiltered
                ? t("workspace:filters.filteredResults", { count: matchingCount })
                : t("workspace:videosCount", { count: totalProjects })}
            </span>
          </div>
        </div>

        <p className="mt-1.5 text-xs text-[var(--color-text-muted)] sm:text-sm">
          {t("workspace:subtitle")}
        </p>
      </div>
    </section>
  );
}