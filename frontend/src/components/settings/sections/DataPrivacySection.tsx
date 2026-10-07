import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Download,
  Trash2,
  Sparkles,
  AlertTriangle,
  Search,
  Video,
  FileText,
  Music,
  Layers,
  FolderGit2,
  RefreshCw,
  Loader2,
  Activity,
  Archive,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SelectBox from "../SelectBox";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsBadge from "../common/SettingsBadge";
import SettingsDangerZone from "../common/SettingsDangerZone";
import SettingsModal from "../common/SettingsModal";
import SettingsInput from "../common/SettingsInput";
import {
  type StorageFileItem,
} from "../mock/settingsMockData";
import {
  getStorageBreakdown,
  getMyQuota,
  getMyCreditAuditLogs,
  cleanPipelineCache,
  deleteStorageFile,
  exportUserDataArchive,
} from "../../../services/subscription.service";
import { deleteAccount, getMe } from "../../../services/auth.service";
import type {
  StorageBreakdownResponse,
  EffectiveQuota,
  CreditAuditLog,
} from "../../../types/subscription";
import type { UserResponse } from "../../../types/auth";

export default function DataPrivacySection() {
  const { t } = useTranslation(["settings", "common"]);

  // Current user state for real account deletion
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);

  // Live Storage Breakdown State
  const [breakdown, setBreakdown] = useState<StorageBreakdownResponse | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(true);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Live Quota & Credits State
  const [quota, setQuota] = useState<EffectiveQuota | null>(null);
  const [creditLogs, setCreditLogs] = useState<CreditAuditLog[]>([]);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);

  // Storage files state
  const [files, setFiles] = useState<StorageFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"size_desc" | "size_asc" | "date_desc" | "name_asc">("size_desc");

  // File to delete state (for delete confirmation modal)
  const [fileToDelete, setFileToDelete] = useState<StorageFileItem | null>(null);

  // Real Export state & modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Danger zone delete account modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Load live breakdown, quota, audit logs, and current user
  const loadStorageData = useCallback(async () => {
    try {
      setIsLoadingBreakdown(true);
      setIsLoadingQuota(true);

      const [storageData, quotaData, logsData, userData] = await Promise.all([
        getStorageBreakdown().catch((err) => {
          console.error("[DataPrivacySection] Storage breakdown error:", err);
          return null;
        }),
        getMyQuota().catch((err) => {
          console.error("[DataPrivacySection] Quota fetch error:", err);
          return null;
        }),
        getMyCreditAuditLogs(100).catch((err) => {
          console.error("[DataPrivacySection] Credit logs fetch error:", err);
          return { logs: [], total: 0 };
        }),
        getMe().catch(() => null),
      ]);

      if (userData) {
        setCurrentUser(userData);
      }

      if (storageData) {
        setBreakdown(storageData);
        if (storageData.all_files && storageData.all_files.length > 0) {
          setFiles(
            storageData.all_files.map((f) => ({
              id: f.id,
              filename: f.filename,
              projectName: f.project_name,
              resourceType: f.resource_type as StorageFileItem["resourceType"],
              sizeBytes: f.size_bytes,
              sizeFormatted: f.size_formatted,
              specs: f.specs,
              createdAt: f.created_at ? new Date(f.created_at).toLocaleDateString() : "Recent",
              status: (f.status === "processing" || f.status === "failed" ? f.status : "ready") as StorageFileItem["status"],
              downloadUrl: f.download_url,
            }))
          );
        } else {
          setFiles([]);
        }
      }

      if (quotaData) {
        setQuota(quotaData);
      }

      if (logsData && logsData.logs) {
        setCreditLogs(logsData.logs);
      }
    } catch (err) {
      console.error("[DataPrivacySection] Failed to load privacy & quota data:", err);
      setFiles([]);
    } finally {
      setIsLoadingBreakdown(false);
      setIsLoadingQuota(false);
    }
  }, []);

  useEffect(() => {
    loadStorageData();

    const handleSync = () => {
      loadStorageData();
    };

    window.addEventListener("subscription-updated", handleSync);
    return () => {
      window.removeEventListener("subscription-updated", handleSync);
    };
  }, [loadStorageData]);

  // Filter & Sort Logic for File Management Table
  const filteredAndSortedFiles = useMemo(() => {
    return files
      .filter((file) => {
        const matchesSearch =
          file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.projectName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType =
          selectedTypeFilter === "all" || file.resourceType === selectedTypeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === "size_desc") return b.sizeBytes - a.sizeBytes;
        if (sortBy === "size_asc") return a.sizeBytes - b.sizeBytes;
        if (sortBy === "name_asc") return a.filename.localeCompare(b.filename);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [files, searchQuery, selectedTypeFilter, sortBy]);

  // Top 5 largest files
  const topLargestFiles = useMemo(() => {
    return [...files].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 5);
  }, [files]);

  // Handle Delete File from Backend API
  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      setIsDeletingFile(true);
      const res = await deleteStorageFile(fileToDelete.resourceType, fileToDelete.id);
      toast.success("Resource Deleted", res.message);
      setFileToDelete(null);
      window.dispatchEvent(new CustomEvent("subscription-updated"));
      await loadStorageData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Could not delete this resource.";
      toast.error("Delete Failed", msg);
    } finally {
      setIsDeletingFile(false);
    }
  };

  // Handle Clean Pipeline Cache
  const handleCleanCache = async () => {
    try {
      setIsCleaningCache(true);
      const res = await cleanPipelineCache();
      toast.success("Cache Purged", res.message);
      window.dispatchEvent(new CustomEvent("subscription-updated"));
      await loadStorageData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to purge pipeline cache.";
      toast.error("Clean Cache Failed", msg);
    } finally {
      setIsCleaningCache(false);
    }
  };

  // Handle Download File
  const handleDownloadFile = (file: StorageFileItem & { downloadUrl?: string | null }) => {
    if (file.downloadUrl) {
      window.open(file.downloadUrl, "_blank");
    } else {
      toast.info("Download Initiated", `Downloading ${file.filename}...`);
    }
  };

  // Direct ZIP Export Archive execution
  const handleStartExport = async () => {
    try {
      setIsExporting(true);
      toast.info(
        "Packaging Archive",
        "Compiling database manifests, project data, transcripts, and subtitles into ZIP..."
      );

      await exportUserDataArchive();

      toast.success(
        "Archive Downloaded",
        "Your project archive (vidnova_user_archive.zip) has been compiled and downloaded."
      );
      setIsExportModalOpen(false);
    } catch (err: any) {
      console.error("[DataPrivacySection] Export archive failed:", err);
      toast.error("Export Failed", err?.response?.data?.detail || "Could not generate user data archive.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Real Permanent Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim() !== "DELETE") {
      toast.error("Confirmation Required", "Please type DELETE in capital letters to confirm.");
      return;
    }

    try {
      setIsDeletingAccount(true);
      await deleteAccount();
      toast.warning("Account Deleted", "Your account and active sessions have been deleted. Redirecting to login...");
      setIsDeleteModalOpen(false);
      setDeleteConfirmationText("");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (err: any) {
      console.error("[DataPrivacySection] Failed to delete account:", err);
      toast.error("Account Deletion Failed", err?.response?.data?.detail || "Could not delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Helper for resource icon & badge
  const getResourceMeta = (type: StorageFileItem["resourceType"]) => {
    switch (type) {
      case "source_video":
        return {
          label: "Source Video",
          badgeVariant: "primary" as const,
          icon: <Video size={14} className="text-[var(--color-primary)]" />,
        };
      case "dubbed_video":
        return {
          label: "Dubbed Video",
          badgeVariant: "success" as const,
          icon: <Video size={14} className="text-blue-500" />,
        };
      case "audio_track":
        return {
          label: "Audio Track",
          badgeVariant: "purple" as const,
          icon: <Music size={14} className="text-purple-500" />,
        };
      case "subtitles_docs":
        return {
          label: "Subtitles & Docs",
          badgeVariant: "warning" as const,
          icon: <FileText size={14} className="text-pink-500" />,
        };
      case "pipeline_cache":
        return {
          label: "Pipeline Cache",
          badgeVariant: "neutral" as const,
          icon: <Layers size={14} className="text-slate-500" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:privacy.title", "Data & Privacy Controls")}
        subtitle={t(
          "settings:privacy.subtitle",
          "Manage storage quota, track AI deductions, review large video assets, download complete ZIP backup, and account termination."
        )}
        actions={
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 py-2 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white active:scale-95 cursor-pointer"
          >
            <Download size={13} />
            <span>Tải bản sao lưu ZIP</span>
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 0: AI PROCESSING WORDS & LIVE QUOTA DASHBOARD (Full width on lg) */}
        <div className="lg:col-span-2">
          <SettingCard
            title={t("settings:privacy.creditsTitle", "AI Word Quota & Deductions")}
            description="Authoritative tracking of speech recognition and translation tokenized words. Subtitle editor in workspace is 100% free."
            action={
              <button
                type="button"
                onClick={loadStorageData}
                disabled={isLoadingQuota}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition disabled:opacity-50 p-1 cursor-pointer"
                title="Refresh Quota"
              >
                <RefreshCw size={14} className={isLoadingQuota ? "animate-spin text-[var(--color-primary)]" : ""} />
              </button>
            }
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column: Remaining Words Gauge */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-black text-[var(--color-text-primary)]">
                      {(quota?.words?.remaining_words ?? (quota?.credits?.remaining_credits ? quota.credits.remaining_credits * 10 : 5000)).toLocaleString()}{" "}
                      <span className="text-xs font-normal text-[var(--color-text-muted)]">
                        / {(quota?.words?.total_words ?? (quota?.credits?.total_credits ? quota.credits.total_credits * 10 : 5000)).toLocaleString()} words
                      </span>
                    </span>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Monthly AI Word Allowance • Reset every cycle
                    </p>
                  </div>
                  <SettingsBadge variant="warning" size="md">
                    {quota?.words
                      ? `${Math.round(((quota.words.total_words - quota.words.remaining_words) / Math.max(1, quota.words.total_words)) * 100)}% Used`
                      : quota?.credits
                      ? `${Math.round(((quota.credits.total_credits - quota.credits.remaining_credits) / Math.max(1, quota.credits.total_credits)) * 100)}% Used`
                      : "0% Used"}
                  </SettingsBadge>
                </div>

                {/* Single visual progress bar */}
                <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-[var(--color-primary)] transition-all duration-500"
                    style={{
                      width: `${
                        quota?.words
                          ? Math.min(100, Math.max(2, (quota.words.remaining_words / Math.max(1, quota.words.total_words)) * 100))
                          : quota && quota.credits.total_credits > 0
                          ? Math.min(100, Math.max(2, (quota.credits.remaining_credits / quota.credits.total_credits) * 100))
                          : 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Live Deduction Audit Logs (All items loaded) */}
              <div className="space-y-2.5 border-t border-[var(--color-border)]/60 pt-3 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-primary)]">
                  <span className="flex items-center gap-1.5">
                    <Activity size={13} className="text-amber-500" />
                    Recent AI Word Deductions
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {creditLogs.length} events
                  </span>
                </div>

                {creditLogs && creditLogs.length > 0 ? (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {creditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/40 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold truncate block text-[var(--color-text-primary)]">
                              {log.description || log.service_type}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)] block">
                              {new Date(log.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-rose-500 block">
                            -{log.words_deducted ?? log.credits_deducted} từ
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono block">
                            {log.balance_after !== null ? `${log.balance_after} left` : "deducted"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-surface-muted)]/20 p-5 text-center text-xs text-[var(--color-text-muted)] space-y-1">
                    <Sparkles size={16} className="text-amber-500/80 mb-1" />
                    <p className="font-semibold text-[var(--color-text-secondary)]">No words deducted yet</p>
                    <p className="text-[11px]">
                      Word quota is automatically deducted when running STT, Translation, or TTS.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SettingCard>
        </div>

        {/* CARD 1: OVERVIEW PROGRESS & USER-FRIENDLY CATEGORIES */}
        <SettingCard
          title={t("settings:storage.title", "Storage & Data Usage")}
          description="Authoritative allocation of video footage, rendered dubs, extracted vocal stems, and cache."
          action={
            <button
              type="button"
              onClick={loadStorageData}
              disabled={isLoadingBreakdown}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition disabled:opacity-50 p-1 cursor-pointer"
              title="Refresh Storage"
            >
              <RefreshCw size={14} className={isLoadingBreakdown ? "animate-spin text-[var(--color-primary)]" : ""} />
            </button>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xl font-black text-[var(--color-text-primary)]">
                  {breakdown
                    ? breakdown.plan.used_bytes < 1024 * 1024 * 1024
                      ? `${(breakdown.plan.used_bytes / (1024 * 1024)).toFixed(1)} MB`
                      : `${breakdown.plan.used_gb} GB`
                    : "0 MB"}{" "}
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">
                    / {breakdown?.plan.total_gb ?? 5} GB
                  </span>
                </span>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {breakdown?.plan.name || "Free"} Plan Quota •{" "}
                  {breakdown?.plan.available_gb ?? 5} GB Available
                </p>
              </div>
              <SettingsBadge variant="primary" size="md">
                {breakdown?.plan.usage_percent ?? 0}% Used
              </SettingsBadge>
            </div>

            {/* Segmented Color Bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-border)] flex">
              {(breakdown?.storage_by_type || []).map((cat) =>
                cat.percentage > 0 ? (
                  <div
                    key={cat.key}
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color.startsWith("var") ? "var(--color-primary)" : cat.color,
                    }}
                    title={`${cat.label} (${cat.size_formatted} - ${cat.percentage}%)`}
                  />
                ) : null
              )}
              {(!breakdown || breakdown.plan.used_bytes === 0) && (
                <div className="h-full w-full bg-[var(--color-border)]/40" title="0 B used" />
              )}
            </div>

            {/* Friendly Resource Categories (No technical DB column names) */}
            <div className="space-y-2 pt-2 text-xs">
              {(breakdown?.storage_by_type || []).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-1 border-b border-[var(--color-border)]/40 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: item.color.startsWith("var") ? "var(--color-primary)" : item.color,
                      }}
                    />
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {item.size_formatted}
                    </span>
                    <span className="ml-1.5 text-[11px] text-[var(--color-text-muted)]">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SettingCard>

        {/* CARD 2: STORAGE BY PROJECT DISTRIBUTION & CACHE CLEANUP */}
        <SettingCard
          title="Storage by Project"
          description="Identify which video translation projects consume the highest storage quota."
        >
          <div className="space-y-3.5">
            {breakdown?.storage_by_project && breakdown.storage_by_project.length > 0 ? (
              breakdown.storage_by_project.map((proj) => (
                <div key={proj.project_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                      <FolderGit2 size={13} className="text-[var(--color-primary)]" />
                      {proj.project_name}
                    </span>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {proj.storage_formatted}{" "}
                      <span className="text-[10px] font-normal text-[var(--color-text-muted)]">
                        ({proj.video_count} {proj.video_count === 1 ? "video" : "videos"})
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                      style={{ width: `${Math.max(proj.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-5 text-center text-xs text-[var(--color-text-muted)]">
                No active projects found yet.
              </div>
            )}

            {/* Cache Cleaner Action Footer */}
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <Layers size={13} className="text-[var(--color-primary)]" />
                  <span>Pipeline Cache</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Temporary audio chunks & VAD buffers ({breakdown?.cache_summary.cache_formatted || "0 B"})
                </p>
              </div>
              <button
                type="button"
                onClick={handleCleanCache}
                disabled={isCleaningCache}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                {isCleaningCache ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                <span>{isCleaningCache ? "Cleaning..." : "Purge Cache"}</span>
              </button>
            </div>
          </div>
        </SettingCard>

        {/* CARD 3: TOP 5 LARGEST FILES (Ergonomic Flat List) */}
        <div className="lg:col-span-2">
          <SettingCard
            title="Largest Files"
            description="Top storage consumers across all projects. Quick actions to download or reclaim space."
          >
            {topLargestFiles.length > 0 ? (
              <div className="divide-y divide-[var(--color-border)]/60 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                {topLargestFiles.map((file, idx) => {
                  const meta = getResourceMeta(file.resourceType);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3.5 text-xs hover:bg-[var(--color-surface-muted)]/40 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] font-mono text-[11px] font-bold text-[var(--color-text-muted)]">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--color-text-primary)] truncate max-w-[280px]" title={file.filename}>
                              {file.filename}
                            </span>
                            <SettingsBadge variant={meta.badgeVariant} size="sm">
                              {meta.label}
                            </SettingsBadge>
                          </div>
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                            Dự án: <b>{file.projectName}</b> • {file.specs}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-sm text-[var(--color-text-primary)]">
                          {file.sizeFormatted}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition cursor-pointer"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-600 hover:border-rose-500/30 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-xs text-[var(--color-text-muted)]">
                <Video size={24} className="mx-auto mb-2 text-[var(--color-text-muted)] opacity-50" />
                No files found in storage yet.
              </div>
            )}
          </SettingCard>
        </div>

        {/* CARD 4: ALL STORED ASSETS TABLE */}
        <div className="lg:col-span-2">
          <SettingCard
            title="All Stored Video Assets & Pipeline Files"
            description="Search, filter by resource types, and manage project media."
          >
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 min-w-[240px]">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by filename or project name..."
                    className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-4 text-xs text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="w-[170px]">
                    <SelectBox
                      value={selectedTypeFilter}
                      onChange={(val) => setSelectedTypeFilter(val)}
                    >
                      <option value="all">All Resource Types</option>
                      <option value="source_video">Source Videos</option>
                      <option value="dubbed_video">Dubbed Videos</option>
                      <option value="audio_track">Audio Tracks</option>
                      <option value="subtitles_docs">Subtitles & Docs</option>
                      <option value="pipeline_cache">Pipeline Cache</option>
                    </SelectBox>
                  </div>

                  <div className="w-[180px]">
                    <SelectBox
                      value={sortBy}
                      onChange={(val) => setSortBy(val as any)}
                    >
                      <option value="size_desc">Size: Largest first</option>
                      <option value="size_asc">Size: Smallest first</option>
                      <option value="date_desc">Date: Newest first</option>
                      <option value="name_asc">Name: A to Z</option>
                    </SelectBox>
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    <tr>
                      <th className="px-4 py-3">File / Resource Name</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Specs / Duration</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/60">
                    {filteredAndSortedFiles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                          No matching media assets found.
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedFiles.map((file) => {
                        const meta = getResourceMeta(file.resourceType);
                        return (
                          <tr
                            key={file.id}
                            className="transition hover:bg-[var(--color-surface-muted)]/50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5 font-bold text-[var(--color-text-primary)]">
                                {meta.icon}
                                <span className="line-clamp-1 max-w-[220px]" title={file.filename}>
                                  {file.filename}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[var(--color-text-secondary)] font-medium">
                              {file.projectName}
                            </td>
                            <td className="px-4 py-3">
                              <SettingsBadge variant={meta.badgeVariant} size="sm">
                                {meta.label}
                              </SettingsBadge>
                            </td>
                            <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono text-[11px]">
                              {file.specs}
                            </td>
                            <td className="px-4 py-3 font-bold text-[var(--color-text-primary)]">
                              {file.sizeFormatted}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-text-muted)]">
                              {file.createdAt}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile(file)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] transition cursor-pointer"
                                  title="Download"
                                >
                                  <Download size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFileToDelete(file)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-rose-500/10 hover:text-rose-600 transition cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="block md:hidden space-y-3">
                {filteredAndSortedFiles.map((file) => {
                  const meta = getResourceMeta(file.resourceType);
                  return (
                    <div
                      key={file.id}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <SettingsBadge variant={meta.badgeVariant} size="sm">
                          {meta.label}
                        </SettingsBadge>
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {file.sizeFormatted}
                        </span>
                      </div>

                      <h5 className="font-bold text-[var(--color-text-primary)] line-clamp-1">
                        {file.filename}
                      </h5>

                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        Project: <b>{file.projectName}</b> • {file.specs}
                      </p>

                      <div className="flex items-center justify-between border-t border-[var(--color-border)]/40 pt-2 text-[11px] text-[var(--color-text-muted)]">
                        <span>{file.createdAt}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file)}
                            className="text-[var(--color-primary)] font-semibold hover:underline cursor-pointer"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => setFileToDelete(file)}
                            className="text-rose-600 font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SettingCard>
        </div>

        {/* DANGER ZONE (Full width on lg) */}
        <div className="lg:col-span-2">
          <SettingsDangerZone
            title="Delete Account & Workspace Data"
            description="Permanently delete your user profile, video projects, generated voice dubbings, and active subscriptions."
            warningNote="This action is completely irreversible. All stored video footage and cloud transcripts will be immediately wiped."
            actionText="Delete My Account"
            onAction={() => {
              setDeleteConfirmationText("");
              setIsDeleteModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* MODAL: DELETE FILE CONFIRMATION */}
      <SettingsModal
        isOpen={Boolean(fileToDelete)}
        onClose={() => setFileToDelete(null)}
        title="Delete Media Resource"
        subtitle="Are you sure you want to delete this file?"
        icon={<Trash2 size={20} className="text-rose-600" />}
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFileToDelete(null)}
              disabled={isDeletingFile}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteFile}
              disabled={isDeletingFile}
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isDeletingFile ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              <span>{isDeletingFile ? "Deleting..." : "Confirm Delete"}</span>
            </button>
          </div>
        }
      >
        {fileToDelete && (
          <div className="space-y-3.5 text-xs">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-rose-700 dark:text-rose-300 leading-relaxed">
              ⚠️ Deleting this file will permanently free <b>{fileToDelete.sizeFormatted}</b> from your storage quota.
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3 space-y-1.5">
              <p className="text-[var(--color-text-muted)]">
                File: <b className="text-[var(--color-text-primary)]">{fileToDelete.filename}</b>
              </p>
              <p className="text-[var(--color-text-muted)]">
                Project: <b className="text-[var(--color-text-primary)]">{fileToDelete.projectName}</b>
              </p>
              <p className="text-[var(--color-text-muted)]">
                Type: <b>{fileToDelete.resourceType}</b> • {fileToDelete.specs}
              </p>
            </div>
          </div>
        )}
      </SettingsModal>

      {/* MODAL: DIRECT ZIP EXPORT */}
      <SettingsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Tải toàn bộ bản sao lưu ZIP"
        subtitle="Xuất gói sao lưu lưu trữ hoàn chỉnh gồm dữ liệu dự án, transcript và phụ đề"
        icon={<Archive size={20} />}
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(false)}
              disabled={isExporting}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleStartExport}
              disabled={isExporting}
              className="rounded-xl bg-[var(--color-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>{isExporting ? "Đang đóng gói ZIP..." : "Tải toàn bộ bản sao lưu ZIP"}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Dung lượng lưu trữ:</span>
              <span className="font-bold text-[var(--color-text-primary)]">
                {breakdown ? `${breakdown.plan.used_gb} GB` : "0 GB"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Tổng số dự án:</span>
              <span className="font-bold text-[var(--color-text-primary)]">
                {breakdown?.storage_by_project?.length ?? 0} dự án
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Định dạng nén xuất:</span>
              <span className="font-mono font-bold text-[var(--color-primary)]">
                vidnova_user_archive.zip
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
            Hệ thống sẽ nén trực tiếp toàn bộ dữ liệu tài khoản bao gồm danh sách dự án, phụ đề SRT/VTT, tệp âm thanh lồng tiếng và bản ghi lịch sử vào một tệp ZIP duy nhất.
          </p>
        </div>
      </SettingsModal>

      {/* MODAL: ACCOUNT DELETION */}
      <SettingsModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Xác nhận xóa tài khoản vĩnh viễn"
        subtitle="Hành động này không thể hoàn tác"
        icon={<AlertTriangle size={20} className="text-rose-600" />}
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmationText.trim() !== "DELETE" || isDeletingAccount}
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isDeletingAccount ? "Đang xóa..." : "Xác nhận xóa tài khoản"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
            ⚠️ <b>Cảnh báo:</b> Bạn sắp xóa vĩnh viễn tài khoản <b>{currentUser?.email || "người dùng"}</b>. Tất cả dữ liệu dự án, video và cấu hình sẽ bị xóa ngay lập tức.
          </div>

          <div>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium mb-1.5">
              Nhập chữ <span className="font-bold text-rose-600">DELETE</span> vào ô bên dưới để xác nhận:
            </p>
            <SettingsInput
              placeholder="Nhập DELETE"
              value={deleteConfirmationText}
              onChange={setDeleteConfirmationText}
            />
          </div>
        </div>
      </SettingsModal>
    </div>
  );
}
