import { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  Layers,
  Volume2,
  Subtitles,
  Globe,
  Settings2,
  Loader2,
  ShieldCheck,
  BookmarkPlus,
} from "lucide-react";
import Dialog from "../common/Dialog";
import Button from "../common/Button";
import { toast } from "../../lib/toast";
import {
  getPresets,
  createPreset,
  type PipelinePreset,
} from "../../services/preset.service";
import {
  createBatchJob,
  type BatchJobDetail,
} from "../../services/batch.service";

interface BatchProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVideoIds: number[];
  projectId: number;
  onBatchStarted: (batch: BatchJobDetail) => void;
}

export default function BatchProcessModal({
  isOpen,
  onClose,
  selectedVideoIds,
  projectId,
  onBatchStarted,
}: BatchProcessModalProps) {
  const [presets, setPresets] = useState<PipelinePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batch Form State
  const [batchName, setBatchName] = useState("");
  const [targetLang, setTargetLang] = useState("vi");
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Save as new preset state
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDesc, setNewPresetDesc] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setBatchName(`Xử lý hàng loạt (${selectedVideoIds.length} video) - ${dateStr}`);

    async function loadPresets() {
      setIsLoadingPresets(true);
      try {
        const list = await getPresets();
        setPresets(list);
        if (list.length > 0) {
          const defaultPreset = list.find((p) => p.is_default) || list[0];
          setSelectedPresetId(defaultPreset.id);
          setTargetLang(defaultPreset.target_language || "vi");
          setBurnSubtitles(defaultPreset.burn_subtitles ?? true);
          setVoiceSpeed(defaultPreset.voice_speed || 1.0);
        }
      } catch (err: any) {
        toast.error("Không thể tải danh sách cấu hình mẫu (presets)");
      } finally {
        setIsLoadingPresets(false);
      }
    }

    loadPresets();
  }, [isOpen, selectedVideoIds.length]);

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  const handleSelectPreset = (preset: PipelinePreset) => {
    setSelectedPresetId(preset.id);
    setTargetLang(preset.target_language || "vi");
    setBurnSubtitles(preset.burn_subtitles ?? true);
    setVoiceSpeed(preset.voice_speed || 1.0);
  };

  const handleSaveAsPreset = async () => {
    if (!newPresetName.trim()) {
      toast.error("Vui lòng nhập tên cấu hình mẫu");
      return;
    }

    try {
      setIsSavingPreset(true);
      const created = await createPreset({
        name: newPresetName.trim(),
        description: newPresetDesc.trim() || "Cấu hình tùy chỉnh cho xử lý hàng loạt",
        target_language: targetLang || "vi",
        source_language: selectedPreset?.source_language || "auto",
        stt_model: selectedPreset?.stt_model || "whisper-medium",
        enable_diarization: selectedPreset?.enable_diarization ?? true,
        translation_model: selectedPreset?.translation_model || "nllb_200_1.3b",
        tts_model: selectedPreset?.tts_model || "coqui_xtts_v2",
        voice_id: String(selectedPreset?.voice_id || "1"),
        voice_speed: Number(voiceSpeed || 1.0),
        subtitle_format: selectedPreset?.subtitle_format || "ass",
        burn_subtitles: Boolean(burnSubtitles),
        video_quality: selectedPreset?.video_quality || "1080p",
        video_format: selectedPreset?.video_format || "mp4",
        config_data: selectedPreset?.config_data || undefined,
      });

      setPresets((prev) => [created, ...prev]);
      setSelectedPresetId(created.id);
      setNewPresetName("");
      setNewPresetDesc("");
      toast.success(`Đã lưu mẫu cấu hình "${created.name}"`);
    } catch (err: any) {
      toast.error("Không thể lưu cấu hình mẫu mới");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVideoIds.length === 0) {
      toast.error("Chưa chọn video nào để xử lý");
      return;
    }

    try {
      setIsSubmitting(true);
      const batch = await createBatchJob(projectId, {
        name: batchName.trim() || undefined,
        video_ids: selectedVideoIds,
        preset_id: selectedPresetId || undefined,
        config_override: {
          target_language: targetLang,
          burn_subtitles: burnSubtitles,
          voice_speed: voiceSpeed,
        },
      });

      toast.success(`Đã khởi tạo xử lý hàng loạt cho ${selectedVideoIds.length} video!`);
      onBatchStarted(batch);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Lỗi khởi tạo xử lý hàng loạt";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Sparkles size={20} />
          </div>
          <span>Xử lý hàng loạt AI (Batch Pipeline)</span>
        </div>
      }
      description={`Cấu hình và tự động hóa quy trình dịch thuật cho ${selectedVideoIds.length} video được chọn.`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        {/* Batch Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
            Tên tiến trình hàng loạt
          </label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            placeholder="VD: Batch dịch anime tập 1-10..."
          />
        </div>

        {/* Presets Selection */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Layers size={14} />
              Chọn mẫu cấu hình (Pipeline Presets)
            </label>
            <span className="text-xs text-[var(--color-text-muted)]">
              {presets.length} mẫu có sẵn
            </span>
          </div>

          {isLoadingPresets ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
              <span className="ml-2 text-sm text-[var(--color-text-muted)]">Đang tải cấu hình mẫu...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {presets.map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-2 ring-[var(--color-primary)]/20 shadow-sm"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">
                          {preset.name}
                        </h4>
                        {isSelected && (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-2.5">
                        {preset.description || "Cấu hình chuẩn hệ thống"}
                      </p>
                    </div>

                    <div className="space-y-1 border-t border-[var(--color-border)]/60 pt-2 text-[11px] text-[var(--color-text-muted)]">
                      <div className="flex items-center justify-between">
                        <span>STT:</span>
                        <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[100px]">
                          {preset.stt_model}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Voice:</span>
                        <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[100px]">
                          {preset.tts_model}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Phụ đề:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {preset.burn_subtitles ? "Hardsub" : "Softsub"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-1">
                      {preset.is_system ? (
                        <span className="inline-flex items-center rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          Hệ thống
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                          Tùy chỉnh
                        </span>
                      )}
                      {preset.is_default && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Mặc định
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Customization Options */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Settings2 size={14} />
              Tùy chỉnh nhanh cho Batch này
            </span>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              {showAdvanced ? "Thu gọn" : "Lưu Preset mới"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Target Language */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                <Globe size={13} />
                Ngôn ngữ đích
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="vi">Tiếng Việt (vi)</option>
                <option value="en">Tiếng Anh (en)</option>
                <option value="ja">Tiếng Nhật (ja)</option>
                <option value="ko">Tiếng Hàn (ko)</option>
                <option value="zh">Tiếng Trung (zh)</option>
                <option value="fr">Tiếng Pháp (fr)</option>
                <option value="es">Tiếng Tây Ban Nha (es)</option>
                <option value="de">Tiếng Đức (de)</option>
              </select>
            </div>

            {/* Voice Speed */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                <Volume2 size={13} />
                Tốc độ giọng ({voiceSpeed}x)
              </label>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-[var(--color-primary)]"
              />
            </div>

            {/* Burn Subtitles Toggle */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                <Subtitles size={13} />
                Ghép phụ đề (Hardsub)
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                <input
                  type="checkbox"
                  checked={burnSubtitles}
                  onChange={(e) => setBurnSubtitles(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
                />
                <span className="text-xs text-[var(--color-text-primary)]">
                  {burnSubtitles ? "In phụ đề vào video" : "Chỉ xuất file phụ đề"}
                </span>
              </label>
            </div>
          </div>

          {/* Advanced Save As Preset Form */}
          {showAdvanced && (
            <div className="border-t border-[var(--color-border)] pt-3 mt-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-primary)]">
                <BookmarkPlus size={14} className="text-purple-500" />
                <span>Lưu cấu hình hiện tại thành Preset riêng:</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tên Preset mới..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Mô tả ngắn..."
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveAsPreset}
                  disabled={isSavingPreset || !newPresetName.trim()}
                  icon={isSavingPreset ? <Loader2 size={12} className="animate-spin" /> : <BookmarkPlus size={12} />}
                >
                  Lưu
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hardware & VRAM Guarantee Note */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300">
          <ShieldCheck size={18} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-0.5">
            <p className="font-semibold">Cơ chế bảo vệ VRAM & Chạy ngầm an toàn:</p>
            <p className="text-[11px] leading-relaxed text-emerald-700/90 dark:text-emerald-300/80">
              Hệ thống sẽ điều phối tuần tự từng video trên GPU RTX 4060 (đỉnh tải &le; 6.19GB VRAM), loại trừ hoàn toàn nguy cơ tràn bộ nhớ. Bạn có thể yên tâm đóng tab trình duyệt; thông báo tổng kết sẽ gửi về khi hoàn tất toàn bộ video.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || selectedVideoIds.length === 0}
            icon={isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          >
            {isSubmitting
              ? "Đang khởi tạo..."
              : `Bắt đầu xử lý hàng loạt (${selectedVideoIds.length} video)`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
