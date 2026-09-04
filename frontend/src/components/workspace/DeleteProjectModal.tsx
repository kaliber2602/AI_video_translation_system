import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Project } from "../../types/project";

interface DeleteProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  mode?: "soft" | "permanent";
  onClose: () => void;
  onConfirm: (projectId: number) => Promise<void>;
}

export default function DeleteProjectModal({
  project,
  isOpen,
  mode = "soft",
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  const { t } = useTranslation(["workspace", "common"]);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !project) return null;

  const isPermanent = mode === "permanent";

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(project.id);
      onClose();
    } catch (error) {
      console.error("[DeleteProjectModal] Error deleting project:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-card)] transition-colors duration-200 animate-scale-in">
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isPermanent ? "bg-red-500/10 text-[var(--color-danger)]" : "bg-amber-500/10 text-amber-500"}`}>
            <Trash2 size={19} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {isPermanent
                ? t("workspace:trash.permanentDeleteTitle", "Xóa vĩnh viễn dự án")
                : t("workspace:trash.moveToTrashTitle", "Chuyển vào thùng rác")}
            </h2>

            <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
              {isPermanent
                ? t("workspace:trash.permanentDeleteConfirm", { name: project.name, defaultValue: `Bạn có chắc chắn muốn xóa vĩnh viễn dự án "${project.name}"? Dữ liệu sẽ không thể khôi phục.` })
                : t("workspace:trash.moveToTrashConfirm", { name: project.name, defaultValue: `Dự án "${project.name}" sẽ được đưa vào hàng chờ xóa tạm thời. Bạn có thể khôi phục lại bất kỳ lúc nào từ mục Thùng rác.` })}
            </p>

            {isPermanent ? (
              <p className="mt-1.5 text-[11px] font-semibold text-[var(--color-danger)]">
                {t("common:cannotBeUndone", "Hành động này không thể hoàn tác.")}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] font-semibold text-[var(--color-primary)]">
                {t("workspace:trash.canBeRestored", "Dự án có thể khôi phục lại từ Thùng rác.")}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50 cursor-pointer"
          >
            {t("common:cancel")}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={`rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${isPermanent ? "bg-red-500 hover:bg-red-600" : "bg-amber-600 hover:bg-amber-700"}`}
          >
            {isDeleting
              ? t("common:processing", "Đang xử lý...")
              : isPermanent
              ? t("workspace:trash.permanentDeleteBtn", "Xóa vĩnh viễn")
              : t("workspace:trash.moveToTrashBtn", "Chuyển vào thùng rác")}
          </button>
        </div>
      </div>
    </div>
  );
}
