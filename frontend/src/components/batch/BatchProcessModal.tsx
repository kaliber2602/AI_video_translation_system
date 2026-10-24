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
  Lock,
} from "lucide-react";
import Dialog from "../common/Dialog";
import Button from "../common/Button";
import { toast } from "../../lib/toast";
import { useSubscriptionPlan } from "../../hooks/useSubscriptionPlan";
import { useTranslation } from "react-i18next";
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

const PRO_TIER_MODELS = [
  "mdx_extra",
  "mdx_net_karaoke",
  "whisper_large_v3",
  "whisper-large-v3",
  "nllb_200_3.3b",
  "nllb-200-3.3b",
  "xtts_v2",
  "coqui_xtts_v2",
  "elevenlabs",
  "elevenlabs_multilingual_v2",
  "qwen3_tts",
  "qwen_2.5_72b",
  "bge_m3",
];

export function isPresetProTier(preset: PipelinePreset): boolean {
  const modelsToCheck = [
    preset.stt_model,
    preset.translation_model,
    preset.tts_model,
    preset.config_data?.audio_separation?.model,
    preset.config_data?.transcription?.model_size,
    preset.config_data?.translation?.model_name,
    preset.config_data?.tts_dubbing?.engine,
  ];

  return modelsToCheck.some((m) => {
    if (!m) return false;
    const clean = String(m).toLowerCase().trim();
    return PRO_TIER_MODELS.some((pro) => clean === pro || clean.includes(pro));
  });
}

export default function BatchProcessModal({
  isOpen,
  onClose,
  selectedVideoIds,
  projectId,
  onBatchStarted,
}: BatchProcessModalProps) {
  const { isPro } = useSubscriptionPlan();
  const { t } = useTranslation(["pipeline", "common"]);
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
          // If user is Free, default to a free-compatible preset first
          const freeCompatible = list.find((p) => isPro || !isPresetProTier(p));
          const defaultPreset = list.find((p) => p.is_default && (isPro || !isPresetProTier(p))) || freeCompatible || list[0];
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
  }, [isOpen, selectedVideoIds.length, isPro]);

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  const handleSelectPreset = (preset: PipelinePreset) => {
    if (!isPro && isPresetProTier(preset)) {
      toast.warning(
        t("pipeline:batch.proRequiredWarning", "This preset requires Pro plan. Please upgrade or choose a Free plan preset.")
      );
      return;
    }
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

    // Validation for Free plan
    if (!isPro && selectedPreset && isPresetProTier(selectedPreset)) {
      toast.error(t("pipeline:batch.proPresetSaveBlocked", "Cannot save configuration with Pro AI models on Free plan. Please upgrade."));
      return;
    }

    try {
      setIsSavingPreset(true);
      const created = await createPreset({
        name: newPresetName.trim(),
        description: newPresetDesc.trim() || "Cấu hình tùy chỉnh cho xử lý hàng loạt",
        target_language: targetLang,
        source_language: selectedPreset?.source_language || "auto",
        stt_model: selectedPreset?.stt_model || "whisper-medium",
        enable_diarization: selectedPreset?.enable_diarization ?? true,
        translation_model: selectedPreset?.translation_model || "nllb_200_1.3b",
        tts_model: selectedPreset?.tts_model || "edge_tts",
        voice_id: String(selectedPreset?.voice_id || "vi-VN-HoaiMyNeural"),
        voice_speed: voiceSpeed,
        subtitle_format: selectedPreset?.subtitle_format || "ass",
        burn_subtitles: burnSubtitles,
        video_quality: selectedPreset?.video_quality || "720p",
        video_format: selectedPreset?.video_format || "mp4",
        config_data: selectedPreset?.config_data || undefined,
      });

      toast.success("Đã lưu cấu hình mới thành công!");
      setPresets((prev) => [created, ...prev]);
      setSelectedPresetId(created.id);
      setNewPresetName("");
      setNewPresetDesc("");
      setShowAdvanced(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu cấu hình");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const XTTS_SUPPORTED_LANGS = ["en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh", "ja", "hu", "ko", "hi"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (selectedVideoIds.length === 0) {
      toast.error("Chưa chọn video nào để xử lý");
      return;
    }

    // Validate Pro subscription tier
    if (!isPro && selectedPreset && isPresetProTier(selectedPreset)) {
      toast.error("Preset đã chọn chứa mô hình thuộc gói Pro. Vui lòng nâng cấp tài khoản hoặc chọn Preset khác.");
      return;
    }

    // Validate Model Responsibilities & Capabilities
    const effectiveTtsModel = (selectedPreset?.tts_model || selectedPreset?.config_data?.tts_dubbing?.engine || "").toLowerCase();
    const isXttsEngine = effectiveTtsModel.includes("xtts") || effectiveTtsModel.includes("coqui");
    const cleanTargetLang = (targetLang || "").toLowerCase().trim();

    if (isXttsEngine && !XTTS_SUPPORTED_LANGS.includes(cleanTargetLang)) {
      toast.error(
        `Mô hình Coqui XTTS-v2 không hỗ trợ ngôn ngữ "${cleanTargetLang.toUpperCase()}". Vui lòng chọn Preset sử dụng Microsoft Edge-TTS hoặc ElevenLabs.`
      );
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
      const detail = err.response?.data?.detail;
      const isUpgradeReq = err.response?.status === 403 || detail?.error_code === "MODEL_UPGRADE_REQUIRED";
      if (isUpgradeReq) {
        const errorMsg = typeof detail === "object" ? detail.message : detail;
        toast.error(errorMsg || "Mô hình đã chọn yêu cầu nâng cấp gói Pro. Vui lòng chọn preset khác hoặc nâng cấp tài khoản.");
      } else {
        const msg = (typeof detail === "string" ? detail : detail?.message) || err.message || "Lỗi khởi tạo xử lý hàng loạt";
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      maxWidth="2xl"
      title={t("pipeline:batch.title", "Batch Processing")}
      description={t("pipeline:batch.subtitle", { count: selectedVideoIds.length, defaultValue: "Apply automated AI pipeline across selected videos." })}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Batch Name */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
            {t("pipeline:batch.batchName", "Batch Process Name")}:
          </label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            disabled={isSubmitting}
            placeholder={t("pipeline:batch.batchNamePlaceholder", "Enter batch process name...")}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        {/* Presets Selection */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Layers size={14} />
              {t("pipeline:batch.selectPreset", "Select Pipeline Presets")}
            </label>
            <span className="text-xs text-[var(--color-text-muted)]">
              {t("pipeline:batch.availablePresets", { count: presets.length, defaultValue: `${presets.length} presets available` })}
            </span>
          </div>

          {isLoadingPresets ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
              <span className="ml-2 text-sm text-[var(--color-text-muted)]">{t("pipeline:batch.loadingPresets", "Loading presets...")}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {presets.map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                const isProPreset = isPresetProTier(preset);
                const isLocked = !isPro && isProPreset;

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                      isLocked
                        ? "cursor-not-allowed border-amber-500/20 bg-amber-500/5 opacity-70"
                        : "cursor-pointer"
                    } ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-2 ring-[var(--color-primary)]/20 shadow-sm"
                        : !isLocked
                        ? "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-muted)]"
                        : ""
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
                        {isLocked && !isSelected && (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Lock size={11} />
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
                          {preset.burn_subtitles ? t("pipeline:batch.hardsub", "Hardsub") : t("pipeline:batch.softsub", "Softsub")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        {preset.is_system ? (
                          <span className="inline-flex items-center rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                            Hệ thống
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                            Tùy chỉnh
                          </span>
                        )}
                        {isProPreset && (
                          <span className="inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            Gói Pro
                          </span>
                        )}
                      </div>
                      {preset.is_default && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
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
            <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Settings2 size={14} className="text-[var(--color-primary)]" />
              {t("pipeline:batch.quickOptions", "Quick options for this batch")}
            </span>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              {showAdvanced ? t("pipeline:batch.collapse", "Collapse") : t("pipeline:batch.saveAsPreset", "Save New Preset")}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Target Language */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                <Globe size={12} /> {t("pipeline:batch.targetLanguage", "Target Translation Language")}
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="vi">Tiếng Việt (vi)</option>
                <option value="en">Tiếng Anh (en)</option>
                <option value="ja">Tiếng Nhật (ja)</option>
                <option value="ko">Tiếng Hàn (ko)</option>
                <option value="zh">Tiếng Trung (zh)</option>
                <option value="es">Tiếng Tây Ban Nha (es)</option>
                <option value="fr">Tiếng Pháp (fr)</option>
                <option value="de">Tiếng Đức (de)</option>
              </select>
              {(selectedPreset?.tts_model || selectedPreset?.config_data?.tts_dubbing?.engine || "").toLowerCase().includes("xtts") &&
                !XTTS_SUPPORTED_LANGS.includes(targetLang.toLowerCase()) && (
                  <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    XTTS không hỗ trợ ngôn ngữ này. Vui lòng chọn Preset khác.
                  </p>
                )}
            </div>

            {/* Subtitle Mode */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                <Subtitles size={12} /> {t("pipeline:batch.subtitleMode", "Subtitle Mode")}
              </label>
              <select
                value={burnSubtitles ? "hardsub" : "softsub"}
                onChange={(e) => setBurnSubtitles(e.target.value === "hardsub")}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="hardsub">{t("pipeline:batch.hardsubDesc", "Hardsub (Burned directly onto video)")}</option>
                <option value="softsub">{t("pipeline:batch.softsubDesc", "Softsub (Separate subtitle stream)")}</option>
              </select>
            </div>

            {/* Voice Speed */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
                  <Volume2 size={12} /> {t("pipeline:batch.voiceSpeed", "Speech Speed")}
                </label>
                <span className="text-xs font-bold text-[var(--color-primary)]">{voiceSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                disabled={isSubmitting}
                className="w-full accent-[var(--color-primary)] cursor-pointer"
              />
            </div>
          </div>

          {/* Advanced Save As Preset Form */}
          {showAdvanced && (
            <div className="pt-3 border-t border-[var(--color-border)]/60 space-y-3">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                <BookmarkPlus size={13} className="text-[var(--color-primary)]" />
                <span>{t("pipeline:batch.saveAsPresetTitle", "Save current configuration as custom preset:")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={t("pipeline:batch.presetNamePlaceholder", "New preset name...")}
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  disabled={isSavingPreset}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
                <input
                  type="text"
                  placeholder={t("pipeline:batch.presetDescPlaceholder", "Short description...")}
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  disabled={isSavingPreset}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
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
            <p className="font-semibold">{t("pipeline:batch.vramTitle", "VRAM Protection & Safe Background Execution:")}</p>
            <p className="text-[11px] leading-relaxed text-emerald-700/90 dark:text-emerald-300/80">
              {t("pipeline:batch.vramDesc", "The system orchestrates sequential execution per video on GPU (peak load <= 6.19GB VRAM), eliminating memory overflow risks. You can safely close your browser; digest notifications will be delivered upon completion.")}
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
              ? t("pipeline:batch.starting", "Initializing...")
              : t("pipeline:batch.startBatch", { count: selectedVideoIds.length, defaultValue: `Start Batch Processing (${selectedVideoIds.length} videos)` })}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
