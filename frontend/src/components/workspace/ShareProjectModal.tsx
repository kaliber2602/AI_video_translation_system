import React, { useEffect, useState } from "react";
import {
  Share2,
  X,
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

  if (!isOpen || !project) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    try {
      setIsSubmitting(true);
      const newMember = await addProjectMember(project.id, {
        email: emailInput.trim(),
        role: roleInput,
      });

      setMembers((prev) => {
        const filtered = prev.filter((m) => m.email.toLowerCase() !== newMember.email.toLowerCase());
        return [...filtered, newMember];
      });

      setEmailInput("");
      onMembersChange?.();
      toast.success(
        t("workspace:share.inviteSuccessTitle", "Đã gửi lời mời"),
        t("workspace:share.inviteSuccessDesc", { email: newMember.email, defaultValue: `Đã chia sẻ dự án với ${newMember.email}` })
      );
    } catch (err: any) {
      console.error("[ShareProjectModal] Invite error:", err);
      const detail = err.response?.data?.detail || err.message || t("workspace:share.inviteError", "Không thể chia sẻ dự án");
      toast.error(t("workspace:share.inviteErrorTitle", "Lỗi chia sẻ"), detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (member: ProjectMember, newRole: "viewer" | "commenter" | "editor" | "admin") => {
    try {
      setActionLoadingId(member.id);
      const updated = await updateProjectMemberRole(project.id, member.id, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: updated.role } : m))
      );
      onMembersChange?.();
      toast.success(
        t("workspace:share.roleUpdatedTitle", "Đã cập nhật vai trò"),
        t("workspace:share.roleUpdatedDesc", { email: member.email, defaultValue: `Vai trò của ${member.email} đã được đổi thành ${newRole}` })
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
        t("workspace:share.memberRemovedDesc", { email: member.email, defaultValue: `Đã thu hồi quyền truy cập của ${member.email}` })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-colors duration-200 animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Share2 size={18} />
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

          <button
            type="button"
            onClick={onClose}
            aria-label={t("common:close")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-5">
          {/* Invite Input Row (Only if user has permission to invite) */}
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
                    placeholder={t("workspace:share.emailPlaceholder", "Nhập email cộng tác viên...")}
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
                    <option value="viewer">{t("workspace:share.roleViewer", "Người xem")}</option>
                    <option value="editor">{t("workspace:share.roleEditor", "Người chỉnh sửa")}</option>
                    <option value="admin">{t("workspace:share.roleAdmin", "Quản trị viên")}</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isSubmitting || !emailInput.trim()}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <UserPlus size={15} />
                    )}
                    <span>{t("workspace:share.inviteBtn", "Mời")}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              {t("workspace:share.membersTitle", "Người có quyền truy cập")}
            </h3>

            <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 overflow-hidden">
              {/* Owner row */}
              <div className="flex items-center justify-between p-3 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-xs font-bold">
                    {(project.owner_name || "O").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[var(--color-text-primary)]">
                      {project.owner_name || t("workspace:share.ownerDefault", "Chủ sở hữu dự án")}
                    </p>
                    <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                      {project.owner_email || ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-primary)]">
                  <Crown size={12} />
                  <span>{t("workspace:share.roleOwner", "Chủ sở hữu")}</span>
                </div>
              </div>

              {/* Members rows */}
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-[var(--color-text-muted)]">
                  <Loader2 size={16} className="animate-spin mr-2 text-[var(--color-primary)]" />
                  {t("common:loading")}
                </div>
              ) : members.length === 0 ? (
                <div className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                  {t("workspace:share.noOtherMembers", "Chưa có cộng tác viên nào khác.")}
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] text-xs font-bold border border-[var(--color-border)]">
                        {(m.full_name || m.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[var(--color-text-primary)]">
                          {m.full_name || m.email}
                        </p>
                        {m.full_name && (
                          <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                            {m.email}
                          </p>
                        )}
                        {m.status === "pending" && (
                          <span className="inline-block text-[10px] text-amber-500 font-medium">
                            {t("workspace:share.pendingStatus", "Đang chờ chấp nhận")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner ? (
                        <>
                          <select
                            value={m.role}
                            disabled={actionLoadingId === m.id}
                            onChange={(e) => handleRoleChange(m, e.target.value as any)}
                            className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs font-medium text-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)] disabled:opacity-50"
                          >
                            <option value="viewer">{t("workspace:share.roleViewer", "Người xem")}</option>
                            <option value="editor">{t("workspace:share.roleEditor", "Người chỉnh sửa")}</option>
                            <option value="admin">{t("workspace:share.roleAdmin", "Quản trị viên")}</option>
                          </select>

                          <button
                            type="button"
                            disabled={actionLoadingId === m.id}
                            onClick={() => handleRemoveMember(m)}
                            title={t("workspace:share.removeMember", "Hủy quyền truy cập")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-50"
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
        <div className="flex justify-end border-t border-[var(--color-border)] px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)]"
          >
            {t("common:close")}
          </button>
        </div>
      </div>
    </div>
  );
}
