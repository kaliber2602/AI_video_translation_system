import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Ban,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  X,
  Zap,
} from "lucide-react";

import {
  getAdminUsers,
  getAdminUserDetail,
  updateAdminUser,
  adjustAdminUserCredits,
} from "../../services/admin.service";
import { toast } from "../../lib/toast";
import type {
  AdminUserListItem,
  AdminUserDetailResponse,
} from "../../types/admin";

export default function AdminUsersPage() {
  const { t } = useTranslation(["admin", "common"]);

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(15);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Credit adjustment modal
  const [creditUser, setCreditUser] = useState<AdminUserListItem | null>(null);
  const [creditAmount, setCreditAmount] = useState(500);
  const [creditReason, setCreditReason] = useState("Hỗ trợ kỹ thuật / Bồi hoàn tín chỉ");
  const [adjusting, setAdjusting] = useState(false);

  // User detail modal
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [offset, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers({
        limit,
        offset,
        search: search.trim() ? search.trim() : undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("[AdminUsersPage] Error loading users:", err);
      toast.error("Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    loadUsers();
  };

  const handleToggleActive = async (user: AdminUserListItem) => {
    const nextState = !user.is_active;
    const confirmMsg = nextState
      ? `Bạn có chắc muốn kích hoạt lại tài khoản ${user.email}?`
      : `Bạn có chắc muốn KHÓA (Ban) tài khoản ${user.email}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateAdminUser(user.id, { is_active: nextState });
      toast.success(
        nextState
          ? `Đã kích hoạt lại tài khoản ${user.email}.`
          : `Đã khóa tài khoản ${user.email}.`
      );
      loadUsers();
    } catch (err) {
      toast.error("Không thể cập nhật trạng thái người dùng.");
    }
  };

  const handleToggleRole = async (user: AdminUserListItem) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const confirmMsg =
      nextRole === "admin"
        ? `CẢNH BÁO: Bạn có muốn thăng cấp tài khoản ${user.email} thành QUẢN TRỊ VIÊN (ADMIN)?`
        : `Bạn có muốn hạ quyền quản trị viên của ${user.email} xuống người dùng thường?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateAdminUser(user.id, { role: nextRole });
      toast.success(`Đã đổi vai trò của ${user.email} thành "${nextRole}".`);
      loadUsers();
    } catch (err) {
      toast.error("Không thể thay đổi quyền quản trị.");
    }
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditUser) return;

    try {
      setAdjusting(true);
      const res = await adjustAdminUserCredits(creditUser.id, {
        amount: creditAmount,
        reason: creditReason,
      });
      toast.success(res.message);
      setCreditUser(null);
      loadUsers();
    } catch (err) {
      toast.error("Lỗi khi điều chỉnh tín chỉ.");
    } finally {
      setAdjusting(false);
    }
  };

  const handleViewDetail = async (userId: number) => {
    setDetailUserId(userId);
    try {
      setDetailLoading(true);
      const data = await getAdminUserDetail(userId);
      setUserDetail(data);
    } catch (err) {
      toast.error("Không thể tải chi tiết người dùng.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            {t("admin:users.title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t("admin:users.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin:users.searchPlaceholder")}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-2 pl-9 pr-4 text-xs font-medium text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-[var(--color-text-muted)] whitespace-nowrap">
            {t("admin:users.role")}:
          </span>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setOffset(0);
            }}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none transition cursor-pointer"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="user">Người dùng thường (User)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3.5">Người dùng</th>
                <th className="px-4 py-3.5">{t("admin:users.role")}</th>
                <th className="px-4 py-3.5">{t("admin:users.plan")}</th>
                <th className="px-4 py-3.5">{t("admin:users.projects")}</th>
                <th className="px-4 py-3.5">{t("admin:users.videos")}</th>
                <th className="px-4 py-3.5">{t("admin:users.creditsUsed")}</th>
                <th className="px-4 py-3.5">{t("admin:users.status")}</th>
                <th className="px-4 py-3.5 text-right">{t("admin:users.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--color-primary)]" />
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--color-surface-muted)]/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold text-xs">
                          {u.full_name ? u.full_name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--color-text-primary)]">{u.full_name}</p>
                          <p className="text-[11px] text-[var(--color-text-muted)]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleRole(u)}
                        title="Click để đổi vai trò"
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          u.role === "admin"
                            ? "bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20"
                            : "bg-gray-500/10 text-gray-600 border border-gray-500/20 hover:bg-gray-500/20"
                        }`}
                      >
                        <Shield size={10} />
                        {u.role}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          u.plan_code === "business"
                            ? "bg-purple-500/15 text-purple-600"
                            : u.plan_code === "pro"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {u.plan_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-secondary)]">
                      {u.projects_count}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-secondary)]">
                      {u.videos_count}
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--color-text-primary)]">
                      <span className="inline-flex items-center gap-1 text-teal-600 font-bold">
                        <Zap size={12} />
                        {u.credits_used.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                          u.is_active
                            ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                            : "bg-red-500/15 text-red-600 hover:bg-red-500/25"
                        }`}
                      >
                        {u.is_active ? <CheckCircle2 size={10} /> : <Ban size={10} />}
                        {u.is_active ? t("admin:users.active") : t("admin:users.banned")}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCreditUser(u);
                            setCreditAmount(500);
                          }}
                          title="Cộng/Trừ credits"
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[11px] font-bold text-teal-600 hover:bg-teal-500/10 transition cursor-pointer"
                        >
                          <Zap size={12} />
                          <span>Credits</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleViewDetail(u.id)}
                          className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[11px] font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition cursor-pointer"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-secondary)]">
            <span>
              Hiển thị {offset + 1} - {Math.min(offset + limit, total)} trên tổng số {total} tài khoản
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-bold disabled:opacity-40 cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-bold disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Credits Modal */}
      {creditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setCreditUser(null)} />
          <form
            onSubmit={handleAdjustCredits}
            className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl z-10 animate-scaleIn space-y-4"
          >
            <div className="border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {t("admin:users.modalAdjustTitle")}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Người dùng: <span className="font-bold">{creditUser.full_name}</span> ({creditUser.email})
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                {t("admin:users.amountLabel")}
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm font-mono font-bold text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                required
              />
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                Ví dụ: Nhập <span className="font-bold text-emerald-600">500</span> để cộng thêm 500 credits, hoặc <span className="font-bold text-red-500">-200</span> để trừ bớt 200 credits.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                {t("admin:users.reasonLabel")}
              </label>
              <input
                type="text"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setCreditUser(null)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer"
              >
                {adjusting ? "Đang xử lý..." : t("admin:users.confirm")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Detail Drawer/Modal */}
      {detailUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => {
              setDetailUserId(null);
              setUserDetail(null);
            }}
          />
          <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl z-10 overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">Hồ Sơ Chi Tiết Người Dùng</h3>
                <p className="font-mono text-xs text-[var(--color-text-muted)]">User ID #{detailUserId}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailUserId(null);
                  setUserDetail(null);
                }}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {detailLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
                </div>
              ) : !userDetail ? (
                <p className="text-sm text-red-500">Không tìm thấy thông tin tài khoản.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-xs">
                    <div>
                      <span className="text-[var(--color-text-muted)]">Họ tên:</span>
                      <p className="font-bold text-[var(--color-text-primary)]">{userDetail.full_name}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">Email:</span>
                      <p className="font-bold text-[var(--color-text-primary)]">{userDetail.email}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">Vai trò:</span>
                      <p className="font-bold uppercase text-red-500">{userDetail.role}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">Gói cước:</span>
                      <p className="font-bold text-purple-600">{userDetail.plan_name}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">Tổng dự án:</span>
                      <p className="font-bold">{userDetail.projects_count}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">Tổng video:</span>
                      <p className="font-bold">{userDetail.videos_count}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">Tín chỉ đã tiêu thụ:</span>
                      <p className="font-bold text-teal-600">{userDetail.total_credits_used.toLocaleString()} credits</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">Ngày tạo tài khoản:</span>
                      <p className="font-mono">{new Date(userDetail.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                      Tiến trình AI gần đây của người dùng
                    </h4>
                    {userDetail.recent_jobs.length === 0 ? (
                      <div className="rounded-xl border border-[var(--color-border)] p-4 text-center text-xs text-[var(--color-text-muted)]">
                        Người dùng chưa chạy tiến trình dịch video nào.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {userDetail.recent_jobs.map((rj) => (
                          <div
                            key={rj.id}
                            className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5 px-3 text-xs"
                          >
                            <div>
                              <p className="font-bold text-[var(--color-text-primary)]">{rj.video_title}</p>
                              <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                                {rj.current_step || "—"} • {rj.progress}%
                              </span>
                            </div>
                            <span className="font-mono font-bold uppercase text-[10px]">{rj.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
