import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Sparkles,
  FileCode,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FontCard {
  id: string;
  name: string;
  sample: string;
}

interface EffectCard {
  id: "none" | "fade" | "pop" | "slide" | "karaoke";
  name: string;
  desc: string;
  badge: string;
}

interface SubtitleStylePanelProps {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  outlineColor: string;
  setOutlineColor: (color: string) => void;
  fontName: string;
  setFontName: (name: string) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  alignment: "left" | "center" | "right" | "justify";
  setAlignment: (align: "left" | "center" | "right" | "justify") => void;
  maxLines: number;
  setMaxLines: (lines: number) => void;
  lineSpacing: number;
  setLineSpacing: (spacing: number) => void;
  positionY: number;
  setPositionY: (y: number) => void;
  setPosition: (pos: "bottom" | "middle" | "top") => void;
  effect: "none" | "fade" | "pop" | "slide" | "karaoke";
  setEffect: (effect: "none" | "fade" | "pop" | "slide" | "karaoke") => void;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3";
  isBilingual: boolean;
  setIsBilingual: (bilingual: boolean) => void;
  selectedFormat: string;
  setSelectedFormat: (fmt: string) => void;
  openSections: {
    typography: boolean;
    format_text: boolean;
    animation: boolean;
    file_format: boolean;
  };
  toggleSection: (section: "typography" | "format_text" | "animation" | "file_format") => void;
  applyPreset: (preset: "none" | "mrbeast" | "netflix" | "tiktok" | "youtube" | "minimal" | "cinematic") => void;
  replayAnimation: () => void;
  fontCards: FontCard[];
  effectCards: EffectCard[];
}

export default function SubtitleStylePanel({
  primaryColor,
  setPrimaryColor,
  outlineColor,
  setOutlineColor,
  fontName,
  setFontName,
  fontSize,
  setFontSize,
  alignment,
  setAlignment,
  maxLines,
  setMaxLines,
  lineSpacing,
  setLineSpacing,
  positionY,
  setPositionY,
  setPosition,
  effect,
  setEffect,
  aspectRatio,
  isBilingual,
  setIsBilingual,
  selectedFormat,
  setSelectedFormat,
  openSections,
  toggleSection,
  applyPreset,
  replayAnimation,
  fontCards,
  effectCards,
}: SubtitleStylePanelProps) {
  return (
    <div className="space-y-3.5">
      {/* 1-CLICK QUICK PRESETS */}
      <div>
        <label className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1.5 uppercase tracking-wider">
          Kiểu mẫu xu hướng 1-Click (Trending Presets):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => applyPreset("none")}
            className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
              effect === "none" && primaryColor === "#FFFFFF" && outlineColor === "#000000" && fontName === "Roboto"
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 font-bold ring-2 ring-emerald-400/40 shadow-sm"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-emerald-400/60 hover:bg-[var(--color-surface)]"
            }`}
          >
            <span className="font-bold text-xs">None</span>
            <span className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Mặc định</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset("mrbeast")}
            className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
              primaryColor === "#FFDF00" && effect === "pop"
                ? "border-amber-400 bg-amber-500/15 text-amber-300 font-bold ring-2 ring-amber-400/40 shadow-sm"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-amber-400/60 hover:bg-[var(--color-surface)]"
            }`}
          >
            <span className="font-bold text-xs">MrBeast Viral</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset("netflix")}
            className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
              fontName === "Roboto" && effect === "fade"
                ? "border-red-400 bg-red-500/15 text-red-300 font-bold ring-2 ring-red-400/40 shadow-sm"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-red-400/60 hover:bg-[var(--color-surface)]"
            }`}
          >
            <span className="font-bold text-xs">Netflix Cinema</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset("tiktok")}
            className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
              aspectRatio === "9:16" && effect === "pop"
                ? "border-cyan-400 bg-cyan-500/15 text-cyan-300 font-bold ring-2 ring-cyan-400/40 shadow-sm"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-cyan-400/60 hover:bg-[var(--color-surface)]"
            }`}
          >
            <span className="font-bold text-xs">TikTok / Shorts</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset("youtube")}
            className={`flex aspect-square flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
              aspectRatio === "16:9" && effect === "fade"
                ? "border-blue-400 bg-blue-500/15 text-blue-300 font-bold ring-2 ring-blue-400/40 shadow-sm"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-blue-400/60 hover:bg-[var(--color-surface)]"
            }`}
          >
            <span className="font-bold text-xs">YouTube Chuẩn</span>
          </button>
        </div>

        {/* Bilingual Subtitle Toggle Switch */}
        <div className="mt-2.5 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
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
              checked={isBilingual}
              onChange={(e) => setIsBilingual(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
          </label>
        </div>
      </div>

      {/* ACCORDION 1: TYPOGRAPHY CONTROLS */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("typography")}
          className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition"
        >
          <div className="flex items-center gap-1.5">
            <Type size={13} className="text-[var(--color-primary)]" />
            <span>Phông chữ & Kiểu dáng (Typography)</span>
          </div>
          {openSections.typography ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {openSections.typography && (
          <div className="p-3 pt-1 space-y-3.5 border-t border-[var(--color-border)]/40 bg-[var(--color-surface)]">
            {/* Font Preview Grid */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                  Kiểu phông chữ thực tế:
                </label>
                <span className="text-[10px] font-mono text-[var(--color-primary)] font-bold">
                  {fontName}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {fontCards.map((f) => {
                  const isSelected = fontName === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFontName(f.id);
                        replayAnimation();
                      }}
                      className={`flex aspect-square flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/25 shadow-sm ring-2 ring-[var(--color-primary)] text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface)]"
                      }`}
                    >
                      <span
                        className="text-xl font-bold leading-tight select-none"
                        style={{ fontFamily: `${f.id}, sans-serif` }}
                      >
                        {f.sample}
                      </span>
                      <span
                        className="text-[10px] font-semibold truncate max-w-full mt-1"
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
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5 space-y-3">
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
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
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
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent shrink-0"
                      />
                      <span className="font-mono text-[9px] text-[var(--color-text-muted)] uppercase truncate">
                        {primaryColor}
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
                          checked={outlineColor !== "transparent"}
                          onChange={(e) =>
                            setOutlineColor(e.target.checked ? "#000000" : "transparent")
                          }
                          className="sr-only peer"
                        />
                        <div className="w-6 h-3.5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                      </label>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] p-1 h-8">
                      <input
                        type="color"
                        disabled={outlineColor === "transparent"}
                        value={outlineColor === "transparent" ? "#000000" : outlineColor}
                        onChange={(e) => setOutlineColor(e.target.value)}
                        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent shrink-0 disabled:opacity-40"
                      />
                      <span className="font-mono text-[9px] text-[var(--color-text-muted)] uppercase truncate">
                        {outlineColor === "transparent" ? "Tắt" : outlineColor}
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
                      <button
                        type="button"
                        onClick={() => setAlignment("left")}
                        className={`flex items-center justify-center py-1 rounded text-xs transition ${
                          alignment === "left"
                            ? "bg-[var(--color-primary)] text-white"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        }`}
                        title="Trái"
                      >
                        <AlignLeft size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment("center")}
                        className={`flex items-center justify-center py-1 rounded text-xs transition ${
                          alignment === "center"
                            ? "bg-[var(--color-primary)] text-white"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        }`}
                        title="Giữa"
                      >
                        <AlignCenter size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment("right")}
                        className={`flex items-center justify-center py-1 rounded text-xs transition ${
                          alignment === "right"
                            ? "bg-[var(--color-primary)] text-white"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        }`}
                        title="Phải"
                      >
                        <AlignRight size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment("justify")}
                        className={`flex items-center justify-center py-1 rounded text-xs transition ${
                          alignment === "justify"
                            ? "bg-[var(--color-primary)] text-white"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        }`}
                        title="Đều"
                      >
                        <AlignJustify size={12} />
                      </button>
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
                          onClick={() => setMaxLines(lines)}
                          className={`py-1 text-center font-bold text-[10px] rounded transition ${
                            maxLines === lines
                              ? "bg-[var(--color-primary)] text-white"
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
                        Khoảng cách:
                      </label>
                      <span className="text-[9px] font-mono font-bold text-[var(--color-primary)]">
                        {lineSpacing.toFixed(1)}x
                      </span>
                    </div>
                    <select
                      value={lineSpacing}
                      onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                      className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
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
                  <span className="text-[10px] font-mono text-[var(--color-primary)] font-bold">
                    {Math.round(positionY)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPositionY(14);
                      setPosition("top");
                    }}
                    className={`py-1 rounded-lg text-xs font-semibold border transition ${
                      positionY <= 25
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)] font-bold"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    Đỉnh (14%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPositionY(50);
                      setPosition("middle");
                    }}
                    className={`py-1 rounded-lg text-xs font-semibold border transition ${
                      positionY > 25 && positionY < 75
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)] font-bold"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    Giữa (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPositionY(84);
                      setPosition("bottom");
                    }}
                    className={`py-1 rounded-lg text-xs font-semibold border transition ${
                      positionY >= 75
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 text-[var(--color-primary)] font-bold"
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
                    value={positionY}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setPositionY(val);
                      if (val <= 25) setPosition("top");
                      else if (val >= 75) setPosition("bottom");
                      else setPosition("middle");
                    }}
                    className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                  />
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono">95%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACCORDION 2: MOTION EFFECTS */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("animation")}
          className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-[var(--color-primary)]" />
            <span>Hiệu ứng chuyển động (Motion Effects)</span>
          </div>
          {openSections.animation ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {openSections.animation && (
          <div className="p-3 pt-1 border-t border-[var(--color-border)]/40 bg-[var(--color-surface)]">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {effectCards.map((ef) => {
                const isSelected = effect === ef.id;
                return (
                  <button
                    key={ef.id}
                    type="button"
                    onClick={() => {
                      setEffect(ef.id);
                      replayAnimation();
                    }}
                    className={`flex aspect-square flex-col items-center justify-center p-1.5 rounded-xl border text-center transition ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/25 shadow-sm ring-2 ring-[var(--color-primary)] text-[var(--color-primary)] font-bold"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span className="text-xs font-semibold line-clamp-2 leading-tight">
                      {ef.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ACCORDION 4: FORMAT */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("file_format")}
          className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition"
        >
          <div className="flex items-center gap-1.5">
            <FileCode size={13} className="text-[var(--color-primary)]" />
            <span>Định dạng tệp phụ đề (Format)</span>
          </div>
          {openSections.file_format ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {openSections.file_format && (
          <div className="p-3 pt-1 space-y-2 border-t border-[var(--color-border)]/40 bg-[var(--color-surface)]">
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-2.5 text-xs font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="ass">.ASS (Gốc - Hiệu ứng màu sắc, animation, vị trí chuẩn xác)</option>
              <option value="srt">.SRT (SubRip phổ thông - Tương thích mọi nền tảng)</option>
              <option value="vtt">.VTT (WebVTT - Chuẩn trình phát HTML5)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
