import { useState } from "react";
import { Globe, Mic, Subtitles, Play, Square, Sparkles, BookOpen, Clock, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SelectBox from "../SelectBox";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsRow from "../common/SettingsRow";
import SettingsSlider from "../common/SettingsSlider";
import SettingsBadge from "../common/SettingsBadge";
import SettingsTabs from "../common/SettingsTabs";
import Toggle from "../Toggle";
import { INITIAL_MOCK_SETTINGS, VOICE_PROFILES } from "../mock/settingsMockData";

export default function TranslationVoiceSection() {
  const { t } = useTranslation(["settings", "common"]);

  // Translation State
  const [sourceLang, setSourceLang] = useState(INITIAL_MOCK_SETTINGS.translationVoice.defaultSourceLanguage);
  const [targetLang, setTargetLang] = useState(INITIAL_MOCK_SETTINGS.translationVoice.defaultTargetLanguage);
  const [translationStyle, setTranslationStyle] = useState(INITIAL_MOCK_SETTINGS.translationVoice.translationStyle);
  const [preserveFormatting, setPreserveFormatting] = useState(INITIAL_MOCK_SETTINGS.translationVoice.preserveFormatting);
  const [glossaryPreservation, setGlossaryPreservation] = useState(INITIAL_MOCK_SETTINGS.translationVoice.glossaryPreservation);
  const [timestampSync, setTimestampSync] = useState(INITIAL_MOCK_SETTINGS.translationVoice.timestampSync);

  // Voice State
  const [selectedVoiceId, setSelectedVoiceId] = useState(INITIAL_MOCK_SETTINGS.translationVoice.selectedVoiceId);
  const [voiceSpeed, setVoiceSpeed] = useState(INITIAL_MOCK_SETTINGS.translationVoice.voiceSpeed);
  const [voicePitch, setVoicePitch] = useState(INITIAL_MOCK_SETTINGS.translationVoice.voicePitch);
  const [voiceEmotion, setVoiceEmotion] = useState(INITIAL_MOCK_SETTINGS.translationVoice.voiceEmotion);
  const [autoDubbing, setAutoDubbing] = useState(INITIAL_MOCK_SETTINGS.translationVoice.autoDubbing);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Subtitle State
  const [subtitleFormat, setSubtitleFormat] = useState(INITIAL_MOCK_SETTINGS.translationVoice.subtitleFormat);
  const [subtitleFont, setSubtitleFont] = useState(INITIAL_MOCK_SETTINGS.translationVoice.subtitleFont);
  const [subtitleFontSize, setSubtitleFontSize] = useState(INITIAL_MOCK_SETTINGS.translationVoice.subtitleFontSize);
  const [subtitleColor, setSubtitleColor] = useState(INITIAL_MOCK_SETTINGS.translationVoice.subtitleColor);
  const [subtitlePosition, setSubtitlePosition] = useState(INITIAL_MOCK_SETTINGS.translationVoice.subtitlePosition);
  const [maxChars, setMaxChars] = useState(INITIAL_MOCK_SETTINGS.translationVoice.maxCharsPerLine);

  const [isSaved, setIsSaved] = useState(true);

  const markDirty = () => setIsSaved(false);

  const handlePlayVoice = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    toast.info("Playing Voice Sample", "Synthesizing audio preview with current pitch & speed.");
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 2800);
  };

  const handleSave = () => {
    setIsSaved(true);
    toast.success(
      t("settings:toast.settingsSaved", "Settings saved"),
      t("settings:toast.translationVoiceSavedDesc", "Translation tone, voice profiles, and subtitle styles updated.")
    );
  };

  const handleReset = () => {
    setSourceLang("auto");
    setTargetLang("vi");
    setTranslationStyle("natural");
    setSelectedVoiceId("voice-1");
    setVoiceSpeed(1.0);
    setVoicePitch(0);
    setVoiceEmotion("natural");
    setSubtitleFormat("srt");
    setSubtitleFontSize(18);
    setSubtitlePosition("bottom");
    setIsSaved(true);
    toast.info("Reset to defaults", "Translation and Voice preferences restored.");
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:translationVoice.title", "Translation & Voice Settings")}
        subtitle={t(
          "settings:translationVoice.subtitle",
          "Fine-tune translation localization tone, synthetic voice dubbing models, and closed-caption subtitle typography."
        )}
        isSaved={isSaved}
        onSave={handleSave}
        onReset={handleReset}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 1: TRANSLATION SETTINGS */}
        <SettingCard
          title={t("settings:translationVoice.translationTitle", "Translation Engine & Dialect")}
          description={t(
            "settings:translationVoice.translationDesc",
            "Set default source and target language pairs with contextual tone presets."
          )}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <Globe size={14} className="text-[var(--color-primary)]" />
                  {t("settings:translationVoice.sourceLang", "Source Language")}
                </label>
                <SelectBox
                  value={sourceLang}
                  onChange={(val) => {
                    setSourceLang(val);
                    markDirty();
                  }}
                >
                  <option value="auto">🌐 Auto Detect</option>
                  <option value="en">🇺🇸 English</option>
                  <option value="vi">🇻🇳 Vietnamese</option>
                  <option value="ja">🇯🇵 Japanese</option>
                  <option value="ko">🇰🇷 Korean</option>
                  <option value="zh">🇨🇳 Chinese</option>
                </SelectBox>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <Sparkles size={14} className="text-[var(--color-primary)]" />
                  {t("settings:translationVoice.targetLang", "Target Language")}
                </label>
                <SelectBox
                  value={targetLang}
                  onChange={(val) => {
                    setTargetLang(val);
                    markDirty();
                  }}
                >
                  <option value="vi">🇻🇳 Vietnamese (Tiếng Việt)</option>
                  <option value="en">🇺🇸 English (US)</option>
                  <option value="ja">🇯🇵 Japanese (日本語)</option>
                  <option value="ko">🇰🇷 Korean (한국어)</option>
                  <option value="zh">🇨🇳 Chinese (中文)</option>
                  <option value="es">🇪🇸 Spanish (Español)</option>
                  <option value="fr">🇫🇷 French (Français)</option>
                </SelectBox>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                {t("settings:translationVoice.styleLabel", "Translation Tone & Register")}
              </label>
              <SelectBox
                value={translationStyle}
                onChange={(val) => {
                  setTranslationStyle(val as any);
                  markDirty();
                }}
              >
                <option value="natural">Natural & Conversational (Best for podcasts & vlogs)</option>
                <option value="formal">Formal & Polite (Best for corporate & webinars)</option>
                <option value="creative">Creative & Expressive (Best for entertainment & anime)</option>
                <option value="technical">Technical & Literal (Best for coding & engineering)</option>
              </SelectBox>
            </div>

            <div className="divide-y divide-[var(--color-border)]/60 pt-1">
              <SettingsRow
                icon={<FileText size={16} />}
                title="Preserve Original Typography & Formatting"
                description="Keep line breaks, markdown bolding, and quotes unchanged."
              >
                <Toggle
                  checked={preserveFormatting}
                  onChange={(val) => {
                    setPreserveFormatting(val);
                    markDirty();
                  }}
                />
              </SettingsRow>

              <SettingsRow
                icon={<BookOpen size={16} />}
                title={t("settings:translationVoice.glossary", "Custom Glossary & Terminology")}
                description={t(
                  "settings:translationVoice.glossaryDesc",
                  "Preserve exact brand names, acronyms, and product terminology during translation."
                )}
              >
                <Toggle
                  checked={glossaryPreservation}
                  onChange={(val) => {
                    setGlossaryPreservation(val);
                    markDirty();
                  }}
                />
              </SettingsRow>

              <SettingsRow
                icon={<Clock size={16} />}
                title={t("settings:translationVoice.timestampSync", "Strict Speech Timestamp Sync")}
                description={t(
                  "settings:translationVoice.timestampSyncDesc",
                  "Constrain translated sentences to fit original speaker utterance duration."
                )}
              >
                <Toggle
                  checked={timestampSync}
                  onChange={(val) => {
                    setTimestampSync(val);
                    markDirty();
                  }}
                />
              </SettingsRow>
            </div>
          </div>
        </SettingCard>

        {/* CARD 2: VOICE SYNTHESIS & DUBBING */}
        <SettingCard
          title={t("settings:translationVoice.voiceTitle", "Voice Synthesis & AI Dubbing")}
          description={t(
            "settings:translationVoice.voiceDesc",
            "Choose default voice actor, modulate pitch & speed, and configure dubbing emotions."
          )}
        >
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <Mic size={14} className="text-[var(--color-primary)]" />
                  {t("settings:translationVoice.defaultVoice", "Default Voice Profile")}
                </label>
                <button
                  type="button"
                  onClick={handlePlayVoice}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    isPlayingAudio
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                  }`}
                >
                  {isPlayingAudio ? <Square size={12} /> : <Play size={12} />}
                  <span>{isPlayingAudio ? "Stop Audio" : "Play Sample"}</span>
                </button>
              </div>

              <SelectBox
                value={selectedVoiceId}
                onChange={(val) => {
                  setSelectedVoiceId(val);
                  markDirty();
                }}
              >
                {VOICE_PROFILES.map((vp) => (
                  <option key={vp.id} value={vp.id}>
                    {vp.name} • {vp.accent} ({vp.provider.toUpperCase()})
                  </option>
                ))}
              </SelectBox>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  {t("settings:translationVoice.emotion", "Voice Emotion")}
                </label>
                <SelectBox
                  value={voiceEmotion}
                  onChange={(val) => {
                    setVoiceEmotion(val as any);
                    markDirty();
                  }}
                >
                  <option value="natural">Natural</option>
                  <option value="energetic">Energetic</option>
                  <option value="serious">Professional</option>
                  <option value="friendly">Warm & Friendly</option>
                </SelectBox>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  {t("settings:translationVoice.autoDub", "Auto-Dubbing")}
                </label>
                <div className="flex h-11 items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3">
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">
                    {autoDubbing ? "Enabled" : "Disabled"}
                  </span>
                  <Toggle
                    checked={autoDubbing}
                    onChange={(val) => {
                      setAutoDubbing(val);
                      markDirty();
                    }}
                  />
                </div>
              </div>
            </div>

            <SettingsSlider
              label={t("settings:translationVoice.speechSpeed", "Speech Rate / Speed")}
              min={0.7}
              max={1.5}
              step={0.05}
              value={voiceSpeed}
              formatValue={(v) => `${v.toFixed(2)}x`}
              onChange={(val) => {
                setVoiceSpeed(val);
                markDirty();
              }}
            />

            <SettingsSlider
              label={t("settings:translationVoice.pitch", "Pitch Modulation")}
              min={-6}
              max={6}
              step={1}
              value={voicePitch}
              formatValue={(v) => (v > 0 ? `+${v} semitones` : `${v} semitones`)}
              onChange={(val) => {
                setVoicePitch(val);
                markDirty();
              }}
            />
          </div>
        </SettingCard>

        {/* CARD 3: SUBTITLE & CAPTION STYLING (Full width on lg) */}
        <div className="lg:col-span-2">
          <SettingCard
            title={t("settings:translationVoice.subtitleTitle", "Subtitle & Caption Styling")}
            description={t(
              "settings:translationVoice.subtitleDesc",
              "Configure burned-in and downloadable closed captions with live styling visualizer."
            )}
          >
            <div className="grid gap-6 md:grid-cols-2">
              {/* Controls Column */}
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">
                    {t("settings:translationVoice.formatLabel", "Default Subtitle Export Format")}
                  </label>
                  <SettingsTabs
                    tabs={[
                      { id: "srt", label: "SRT (Standard)" },
                      { id: "vtt", label: "WebVTT" },
                      { id: "ass", label: "ASS (Advanced)" },
                    ]}
                    activeTab={subtitleFormat}
                    onChange={(tab) => {
                      setSubtitleFormat(tab as any);
                      markDirty();
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                      {t("settings:translationVoice.fontFamily", "Font Family")}
                    </label>
                    <SelectBox
                      value={subtitleFont}
                      onChange={(val) => {
                        setSubtitleFont(val);
                        markDirty();
                      }}
                    >
                      <option value="Inter">Inter (Clean)</option>
                      <option value="Arial">Arial (Universal)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Montserrat">Montserrat (Modern)</option>
                    </SelectBox>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                      {t("settings:translationVoice.position", "Screen Position")}
                    </label>
                    <SelectBox
                      value={subtitlePosition}
                      onChange={(val) => {
                        setSubtitlePosition(val as any);
                        markDirty();
                      }}
                    >
                      <option value="bottom">Bottom (Standard)</option>
                      <option value="top">Top (Headlines)</option>
                      <option value="center">Center</option>
                    </SelectBox>
                  </div>
                </div>

                <SettingsSlider
                  label={t("settings:translationVoice.fontSize", "Font Size")}
                  min={14}
                  max={32}
                  step={1}
                  value={subtitleFontSize}
                  unit="px"
                  onChange={(val) => {
                    setSubtitleFontSize(val);
                    markDirty();
                  }}
                />

                <SettingsSlider
                  label={t("settings:translationVoice.maxChars", "Max Characters Per Line")}
                  min={24}
                  max={60}
                  step={2}
                  value={maxChars}
                  unit=" chars"
                  onChange={(val) => {
                    setMaxChars(val);
                    markDirty();
                  }}
                />

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                    Subtitle Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { label: "White", color: "#FFFFFF" },
                      { label: "Yellow", color: "#FDE047" },
                      { label: "Cyan", color: "#38BDF8" },
                      { label: "Green", color: "#4ADE80" },
                    ].map((swatch) => (
                      <button
                        key={swatch.color}
                        type="button"
                        onClick={() => {
                          setSubtitleColor(swatch.color);
                          markDirty();
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          subtitleColor === swatch.color
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm"
                            : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: swatch.color }}
                        />
                        <span>{swatch.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Column */}
              <div className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-slate-950 p-4 text-white relative min-h-[220px] overflow-hidden">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Subtitles size={14} className="text-[var(--color-primary)]" />
                    Live Subtitle Visualizer
                  </span>
                  <SettingsBadge variant="primary" size="sm">
                    {subtitleFormat.toUpperCase()}
                  </SettingsBadge>
                </div>

                {/* Simulated video frame with styled subtitle */}
                <div
                  className={`flex flex-col items-center justify-center p-2 text-center transition-all duration-200 ${
                    subtitlePosition === "top"
                      ? "justify-start pt-3"
                      : subtitlePosition === "center"
                      ? "justify-center"
                      : "justify-end pb-3"
                  }`}
                  style={{ minHeight: "130px" }}
                >
                  <div
                    className="inline-block rounded-md px-3 py-1 font-bold shadow-lg transition-all"
                    style={{
                      fontFamily: subtitleFont,
                      fontSize: `${subtitleFontSize}px`,
                      color: subtitleColor,
                      backgroundColor: "rgba(0,0,0,0.75)",
                    }}
                  >
                    Chào mừng bạn đến với hệ thống dịch video VidNova!
                  </div>
                  <span className="mt-1 text-[11px] text-slate-400">
                    [00:01.400 -- 00:04.200]
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-400">
                  <span>Font: {subtitleFont} • {subtitleFontSize}px</span>
                  <span>Position: {subtitlePosition}</span>
                </div>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );
}
