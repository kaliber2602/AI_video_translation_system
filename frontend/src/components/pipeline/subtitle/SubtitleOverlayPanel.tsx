import {
  Image as ImageIcon,
  Type,
  Trash2,
  Loader2,
  Upload,
} from "lucide-react";
import type { RefObject } from "react";
import type { OverlayConfig } from "../../../types/video";

interface SubtitleOverlayPanelProps {
  overlayConfig: OverlayConfig | undefined;
  setOverlayConfig: React.Dispatch<React.SetStateAction<OverlayConfig | undefined>>;
  logoInputRef: RefObject<HTMLInputElement | null>;
  isUploadingLogo: boolean;
  handleUploadLogo: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SubtitleOverlayPanel({
  overlayConfig,
  setOverlayConfig,
  logoInputRef,
  isUploadingLogo,
  handleUploadLogo,
}: SubtitleOverlayPanelProps) {
  return (
    <div className="space-y-4">
      {/* 1. LOGO WATERMARK SECTION */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">Watermark Logo PNG</span>
          </div>
          {overlayConfig?.logo_url && (
            <button
              type="button"
              onClick={() => setOverlayConfig((prev) => prev ? { ...prev, logo_url: null, logo_path: null } : undefined)}
              className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <Trash2 size={11} />
              <span>Gỡ Logo</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Chèn logo thương hiệu hoặc hình ảnh PNG trong suốt hiển thị cố định trên video.
        </p>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleUploadLogo}
          className="hidden"
        />

        {overlayConfig?.logo_url ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <img
                src={overlayConfig.logo_url}
                alt="Logo Preview"
                className="h-10 w-10 object-contain rounded border border-zinc-700 bg-zinc-950 p-1"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">Logo đã tải lên</p>
                <p className="text-[10px] text-zinc-400">Đang hiển thị ở góc khung hình</p>
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="px-2 py-1 rounded bg-zinc-800 text-[10px] text-zinc-300 hover:text-white border border-zinc-700"
              >
                Đổi ảnh
              </button>
            </div>

            {/* Controls: Scale & Opacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[10px] text-zinc-300 mb-1">
                  <span>Tỉ lệ:</span>
                  <span className="font-mono text-cyan-400 font-bold">{overlayConfig.logo_scale ?? 1}x</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.1}
                  value={overlayConfig.logo_scale ?? 1}
                  onChange={(e) =>
                    setOverlayConfig((prev) => ({
                      ...(prev || {
                        logo_x: 24,
                        logo_y: 24,
                        logo_opacity: 1,
                        ticker_speed: 1,
                        ticker_font_size: 20,
                        ticker_color: "#FFFFFF",
                        ticker_bg_color: "rgba(0,0,0,0.6)",
                      }),
                      logo_scale: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-cyan-500 h-1 bg-zinc-800 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-zinc-300 mb-1">
                  <span>Độ mờ:</span>
                  <span className="font-mono text-cyan-400 font-bold">{Math.round((overlayConfig.logo_opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={overlayConfig.logo_opacity ?? 1}
                  onChange={(e) =>
                    setOverlayConfig((prev) => ({
                      ...(prev || {
                        logo_x: 24,
                        logo_y: 24,
                        logo_scale: 1,
                        ticker_speed: 1,
                        ticker_font_size: 20,
                        ticker_color: "#FFFFFF",
                        ticker_bg_color: "rgba(0,0,0,0.6)",
                      }),
                      logo_opacity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-cyan-500 h-1 bg-zinc-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={isUploadingLogo}
            className="w-full py-2.5 px-3 rounded-lg border border-dashed border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            {isUploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            <span>{isUploadingLogo ? "Đang tải ảnh lên..." : "Tải lên Logo Watermark (PNG)"}</span>
          </button>
        )}
      </div>

      {/* 2. LOWER-THIRD TICKER MARQUEE SECTION */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-xs font-bold text-white">Băng chữ tin tức chạy chân trang (Ticker)</span>
          </div>
          {overlayConfig?.ticker_text && (
            <button
              type="button"
              onClick={() => setOverlayConfig((prev) => prev ? { ...prev, ticker_text: "" } : undefined)}
              className="text-[10px] text-zinc-400 hover:text-white"
            >
              Xóa chữ
            </button>
          )}
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Dòng chữ thông báo, tin nóng hoặc link mạng xã hội tự động cuộn ở đáy video.
        </p>

        <div>
          <label className="text-[11px] font-medium text-zinc-300 block mb-1">
            Nội dung tin tức:
          </label>
          <input
            type="text"
            placeholder="VD: BẢN TIN ĐẶC BIỆT: THEO DÕI KÊNH ĐỂ CẬP NHẬT KIẾN THỨC MỚI..."
            value={overlayConfig?.ticker_text || ""}
            onChange={(e) =>
              setOverlayConfig((prev) => ({
                ...(prev || {
                  logo_x: 24,
                  logo_y: 24,
                  logo_scale: 1,
                  logo_opacity: 1,
                  ticker_speed: 1,
                  ticker_font_size: 18,
                  ticker_color: "#FFFFFF",
                  ticker_bg_color: "rgba(0,0,0,0.6)",
                }),
                ticker_text: e.target.value,
              }))
            }
            className="w-full h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-500"
          />
        </div>

        {overlayConfig?.ticker_text && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Màu nền dải tin:</label>
              <div className="flex items-center gap-1.5">
                {["rgba(0,0,0,0.75)", "#dc2626", "#2563eb", "#d97706"].map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() =>
                      setOverlayConfig((prev) => prev ? { ...prev, ticker_bg_color: bg } : undefined)
                    }
                    style={{ backgroundColor: bg }}
                    className={`w-5 h-5 rounded border ${
                      overlayConfig.ticker_bg_color === bg ? "border-cyan-400 ring-1 ring-cyan-400" : "border-zinc-700"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Cỡ chữ (Font size):</label>
              <select
                value={overlayConfig.ticker_font_size || 18}
                onChange={(e) =>
                  setOverlayConfig((prev) => prev ? { ...prev, ticker_font_size: parseInt(e.target.value) } : undefined)
                }
                className="w-full h-7 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-xs text-white outline-none"
              >
                <option value={14}>Nhỏ (14px)</option>
                <option value={18}>Chuẩn (18px)</option>
                <option value={22}>Lớn (22px)</option>
                <option value={26}>Rất lớn (26px)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
