import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import { useSubscriptionPlan } from "../../../hooks/useSubscriptionPlan";

interface AudioSeparationCardProps {
  pipelineConfig?: any;
  onUpdateConfig: (configUpdate: Record<string, any>) => void;
}

export default function AudioSeparationCard({

  pipelineConfig,
  onUpdateConfig,
}: AudioSeparationCardProps) {
  const { t } = useTranslation(["pipeline", "common"]);
  const { isPro } = useSubscriptionPlan();

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-muted)]">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[var(--color-primary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
            {t("pipeline:steps.upload.audioSepTitle", "Tách âm & Tiền xử lý (Audio Separation Studio)")}
          </h4>
        </div>
        <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
          {t("pipeline:steps.upload.twoWaySync", "Đồng bộ 2 chiều (Auto-saved)")}
        </span>
      </div>

      <div>
        {/* Demucs Separation Model */}
        <div>
          <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1.5">
            {t("pipeline:steps.upload.demucsModelLabel", "Mô hình bóc tách âm thanh (Demucs):")}
          </label>
          <select
            value={pipelineConfig?.audio_separation?.demucs_model || "htdemucs"}
            onChange={(e) =>
              onUpdateConfig({
                audio_separation: {
                  ...(pipelineConfig?.audio_separation || {}),
                  demucs_model: e.target.value as any,
                },
              })
            }
            className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
          >
            <option value="htdemucs">Meta Demucs v4 HT (Free)</option>
            <option value="htdemucs_ft">Meta Demucs v4 FT (Free)</option>
            <option value="mdx_extra" disabled={!isPro}>
              MDX-Net Extra {!isPro ? "(Yeu cau goi Pro)" : "(Pro)"}
            </option>
          </select>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
            {t("pipeline:steps.upload.demucsExplanation", "Demucs trích xuất riêng biệt Vocals (cho nhận diện giọng nói) và Background Music (cho khâu lồng tiếng).")}
          </p>
        </div>
      </div>
    </div>
  );
}
