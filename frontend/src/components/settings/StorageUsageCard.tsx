import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { HardDrive, Loader2, ArrowRight } from "lucide-react";
import SettingCard from "./SettingCard";
import { getStorageBreakdown } from "../../services/subscription.service";
import type { StorageBreakdownResponse } from "../../types/subscription";

interface StorageUsageCardProps {
  onManageStorage?: () => void;
}

export default function StorageUsageCard({ onManageStorage }: StorageUsageCardProps) {
  const { t } = useTranslation(["settings", "common"]);
  const navigate = useNavigate();

  const [breakdown, setBreakdown] = useState<StorageBreakdownResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getStorageBreakdown();
      setBreakdown(data);
    } catch (err) {
      console.error("[StorageUsageCard] Failed to fetch storage breakdown:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };

    window.addEventListener("subscription-updated", handleSync);
    return () => {
      window.removeEventListener("subscription-updated", handleSync);
    };
  }, [loadData]);

  const handleManage = () => {
    if (onManageStorage) {
      onManageStorage();
    } else {
      navigate("/workspace/settings?tab=privacy");
    }
  };

  const usedFormatted = breakdown
    ? breakdown.plan.used_bytes < 1024 * 1024 * 1024
      ? `${(breakdown.plan.used_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${breakdown.plan.used_gb} GB`
    : "0 MB";

  const totalFormatted = `${breakdown?.plan.total_gb ?? 5} GB`;
  const usagePercent = Math.min(100, Math.max(0, Number(breakdown?.plan.usage_percent) || 0));

  return (
    <SettingCard
      title={t("settings:storage.title", "Storage & Cloud Usage")}
      description={t(
        "settings:storage.description",
        "Monitor your project storage, vocal stems, cache, and uploaded source media."
      )}
    >
      {isLoading && !breakdown ? (
        <div className="flex flex-col items-center justify-center py-6 text-[var(--color-text-muted)] space-y-2">
          <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
          <span className="text-xs">Loading live storage usage...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <HardDrive size={15} className="text-[var(--color-primary)]" />
              {usedFormatted} / {totalFormatted}
            </span>

            <span className="text-xs font-semibold text-[var(--color-primary)]">
              {usagePercent}%
            </span>
          </div>

          {/* Segmented Color Bar */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)] flex">
            {breakdown && breakdown.storage_by_type && breakdown.storage_by_type.length > 0 ? (
              breakdown.storage_by_type.map((cat) =>
                cat.percentage > 0 ? (
                  <div
                    key={cat.key}
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color.startsWith("var")
                        ? "var(--color-primary)"
                        : cat.color,
                    }}
                    title={`${cat.label}: ${cat.size_formatted} (${cat.percentage}%)`}
                  />
                ) : null
              )
            ) : null}
            {(!breakdown || breakdown.plan.used_bytes === 0) && (
              <div className="h-full w-full bg-[var(--color-border)]/40" title="0 B used" />
            )}
          </div>

          {/* Categories Legend */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--color-text-muted)]">
            {breakdown?.storage_by_type && breakdown.storage_by_type.length > 0 ? (
              breakdown.storage_by_type.map((item) => (
                <span key={item.key} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: item.color.startsWith("var")
                        ? "var(--color-primary)"
                        : item.color,
                    }}
                  />
                  <span>{item.label}</span>
                  <span className="font-semibold text-[var(--color-text-secondary)]">
                    {item.size_formatted}
                  </span>
                </span>
              ))
            ) : (
              <span>No storage data available.</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleManage}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)] active:scale-[0.99] cursor-pointer"
          >
            <span>{t("settings:storage.manageStorage", "Manage Storage & Cache")}</span>
            <ArrowRight size={14} />
          </button>
        </>
      )}
    </SettingCard>
  );
}

