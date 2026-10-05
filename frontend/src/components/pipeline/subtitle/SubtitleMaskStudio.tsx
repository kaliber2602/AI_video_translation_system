import {
  Crop,
  Trash2,
} from "lucide-react";
import type { SubtitleMaskConfig } from "../../../types/video";

interface SubtitleMaskStudioProps {
  subtitleMask: SubtitleMaskConfig | undefined;
  setSubtitleMask: React.Dispatch<React.SetStateAction<SubtitleMaskConfig | undefined>>;
  isMaskingMode: boolean;
  setIsMaskingMode: React.Dispatch<React.SetStateAction<boolean>>;
  videoDimensions: { width: number; height: number };
}

export default function SubtitleMaskStudio({
  subtitleMask,
  setSubtitleMask,
  isMaskingMode,
  setIsMaskingMode,
  videoDimensions,
}: SubtitleMaskStudioProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-white">Che phụ đề cũ / Watermark gốc</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={subtitleMask?.enabled ?? false}
              onChange={(e) =>
                setSubtitleMask((prev) => ({
                  enabled: e.target.checked,
                  x: prev?.x ?? 0,
                  y: prev?.y ?? Math.round((videoDimensions.height || 1080) * 0.8),
                  width: prev?.width ?? (videoDimensions.width || 1920),
                  height: prev?.height ?? Math.round((videoDimensions.height || 1080) * 0.18),
                  mask_type: prev?.mask_type ?? "blur",
                  opacity: prev?.opacity ?? 0.85,
                  color: prev?.color ?? "black",
                }))
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600" />
          </label>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Vẽ một vùng hình chữ nhật trên khung hình video để áp dụng bộ lọc Gaussian Blur hoặc Dải màu đơn sắc che đi phụ đề cứng có sẵn của video gốc.
        </p>

        <button
          type="button"
          onClick={() => setIsMaskingMode((prev) => !prev)}
          className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
            isMaskingMode
              ? "bg-rose-600 border-rose-500 text-white animate-pulse"
              : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-rose-500/60"
          }`}
        >
          <Crop className="w-3.5 h-3.5" />
          <span>{isMaskingMode ? "Đang vẽ vùng che (Nhấp & kéo chuột trên video)" : "✏ Nhấn để vẽ vùng che trên Video"}</span>
        </button>

        {subtitleMask?.enabled && (
          <div className="pt-3 border-t border-rose-500/20 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-zinc-300 block mb-1.5">
                Kiểu che (Mask Effect):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubtitleMask((prev) => prev ? { ...prev, mask_type: "blur" } : undefined)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition ${
                    subtitleMask.mask_type === "blur"
                      ? "border-rose-500 bg-rose-500/20 text-rose-300 font-semibold"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="font-bold block">Gaussian Blur</span>
                  <span className="text-[10px] opacity-75">Làm mờ phụ đề cũ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubtitleMask((prev) => prev ? { ...prev, mask_type: "banner" } : undefined)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition ${
                    subtitleMask.mask_type === "banner"
                      ? "border-rose-500 bg-rose-500/20 text-rose-300 font-semibold"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="font-bold block">Solid Banner</span>
                  <span className="text-[10px] opacity-75">Dải màu đơn sắc đè lên</span>
                </button>
              </div>
            </div>

            {subtitleMask.mask_type === "banner" && (
              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1.5">
                  Màu dải banner:
                </label>
                <div className="flex items-center gap-2">
                  {["black", "#18181b", "#0f172a", "#3b0764"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSubtitleMask((prev) => prev ? { ...prev, color: c } : undefined)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg border transition ${
                        subtitleMask.color === c ? "border-rose-400 ring-2 ring-rose-400/40" : "border-zinc-700"
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={subtitleMask.color || "#000000"}
                    onChange={(e) => setSubtitleMask((prev) => prev ? { ...prev, color: e.target.value } : undefined)}
                    className="w-7 h-7 rounded-lg border border-zinc-700 cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-[11px] font-medium text-zinc-300 mb-1">
                <span>Độ mờ đục (Opacity):</span>
                <span className="font-mono text-rose-400 font-bold">{Math.round((subtitleMask.opacity ?? 0.85) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={subtitleMask.opacity ?? 0.85}
                onChange={(e) =>
                  setSubtitleMask((prev) => prev ? { ...prev, opacity: parseFloat(e.target.value) } : undefined)
                }
                className="w-full accent-rose-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1">
              <span>Tọa độ: {subtitleMask.x}, {subtitleMask.y}</span>
              <span>Kích thước: {subtitleMask.width} × {subtitleMask.height} px</span>
            </div>

            <button
              type="button"
              onClick={() => setSubtitleMask((prev) => prev ? { ...prev, enabled: false } : undefined)}
              className="w-full py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-medium hover:bg-red-500/20 transition flex items-center justify-center gap-1.5"
            >
              <Trash2 size={12} />
              <span>Xóa vùng che phụ đề cũ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
