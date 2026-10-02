import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Project } from "../../types/project";
import Dialog from "../common/Dialog";
import Button from "../common/Button";

interface DeleteProjectModalProps {
  project?: Project | null;
  projects?: Project[];
  isOpen: boolean;
  mode?: "soft" | "permanent";
  onClose: () => void;
  onConfirm: (projectIds: number[]) => Promise<void>;
}

export default function DeleteProjectModal({
  project,
  projects = [],
  isOpen,
  mode = "soft",
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  const { t } = useTranslation(["workspace", "common"]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Target list of projects to delete
  const targetProjects: Project[] = project
    ? [project]
    : projects;

  if (targetProjects.length === 0) return null;

  const isPermanent = mode === "permanent";
  const isMultiple = targetProjects.length > 1;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(targetProjects.map((p) => p.id));
      onClose();
    } catch (error) {
      console.error("[DeleteProjectModal] Error deleting projects:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      maxWidth="md"
      showCloseButton={!isDeleting}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isPermanent
              ? "bg-red-500/10 text-[var(--color-danger)]"
              : "bg-amber-500/10 text-amber-500"
          }`}
        >
          <Trash2 size={20} />
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            {isMultiple
              ? isPermanent
                ? t("workspace:trash.batchPermanentDeleteTitle", "Xóa vĩnh viễn các dự án đã chọn?")
                : t("workspace:trash.batchMoveToTrashTitle", "Chuyển các dự án đã chọn vào thùng rác?")
              : isPermanent
              ? t("workspace:trash.permanentDeleteTitle", "Xóa vĩnh viễn dự án")
              : t("workspace:trash.moveToTrashTitle", "Chuyển vào thùng rác")}
          </h2>

          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {isMultiple
              ? isPermanent
                ? t("workspace:trash.batchPermanentDeleteConfirm", {
                    count: targetProjects.length,
                    defaultValue: `Bạn có chắc chắn muốn xóa vĩnh viễn ${targetProjects.length} dự án đã chọn? Hành động này không thể hoàn tác.`,
                  })
                : t("workspace:trash.batchMoveToTrashConfirm", {
                    count: targetProjects.length,
                    defaultValue: `Bạn có chắc chắn muốn chuyển ${targetProjects.length} dự án đã chọn vào thùng rác?`,
                  })
              : isPermanent
              ? t("workspace:trash.permanentDeleteConfirm", {
                  name: targetProjects[0].name,
                  defaultValue: `Bạn có chắc chắn muốn xóa vĩnh viễn dự án "${targetProjects[0].name}"? Dữ liệu sẽ không thể khôi phục.`,
                })
              : t("workspace:trash.moveToTrashConfirm", {
                  name: targetProjects[0].name,
                  defaultValue: `Dự án "${targetProjects[0].name}" sẽ được đưa vào hàng chờ xóa tạm thời. Bạn có thể khôi phục lại bất kỳ lúc nào từ mục Thùng rác.`,
                })}
          </p>

          {isPermanent ? (
            <p className="mt-2 text-xs font-semibold text-[var(--color-danger)]">
              {t("common:cannotBeUndone", "Hành động này không thể hoàn tác.")}
            </p>
          ) : (
            <p className="mt-2 text-xs font-semibold text-[var(--color-primary)]">
              {t("workspace:trash.canBeRestored", "Dự án có thể khôi phục lại từ Thùng rác.")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
        <Button
          variant="secondary"
          size="md"
          onClick={onClose}
          disabled={isDeleting}
        >
          {t("common:cancel")}
        </Button>

        <Button
          variant={isPermanent ? "danger" : "primary"}
          size="md"
          onClick={handleDelete}
          isLoading={isDeleting}
        >
          {isMultiple
            ? isPermanent
              ? t("workspace:trash.batchPermanentDelete", { count: targetProjects.length, defaultValue: `Xóa vĩnh viễn ${targetProjects.length} dự án` })
              : t("workspace:trash.batchMoveToTrash", { count: targetProjects.length, defaultValue: `Chuyển ${targetProjects.length} dự án vào thùng rác` })
            : isPermanent
            ? t("workspace:trash.permanentDeleteBtn", "Xóa vĩnh viễn")
            : t("workspace:trash.moveToTrashBtn", "Chuyển vào thùng rác")}
        </Button>
      </div>
    </Dialog>
  );
}
