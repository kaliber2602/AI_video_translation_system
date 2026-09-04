import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  X,
} from "lucide-react";

import {
  getAdminContacts,
  updateAdminContactStatus,
} from "../../services/admin.service";
import { toast } from "../../lib/toast";
import type { AdminContactMessageResponse } from "../../types/admin";

export default function AdminContactsPage() {
  const { t } = useTranslation(["admin", "common"]);

  const [contacts, setContacts] = useState<AdminContactMessageResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(15);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Message preview modal
  const [selectedContact, setSelectedContact] = useState<AdminContactMessageResponse | null>(null);

  useEffect(() => {
    loadContacts();
  }, [offset, statusFilter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await getAdminContacts({
        limit,
        offset,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setContacts(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("[AdminContactsPage] Error loading contacts:", err);
      toast.error("Không thể tải danh sách tin nhắn hỗ trợ.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (contactId: number, nextStatus: string) => {
    try {
      await updateAdminContactStatus(contactId, nextStatus);
      toast.success(`Đã cập nhật trạng thái tin nhắn sang "${nextStatus}".`);
      if (selectedContact && selectedContact.id === contactId) {
        setSelectedContact({ ...selectedContact, status: nextStatus as any });
      }
      loadContacts();
    } catch (err) {
      toast.error("Không thể cập nhật trạng thái tin nhắn.");
    }
  };

  const handleOpenDetail = (contact: AdminContactMessageResponse) => {
    setSelectedContact(contact);
    if (contact.status === "pending") {
      // Automatically mark as read
      handleUpdateStatus(contact.id, "read");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            {t("admin:contacts.title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t("admin:contacts.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadContacts}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)] pb-1">
        {[
          { id: "all", label: "Tất cả" },
          { id: "pending", label: t("admin:contacts.pending") },
          { id: "read", label: t("admin:contacts.read") },
          { id: "resolved", label: t("admin:contacts.resolved") },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setStatusFilter(tab.id);
              setOffset(0);
            }}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 cursor-pointer ${
              statusFilter === tab.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contacts Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3.5">{t("admin:contacts.sender")}</th>
                <th className="px-4 py-3.5">{t("admin:contacts.subject")}</th>
                <th className="px-4 py-3.5">Nội dung tóm tắt</th>
                <th className="px-4 py-3.5">{t("admin:contacts.status")}</th>
                <th className="px-4 py-3.5">{t("admin:contacts.date")}</th>
                <th className="px-4 py-3.5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--color-primary)]" />
                    Đang tải hộp thư...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    Không có tin nhắn nào.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-[var(--color-surface-muted)]/50 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-[var(--color-text-primary)]">{contact.name}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{contact.email}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)] max-w-xs truncate">
                      {contact.subject || "(Không có tiêu đề)"}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-sm truncate">
                      {contact.message}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          contact.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : contact.status === "read"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono text-[11px]">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(contact)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>Xem</span>
                      </button>
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
              Hiển thị {offset + 1} - {Math.min(offset + limit, total)} trên {total} tin nhắn
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-bold disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-bold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setSelectedContact(null)} />
          <div className="relative flex flex-col w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl z-10 animate-scaleIn space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-[var(--color-primary)]" />
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">Chi Tiết Tin Nhắn Hỗ Trợ</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-surface-muted)] p-3">
                <div>
                  <span className="text-[var(--color-text-muted)]">Người gửi:</span>
                  <p className="font-bold text-[var(--color-text-primary)]">{selectedContact.name}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Email:</span>
                  <p className="font-bold text-[var(--color-text-primary)]">{selectedContact.email}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">IP Address:</span>
                  <p className="font-mono">{selectedContact.ip_address || "—"}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Thời gian:</span>
                  <p className="font-mono">{new Date(selectedContact.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <span className="font-bold text-[var(--color-text-muted)] uppercase text-[10px]">Chủ đề:</span>
                <p className="font-bold text-sm text-[var(--color-text-primary)] mt-0.5">
                  {selectedContact.subject || "(Không có tiêu đề)"}
                </p>
              </div>

              <div>
                <span className="font-bold text-[var(--color-text-muted)] uppercase text-[10px]">Nội dung:</span>
                <div className="mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3.5 text-xs text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {selectedContact.message}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
              <div className="flex gap-2">
                {selectedContact.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedContact.id, "resolved")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Đánh dấu Đã xử lý</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
