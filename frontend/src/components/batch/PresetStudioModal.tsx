import { useState, useEffect } from "react";
import {
  Sliders,
  Volume2,
  Mic,
  Languages,
  Speech,
  Subtitles,
  Film,
  Check,
  Plus,
  Trash2,
  Play,
  Square,
  Save,
  RotateCcw,
  Lock,
  Loader2,
  Eye,
} from "lucide-react";
import Dialog from "../common/Dialog";
import Button from "../common/Button";
import { toast } from "../../lib/toast";
import {
  getPresets,
  createPreset,
  updatePreset,
  deletePreset,
  type PipelinePreset,
  type PresetConfigData,
} from "../../services/preset.service";

export interface PresetStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPresetId?: number | null;
  onPresetsChanged?: () => void;
  onSelectPreset?: (preset: PipelinePreset) => void;
}

type TabKey =
  | "separation"
  | "transcription"
  | "translation"
  | "tts"
  | "subtitles"
  | "export";

const DEFAULT_CONFIG: PresetConfigData = {
  audio_separation: {
    demucs_model: "htdemucs",
    vocal_volume: 100,
    bgm_volume: 35,
    enable_ducking: true,
    ducking_level: -14,
    ducking_threshold: -22,
    ducking_attack: 20,
    ducking_release: 250,
  },
  transcription: {
    model_size: "medium",
    diarization: true,
    min_speakers: 1,
    max_speakers: 4,
    filter_fillers: true,
    temperature: 0.0,
  },
  translation: {
    model_name: "nllb_200_1.3b",
    source_language: "auto",
    target_language: "vi",
    apply_glossary: true,
    preserve_tone: "natural",
  },
  tts_dubbing: {
    engine: "coqui_xtts_v2",
    default_voice_id: "female_warm",
    speed_rate: 1.0,
    pitch_shift: 0,
    speaker_voice_mapping: {
      "Speaker 1": "female_warm",
      "Speaker 2": "male_deep",
    },
  },
  subtitles: {
    format: "ass",
    burn_mode: "hardcode",
    style: {
      font_name: "Montserrat",
      font_size: 22,
      primary_color: "#FFFFFF",
      outline_color: "#000000",
      margin_v: 25,
      max_chars_per_line: 40,
      karaoke_effect: true,
      highlight_color: "#FFD700",
    },
  },
  export_muxing: {
    resolution: "1080p",
    encoder: "h264_nvenc",
    bitrate: "8M",
    preset_speed: "p4",
    container: "mp4",
  },
};

export default function PresetStudioModal({
  isOpen,
  onClose,
  initialPresetId,
  onPresetsChanged,
  onSelectPreset,
}: PresetStudioModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("separation");
  const [presets, setPresets] = useState<PipelinePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preset Info
  const [presetName, setPresetName] = useState("Cấu hình tùy chỉnh mới");
  const [presetDescription, setPresetDescription] = useState("");
  const [isSaveAsNewOpen, setIsSaveAsNewOpen] = useState(false);
  const [newSaveName, setNewSaveName] = useState("");

  // 6 Layers Config State
  const [config, setConfig] = useState<PresetConfigData>(DEFAULT_CONFIG);

  // Voice Preview State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Preview Subtitle Text
  const [previewSubtitleText, setPreviewSubtitleText] = useState(
    "Chào mừng bạn đến với hệ thống dịch thuật video tự động bằng AI đa mô hình!"
  );

  useEffect(() => {
    if (!isOpen) return;
    loadPresetList();
  }, [isOpen]);

  const loadPresetList = async () => {
    setIsLoading(true);
    try {
      const list = await getPresets();
      setPresets(list);

      const targetId = initialPresetId || (list.length > 0 ? list[0].id : null);
      if (targetId) {
        const found = list.find((p) => p.id === targetId) || list[0];
        if (found) {
          applyPresetToState(found);
        }
      }
    } catch (err: any) {
      toast.error("Không thể tải danh sách presets");
    } finally {
      setIsLoading(false);
    }
  };

  const applyPresetToState = (preset: PipelinePreset) => {
    setSelectedPresetId(preset.id);
    setPresetName(preset.name);
    setPresetDescription(preset.description || "");

    // Merge config_data or synthesize from flat fields
    const base: PresetConfigData = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (preset.config_data) {
      if (preset.config_data.audio_separation) {
        base.audio_separation = { ...base.audio_separation, ...preset.config_data.audio_separation };
      }
      if (preset.config_data.transcription) {
        base.transcription = { ...base.transcription, ...preset.config_data.transcription };
      }
      if (preset.config_data.translation) {
        base.translation = { ...base.translation, ...preset.config_data.translation };
      }
      if (preset.config_data.tts_dubbing) {
        base.tts_dubbing = { ...base.tts_dubbing, ...preset.config_data.tts_dubbing };
      }
      if (preset.config_data.subtitles) {
        base.subtitles = {
          ...base.subtitles,
          ...preset.config_data.subtitles,
          style: { ...base.subtitles?.style, ...(preset.config_data.subtitles.style || {}) },
        };
      }
      if (preset.config_data.export_muxing) {
        base.export_muxing = { ...base.export_muxing, ...preset.config_data.export_muxing };
      }
    } else {
      // Fallback from flat legacy fields
      if (preset.target_language) base.translation!.target_language = preset.target_language;
      if (preset.source_language) base.translation!.source_language = preset.source_language;
      if (preset.stt_model) base.transcription!.model_size = preset.stt_model;
      if (preset.enable_diarization !== undefined) base.transcription!.diarization = preset.enable_diarization;
      if (preset.translation_model) base.translation!.model_name = preset.translation_model;
      if (preset.tts_model) base.tts_dubbing!.engine = preset.tts_model;
      if (preset.voice_speed !== undefined) base.tts_dubbing!.speed_rate = preset.voice_speed;
      if (preset.burn_subtitles !== undefined) base.subtitles!.burn_mode = preset.burn_subtitles ? "hardcode" : "none";
      if (preset.video_quality) base.export_muxing!.resolution = preset.video_quality;
    }

    setConfig(base);
  };

  const currentPreset = presets.find((p) => p.id === selectedPresetId);
  const isSystemPreset = currentPreset?.is_system ?? false;

  const handleResetDefaults = () => {
    setConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    toast.success("Đã khôi phục cài đặt mặc định 6 tầng AI");
  };

  const handleSaveExisting = async () => {
    if (!selectedPresetId || isSystemPreset) return;
    setIsSaving(true);
    try {
      const isDiarization = typeof config.transcription?.diarization === "object"
        ? Boolean((config.transcription?.diarization as any)?.enabled ?? true)
        : Boolean(config.transcription?.diarization ?? true);
      const isBurn = config.subtitles?.burn_mode === "hardcode" || config.subtitles?.burn_mode === "hardsub";

      const payload = {
        name: presetName.trim(),
        description: presetDescription || "Cấu hình tạo từ Preset Studio",
        target_language: config.translation?.target_language || "vi",
        source_language: config.translation?.source_language || "auto",
        stt_model: config.transcription?.model_size || "medium",
        enable_diarization: isDiarization,
        translation_model: config.translation?.model_name || "nllb_200_1.3b",
        tts_model: config.tts_dubbing?.engine || "coqui_xtts_v2",
        voice_id: String(config.tts_dubbing?.default_voice_id || "female_warm"),
        voice_speed: Number(config.tts_dubbing?.speed_rate || 1.0),
        subtitle_format: config.subtitles?.format || "ass",
        burn_subtitles: isBurn,
        video_quality: config.export_muxing?.resolution || "1080p",
        video_format: config.export_muxing?.container || "mp4",
        config_data: config,
      };

      const updated = await updatePreset(selectedPresetId, payload);
      setPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(`Đã cập nhật preset "${updated.name}" thành công!`);
      if (onPresetsChanged) onPresetsChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi cập nhật preset");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!newSaveName.trim()) {
      toast.error("Vui lòng nhập tên cho cấu hình mới");
      return;
    }
    setIsSaving(true);
    try {
      const isDiarization = typeof config.transcription?.diarization === "object"
        ? Boolean((config.transcription?.diarization as any)?.enabled ?? true)
        : Boolean(config.transcription?.diarization ?? true);
      const isBurn = config.subtitles?.burn_mode === "hardcode" || config.subtitles?.burn_mode === "hardsub";

      const payload = {
        name: newSaveName.trim(),
        description: presetDescription || "Cấu hình tạo từ Preset Studio",
        target_language: config.translation?.target_language || "vi",
        source_language: config.translation?.source_language || "auto",
        stt_model: config.transcription?.model_size || "medium",
        enable_diarization: isDiarization,
        translation_model: config.translation?.model_name || "nllb_200_1.3b",
        tts_model: config.tts_dubbing?.engine || "coqui_xtts_v2",
        voice_id: String(config.tts_dubbing?.default_voice_id || "female_warm"),
        voice_speed: Number(config.tts_dubbing?.speed_rate || 1.0),
        subtitle_format: config.subtitles?.format || "ass",
        burn_subtitles: isBurn,
        video_quality: config.export_muxing?.resolution || "1080p",
        video_format: config.export_muxing?.container || "mp4",
        config_data: config,
      };

      const created = await createPreset(payload);
      setPresets((prev) => [created, ...prev]);
      setSelectedPresetId(created.id);
      setPresetName(created.name);
      setIsSaveAsNewOpen(false);
      setNewSaveName("");
      toast.success(`Đã tạo preset mới "${created.name}" thành công!`);
      if (onPresetsChanged) onPresetsChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi tạo preset mới");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPresetId || isSystemPreset) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa preset "${presetName}"?`)) return;

    setIsDeleting(true);
    try {
      await deletePreset(selectedPresetId);
      const remaining = presets.filter((p) => p.id !== selectedPresetId);
      setPresets(remaining);
      if (remaining.length > 0) {
        applyPresetToState(remaining[0]);
      }
      toast.success("Đã xóa preset thành công");
      if (onPresetsChanged) onPresetsChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xóa preset");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestVoiceAudio = () => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    if (!window.speechSynthesis) {
      toast.error("Trình duyệt không hỗ trợ Web Speech Synthesis");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      config.translation?.target_language === "en"
        ? "Hello, this is a sample voice preview generated for your dubbing configuration."
        : "Xin chào, đây là giọng đọc thử nghiệm với tốc độ và âm điệu bạn đã chọn trong preset studio."
    );

    utterance.rate = config.tts_dubbing?.speed_rate || 1.0;
    utterance.pitch = 1.0 + (config.tts_dubbing?.pitch_shift || 0) * 0.1;
    utterance.lang = config.translation?.target_language === "en" ? "en-US" : "vi-VN";

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 text-lg font-bold text-[var(--color-text-primary)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Sliders size={20} />
          </div>
          <span>Preset Studio — Cấu Hình 6 Tầng AI Chuyên Sâu</span>
        </div>
      }
      description="Thiết lập tham số toàn diện cho chu trình xử lý video: Tách âm, STT Whisper, Dịch thuật, TTS đa giọng, Phụ đề ASS & Render GPU NVENC."
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-5 pt-2">
        {/* Top Preset Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] shrink-0">
              Preset mẫu:
            </span>
            <select
              value={selectedPresetId || ""}
              disabled={isLoading}
              onChange={(e) => {
                const id = Number(e.target.value);
                const found = presets.find((p) => p.id === id);
                if (found) applyPresetToState(found);
              }}
              className="h-9 flex-1 truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-indigo-500 cursor-pointer"
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.is_system ? "(Hệ thống 🔒)" : "(Tùy chỉnh ✏️)"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSystemPreset ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-500">
                <Lock size={12} />
                Hệ thống (Read-only)
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveExisting}
                  disabled={isSaving}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Lưu cập nhật
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex h-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 text-xs text-rose-500 transition hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
                  title="Xóa preset này"
                >
                  {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setNewSaveName(`${presetName} (Copy)`);
                setIsSaveAsNewOpen(true);
              }}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-text-primary)] transition hover:border-indigo-500 hover:text-indigo-500 cursor-pointer"
            >
              <Plus size={13} />
              Lưu thành mới
            </button>
          </div>
        </div>

        {/* Save As New Popover/Bar */}
        {isSaveAsNewOpen && (
          <div className="flex flex-col gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 animate-fade-in">
            <div className="text-xs font-bold text-indigo-400">Tạo Preset mới từ các thiết lập hiện tại:</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nhập tên preset mới..."
                value={newSaveName}
                onChange={(e) => setNewSaveName(e.target.value)}
                className="h-8 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
              />
              <Button size="sm" onClick={handleSaveAsNew} disabled={isSaving}>
                {isSaving ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}
                Xác nhận
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsSaveAsNewOpen(false)}>
                Hủy
              </Button>
            </div>
          </div>
        )}

        {/* 6 Tabs Navigation */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("separation")}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 transition cursor-pointer ${
              activeTab === "separation"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Volume2 size={16} />
            <span>1. Tách âm</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transcription")}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 transition cursor-pointer ${
              activeTab === "transcription"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Mic size={16} />
            <span>2. STT Whisper</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("translation")}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 transition cursor-pointer ${
              activeTab === "translation"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Languages size={16} />
            <span>3. Dịch thuật</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tts")}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 transition cursor-pointer ${
              activeTab === "tts"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Speech size={16} />
            <span>4. Lồng tiếng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("subtitles")}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 transition cursor-pointer ${
              activeTab === "subtitles"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Subtitles size={16} />
            <span>5. Phụ đề ASS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 transition cursor-pointer ${
              activeTab === "export"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Film size={16} />
            <span>6. Xuất NVENC</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="min-h-[340px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          {/* TAB 1: AUDIO SEPARATION & DUCKING */}
          {activeTab === "separation" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 1: Tách Âm Nhạc Nền (Demucs) & Tự Động Hạ Nhạc (Ducking)
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Tách âm thanh gốc thành Vocal và BGM bằng mô hình Hybrid Demucs v4.
                  </p>
                </div>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
                  HTDemucs v4
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Mô hình Demucs AI
                  </label>
                  <select
                    value={config.audio_separation?.demucs_model || "htdemucs"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        audio_separation: { ...prev.audio_separation, demucs_model: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="htdemucs">htdemucs (Tốc độ cao, VRAM tối ưu 1.2GB)</option>
                    <option value="htdemucs_ft">htdemucs_ft (Độ chính xác cao, khử sạch tạp âm)</option>
                    <option value="mdx_extra">mdx_extra (Bảo toàn nhạc nền chi tiết)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Âm lượng Nhạc nền (BGM Volume): {config.audio_separation?.bgm_volume ?? 35}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="5"
                    value={config.audio_separation?.bgm_volume ?? 35}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        audio_separation: { ...prev.audio_separation, bgm_volume: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    <span>Tắt (0%)</span>
                    <span>Chuẩn (35%)</span>
                    <span>Nguyên bản (100%)</span>
                  </div>
                </div>
              </div>

              {/* Ducking Settings */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable_ducking"
                      checked={config.audio_separation?.enable_ducking ?? true}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          audio_separation: { ...prev.audio_separation, enable_ducking: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="enable_ducking" className="text-xs font-bold text-[var(--color-text-primary)] cursor-pointer">
                      Tự động hạ nhỏ nhạc nền khi có giọng đọc AI (Smart Audio Ducking)
                    </label>
                  </div>
                  <span className="text-[11px] text-emerald-500 font-medium">Khuyên dùng</span>
                </div>

                {config.audio_separation?.enable_ducking && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
                    <div>
                      <span className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                        Mức giảm BGM (Attenuation): {config.audio_separation?.ducking_level ?? -14} dB
                      </span>
                      <input
                        type="range"
                        min="-30"
                        max="-3"
                        step="1"
                        value={config.audio_separation?.ducking_level ?? -14}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            audio_separation: { ...prev.audio_separation, ducking_level: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                        Attack Time (ms): {config.audio_separation?.ducking_attack ?? 20} ms
                      </span>
                      <input
                        type="number"
                        value={config.audio_separation?.ducking_attack ?? 20}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            audio_separation: { ...prev.audio_separation, ducking_attack: Number(e.target.value) },
                          }))
                        }
                        className="w-full h-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                        Release Time (ms): {config.audio_separation?.ducking_release ?? 250} ms
                      </span>
                      <input
                        type="number"
                        value={config.audio_separation?.ducking_release ?? 250}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            audio_separation: { ...prev.audio_separation, ducking_release: Number(e.target.value) },
                          }))
                        }
                        className="w-full h-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TRANSCRIPTION & DIARIZATION */}
          {activeTab === "transcription" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 2: Nhận Dạng Giọng Nói (Faster-Whisper) & Phân Tách Người Nói (Diarization)
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Chuyển âm thanh thành văn bản với độ chính xác cao và gán nhãn người nói (Speaker ID).
                  </p>
                </div>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
                  PyAnnote 3.1
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Mô hình Whisper STT
                  </label>
                  <select
                    value={config.transcription?.model_size || "medium"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        transcription: { ...prev.transcription, model_size: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="small">Whisper Small (Nhanh nhất, VRAM 1.0GB)</option>
                    <option value="medium">Whisper Medium (Cân bằng xuất sắc, VRAM 2.4GB - Khuyên dùng)</option>
                    <option value="large-v3">Whisper Large-v3 (Chính xác tuyệt đối, VRAM 4.2GB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Nhiệt độ giải mã (Temperature): {config.transcription?.temperature ?? 0.0}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.1"
                    value={config.transcription?.temperature ?? 0.0}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        transcription: { ...prev.transcription, temperature: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    <span>Chính xác (0.0)</span>
                    <span>Sáng tạo (0.8)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable_diarization"
                      checked={config.transcription?.diarization ?? true}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          transcription: { ...prev.transcription, diarization: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="enable_diarization" className="text-xs font-bold text-[var(--color-text-primary)] cursor-pointer">
                      Phân tách người nói (Speaker Diarization - PyAnnote 3.1)
                    </label>
                  </div>
                  <span className="text-[11px] text-indigo-400 font-medium">Hỗ trợ hội thoại nhiều người</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="filter_fillers"
                    checked={config.transcription?.filter_fillers ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        transcription: { ...prev.transcription, filter_fillers: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="filter_fillers" className="text-xs font-semibold text-[var(--color-text-secondary)] cursor-pointer">
                    Tự động lọc từ đệm ngập ngừng ("ừm", "à", "ờ", "uh", "um")
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSLATION & GLOSSARY */}
          {activeTab === "translation" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 3: Dịch Thuật Đa Ngữ (NLLB-200) & Từ Điển Thuật Ngữ (Glossary)
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Bản dịch mạch lạc tự nhiên, bảo toàn ngữ cảnh và dịch chính xác thuật ngữ chuyên ngành.
                  </p>
                </div>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
                  Meta NLLB 200
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Ngôn ngữ đích mặc định
                  </label>
                  <select
                    value={config.translation?.target_language || "vi"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        translation: { ...prev.translation, target_language: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="vi">Tiếng Việt (Vietnamese)</option>
                    <option value="en">Tiếng Anh (English)</option>
                    <option value="zh">Tiếng Trung (Chinese)</option>
                    <option value="ja">Tiếng Nhật (Japanese)</option>
                    <option value="ko">Tiếng Hàn (Korean)</option>
                    <option value="fr">Tiếng Pháp (French)</option>
                    <option value="de">Tiếng Đức (German)</option>
                    <option value="es">Tiếng Tây Ban Nha (Spanish)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Mô hình dịch thuật
                  </label>
                  <select
                    value={config.translation?.model_name || "nllb_200_1.3b"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        translation: { ...prev.translation, model_name: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="nllb_200_1.3b">Meta NLLB-200 (1.3B) - Chất lượng cao nhất</option>
                    <option value="nllb_200_600m">Meta NLLB-200 (600M Distilled) - Tốc độ cao</option>
                    <option value="marianmt">MarianMT (Chuyên biệt cặp ngôn ngữ)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="apply_glossary"
                      checked={config.translation?.apply_glossary ?? true}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          translation: { ...prev.translation, apply_glossary: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="apply_glossary" className="text-xs font-bold text-[var(--color-text-primary)] cursor-pointer">
                      Tự động áp dụng từ điển thuật ngữ của dự án (Project Glossary)
                    </label>
                  </div>
                  <span className="text-[11px] text-emerald-500 font-medium">Khớp từ khóa chính xác</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Phong cách ngữ điệu (Tone of Voice)
                  </label>
                  <div className="flex gap-3 text-xs">
                    {(["natural", "formal", "casual"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer text-[var(--color-text-secondary)]">
                        <input
                          type="radio"
                          name="preserve_tone"
                          value={t}
                          checked={(config.translation?.preserve_tone || "natural") === t}
                          onChange={() =>
                            setConfig((prev) => ({
                              ...prev,
                              translation: { ...prev.translation, preserve_tone: t },
                            }))
                          }
                          className="accent-indigo-500"
                        />
                        {t === "natural" ? "Tự nhiên (Natural)" : t === "formal" ? "Trang trọng (Formal)" : "Thân mật (Casual)"}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TTS DUBBING & VOICE ASSIGNMENT */}
          {activeTab === "tts" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 4: Lồng Tiếng AI (TTS Dubbing) & Phân Vai Giọng Đọc
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Nhân bản giọng gốc bằng XTTS v2 hoặc sử dụng Microsoft Neural Voice truyền cảm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestVoiceAudio}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20 cursor-pointer"
                >
                  {isPlayingAudio ? <Square size={13} /> : <Play size={13} />}
                  {isPlayingAudio ? "Dừng phát" : "Nghe thử giọng mẫu"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Động cơ TTS
                  </label>
                  <select
                    value={config.tts_dubbing?.engine || "coqui_xtts_v2"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tts_dubbing: { ...prev.tts_dubbing, engine: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="coqui_xtts_v2">Coqui XTTS v2 (Zero-shot Voice Cloning)</option>
                    <option value="edge_tts">Microsoft Edge-TTS Neural (Siêu tốc độ, mượt mà)</option>
                    <option value="bark">Suno Bark (Biểu cảm tiếng cười, thở)</option>
                    <option value="none">Không lồng tiếng (Chỉ xuất phụ đề)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Giọng đọc chính (Default Voice)
                  </label>
                  <select
                    value={config.tts_dubbing?.default_voice_id || "female_warm"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tts_dubbing: { ...prev.tts_dubbing, default_voice_id: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="female_warm">Nữ ấm áp truyền cảm (Hoài My / Jenny)</option>
                    <option value="male_deep">Nam trầm ấm tin cậy (Nam Minh / Guy)</option>
                    <option value="female_young">Nữ trẻ trung năng động</option>
                    <option value="male_dynamic">Nam sôi nổi tin tức</option>
                    <option value="clone_speaker">Tự động nhân bản giọng người nói gốc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Tốc độ giọng đọc (Speed): {config.tts_dubbing?.speed_rate ?? 1.0}x
                  </label>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={config.tts_dubbing?.speed_rate ?? 1.0}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tts_dubbing: { ...prev.tts_dubbing, speed_rate: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    <span>0.75x (Chậm)</span>
                    <span>1.0x (Chuẩn)</span>
                    <span>1.5x (Nhanh)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Độ lệch cao độ (Pitch Shift): {config.tts_dubbing?.pitch_shift ?? 0}
                  </label>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="1"
                    value={config.tts_dubbing?.pitch_shift ?? 0}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tts_dubbing: { ...prev.tts_dubbing, pitch_shift: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    <span>-5 (Trầm hơn)</span>
                    <span>0 (Mặc định)</span>
                    <span>+5 (Cao hơn)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUBTITLES & LIVE PREVIEW */}
          {activeTab === "subtitles" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 5: Kiểu Dáng Phụ Đề Chuyên Nghiệp (ASS Subtitles Studio)
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Tùy biến typography, viền đổ bóng và hiệu ứng Karaoke xem trực tiếp.
                  </p>
                </div>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
                  Advanced SubStation Alpha
                </span>
              </div>

              {/* LIVE SUBTITLE PREVIEW SCREEN */}
              <div className="relative w-full aspect-video max-h-[190px] rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shadow-inner flex flex-col justify-between p-3 select-none">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Eye size={12} className="text-indigo-400" /> Live Preview
                  </span>
                  <span>1080p ASS Render</span>
                </div>

                {/* Simulated Subtitle Line */}
                <div className="w-full text-center pb-2 px-4">
                  <p
                    style={{
                      fontFamily: config.subtitles?.style?.font_name || "Montserrat",
                      fontSize: `${config.subtitles?.style?.font_size || 22}px`,
                      color: config.subtitles?.style?.primary_color || "#FFFFFF",
                      textShadow: `0 0 4px ${config.subtitles?.style?.outline_color || "#000000"}, 0 2px 5px #000`,
                      fontWeight: "bold",
                      lineHeight: 1.3,
                    }}
                  >
                    {config.subtitles?.style?.karaoke_effect ? (
                      <span>
                        <span style={{ color: config.subtitles?.style?.highlight_color || "#FFD700" }}>
                          {previewSubtitleText.slice(0, 20)}
                        </span>
                        {previewSubtitleText.slice(20)}
                      </span>
                    ) : (
                      previewSubtitleText
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={previewSubtitleText}
                  onChange={(e) => setPreviewSubtitleText(e.target.value)}
                  placeholder="Nhập câu mẫu để thử nghiệm phụ đề..."
                  className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Chế độ phụ đề
                  </label>
                  <select
                    value={config.subtitles?.burn_mode || "hardcode"}
                    onChange={(e: any) =>
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: { ...prev.subtitles, burn_mode: e.target.value },
                      }))
                    }
                    className="w-full h-8 rounded border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs"
                  >
                    <option value="hardcode">Hardcode (Gắn chết vào video)</option>
                    <option value="soft">Soft (Phụ đề mềm tách rời)</option>
                    <option value="none">Tắt (Không xuất phụ đề)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Phông chữ (Font)
                  </label>
                  <select
                    value={config.subtitles?.style?.font_name || "Montserrat"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: {
                          ...prev.subtitles,
                          style: { ...prev.subtitles?.style, font_name: e.target.value },
                        },
                      }))
                    }
                    className="w-full h-8 rounded border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs"
                  >
                    <option value="Montserrat">Montserrat (Hiện đại, sang trọng)</option>
                    <option value="Roboto">Roboto (Rõ ràng YouTube)</option>
                    <option value="Arial">Arial (Phổ thông)</option>
                    <option value="Inter">Inter (UI Clean)</option>
                    <option value="SVN-Agency FB">SVN-Agency (Nổi bật điện ảnh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Cỡ chữ: {config.subtitles?.style?.font_size || 22}px
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="36"
                    step="1"
                    value={config.subtitles?.style?.font_size || 22}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: {
                          ...prev.subtitles,
                          style: { ...prev.subtitles?.style, font_size: Number(e.target.value) },
                        },
                      }))
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-[var(--color-text-muted)]">Màu chữ:</label>
                    <input
                      type="color"
                      value={config.subtitles?.style?.primary_color || "#FFFFFF"}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          subtitles: {
                            ...prev.subtitles,
                            style: { ...prev.subtitles?.style, primary_color: e.target.value },
                          },
                        }))
                      }
                      className="h-7 w-7 rounded border border-[var(--color-border)] cursor-pointer p-0"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-[var(--color-text-muted)]">Viền:</label>
                    <input
                      type="color"
                      value={config.subtitles?.style?.outline_color || "#000000"}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          subtitles: {
                            ...prev.subtitles,
                            style: { ...prev.subtitles?.style, outline_color: e.target.value },
                          },
                        }))
                      }
                      className="h-7 w-7 rounded border border-[var(--color-border)] cursor-pointer p-0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="karaoke_effect"
                  checked={config.subtitles?.style?.karaoke_effect ?? true}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      subtitles: {
                        ...prev.subtitles,
                        style: { ...prev.subtitles?.style, karaoke_effect: e.target.checked },
                      },
                    }))
                  }
                  className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                />
                <label htmlFor="karaoke_effect" className="text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer">
                  Kích hoạt hiệu ứng Karaoke đổi màu chữ theo nhịp đọc (Pop Highlight)
                </label>
              </div>
            </div>
          )}

          {/* TAB 6: EXPORT & NVENC */}
          {activeTab === "export" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 6: Mã Hóa & Xuất Bản Video (GPU Hardware Acceleration)
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Kích hoạt nhân mã hóa phần cứng NVENC trên GPU NVIDIA RTX để xuất video siêu tốc.
                  </p>
                </div>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  NVENC Active ⚡
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Độ phân giải (Resolution)
                  </label>
                  <select
                    value={config.export_muxing?.resolution || "1080p"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        export_muxing: { ...prev.export_muxing, resolution: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="1080p">1080p (Full HD 1920x1080 - Khuyên dùng)</option>
                    <option value="720p">720p (HD 1280x720 - Nhanh)</option>
                    <option value="4k">4K UHD (3840x2160 - Điện ảnh)</option>
                    <option value="9:16">9:16 Dọc (TikTok, Shorts, Reels)</option>
                    <option value="1:1">1:1 Vuông (Instagram, Facebook)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Bộ mã hóa (Video Encoder)
                  </label>
                  <select
                    value={config.export_muxing?.encoder || "h264_nvenc"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        export_muxing: { ...prev.export_muxing, encoder: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="h264_nvenc">h264_nvenc (NVIDIA RTX GPU - Tốc độ gấp 6x)</option>
                    <option value="libx264">libx264 (Phần mềm CPU - Tương thích tối đa)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Bitrate mục tiêu
                  </label>
                  <select
                    value={config.export_muxing?.bitrate || "8M"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        export_muxing: { ...prev.export_muxing, bitrate: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="4M">4 Mbps (Dung lượng nhỏ)</option>
                    <option value="8M">8 Mbps (Chuẩn YouTube 1080p)</option>
                    <option value="12M">12 Mbps (Chất lượng rất cao)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Định dạng file xuất (Container)
                  </label>
                  <select
                    value={config.export_muxing?.container || "mp4"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        export_muxing: { ...prev.export_muxing, container: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="mp4">MP4 (.mp4 - Chuẩn phát sóng web & di động)</option>
                    <option value="mkv">MKV (.mkv - Hỗ trợ nhiều luồng âm thanh/phụ đề)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition cursor-pointer"
          >
            <RotateCcw size={13} />
            Khôi phục mặc định 6 tầng
          </button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            {onSelectPreset && currentPreset && (
              <Button
                variant="primary"
                onClick={() => {
                  onSelectPreset(currentPreset);
                  onClose();
                }}
              >
                <Check size={14} className="mr-1.5" />
                Áp dụng Preset này
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
