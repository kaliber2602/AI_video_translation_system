import { useTranslation } from "react-i18next";
import SettingCard from "./SettingCard";

export default function StorageUsageCard() {
  const { t } = useTranslation(["settings"]);

  return (
    <SettingCard
      title={t("settings:storage.title")}
      description={t("settings:storage.description")}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--color-text-primary)]">
          72.4 GB / 100 GB
        </span>

        <span className="text-xs font-semibold text-[var(--color-primary)]">
          72.4%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)] flex">
        <div className="h-full w-[42.5%] bg-[var(--color-primary)]" title="Source Videos" />
        <div className="h-full w-[18.2%] bg-blue-500" title="Dubbed Videos" />
        <div className="h-full w-[7.4%] bg-purple-500" title="Audio Tracks" />
        <div className="h-full w-[1.8%] bg-pink-500" title="Subtitles & Docs" />
        <div className="h-full w-[2.5%] bg-slate-400" title="Pipeline Cache" />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--color-text-muted)]">
        <span>
          <b className="text-[var(--color-primary)]">●</b>{" "}
          {t("settings:storage.sourceVideos", "Source Videos")} 42.5 GB
        </span>

        <span>
          <b className="text-blue-500">●</b>{" "}
          {t("settings:storage.dubbedVideos", "Dubbed Videos")} 18.2 GB
        </span>

        <span>
          <b className="text-purple-500">●</b>{" "}
          {t("settings:storage.audioTracks", "Audio Tracks")} 7.4 GB
        </span>

        <span>
          <b className="text-pink-500">●</b>{" "}
          {t("settings:storage.subtitlesDocs", "Subtitles & Docs")} 1.8 GB
        </span>

        <span>
          <b className="text-slate-400">●</b>{" "}
          {t("settings:storage.pipelineCache", "Cache")} 2.5 GB
        </span>
      </div>

      <button
        type="button"
        className="mt-5 h-10 w-full rounded-lg border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
      >
        {t("settings:storage.manageStorage")}
      </button>
    </SettingCard>
  );
}
