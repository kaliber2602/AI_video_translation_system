import { useState, useEffect } from "react";

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
  },
  transcription: {
    model_size: "whisper-medium",
  },
  translation: {
    model_name: "nllb_200_1.3b",
    source_language: "auto",
    target_language: "vi",
    apply_glossary: true,
  },
  tts_dubbing: {
    engine: "edge_tts",
    default_voice_id: "vi-VN-HoaiMyNeural",
    speed_rate: 1.0,
    vocal_volume: 100,
    bgm_volume: 70,
    dub_volume: 100,
    is_vocal_muted: false,
    is_bgm_muted: false,
    is_dub_muted: false,
  },
  subtitles: {
    format: "ass",
    burn_mode: "hardcode",
    bilingual_subtitles: false,
    style: {
      font_name: "Montserrat",
      font_size: 22,
      primary_color: "#FFFFFF",
      outline_color: "#000000",
      alignment: "center",
      max_lines: 2,
      line_spacing: 1.2,
      position: "bottom",
      position_y: 84,
      effect: "none",
      aspect_ratio: "16:9",
      karaoke_effect: false,
      highlight_color: "#FFD700",
    },
  },
  export_muxing: {
    resolution: "1080p",
    encoder: "h264_nvenc",
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

  const XTTS_SUPPORTED_LANGS = ["en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh", "ja", "hu", "ko", "hi"];

  const handleSaveExisting = async () => {
    if (!selectedPresetId || isSystemPreset) return;

    const ttsEngine = (config.tts_dubbing?.engine || "").toLowerCase();
    const tgtLang = (config.translation?.target_language || "vi").toLowerCase().trim();
    if ((ttsEngine.includes("xtts") || ttsEngine.includes("coqui")) && !XTTS_SUPPORTED_LANGS.includes(tgtLang)) {
      toast.error(`Mô hình Coqui XTTS-v2 không hỗ trợ ngôn ngữ "${tgtLang.toUpperCase()}". Vui lòng chọn Microsoft Edge-TTS hoặc ElevenLabs.`);
      return;
    }

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

    const ttsEngine = (config.tts_dubbing?.engine || "").toLowerCase();
    const tgtLang = (config.translation?.target_language || "vi").toLowerCase().trim();
    if ((ttsEngine.includes("xtts") || ttsEngine.includes("coqui")) && !XTTS_SUPPORTED_LANGS.includes(tgtLang)) {
      toast.error(`Mô hình Coqui XTTS-v2 không hỗ trợ ngôn ngữ "${tgtLang.toUpperCase()}". Vui lòng chọn Microsoft Edge-TTS hoặc ElevenLabs.`);
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
        <div className="flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
          <span>Preset Studio — Cấu Hình 6 Tầng AI Chuyên Sâu</span>
        </div>
      }
      description="Thiết lập tham số toàn diện cho chu trình xử lý video: Tách âm, STT Whisper, Dịch thuật, TTS đa giọng, Phụ đề ASS & Render GPU NVENC."
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-5 pt-2">
        {/* Top Preset Bar with Glassmorphic styling */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/70 backdrop-blur-md p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] shrink-0">
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
              <span className="inline-flex items-center rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-500">
                Hệ thống (Read-only)
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveExisting}
                  disabled={isSaving}
                  className="flex h-8 items-center rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Đang lưu..." : "Lưu cập nhật"}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex h-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-medium text-rose-500 transition hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
                  title="Xóa preset này"
                >
                  {isDeleting ? "Đang xóa..." : "Xóa"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setNewSaveName(`${presetName} (Copy)`);
                setIsSaveAsNewOpen(true);
              }}
              className="flex h-8 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-text-primary)] transition hover:border-indigo-500 hover:text-indigo-500 cursor-pointer"
            >
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
                {isSaving ? "Đang lưu..." : "Xác nhận"}
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
            className={`flex items-center justify-center rounded-lg py-2 transition cursor-pointer ${
              activeTab === "separation"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <span>1. Tách âm</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transcription")}
            className={`flex items-center justify-center rounded-lg py-2 transition cursor-pointer ${
              activeTab === "transcription"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <span>2. STT Whisper</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("translation")}
            className={`flex items-center justify-center rounded-lg py-2 transition cursor-pointer ${
              activeTab === "translation"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <span>3. Dịch thuật</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tts")}
            className={`flex items-center justify-center rounded-lg py-2 transition cursor-pointer ${
              activeTab === "tts"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <span>4. Lồng tiếng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("subtitles")}
            className={`flex items-center justify-center rounded-lg py-2 transition cursor-pointer ${
              activeTab === "subtitles"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <span>5. Phụ đề ASS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`flex items-center justify-center rounded-lg py-2 transition cursor-pointer ${
              activeTab === "export"
                ? "bg-[var(--color-surface)] text-indigo-500 shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <span>6. Xuất NVENC</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="min-h-[340px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          {/* TAB 1: AUDIO SEPARATION */}
          {activeTab === "separation" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 1: Tách Âm & Tiền Xử Lý (Demucs Audio Separation)
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Bóc tách âm thanh gốc thành Vocals (cho STT & lồng tiếng) và Background Music (BGM).
                  </p>
                </div>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
                  Meta Demucs v4
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Mô hình bóc tách âm thanh (Demucs)
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
                    <option value="htdemucs">Meta Demucs v4 HT (Free - Nhanh, VRAM 1.2GB)</option>
                    <option value="htdemucs_ft">Meta Demucs v4 FT (Free - Khử tạp âm tốt)</option>
                    <option value="mdx_extra">MDX-Net Extra (Pro - Bảo toàn nhạc nền chi tiết)</option>
                  </select>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                    Demucs trích xuất riêng biệt Vocals (cho nhận diện giọng nói) và Background Music (cho khâu lồng tiếng).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSCRIPTION */}
          {activeTab === "transcription" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 2: Nhận Dạng Giọng Nói (Faster-Whisper STT)
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Chuyển âm thanh thành văn bản với độ chính xác cao bám sát thời gian thực.
                  </p>
                </div>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
                  Faster-Whisper
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Mô hình nhận dạng giọng nói (Whisper STT)
                  </label>
                  <select
                    value={config.transcription?.model_size || "whisper-medium"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        transcription: { ...prev.transcription, model_size: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    <option value="whisper-base">OpenAI Whisper Base (Free)</option>
                    <option value="whisper-small">OpenAI Whisper Small (Free)</option>
                    <option value="whisper-medium">OpenAI Whisper Medium (Free - Khuyên dùng)</option>
                    <option value="whisperx-large-v3">WhisperX Large v3 (Free - Căn chỉnh thời gian chuẩn xác)</option>
                    <option value="whisper-large-v3">OpenAI Whisper Large v3 (Pro)</option>
                  </select>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                    Mô hình nhận dạng giọng nói tự động trích xuất lời thoại chính xác theo từng đoạn video.
                  </p>
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
                    <option value="en">English (English)</option>
                    <option value="zh">中文 (Chinese)</option>
                    <option value="ja">日本語 (Japanese)</option>
                    <option value="ko">한국어 (Korean)</option>
                    <option value="fr">Français (French)</option>
                    <option value="de">Deutsch (German)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="ar">العربية (Arabic)</option>
                    <option value="ru">Русский (Russian)</option>
                    <option value="pt">Português (Portuguese)</option>
                    <option value="it">Italiano (Italian)</option>
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
                    <option value="nllb_200_1.3b">Meta NLLB-200 1.3B (Free)</option>
                    <option value="deepseek_v3">DeepSeek V3 (Free)</option>
                    <option value="nllb_200_3.3b">Meta NLLB-200 3.3B (Pro)</option>
                  </select>
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
                  className="flex items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20 cursor-pointer"
                >
                  {isPlayingAudio ? "Dừng phát" : "Nghe thử giọng mẫu"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Mô hình lồng tiếng AI (TTS Engine)
                  </label>
                  <select
                    value={config.tts_dubbing?.engine || "edge_tts"}
                    onChange={(e) => {
                      const newEngine = e.target.value;
                      let defaultVoice = config.tts_dubbing?.default_voice_id;
                      if (newEngine === "edge_tts") defaultVoice = "vi-VN-HoaiMyNeural";
                      else if (newEngine === "elevenlabs") defaultVoice = "ErXwobaYiN019PkySvjV";
                      else if (newEngine === "coqui_xtts_v2") defaultVoice = "female_warm";
                      setConfig((prev) => ({
                        ...prev,
                        tts_dubbing: { ...prev.tts_dubbing, engine: newEngine, default_voice_id: defaultVoice },
                      }));
                    }}
                    className={`w-full h-9 rounded-lg border bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none ${
                      (config.tts_dubbing?.engine === "coqui_xtts_v2") &&
                      !XTTS_SUPPORTED_LANGS.includes((config.translation?.target_language || "vi").toLowerCase().trim())
                        ? "border-rose-500 bg-rose-500/5 focus:border-rose-500"
                        : "border-[var(--color-border)] focus:border-indigo-500"
                    }`}
                  >
                    <option value="edge_tts">Microsoft Edge-TTS Neural (Free Cloud)</option>
                    <option value="coqui_xtts_v2">Coqui XTTS-v2 Voice Cloning (Pro)</option>
                    <option value="elevenlabs">ElevenLabs Multilingual v2 (Pro API)</option>
                  </select>
                  {(config.tts_dubbing?.engine === "coqui_xtts_v2") &&
                    !XTTS_SUPPORTED_LANGS.includes((config.translation?.target_language || "vi").toLowerCase().trim()) && (
                      <p className="mt-1 text-[11px] font-semibold text-rose-500">
                        Coqui XTTS-v2 không hỗ trợ ngôn ngữ "{config.translation?.target_language?.toUpperCase() || "VI"}". Vui lòng chọn Microsoft Edge-TTS hoặc ElevenLabs.
                      </p>
                    )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Giọng đọc chính (Default Voice)
                  </label>
                  <select
                    value={config.tts_dubbing?.default_voice_id || "vi-VN-HoaiMyNeural"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tts_dubbing: { ...prev.tts_dubbing, default_voice_id: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                  >
                    {config.tts_dubbing?.engine === "elevenlabs" ? (
                      <>
                        <option value="ErXwobaYiN019PkySvjV">Antoni (Nam Chuẩn)</option>
                        <option value="pNInz6obpgDQGcFmaJgB">Adam (Nam Trầm)</option>
                        <option value="JBFqnCBsd6RMkjVDRZzb">George (Nam Ấm)</option>
                        <option value="EXAVITQu4vr4xnSDxMaL">Sarah (Nữ Trẻ)</option>
                        <option value="Xb7hH8MSUJpSbSDYk0k2">Alice (Nữ Dịu Dàng)</option>
                      </>
                    ) : config.tts_dubbing?.engine === "coqui_xtts_v2" ? (
                      <>
                        <option value="female_warm">Nữ ấm áp (Warm)</option>
                        <option value="male_deep">Nam trầm ấm (Deep)</option>
                        <option value="clone_speaker">Tự động nhân bản giọng người nói gốc</option>
                      </>
                    ) : (
                      <>
                        <option value="vi-VN-HoaiMyNeural">Hoài My (Nữ - Tiếng Việt)</option>
                        <option value="vi-VN-NamMinhNeural">Nam Minh (Nam - Tiếng Việt)</option>
                        <option value="en-US-JennyNeural">Jenny (Nữ - English US)</option>
                        <option value="en-US-GuyNeural">Guy (Nam - English US)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* 3-Track Virtual Mixer (Web Audio Real-Time Mixing - Matching DubbingStep) */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3.5 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                      Bàn Trộn 3 Rãnh (Virtual Mixer)
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    Real-time 0ms
                  </span>
                </div>

                {/* 1-Click Audio Presets */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--color-text-muted)] block">
                    Bộ Preset Hòa Âm 1-Click:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          tts_dubbing: {
                            ...prev.tts_dubbing,
                            is_vocal_muted: true,
                            vocal_volume: 0,
                            is_bgm_muted: false,
                            bgm_volume: 70,
                            is_dub_muted: false,
                            dub_volume: 100,
                          },
                        }));
                      }}
                      className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500 text-[10px] font-medium text-[var(--color-text-primary)] flex flex-col items-center gap-0.5 text-center transition cursor-pointer"
                      title="Vocal Gốc 0% (Tắt) + BGM 70% (Bật) + Giọng AI 100%"
                    >
                      <span>🎙️ Giọng AI</span>
                      <span className="text-[9px] text-[var(--color-text-muted)]">Pure Dub</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          tts_dubbing: {
                            ...prev.tts_dubbing,
                            is_vocal_muted: false,
                            vocal_volume: 30,
                            is_bgm_muted: false,
                            bgm_volume: 50,
                            is_dub_muted: false,
                            dub_volume: 70,
                          },
                        }));
                      }}
                      className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500 text-[10px] font-medium text-[var(--color-text-primary)] flex flex-col items-center gap-0.5 text-center transition cursor-pointer"
                      title="Vocal Gốc 30% (Bật) + BGM 50% (Bật) + Giọng AI 70%"
                    >
                      <span>📻 Truyền hình</span>
                      <span className="text-[9px] text-[var(--color-text-muted)]">70/30 Mux</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          tts_dubbing: {
                            ...prev.tts_dubbing,
                            is_vocal_muted: true,
                            vocal_volume: 0,
                            is_bgm_muted: true,
                            bgm_volume: 0,
                            is_dub_muted: false,
                            dub_volume: 100,
                          },
                        }));
                      }}
                      className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500 text-[10px] font-medium text-[var(--color-text-primary)] flex flex-col items-center gap-0.5 text-center transition cursor-pointer"
                      title="Vocal Gốc 0% (Tắt) + BGM 0% (Tắt) + Giọng AI 100%"
                    >
                      <span>🗣️ Chỉ lời nói</span>
                      <span className="text-[9px] text-[var(--color-text-muted)]">Clean Speech</span>
                    </button>
                  </div>
                </div>

                {/* Track 1: Original Vocal */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-[var(--color-text-secondary)]">
                      Vocal Gốc (Original)
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            tts_dubbing: {
                              ...prev.tts_dubbing,
                              is_vocal_muted: !prev.tts_dubbing?.is_vocal_muted,
                            },
                          }))
                        }
                        className={`text-[9px] px-1 py-0.2 rounded font-bold transition cursor-pointer ${
                          config.tts_dubbing?.is_vocal_muted
                            ? "bg-red-500/20 text-red-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {config.tts_dubbing?.is_vocal_muted ? "MUTED" : "ON"}
                      </button>
                      <span className="w-8 text-right">
                        {config.tts_dubbing?.is_vocal_muted ? "0%" : `${config.tts_dubbing?.vocal_volume ?? 100}%`}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    disabled={config.tts_dubbing?.is_vocal_muted}
                    value={config.tts_dubbing?.is_vocal_muted ? 0 : config.tts_dubbing?.vocal_volume ?? 100}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tts_dubbing: { ...prev.tts_dubbing, vocal_volume: parseInt(e.target.value) },
                      }))
                    }
                    className={`w-full h-1.5 bg-[var(--color-border)] rounded accent-indigo-500 transition ${
                      config.tts_dubbing?.is_vocal_muted ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  />
                </div>

                {/* Track 2: Original BGM */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-[var(--color-text-secondary)]">
                      Nhạc nền (BGM)
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            tts_dubbing: {
                              ...prev.tts_dubbing,
                              is_bgm_muted: !prev.tts_dubbing?.is_bgm_muted,
                            },
                          }))
                        }
                        className={`text-[9px] px-1 py-0.2 rounded font-bold transition cursor-pointer ${
                          config.tts_dubbing?.is_bgm_muted
                            ? "bg-red-500/20 text-red-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {config.tts_dubbing?.is_bgm_muted ? "MUTED" : "ON"}
                      </button>
                      <span className="w-8 text-right">
                        {config.tts_dubbing?.is_bgm_muted ? "0%" : `${config.tts_dubbing?.bgm_volume ?? 70}%`}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    disabled={config.tts_dubbing?.is_bgm_muted}
                    value={config.tts_dubbing?.is_bgm_muted ? 0 : config.tts_dubbing?.bgm_volume ?? 70}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tts_dubbing: { ...prev.tts_dubbing, bgm_volume: parseInt(e.target.value) },
                      }))
                    }
                    className={`w-full h-1.5 bg-[var(--color-border)] rounded accent-indigo-500 transition ${
                      config.tts_dubbing?.is_bgm_muted ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  />
                </div>

                {/* Track 3: AI Dubbing Voice */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-[var(--color-text-secondary)]">
                      Giọng AI Dubbing
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            tts_dubbing: {
                              ...prev.tts_dubbing,
                              is_dub_muted: !prev.tts_dubbing?.is_dub_muted,
                            },
                          }))
                        }
                        className={`text-[9px] px-1 py-0.2 rounded font-bold transition cursor-pointer ${
                          config.tts_dubbing?.is_dub_muted
                            ? "bg-red-500/20 text-red-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {config.tts_dubbing?.is_dub_muted ? "MUTED" : "ON"}
                      </button>
                      <span className="w-8 text-right">
                        {config.tts_dubbing?.is_dub_muted ? "0%" : `${config.tts_dubbing?.dub_volume ?? 100}%`}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    disabled={config.tts_dubbing?.is_dub_muted}
                    value={config.tts_dubbing?.is_dub_muted ? 0 : config.tts_dubbing?.dub_volume ?? 100}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tts_dubbing: { ...prev.tts_dubbing, dub_volume: parseInt(e.target.value) },
                      }))
                    }
                    className={`w-full h-1.5 bg-[var(--color-border)] rounded accent-emerald-500 transition ${
                      config.tts_dubbing?.is_dub_muted ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  />
                </div>
              </div>
            </div>
          )}


          {/* TAB 5: SUBTITLES STUDIO */}
          {activeTab === "subtitles" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 5: Tùy Biến Kiểu Dáng Phụ Đề (Subtitle Studio)
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Đồng bộ 100% tham số hiển thị, typography, căn lề, hoạt ảnh và vị trí chuẩn xác.
                  </p>
                </div>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
                  ASS Subtitle Studio
                </span>
              </div>

              {/* 1-CLICK QUICK PRESETS */}
              <div>
                <label className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1.5 uppercase tracking-wider">
                  Kiểu mẫu xu hướng 1-Click (Trending Presets):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: {
                          ...prev.subtitles,
                          style: {
                            ...prev.subtitles?.style,
                            font_name: "Roboto",
                            font_size: 22,
                            primary_color: "#FFFFFF",
                            outline_color: "#000000",
                            max_lines: 2,
                            effect: "none",
                            position: "bottom",
                            position_y: 84,
                            alignment: "center",
                            line_spacing: 1.2,
                            aspect_ratio: "16:9",
                            karaoke_effect: false,
                          },
                        },
                      }));
                    }}
                    className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                      config.subtitles?.style?.effect === "none" &&
                      config.subtitles?.style?.primary_color === "#FFFFFF" &&
                      config.subtitles?.style?.font_name === "Roboto"
                        ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 font-bold ring-2 ring-emerald-400/40 shadow-sm"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-emerald-400/60 hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span className="font-bold text-xs">None</span>
                    <span className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Mặc định</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: {
                          ...prev.subtitles,
                          style: {
                            ...prev.subtitles?.style,
                            font_name: "Montserrat",
                            font_size: 32,
                            primary_color: "#FFDF00",
                            outline_color: "#000000",
                            max_lines: 1,
                            effect: "pop",
                            position: "bottom",
                            position_y: 80,
                            alignment: "center",
                            line_spacing: 1.2,
                            aspect_ratio: "16:9",
                            karaoke_effect: false,
                          },
                        },
                      }));
                    }}
                    className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                      config.subtitles?.style?.primary_color === "#FFDF00" &&
                      config.subtitles?.style?.effect === "pop"
                        ? "border-amber-400 bg-amber-500/15 text-amber-300 font-bold ring-2 ring-amber-400/40 shadow-sm"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-amber-400/60 hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span className="font-bold text-xs">MrBeast</span>
                    <span className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Viral Pop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: {
                          ...prev.subtitles,
                          style: {
                            ...prev.subtitles?.style,
                            font_name: "Roboto",
                            font_size: 20,
                            primary_color: "#FFFFFF",
                            outline_color: "#111111",
                            max_lines: 2,
                            effect: "fade",
                            position: "bottom",
                            position_y: 86,
                            alignment: "center",
                            line_spacing: 1.3,
                            aspect_ratio: "16:9",
                            karaoke_effect: false,
                          },
                        },
                      }));
                    }}
                    className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                      config.subtitles?.style?.font_name === "Roboto" &&
                      config.subtitles?.style?.effect === "fade"
                        ? "border-red-400 bg-red-500/15 text-red-300 font-bold ring-2 ring-red-400/40 shadow-sm"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-red-400/60 hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span className="font-bold text-xs">Netflix</span>
                    <span className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Cinema</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: {
                          ...prev.subtitles,
                          style: {
                            ...prev.subtitles?.style,
                            font_name: "Montserrat",
                            font_size: 32,
                            primary_color: "#FFE600",
                            outline_color: "#000000",
                            max_lines: 1,
                            effect: "pop",
                            position: "bottom",
                            position_y: 82,
                            alignment: "center",
                            line_spacing: 1.2,
                            aspect_ratio: "9:16",
                            karaoke_effect: false,
                          },
                        },
                      }));
                    }}
                    className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                      config.subtitles?.style?.aspect_ratio === "9:16" &&
                      config.subtitles?.style?.effect === "pop"
                        ? "border-cyan-400 bg-cyan-500/15 text-cyan-300 font-bold ring-2 ring-cyan-400/40 shadow-sm"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-cyan-400/60 hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span className="font-bold text-xs">TikTok</span>
                    <span className="text-[9px] text-[var(--color-text-muted)] mt-0.5">9:16 Dọc</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: {
                          ...prev.subtitles,
                          style: {
                            ...prev.subtitles?.style,
                            font_name: "Be Vietnam Pro",
                            font_size: 22,
                            primary_color: "#FFFFFF",
                            outline_color: "#000000",
                            max_lines: 2,
                            effect: "fade",
                            position: "bottom",
                            position_y: 85,
                            alignment: "center",
                            line_spacing: 1.2,
                            aspect_ratio: "16:9",
                            karaoke_effect: false,
                          },
                        },
                      }));
                    }}
                    className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                      config.subtitles?.style?.aspect_ratio === "16:9" &&
                      config.subtitles?.style?.effect === "fade"
                        ? "border-blue-400 bg-blue-500/15 text-blue-300 font-bold ring-2 ring-blue-400/40 shadow-sm"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-blue-400/60 hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span className="font-bold text-xs">YouTube</span>
                    <span className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Chuẩn 16:9</span>
                  </button>
                </div>

                {/* Bilingual Subtitle Toggle Switch */}
                <div className="mt-2.5 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                      Phụ đề song ngữ (Bilingual)
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      Dòng 1 câu gốc, Dòng 2 câu dịch
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config.subtitles?.bilingual_subtitles)}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          subtitles: {
                            ...prev.subtitles,
                            bilingual_subtitles: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* LIVE SUBTITLE PREVIEW SCREEN */}
              <div className="relative w-full aspect-video max-h-[190px] rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shadow-inner flex flex-col justify-between p-3 select-none">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Live Preview</span>
                  <span>1080p ASS Render ({config.subtitles?.style?.aspect_ratio || "16:9"})</span>
                </div>

                {/* Simulated Subtitle Line */}
                <div
                  className="w-full text-center pb-2 px-4"
                  style={{
                    textAlign: (config.subtitles?.style?.alignment as any) || "center",
                    transform: `translateY(${((config.subtitles?.style?.position_y ?? 84) - 84) * 0.8}px)`,
                  }}
                >
                  <p
                    style={{
                      fontFamily: config.subtitles?.style?.font_name || "Montserrat",
                      fontSize: `${config.subtitles?.style?.font_size || 22}px`,
                      color: config.subtitles?.style?.primary_color || "#FFFFFF",
                      textShadow:
                        config.subtitles?.style?.outline_color &&
                        config.subtitles?.style?.outline_color !== "transparent"
                          ? `0 0 4px ${config.subtitles?.style?.outline_color}, 0 2px 5px #000`
                          : "none",
                      fontWeight: "bold",
                      lineHeight: config.subtitles?.style?.line_spacing || 1.2,
                    }}
                  >
                    {config.subtitles?.style?.karaoke_effect || config.subtitles?.style?.effect === "karaoke" ? (
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

              {/* FONT GRID CARDS */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                    Kiểu phông chữ thực tế:
                  </label>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold">
                    {config.subtitles?.style?.font_name || "Montserrat"}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {[
                    { id: "Montserrat", name: "Montserrat", sample: "Aa" },
                    { id: "Be Vietnam Pro", name: "Be Vietnam Pro", sample: "Aa" },
                    { id: "Roboto", name: "Roboto", sample: "Aa" },
                    { id: "Inter", name: "Inter", sample: "Aa" },
                    { id: "Impact", name: "Impact", sample: "Aa" },
                    { id: "Bebas Neue", name: "Bebas Neue", sample: "Aa" },
                    { id: "Oswald", name: "Oswald", sample: "Aa" },
                    { id: "Playfair Display", name: "Playfair", sample: "Aa" },
                  ].map((f) => {
                    const isSelected = (config.subtitles?.style?.font_name || "Montserrat") === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            subtitles: {
                              ...prev.subtitles,
                              style: { ...prev.subtitles?.style, font_name: f.id },
                            },
                          }))
                        }
                        className={`flex aspect-square flex-col items-center justify-center p-1.5 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/15 shadow-sm ring-2 ring-indigo-500 text-indigo-400"
                            : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-indigo-500/50 hover:bg-[var(--color-surface)]"
                        }`}
                      >
                        <span
                          className="text-lg font-bold leading-tight select-none"
                          style={{ fontFamily: `${f.id}, sans-serif` }}
                        >
                          {f.sample}
                        </span>
                        <span
                          className="text-[9px] font-semibold truncate max-w-full mt-1"
                          style={{ fontFamily: `${f.id}, sans-serif` }}
                        >
                          {f.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DEDICATED TYPOGRAPHY CONTROLS CONTAINER */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-3">
                {/* HÀNG 1: Cỡ chữ + Màu chữ + Màu viền */}
                <div>
                  <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                    Hàng 1 · Cỡ chữ & Màu sắc:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-[var(--color-text-secondary)] block mb-1">
                        Cỡ chữ:
                      </label>
                      <select
                        value={String(config.subtitles?.style?.font_size || 22)}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            subtitles: {
                              ...prev.subtitles,
                              style: { ...prev.subtitles?.style, font_size: Number(e.target.value) },
                            },
                          }))
                        }
                        className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                      >
                        <option value="16">16px</option>
                        <option value="18">18px</option>
                        <option value="20">20px</option>
                        <option value="22">22px</option>
                        <option value="26">26px</option>
                        <option value="32">32px</option>
                        <option value="38">38px</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-[var(--color-text-secondary)] block mb-1">
                        Màu chữ:
                      </label>
                      <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-1 h-8">
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
                          className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent shrink-0"
                        />
                        <span className="font-mono text-[9px] text-[var(--color-text-muted)] uppercase truncate">
                          {config.subtitles?.style?.primary_color || "#FFFFFF"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-medium text-[var(--color-text-secondary)]">
                          Viền:
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.subtitles?.style?.outline_color !== "transparent"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                subtitles: {
                                  ...prev.subtitles,
                                  style: {
                                    ...prev.subtitles?.style,
                                    outline_color: e.target.checked ? "#000000" : "transparent",
                                  },
                                },
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-6 h-3.5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-1 h-8">
                        <input
                          type="color"
                          disabled={config.subtitles?.style?.outline_color === "transparent"}
                          value={
                            config.subtitles?.style?.outline_color === "transparent"
                              ? "#000000"
                              : config.subtitles?.style?.outline_color || "#000000"
                          }
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              subtitles: {
                                ...prev.subtitles,
                                style: { ...prev.subtitles?.style, outline_color: e.target.value },
                              },
                            }))
                          }
                          className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent shrink-0 disabled:opacity-40"
                        />
                        <span className="font-mono text-[9px] text-[var(--color-text-muted)] uppercase truncate">
                          {config.subtitles?.style?.outline_color === "transparent"
                            ? "Tắt"
                            : config.subtitles?.style?.outline_color || "#000000"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* HÀNG 2: Căn lề + Số dòng + Khoảng cách */}
                <div className="pt-2 border-t border-[var(--color-border)]/40 space-y-1.5">
                  <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    Hàng 2 · Căn lề & Số dòng:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-[var(--color-text-secondary)] block mb-1">
                        Căn lề:
                      </label>
                      <div className="grid grid-cols-4 gap-0.5 bg-[var(--color-surface)] p-0.5 rounded-lg border border-[var(--color-border)]">
                        {[
                          { id: "left", label: "Trái" },
                          { id: "center", label: "Giữa" },
                          { id: "right", label: "Phải" },
                          { id: "justify", label: "Đều" },
                        ].map((al) => (
                          <button
                            key={al.id}
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                subtitles: {
                                  ...prev.subtitles,
                                  style: { ...prev.subtitles?.style, alignment: al.id as any },
                                },
                              }))
                            }
                            className={`py-1 text-center font-bold text-[10px] rounded transition cursor-pointer ${
                              (config.subtitles?.style?.alignment || "center") === al.id
                                ? "bg-indigo-600 text-white"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            }`}
                          >
                            {al.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-[var(--color-text-secondary)] block mb-1">
                        Số dòng tối đa:
                      </label>
                      <div className="grid grid-cols-3 gap-0.5 bg-[var(--color-surface)] p-0.5 rounded-lg border border-[var(--color-border)]">
                        {[1, 2, 3].map((lines) => (
                          <button
                            key={lines}
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                subtitles: {
                                  ...prev.subtitles,
                                  style: { ...prev.subtitles?.style, max_lines: lines },
                                },
                              }))
                            }
                            className={`py-1 text-center font-bold text-[10px] rounded transition cursor-pointer ${
                              (config.subtitles?.style?.max_lines || 2) === lines
                                ? "bg-indigo-600 text-white"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            }`}
                          >
                            {lines} dòng
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-medium text-[var(--color-text-secondary)]">
                          Khoảng cách dòng:
                        </label>
                        <span className="text-[9px] font-mono font-bold text-indigo-400">
                          {(config.subtitles?.style?.line_spacing || 1.2).toFixed(1)}x
                        </span>
                      </div>
                      <select
                        value={String(config.subtitles?.style?.line_spacing || 1.2)}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            subtitles: {
                              ...prev.subtitles,
                              style: { ...prev.subtitles?.style, line_spacing: parseFloat(e.target.value) },
                            },
                          }))
                        }
                        className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
                      >
                        <option value="1.0">1.0x (Sát)</option>
                        <option value="1.2">1.2x (Chuẩn)</option>
                        <option value="1.3">1.3x (Thoáng)</option>
                        <option value="1.4">1.4x (Rộng)</option>
                        <option value="1.6">1.6x (Rất rộng)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* HÀNG 3: Vị trí Y */}
                <div className="pt-2 border-t border-[var(--color-border)]/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                      Hàng 3 · Vị trí Y:
                    </span>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">
                      {Math.round(config.subtitles?.style?.position_y || 84)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          subtitles: {
                            ...prev.subtitles,
                            style: { ...prev.subtitles?.style, position_y: 14, position: "top" },
                          },
                        }))
                      }
                      className={`py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        (config.subtitles?.style?.position_y || 84) <= 25
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-400 font-bold"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      Đỉnh (14%)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          subtitles: {
                            ...prev.subtitles,
                            style: { ...prev.subtitles?.style, position_y: 50, position: "middle" },
                          },
                        }))
                      }
                      className={`py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        (config.subtitles?.style?.position_y || 84) > 25 &&
                        (config.subtitles?.style?.position_y || 84) < 75
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-400 font-bold"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      Giữa (50%)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          subtitles: {
                            ...prev.subtitles,
                            style: { ...prev.subtitles?.style, position_y: 84, position: "bottom" },
                          },
                        }))
                      }
                      className={`py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        (config.subtitles?.style?.position_y || 84) >= 75
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-400 font-bold"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      Đáy (84%)
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">5%</span>
                    <input
                      type="range"
                      min={5}
                      max={95}
                      step={1}
                      value={config.subtitles?.style?.position_y || 84}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const pos = val <= 25 ? "top" : val >= 75 ? "bottom" : "middle";
                        setConfig((prev) => ({
                          ...prev,
                          subtitles: {
                            ...prev.subtitles,
                            style: { ...prev.subtitles?.style, position_y: val, position: pos },
                          },
                        }));
                      }}
                      className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">95%</span>
                  </div>
                </div>
              </div>

              {/* MOTION EFFECTS (ACCORDION 2 IN MANUAL PROCESSING) */}
              <div>
                <label className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1.5 uppercase tracking-wider">
                  Hiệu ứng chuyển động (Motion Effects):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { id: "none" as const, name: "Tĩnh (Standard)", desc: "Mặc định" },
                    { id: "pop" as const, name: "Bật nảy (Pop)", desc: "TikTok / Shorts" },
                    { id: "fade" as const, name: "Mờ dần (Fade)", desc: "Điện ảnh" },
                    { id: "slide" as const, name: "Trượt lên (Slide)", desc: "Mượt mà" },
                    { id: "karaoke" as const, name: "Karaoke Glow", desc: "Âm nhạc" },
                  ].map((ef) => {
                    const isSelected = (config.subtitles?.style?.effect || "none") === ef.id;
                    return (
                      <button
                        key={ef.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            subtitles: {
                              ...prev.subtitles,
                              style: {
                                ...prev.subtitles?.style,
                                effect: ef.id,
                                karaoke_effect: ef.id === "karaoke",
                              },
                            },
                          }))
                        }
                        className={`flex aspect-square flex-col items-center justify-center p-1.5 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/20 shadow-sm ring-2 ring-indigo-500 text-indigo-400 font-bold"
                            : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-indigo-500/50 hover:bg-[var(--color-surface)]"
                        }`}
                      >
                        <span className="text-xs font-semibold leading-tight">{ef.name}</span>
                        <span className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{ef.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FORMAT & BURN MODE CONTROLS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Định dạng file phụ đề
                  </label>
                  <select
                    value={config.subtitles?.format || "ass"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: { ...prev.subtitles, format: e.target.value },
                      }))
                    }
                    className="w-full h-8 rounded border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs"
                  >
                    <option value="ass">.ASS (Gốc - Hiệu ứng màu sắc, animation)</option>
                    <option value="srt">.SRT (SubRip phổ thông)</option>
                    <option value="vtt">.VTT (WebVTT HTML5)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Chế độ gắn phụ đề (Burn Mode)
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
                    <option value="hardcode">Hardcode (Gắn chết vào khung hình)</option>
                    <option value="soft">Soft (Phụ đề mềm tách rời)</option>
                    <option value="none">Tắt (Không xuất phụ đề)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Tỷ lệ khung hình (Aspect Ratio)
                  </label>
                  <select
                    value={config.subtitles?.style?.aspect_ratio || "16:9"}
                    onChange={(e: any) =>
                      setConfig((prev) => ({
                        ...prev,
                        subtitles: {
                          ...prev.subtitles,
                          style: { ...prev.subtitles?.style, aspect_ratio: e.target.value },
                        },
                      }))
                    }
                    className="w-full h-8 rounded border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs"
                  >
                    <option value="16:9">16:9 Ngang (YouTube, TV, Laptop)</option>
                    <option value="9:16">9:16 Dọc (TikTok, Shorts, Reels)</option>
                    <option value="1:1">1:1 Vuông (Instagram, Facebook)</option>
                    <option value="4:3">4:3 Truyền thống</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: EXPORT & NVENC */}
          {activeTab === "export" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Tầng 6: Mã Hóa & Xuất Bản Video (Video Export Studio)
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Cấu hình chất lượng video, định dạng thùng chứa và bộ mã hóa GPU phần cứng.
                  </p>
                </div>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  GPU Acceleration ⚡
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    <option value="720p">720p HD (Gói Free & Pro)</option>
                    <option value="1080p">1080p Full HD (Chuẩn - Gói Pro)</option>
                    <option value="4K">4K Ultra HD (Chất lượng cao - Gói Pro)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                    Định dạng tệp (Container)
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
                    <option value="mp4">.mp4 (Phổ biến, tương thích mọi thiết bị)</option>
                    <option value="mkv">.mkv (Matroska đa luồng phụ đề)</option>
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
                    <option value="h264_nvenc">h264_nvenc (NVIDIA RTX GPU - Siêu tốc)</option>
                    <option value="libx264">libx264 (Phần mềm CPU - Tương thích)</option>
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
            className="flex items-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition cursor-pointer"
          >
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
                Áp dụng Preset này
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
