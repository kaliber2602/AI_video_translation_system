import SettingCard from "./SettingCard";

export default function StorageUsageCard() {
  return (
    <SettingCard
      title="Storage & Usage"
      description="Monitor your storage and usage"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--color-text-primary)]">
          72.4 GB / 500 GB
        </span>

        <span className="text-xs text-[var(--color-text-muted)]">
          14%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div className="h-full w-[14%] rounded-full bg-[var(--color-primary)]" />
      </div>

      <div className="mt-4 flex flex-wrap gap-5 text-xs text-[var(--color-text-muted)]">
        <span>
          <b className="text-[var(--color-primary)]">
            ●
          </b>{" "}
          Videos 52.1 GB
        </span>

        <span>
          <b className="text-[var(--color-secondary)]">
            ●
          </b>{" "}
          Documents 12.3 GB
        </span>

        <span>
          <b className="text-[#9570D9]">
            ●
          </b>{" "}
          Cache 8.0 GB
        </span>
      </div>

      <button
        type="button"
        className="mt-5 h-10 w-full rounded-lg border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
      >
        Manage Storage
      </button>
    </SettingCard>
  );
}
