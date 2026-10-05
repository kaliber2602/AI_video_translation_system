import {
  Mic,
  Loader2,
  Volume2,
  Pause,
  Play,
  Waves,
  Download,
  Sliders,
  ChevronRight,
  Captions,
  Film,
  Lock,
  Check,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { toast } from "../../../lib/toast";
import { videoService } from "../../../services/video.service";

interface DubbingToolsPanelProps {
  ttsEngine: string;
  setTtsEngine: (engine: string) => void;
  activeSpeakerAudio?: RefObject<HTMLAudioElement | null>;
  selectedVoiceId?: string;
  onSelectVoice?: (voiceId: string) => void;
  ttsSpeed: number;
  setTtsSpeed: (speed: number) => void;
  isGeneratingTTS: boolean;
  isGlobalTaskRunning: boolean;
  isTTSReady: boolean;
  ttsProgress: number;
  ttsMessage: string;
  generateTTS: () => void;
  ttsAudioUrl: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  handleAudioTimeUpdate: () => void;
  handleAudioLoaded: () => void;
  handleAudioEnded: () => void;
  togglePlayTTSOnly: () => void;
  isPlayingTTSOnly: boolean;
  currentTime: number;
  audioDuration: number;
  formatTime: (seconds: number) => string;
  selectedLanguage: string;
  // 3-Track Mixer Props
  isVocalMuted: boolean;
  setIsVocalMuted: (muted: boolean) => void;
  vocalVolume: number;
  setVocalVolume: (vol: number) => void;
  isBgmMuted: boolean;
  setIsBgmMuted: (muted: boolean) => void;
  bgmVolume: number;
  setBgmVolume: (vol: number) => void;
  isDubMuted: boolean;
  setIsDubMuted: (muted: boolean) => void;
  dubVolume: number;
  setDubVolume: (vol: number) => void;
  // Phase 2: Render & Mux Props
  isDubReady?: boolean;
  isGeneratingDub?: boolean;
  burnSubtitles?: boolean;
  setBurnSubtitles?: (burn: boolean) => void;
  aspectRatio?: string;
  generateDubbedVideo?: () => void;
  dubProgress?: number;
  dubMessage?: string;
  onGoToReviewStep?: () => void;
  onGoToRenderTab?: () => void;
}

export default function DubbingToolsPanel({
  ttsEngine,
  setTtsEngine,
  activeSpeakerAudio,
  selectedVoiceId,
  onSelectVoice,
  ttsSpeed,
  setTtsSpeed,
  isGeneratingTTS,
  isGlobalTaskRunning,
  isTTSReady,
  ttsProgress,
  ttsMessage,
  generateTTS,
  ttsAudioUrl,
  audioRef,
  handleAudioTimeUpdate,
  handleAudioLoaded,
  handleAudioEnded,
  togglePlayTTSOnly,
  isPlayingTTSOnly,
  currentTime,
  audioDuration,
  formatTime,
  selectedLanguage,
  isVocalMuted,
  setIsVocalMuted,
  vocalVolume,
  setVocalVolume,
  isBgmMuted,
  setIsBgmMuted,
  bgmVolume,
  setBgmVolume,
  isDubMuted,
  setIsDubMuted,
  dubVolume,
  setDubVolume,
  // Phase 2: Render & Mux Props
  isDubReady = false,
  isGeneratingDub = false,
  burnSubtitles = true,
  setBurnSubtitles,
  aspectRatio = "16:9",
  generateDubbedVideo,
  dubProgress = 0,
  dubMessage = "",
  onGoToReviewStep,
}: DubbingToolsPanelProps) {
  const [elevenVoices, setElevenVoices] = useState<Array<{ id: string; name: string; sample_url: string }>>([
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Nữ)", sample_url: "/api/videos/elevenlabs/voices/21m00Tcm4TlvDq8ikWAM/sample" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Nữ)", sample_url: "/api/videos/elevenlabs/voices/AZnzlk1XvdvUeBnXmlld/sample" },
    { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Nam)", sample_url: "/api/videos/elevenlabs/voices/ErXwobaYiN019PkySvjV/sample" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Nam)", sample_url: "/api/videos/elevenlabs/voices/pNInz6obpgDQGcFmaJgB/sample" },
  ]);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const voiceAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (ttsEngine === "elevenlabs") {
      videoService.listElevenLabsVoices()
        .then((voices) => {
          if (isMounted && voices && voices.length > 0) {
            setElevenVoices(voices);
          }
        })
        .catch((err) => {
          console.warn("Failed to load dynamic ElevenLabs voices:", err);
        });
    }
    return () => {
      isMounted = false;
      if (voiceAudioPlayerRef.current) {
        voiceAudioPlayerRef.current.pause();
        voiceAudioPlayerRef.current = null;
      }
    };
  }, [ttsEngine]);

  const handlePlayVoiceSample = (voiceId: string) => {
    if (activeSpeakerAudio?.current) {
      activeSpeakerAudio.current.pause();
    }
    if (playingVoiceId === voiceId && voiceAudioPlayerRef.current) {
      voiceAudioPlayerRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }
    if (voiceAudioPlayerRef.current) {
      voiceAudioPlayerRef.current.pause();
    }
    const targetUrl = videoService.getElevenLabsVoiceSampleUrl(voiceId);
    const audio = new Audio(targetUrl);
    voiceAudioPlayerRef.current = audio;
    setPlayingVoiceId(voiceId);
    audio.play().catch((err) => {
      console.warn("Error playing ElevenLabs preview audio:", err);
      toast.error("Không thể phát mẫu âm thanh giọng đọc này.");
      setPlayingVoiceId(null);
    });
    audio.onended = () => {
      setPlayingVoiceId(null);
    };
    audio.onerror = () => {
      toast.error("Lỗi tải mẫu âm thanh từ máy chủ.");
      setPlayingVoiceId(null);
    };
  };

  return (
    <div className="space-y-4">
      {/* TTS CONFIGURATION BOX */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
              1
            </span>
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              Cấu hình Giọng Đọc AI (TTS)
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isTTSReady
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : isGeneratingTTS
                ? "bg-amber-500/15 text-amber-400 animate-pulse"
                : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
            }`}
          >
            {isTTSReady ? "✓ Đã sẵn sàng" : isGeneratingTTS ? "Đang tạo..." : "Chưa tạo"}
          </span>
        </div>

        {/* TTS Engine Selector */}
        <div>
          <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
            Mô hình lồng tiếng AI (TTS Engine):
          </label>
          <select
            value={ttsEngine}
            onChange={(e) => setTtsEngine(e.target.value)}
            className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
          >
            <option value="edge_tts">Microsoft Edge-TTS Neural (Free)</option>
            <option value="bark">Suno Bark (Free)</option>
            <option value="coqui_xtts_v2">Coqui XTTS v2 (Pro)</option>
            <option value="elevenlabs">ElevenLabs Multilingual v2 (Pro)</option>
          </select>
        </div>

        {/* ELEVENLABS PRO VOICES IF SELECTED */}
        {ttsEngine === "elevenlabs" && (
          <div className="space-y-2 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                ElevenLabs Multilingual v2 Voices (Pro):
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold border border-[var(--color-primary)]/20">
                PRO API
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {elevenVoices.map((v) => {
                const isSelected = selectedVoiceId === v.id;
                const isPlaying = playingVoiceId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => onSelectVoice?.(v.id)}
                    className={`flex items-center justify-between p-1.5 rounded-lg border transition cursor-pointer select-none text-[10px] ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] ring-1 ring-[var(--color-primary)]/40 shadow-xs"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate pr-1">
                      {isSelected && (
                        <Check size={11} className="text-[var(--color-primary)] shrink-0 font-bold" />
                      )}
                      <span className={`truncate font-semibold ${isSelected ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"}`}>
                        {v.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayVoiceSample(v.id);
                      }}
                      className={`px-2 py-0.5 rounded border transition text-[9px] font-bold cursor-pointer shrink-0 flex items-center gap-1 ${
                        isPlaying
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                      }`}
                      title={isPlaying ? "Tạm dừng mẫu giọng" : "Nghe thử giọng mẫu ElevenLabs"}
                    >
                      {isPlaying ? <Pause size={9} /> : <Play size={9} />}
                      <span>{isPlaying ? "Dừng" : "Nghe"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SPEED SELECTOR DROPDOWN */}
        <div>
          <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
            Tốc độ đọc mặc định:
          </label>
          <select
            value={ttsSpeed}
            onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
            className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] font-mono"
          >
            <option value={0.8}>0.8x (Chậm)</option>
            <option value={0.9}>0.9x</option>
            <option value={1.0}>1.0x (Chuẩn)</option>
            <option value={1.1}>1.1x</option>
            <option value={1.2}>1.2x (Nhanh)</option>
          </select>
        </div>

        {/* GENERATE TTS BUTTON */}
        <button
          type="button"
          onClick={generateTTS}
          disabled={isGeneratingTTS || isGlobalTaskRunning}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-3 py-2.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50 active:scale-98 shadow-xs"
        >
          {isGeneratingTTS ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
          <span>
            {isGeneratingTTS
              ? `Đang tạo giọng AI...${ttsProgress > 0 ? ` (${ttsProgress}%)` : ""}`
              : isGlobalTaskRunning
              ? "Tác vụ ngầm đang chạy (Đã khóa)"
              : isTTSReady
              ? "Tạo lại giọng đọc AI"
              : "Tạo giọng đọc AI (TTS)"}
          </span>
        </button>

        {/* Real-time TTS Progress Indicator */}
        {isGeneratingTTS && (
          <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/20 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-primary)]">
              <span className="flex items-center gap-1.5 truncate max-w-[80%]">
                <Loader2 size={13} className="animate-spin text-[var(--color-primary)] shrink-0" />
                <span className="truncate">
                  {ttsMessage || `Đang tổng hợp giọng nói (${ttsProgress}%)...`}
                </span>
              </span>
              <span className="font-mono font-bold text-[var(--color-primary)] shrink-0">{ttsProgress}%</span>
            </div>
            <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, Math.min(100, ttsProgress))}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Tiến độ lồng tiếng được tính toán trực tiếp trên số lượng câu AI đã đọc.
            </p>
          </div>
        )}

        {/* TTS AUDIO WAVEFORM TRACK CARD */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Waves size={13} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Rãnh Âm Thanh Lồng Tiếng (TTS)
              </span>
            </div>

            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                isTTSReady
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : isGeneratingTTS
                  ? "bg-amber-500/20 text-amber-400 animate-pulse"
                  : "bg-zinc-800/80 text-zinc-400"
              }`}
            >
              {isTTSReady ? "✓ Đã Tạo" : isGeneratingTTS ? "Đang tạo..." : "Chưa tạo"}
            </span>
          </div>

          {ttsAudioUrl ? (
            <div className="space-y-2">
              <audio
                ref={audioRef}
                src={ttsAudioUrl}
                onTimeUpdate={handleAudioTimeUpdate}
                onLoadedMetadata={handleAudioLoaded}
                onEnded={handleAudioEnded}
              />

              <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                <button
                  type="button"
                  onClick={togglePlayTTSOnly}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition active:scale-95"
                >
                  {isPlayingTTSOnly ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[9px] font-mono text-[var(--color-text-muted)] mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                    <div
                      className="h-full bg-[var(--color-primary)] transition-all"
                      style={{
                        width: `${audioDuration ? (currentTime / audioDuration) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <a
                  href={ttsAudioUrl}
                  download={`tts_${selectedLanguage}.wav`}
                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                  title="Tải tệp âm thanh wav"
                >
                  <Download size={14} />
                </a>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-[var(--color-text-muted)] py-0.5 italic">
              Chưa có tệp âm thanh xem trước. Hãy nhấn nút tạo ở trên.
            </div>
          )}
        </div>

        {/* 3-Track Virtual Mixer */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-1.5">
              <Sliders size={13} className="text-[var(--color-primary)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Bàn Trộn 3 Rãnh (Virtual Mixer)
              </span>
            </div>
            <span className="text-[9px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.2 rounded">
              Real-time 0ms
            </span>
          </div>

          {/* Track 1: Original Vocal */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 font-semibold text-[var(--color-text-secondary)]">
                <Mic size={11} className="text-zinc-400" />
                Vocal Gốc (Original)
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setIsVocalMuted(!isVocalMuted)}
                  className={`text-[9px] px-1 py-0.2 rounded font-bold transition ${
                    isVocalMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isVocalMuted ? "MUTED" : "ON"}
                </button>
                <span className="w-8 text-right">{isVocalMuted ? "0%" : `${vocalVolume}%`}</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              disabled={isVocalMuted}
              value={isVocalMuted ? 0 : vocalVolume}
              onChange={(e) => setVocalVolume(parseInt(e.target.value))}
              className={`w-full h-1.5 bg-[var(--color-border)] rounded accent-[var(--color-primary)] ${
                isVocalMuted ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
            />
          </div>

          {/* Track 2: Original BGM */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 font-semibold text-[var(--color-text-secondary)]">
                <Waves size={11} className="text-indigo-400" />
                Nhạc nền (BGM)
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setIsBgmMuted(!isBgmMuted)}
                  className={`text-[9px] px-1 py-0.2 rounded font-bold transition ${
                    isBgmMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isBgmMuted ? "MUTED" : "ON"}
                </button>
                <span className="w-8 text-right">{isBgmMuted ? "0%" : `${bgmVolume}%`}</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              disabled={isBgmMuted}
              value={isBgmMuted ? 0 : bgmVolume}
              onChange={(e) => setBgmVolume(parseInt(e.target.value))}
              className={`w-full h-1.5 bg-[var(--color-border)] rounded accent-indigo-500 ${
                isBgmMuted ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
            />
          </div>

          {/* Track 3: AI Dubbing Voice */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 font-semibold text-[var(--color-text-secondary)]">
                <Volume2 size={11} className="text-emerald-400" />
                Giọng AI Dubbing
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setIsDubMuted(!isDubMuted)}
                  className={`text-[9px] px-1 py-0.2 rounded font-bold transition ${
                    isDubMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isDubMuted ? "MUTED" : "ON"}
                </button>
                <span className="w-8 text-right">{isDubMuted ? "0%" : `${dubVolume}%`}</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              disabled={isDubMuted}
              value={isDubMuted ? 0 : dubVolume}
              onChange={(e) => setDubVolume(parseInt(e.target.value))}
              className={`w-full h-1.5 bg-[var(--color-border)] rounded accent-emerald-500 ${
                isDubMuted ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
            />
          </div>

          {/* 1-Click Mixing Audio Presets */}
          <div className="pt-2 border-t border-[var(--color-border)]">
            <span className="text-[10px] font-bold text-[var(--color-text-secondary)] block mb-1.5">
              Thiết lập mẫu nhanh (1-Click Presets):
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsVocalMuted(true);
                  setVocalVolume(0);
                  setIsBgmMuted(false);
                  setBgmVolume(45);
                  setIsDubMuted(false);
                  setDubVolume(100);
                  toast.success("Áp dụng: Lồng tiếng chuẩn (Tắt vocal gốc, BGM 45%, Dub 100%)");
                }}
                className="px-1.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition truncate"
              >
                Lồng tiếng chuẩn
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsVocalMuted(false);
                  setVocalVolume(30);
                  setIsBgmMuted(false);
                  setBgmVolume(40);
                  setIsDubMuted(false);
                  setDubVolume(100);
                  toast.success("Áp dụng: Thuyết minh Discovery 70/30 (Vocal gốc 30%, Dub 100%)");
                }}
                className="px-1.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition truncate"
              >
                Thuyết minh 70/30
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsVocalMuted(true);
                  setVocalVolume(0);
                  setIsBgmMuted(true);
                  setBgmVolume(0);
                  setIsDubMuted(false);
                  setDubVolume(100);
                  toast.success("Áp dụng: Chỉ lấy giọng AI (Tắt toàn bộ vocal & BGM gốc)");
                }}
                className="px-1.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition truncate"
              >
                Giọng trong trẻo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 2: HÒA ÂM & RENDER VIDEO LỒNG TIẾNG */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
              2
            </span>
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              Hòa Âm & Render Video Lồng Tiếng
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isDubReady
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : isGeneratingDub
                ? "bg-amber-500/15 text-amber-400 animate-pulse"
                : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
            }`}
          >
            {isDubReady ? "✓ Đã xong" : isGeneratingDub ? "Đang render..." : "Chờ TTS"}
          </span>
        </div>

        {/* Dependency Warning if TTS not ready */}
        {!isTTSReady && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 space-y-2">
            <div className="flex items-start gap-2">
              <Lock size={14} className="shrink-0 mt-0.5" />
              <span>Cần tạo giọng đọc AI (TTS) ở Mục 1 trước khi kết xuất video hoàn chỉnh.</span>
            </div>
          </div>
        )}

        {/* HARDSUB SWITCH TOGGLE */}
        {setBurnSubtitles && (
          <div
            onClick={() => setBurnSubtitles(!burnSubtitles)}
            className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] p-2.5 transition hover:border-[var(--color-primary)]/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-primary)]">
                <Captions size={14} className="text-[var(--color-primary)]" />
                <span>Nhúng phụ đề cứng (Hardsub)</span>
              </div>
              <div
                className={`w-8 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${
                  burnSubtitles ? "bg-[var(--color-primary)]" : "bg-zinc-600"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                    burnSubtitles ? "transform translate-x-4" : ""
                  }`}
                />
              </div>
            </div>
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)] leading-normal">
              {burnSubtitles
                ? `✓ Bật: Nung phụ đề chuẩn khung hình ${aspectRatio} đã chọn ở Bước 4`
                : "✗ Tắt: Giữ video sạch không chữ (Clean export)"}
            </p>
          </div>
        )}

        {/* GENERATE DUBBED VIDEO BUTTON */}
        {generateDubbedVideo && (
          <button
            type="button"
            onClick={generateDubbedVideo}
            disabled={isGeneratingDub || !isTTSReady || isGlobalTaskRunning}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
          >
            {isGeneratingDub ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
            <span>
              {isGeneratingDub
                ? `Đang render video...${dubProgress > 0 ? ` (${dubProgress}%)` : ""}`
                : isGlobalTaskRunning
                ? "Tác vụ ngầm đang chạy (Đã khóa)"
                : isDubReady
                ? "Tạo lại Video Lồng Tiếng"
                : "Tạo Video Lồng Tiếng"}
            </span>
          </button>
        )}

        {/* Real-time Video Dubbing / Mux Progress Indicator */}
        {isGeneratingDub && (
          <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/20 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-primary)]">
              <span className="flex items-center gap-1.5 truncate max-w-[80%]">
                <Loader2 size={13} className="animate-spin text-[var(--color-primary)] shrink-0" />
                <span className="truncate">
                  {dubMessage || `Đang hòa âm và kết xuất video (${dubProgress}%)...`}
                </span>
              </span>
              <span className="font-mono font-bold text-[var(--color-primary)] shrink-0">{dubProgress}%</span>
            </div>
            <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, Math.min(100, dubProgress))}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Tiến độ encode FFmpeg / hòa âm âm thanh được cập nhật thời gian thực từ worker.
            </p>
          </div>
        )}
      </div>

      {/* PROCEED TO REVIEW (STEP 6) */}
      {onGoToReviewStep && (
        <button
          type="button"
          onClick={onGoToReviewStep}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition active:scale-98 shadow-xs"
        >
          <span>Tiếp tục: Kiểm duyệt & Xuất (Bước 6)</span>
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
