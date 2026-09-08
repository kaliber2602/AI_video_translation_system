import { type FormEvent, useEffect, useState } from "react";
import {
  Share2,
  UserPlus,
  Trash2,
  Crown,
  Mail,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from "../../services/project.service";
import type { Project, ProjectMember } from "../../types/project";
import { toast } from "../../lib/toast";
import Dialog from "../common/Dialog";
import Button from "../common/Button";

interface ShareProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onMembersChange?: () => void;
}

export default function ShareProjectModal({
  project,
  isOpen,
  onClose,
  onMembersChange,
}: ShareProjectModalProps) {
  const { t } = useTranslation(["workspace", "common"]);

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<"viewer" | "commenter" | "editor" | "admin">("editor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !project) return;

    let ignore = false;
    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        const data = await getProjectMembers(project.id);
        if (!ignore) setMembers(data);
      } catch (err: any) {
        console.error("[ShareProjectModal] Failed to load members:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchMembers();
    return () => {
      ignore = true;
    };
  }, [isOpen, project]);

  if (!project) return null;

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    try {
      setIsSubmitting(true);
      const newMember = await addProjectMember(project.id, {
        email: emailInput.trim(),
        role: roleInput,
      });

      setMembers((prev) => {
        const filtered = prev.filter(
          (m) => m.email.toLowerCase() !== newMember.email.toLowerCase()
        );
        return [...filtered, newMember];
      });

      setEmailInput("");
      onMembersChange?.();
      toast.success(
        t("workspace:share.inviteSuccessTitle", "Đã gửi lời mời"),
        t("workspace:share.inviteSuccessDesc", {
          email: newMember.email,
          defaultValue: `Đã chia sẻ dự án với ${newMember.email}`,
        })
      );
    } catch (err: any) {
      console.error("[ShareProjectModal] Invite error:", err);
      const detail =
        err.response?.data?.detail ||
        err.message ||
        t("workspace:share.inviteError", "Không thể chia sẻ dự án");
      toast.error(t("workspace:share.inviteErrorTitle", "Lỗi chia sẻ"), detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (
    member: ProjectMember,
    newRole: "viewer" | "commenter" | "editor" | "admin"
  ) => {
    try {
      setActionLoadingId(member.id);
      const updated = await updateProjectMemberRole(project.id, member.id, {
        role: newRole,
      });
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: updated.role } : m))
      );
      onMembersChange?.();
      toast.success(
        t("workspace:share.roleUpdatedTitle", "Đã cập nhật vai trò"),
        t("workspace:share.roleUpdatedDesc", {
          email: member.email,
          defaultValue: `Vai trò của ${member.email} đã được đổi thành ${newRole}`,
        })
      );
    } catch (err: any) {
      console.error("[ShareProjectModal] Update role error:", err);
      toast.error(t("workspace:share.updateRoleError", "Lỗi cập nhật vai trò"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveMember = async (member: ProjectMember) => {
    try {
      setActionLoadingId(member.id);
      await removeProjectMember(project.id, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      onMembersChange?.();
      toast.success(
        t("workspace:share.memberRemovedTitle", "Đã hủy chia sẻ"),
        t("workspace:share.memberRemovedDesc", {
          email: member.email,
          defaultValue: `Đã thu hồi quyền truy cập của ${member.email}`,
        })
      );
    } catch (err: any) {
      console.error("[ShareProjectModal] Remove member error:", err);
      toast.error(t("workspace:share.removeMemberError", "Lỗi khi xóa thành viên"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const isOwner = project.my_role === "owner" || !project.is_shared;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      showCloseButton={true}
    >
      {/* Modal Header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4 -mt-1 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Share2 size={19} />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)] sm:text-lg">
            {t("workspace:share.modalTitle", "Chia sẻ dự án")}
          </h2>
          <p className="line-clamp-1 text-xs text-[var(--color-text-muted)]">
            {project.name}
          </p>
        </div>
      </div>

      {/* Modal Body */}
      <div className="mt-4 space-y-5">
        {/* Invite Input Row */}
        {isOwner && (
          <form onSubmit={handleInvite} className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {t("workspace:share.inviteLabel", "Mời cộng tác viên")}
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={t(
                    "workspace:share.emailPlaceholder",
                    "Nhập email cộng tác viên..."
                  )}
                  required
                  className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-9 pr-3 text-xs text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as any)}
                  className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                >
                  <option value="viewer">
                    {t("workspace:share.roleViewer", "Người xem")}
                  </option>
                  <option value="editor">
                    {t("workspace:share.roleEditor", "Người chỉnh sửa")}
                  </option>
                  <option value="admin">
                    {t("workspace:share.roleAdmin", "Quản trị viên")}
                  </option>
                </select>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!emailInput.trim()}
                  isLoading={isSubmitting}
                  icon={<UserPlus size={15} />}
                >
                  {t("workspace:share.inviteBtn", "Mời")}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Members List */}
        <div>
          <h3 className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
            {t("workspace:share.membersListTitle", "Những người có quyền truy cập")}
          </h3>

          <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 max-h-60 overflow-y-auto">
            {/* Owner Row */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/20 font-bold text-[var(--color-primary)] text-xs">
                  {project.owner_name?.[0]?.toUpperCase() ||
                    project.owner_email?.[0]?.toUpperCase() ||
                    "O"}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      {project.owner_name ||
                        project.owner_email ||
                        t("workspace:share.owner", "Chủ sở hữu")}
                    </span>
                    <Crown size={12} className="text-amber-500" />
                  </div>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {project.owner_email}
                  </span>
                </div>
              </div>
              <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-500">
                {t("workspace:share.ownerBadge", "Chủ sở hữu")}
              </span>
            </div>

            {/* Collaborators List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-[var(--color-text-muted)] gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span>{t("common:loading")}</span>
              </div>
            ) : members.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                {t(
                  "workspace:share.noMembers",
                  "Chưa có ai được chia sẻ dự án này."
                )}
              </div>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 transition hover:bg-[var(--color-surface)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/10 font-bold text-[var(--color-primary)] text-xs">
                      {m.full_name?.[0] || m.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {m.full_name || m.email}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        {m.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <>
                        <select
                          value={m.role}
                          disabled={actionLoadingId === m.id}
                          onChange={(e) =>
                            handleRoleChange(m, e.target.value as any)
                          }
                          className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs font-medium text-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)]"
                        >
                          <option value="viewer">
                            {t("workspace:share.roleViewer", "Người xem")}
                          </option>
                          <option value="editor">
                            {t("workspace:share.roleEditor", "Người chỉnh sửa")}
                          </option>
                          <option value="admin">
                            {t("workspace:share.roleAdmin", "Quản trị viên")}
                          </option>
                        </select>

                        <button
                          type="button"
                          disabled={actionLoadingId === m.id}
                          onClick={() => handleRemoveMember(m)}
                          title={t(
                            "workspace:share.removeMember",
                            "Hủy quyền truy cập"
                          )}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoadingId === m.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="rounded-lg bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                        {m.role === "admin"
                          ? t("workspace:share.roleAdmin", "Quản trị viên")
                          : m.role === "editor"
                          ? t("workspace:share.roleEditor", "Người chỉnh sửa")
                          : t("workspace:share.roleViewer", "Người xem")}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="mt-6 flex justify-end border-t border-[var(--color-border)] pt-4">
        <Button variant="secondary" size="md" onClick={onClose}>
          {t("common:close")}
        </Button>
      </div>
    </Dialog>
  );
}
