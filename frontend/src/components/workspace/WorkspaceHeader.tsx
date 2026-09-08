import { FolderGit2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WorkspaceTab } from "./WorkspaceSidebar";

interface WorkspaceHeaderProps {
  totalProjects?: number;
  matchingCount?: number;
  isFiltered?: boolean;
  currentTab?: WorkspaceTab;
}

export default function WorkspaceHeader({
  totalProjects = 0,
  matchingCount = 0,
  isFiltered = false,
  currentTab = "allProjects",
}: WorkspaceHeaderProps) {
  const { t } = useTranslation(["workspace"]);

  const getHeaderInfo = () => {
    switch (currentTab) {
      case "sharedWithMe":
        return {
          title: t("workspace:sharedWithMeTitle", "Chia sẻ với tôi"),
          subtitle: t("workspace:sharedWithMeSubtitle", "Các dự án mà cộng tác viên chia sẻ quyền truy cập với bạn"),
        };
      case "favorites":
        return {
          title: t("workspace:favoritesTitle", "Mục yêu thích"),
          subtitle: t("workspace:favoritesSubtitle", "Các dự án quan trọng được đánh dấu sao để bạn truy cập nhanh nhất"),
        };
      case "trash":
        return {
          title: t("workspace:trashTitle", "Thùng rác"),
          subtitle: t("workspace:trashSubtitle", "Hàng chờ xóa tạm thời. Các dự án trong này có thể khôi phục hoặc xóa vĩnh viễn."),
        };
      case "allProjects":
      default:
        return {
          title: t("workspace:title"),
          subtitle: t("workspace:subtitle"),
        };
    }
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            {title}
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
          {subtitle}
        </p>
      </div>
    </section>
  );
}