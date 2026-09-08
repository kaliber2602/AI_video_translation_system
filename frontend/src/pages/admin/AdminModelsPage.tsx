import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Edit2,
  Loader2,
  Power,
  RefreshCw,
  Zap,
} from "lucide-react";

import { getAdminModels, updateAdminModel } from "../../services/admin.service";
import { toast } from "../../lib/toast";
import type { AdminAIModelResponse } from "../../types/admin";

export default function AdminModelsPage() {
  const { t } = useTranslation(["admin", "common"]);

  const [models, setModels] = useState<AdminAIModelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingModel, setEditingModel] = useState<AdminAIModelResponse | null>(null);
  const [editCost, setEditCost] = useState(1);
  const [editPlan, setEditPlan] = useState("free");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadModels();
  }, [selectedCategory]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await getAdminModels({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
      });
      setModels(data);
    } catch (err) {
      console.error("[AdminModelsPage] Error loading models:", err);
      toast.error("Không thể tải danh sách mô hình AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (model: AdminAIModelResponse) => {
    const nextState = !model.is_active;
    // Optimistic update
    setModels((prev) =>
      prev.map((m) => (m.id === model.id ? { ...m, is_active: nextState } : m))
    );

    try {
      await updateAdminModel(model.id, { is_active: nextState });
      toast.success(
        `Đã ${nextState ? "bật" : "tắt"} mô hình "${model.name}".`
      );
    } catch (err) {
      // Revert on error
      setModels((prev) =>
        prev.map((m) => (m.id === model.id ? { ...m, is_active: model.is_active } : m))
      );
      toast.error("Không thể cập nhật trạng thái mô hình.");
    }
  };

  const handleOpenEdit = (model: AdminAIModelResponse) => {
    setEditingModel(model);
    setEditCost(model.credit_cost_per_minute);
    setEditPlan(model.required_plan);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;

    try {
      setSaving(true);
      const updated = await updateAdminModel(editingModel.id, {
        credit_cost_per_minute: editCost,
        required_plan: editPlan,
      });
      setModels((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(`Cập nhật cấu hình mô hình ${updated.name} thành công.`);
      setEditingModel(null);
    } catch (err) {
      toast.error("Lỗi khi lưu cấu hình mô hình.");
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: "all", label: "Tất cả các loại" },
    { id: "stt", label: "Speech-to-Text (STT)" },
    { id: "separation", label: "Tách âm thanh (Demucs)" },
    { id: "diarization", label: "Nhận diện người nói" },
    { id: "translation", label: "Dịch thuật (NLLB/GPT)" },
    { id: "tts", label: "Lồng tiếng (TTS/Clone)" },
    { id: "llm", label: "LLM & Video Understanding" },
    { id: "embedding", label: "Semantic Search & Vector" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            {t("admin:models.title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t("admin:models.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadModels}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat.id
                ? "bg-[var(--color-primary)] text-white shadow-xs"
                : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Models Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3.5">Mã Model (Code)</th>
                <th className="px-4 py-3.5">Tên Mô Hình</th>
                <th className="px-4 py-3.5">{t("admin:models.category")}</th>
                <th className="px-4 py-3.5">{t("admin:models.provider")}</th>
                <th className="px-4 py-3.5">{t("admin:models.cost")}</th>
                <th className="px-4 py-3.5">{t("admin:models.requiredPlan")}</th>
                <th className="px-4 py-3.5">{t("admin:models.status")}</th>
                <th className="px-4 py-3.5 text-right">{t("common:actions", "Hành động")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--color-primary)]" />
                    Đang tải danh sách mô hình...
                  </td>
                </tr>
              ) : models.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    Không có mô hình nào thuộc danh mục này.
                  </td>
                </tr>
              ) : (
                models.map((model) => (
                  <tr key={model.id} className="hover:bg-[var(--color-surface-muted)]/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-primary)]">
                      {model.code}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--color-text-primary)]">
                      {model.name}
                    </td>
                    <td className="px-4 py-3 font-mono uppercase text-[10px] text-purple-600 dark:text-purple-400">
                      {model.category}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-[var(--color-surface-muted)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                        {model.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">
                      <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400">
                        <Zap size={13} />
                        {model.credit_cost_per_minute} credits/min
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                          model.required_plan === "business"
                            ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                            : model.required_plan === "pro"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-gray-500/10 text-gray-600 border border-gray-500/20"
                        }`}
                      >
                        {model.required_plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(model)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                          model.is_active
                            ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                            : "bg-red-500/15 text-red-600 hover:bg-red-500/25"
                        }`}
                      >
                        <Power size={12} />
                        {model.is_active ? t("admin:models.active") : t("admin:models.disabled")}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(model)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition cursor-pointer"
                      >
                        <Edit2 size={13} />
                        <span>Sửa</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Model Modal */}
      {editingModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setEditingModel(null)}
          />
          <form
            onSubmit={handleSaveEdit}
            className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl z-10 animate-scaleIn space-y-4"
          >
            <div className="border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {t("admin:models.modalTitle")}
              </h3>
              <p className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5">
                Model: {editingModel.code} ({editingModel.name})
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                Chi phí Credits mỗi phút (Credit Cost)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={editCost}
                onChange={(e) => setEditCost(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                required
              />
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                Số tín chỉ AI bị trừ khi người dùng xử lý 1 phút audio/video với mô hình này.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                Gói yêu cầu tối thiểu (Required Plan)
              </label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="free">Free (Tất cả người dùng)</option>
                <option value="pro">Pro (Gói Pro trở lên)</option>
                <option value="business">Business (Chỉ gói Business)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setEditingModel(null)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
              >
                {t("admin:models.cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Đang lưu..." : t("admin:models.save")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
