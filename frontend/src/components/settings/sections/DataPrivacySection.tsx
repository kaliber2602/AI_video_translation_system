import { useState, useMemo } from "react";
import {
  Shield,
  Download,
  Trash2,
  Database,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Search,
  Video,
  FileText,
  Music,
  Layers,
  FolderGit2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SelectBox from "../SelectBox";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsRow from "../common/SettingsRow";
import SettingsBadge from "../common/SettingsBadge";
import SettingsDangerZone from "../common/SettingsDangerZone";
import SettingsModal from "../common/SettingsModal";
import SettingsInput from "../common/SettingsInput";
import Toggle from "../Toggle";
import {
  INITIAL_MOCK_SETTINGS,
  type StorageFileItem,
} from "../mock/settingsMockData";

export default function DataPrivacySection() {
  const { t } = useTranslation(["settings", "common"]);

  // Storage files state
  const [files, setFiles] = useState<StorageFileItem[]>(
    INITIAL_MOCK_SETTINGS.privacy.storageFiles
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"size_desc" | "size_asc" | "date_desc" | "name_asc">("size_desc");

  // File to delete state (for delete confirmation modal)
  const [fileToDelete, setFileToDelete] = useState<StorageFileItem | null>(null);

  // Privacy toggles
  const [aiTraining, setAiTraining] = useState(
    INITIAL_MOCK_SETTINGS.privacy.aiModelTrainingConsent
  );
  const [telemetry, setTelemetry] = useState(
    INITIAL_MOCK_SETTINGS.privacy.telemetryAnalytics
  );
  const [personalized, setPersonalized] = useState(
    INITIAL_MOCK_SETTINGS.privacy.personalizedRecommendations
  );
  const [trashDays, setTrashDays] = useState(
    INITIAL_MOCK_SETTINGS.privacy.trashRetentionDays
  );
  const [autoCleanCache, setAutoCleanCache] = useState(
    INITIAL_MOCK_SETTINGS.privacy.autoCleanCache
  );

  // Data Export Modal & Selected Entities
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportEntities, setExportEntities] = useState({
    projectsMetadata: true,
    transcripts: true,
    subtitles: true,
    glossaries: true,
    dubbedAudio: false,
    invoices: false,
  });
  const [exportState, setExportState] = useState<"idle" | "generating" | "ready">("idle");

  // Danger zone delete account modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [isSaved, setIsSaved] = useState(true);

  const markDirty = () => setIsSaved(false);

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

  // Handle Delete File
  const handleConfirmDeleteFile = () => {
    if (!fileToDelete) return;
    setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
    toast.success(
      "Resource Deleted",
      `Deleted ${fileToDelete.filename} (${fileToDelete.sizeFormatted} freed).`
    );
    setFileToDelete(null);
  };

  // Handle Request Export
  const handleStartExport = () => {
    setExportState("generating");
    toast.info(
      "Generating Archive",
      "Packaging selected database entities, transcripts, and subtitles..."
    );

    setTimeout(() => {
      setExportState("ready");
      toast.success(
        "Archive Ready",
        "Your project archive package (vidnova_export_2026.zip) is ready for download."
      );
    }, 2400);
  };

  const handleDownloadArchive = () => {
    toast.success("Downloading Archive", "Downloading vidnova_export_2026.zip (14.2 MB)...");
    setIsExportModalOpen(false);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmationText.trim() !== "DELETE") {
      toast.error("Confirmation Required", "Please type DELETE in capital letters to confirm.");
      return;
    }

    setIsDeletingAccount(true);
    setTimeout(() => {
      setIsDeletingAccount(false);
      setIsDeleteModalOpen(false);
      setDeleteConfirmationText("");
      toast.error("Account Deletion Demo", "Account marked for scheduled deletion (demo simulation).");
    }, 1200);
  };

  const handleSave = () => {
    setIsSaved(true);
    toast.success(
      t("settings:toast.settingsSaved", "Settings saved"),
      t("settings:toast.privacySavedDesc", "Data retention policies and privacy consents updated.")
    );
  };

  const handleReset = () => {
    setAiTraining(false);
    setTelemetry(true);
    setPersonalized(true);
    setTrashDays(30);
    setAutoCleanCache(true);
    setIsSaved(true);
    toast.info("Reset to defaults", "Privacy preferences restored.");
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
          "Manage storage footprint, large video assets, retention policies, selective data exports, and AI privacy."
        )}
        isSaved={isSaved}
        onSave={handleSave}
        onReset={handleReset}
        actions={
          <button
            type="button"
            onClick={() => {
              setExportState("idle");
              setIsExportModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 py-2 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white active:scale-95"
          >
            <Download size={13} />
            <span>Export Data Archive</span>
          </button>
        }
      />

      {/* ========================================================= */}
      {/* 1. STORAGE USAGE & BREAKDOWN DASHBOARD                    */}
      {/* ========================================================= */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 1: OVERVIEW PROGRESS & MULTI-CATEGORY BAR */}
        <SettingCard
          title={t("settings:storage.title", "Storage & Data Usage")}
          description="Live allocation of video footage, rendered dubs, extracted vocal stems, and cache."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xl font-black text-[var(--color-text-primary)]">
                  72.4 GB <span className="text-xs font-normal text-[var(--color-text-muted)]">/ 100 GB</span>
                </span>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Pro Plan Quota • 27.6 GB Available
                </p>
              </div>
              <SettingsBadge variant="primary" size="md">
                72.4% Used
              </SettingsBadge>
            </div>

            {/* Segmented Color Bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-border)] flex">
              <div className="h-full w-[42.5%] bg-[var(--color-primary)] transition-all" title="Source Videos (42.5 GB)" />
              <div className="h-full w-[18.2%] bg-blue-500 transition-all" title="Dubbed Videos (18.2 GB)" />
              <div className="h-full w-[7.4%] bg-purple-500 transition-all" title="Audio Tracks (7.4 GB)" />
              <div className="h-full w-[1.8%] bg-pink-500 transition-all" title="Subtitles & Docs (1.8 GB)" />
              <div className="h-full w-[2.5%] bg-slate-400 transition-all" title="Pipeline Cache (2.5 GB)" />
            </div>

            {/* Real Resource Categories */}
            <div className="space-y-2 pt-2 text-xs">
              {INITIAL_MOCK_SETTINGS.privacy.storageByType.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-1 border-b border-[var(--color-border)]/40 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {item.label}
                    </span>
                    <span className="hidden font-mono text-[10px] text-[var(--color-text-muted)] sm:inline">
                      ({item.dbField})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {item.sizeGB} GB
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

        {/* CARD 2: STORAGE BY PROJECT DISTRIBUTION */}
        <SettingCard
          title="Storage by Project"
          description="Identify which video translation projects consume the highest storage quota."
        >
          <div className="space-y-3.5">
            {INITIAL_MOCK_SETTINGS.privacy.storageByProject.map((proj) => (
              <div key={proj.projectName} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <FolderGit2 size={13} className="text-[var(--color-primary)]" />
                    {proj.projectName}
                  </span>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {proj.storageGB} GB{" "}
                    <span className="text-[10px] font-normal text-[var(--color-text-muted)]">
                      ({proj.videoCount} videos)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${proj.percentage}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3 text-xs text-[var(--color-text-muted)]">
              💡 <b>Storage Optimization:</b> Archiving completed projects frees up local render cache while preserving finalized subtitle tracks.
            </div>
          </div>
        </SettingCard>

        {/* CARD 3: TOP 5 LARGEST FILES QUICK INSIGHT (Full width on lg) */}
        <div className="lg:col-span-2">
          <SettingCard
            title="Largest Files"
            description="Top storage consumers across all projects. Quick actions to review or reclaim space."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topLargestFiles.map((file, idx) => {
                const meta = getResourceMeta(file.resourceType);
                return (
                  <div
                    key={file.id}
                    className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-sm transition hover:border-[var(--color-primary)]/40"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--color-primary)]">
                          #{idx + 1} Largest
                        </span>
                        <SettingsBadge variant={meta.badgeVariant} size="sm">
                          {meta.label}
                        </SettingsBadge>
                      </div>

                      <h5 className="text-xs font-bold text-[var(--color-text-primary)] line-clamp-1" title={file.filename}>
                        {file.filename}
                      </h5>

                      <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
                        Project: <b>{file.projectName}</b>
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                        <span>{file.specs}</span>
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {file.sizeFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--color-border)]/40 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          toast.info("Downloading File", `Initiating download for ${file.filename}`)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition"
                        title="Download"
                      >
                        <Download size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setFileToDelete(file)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-600 hover:border-rose-500/30 hover:bg-rose-500/10 transition"
                        title="Delete Resource"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingCard>
        </div>

        {/* CARD 4: INTERACTIVE FULL FILE MANAGEMENT DATA TABLE (Full width on lg) */}
        <div className="lg:col-span-2">
          <SettingCard
            title="All Stored Video Assets & Pipeline Files"
            description="Search, filter by real database resource types, and safely manage project media."
          >
            <div className="space-y-4">
              {/* Toolbar: Search, Filter, Sort */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
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

                {/* Filter & Sort Controls */}
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

              {/* Table Container (Desktop) */}
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
                                  onClick={() =>
                                    toast.info("Downloading File", `Initiating download for ${file.filename}`)
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] transition"
                                  title="Download"
                                >
                                  <Download size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFileToDelete(file)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-rose-500/10 hover:text-rose-600 transition"
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

              {/* Mobile Card List (< 768px) */}
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
                            onClick={() =>
                              toast.info("Downloading File", `Initiating download for ${file.filename}`)
                            }
                            className="text-[var(--color-primary)] font-semibold"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => setFileToDelete(file)}
                            className="text-rose-600 font-semibold"
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

        {/* CARD 5: AI PRIVACY & MODEL TRAINING */}
        <SettingCard
          title={t("settings:privacy.aiPrivacyTitle", "AI Model Privacy & Training")}
          description={t(
            "settings:privacy.aiPrivacyDesc",
            "Control whether your audio recordings and transcriptions are used for AI training."
          )}
        >
          <div className="divide-y divide-[var(--color-border)]/60">
            <SettingsRow
              icon={<Lock size={16} />}
              title={t("settings:privacy.aiTraining", "AI Training Opt-Out")}
              description={t(
                "settings:privacy.aiTrainingDesc",
                "Strictly prohibit VidNova or sub-processors from training foundation models on your content."
              )}
              badge={<SettingsBadge variant="success" size="sm">Protected</SettingsBadge>}
            >
              <Toggle
                checked={!aiTraining}
                onChange={(val) => {
                  setAiTraining(!val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<Shield size={16} />}
              title={t("settings:privacy.telemetry", "Anonymous Telemetry & Diagnostics")}
              description={t(
                "settings:privacy.telemetryDesc",
                "Share anonymous app crash reports and latency metrics to help improve video translation speed."
              )}
            >
              <Toggle
                checked={telemetry}
                onChange={(val) => {
                  setTelemetry(val);
                  markDirty();
                }}
              />
            </SettingsRow>

            <SettingsRow
              icon={<Sparkles size={16} />}
              title={t("settings:privacy.personalized", "Personalized AI Recommendations")}
              description={t(
                "settings:privacy.personalizedDesc",
                "Allow AI assistant to tailor voice and subtitle style suggestions based on editing habits."
              )}
            >
              <Toggle
                checked={personalized}
                onChange={(val) => {
                  setPersonalized(val);
                  markDirty();
                }}
              />
            </SettingsRow>
          </div>
        </SettingCard>

        {/* CARD 6: RETENTION & CACHE */}
        <SettingCard
          title={t("settings:privacy.retentionTitle", "Data Retention & Storage Lifecycle")}
          description={t(
            "settings:privacy.retentionDesc",
            "Automate cleanup schedules for discarded projects, trash, and temporary audio waveforms."
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                <Clock size={14} className="text-[var(--color-primary)]" />
                {t("settings:privacy.trashRetention", "Trash Auto-Purge Period")}
              </label>
              <SelectBox
                value={String(trashDays)}
                onChange={(val) => {
                  setTrashDays(Number(val) as any);
                  markDirty();
                }}
              >
                <option value="30">30 Days (Standard retention)</option>
                <option value="60">60 Days (Extended buffer)</option>
                <option value="90">90 Days (Enterprise archive)</option>
              </SelectBox>
            </div>

            <div className="divide-y divide-[var(--color-border)]/60 pt-1">
              <SettingsRow
                icon={<Database size={16} />}
                title={t("settings:privacy.autoCleanCache", "Auto-Clear Render Cache")}
                description={t(
                  "settings:privacy.autoCleanCacheDesc",
                  "Automatically flush temporary audio chunk files older than 7 days (saves ~2.5 GB)."
                )}
              >
                <Toggle
                  checked={autoCleanCache}
                  onChange={(val) => {
                    setAutoCleanCache(val);
                    markDirty();
                  }}
                />
              </SettingsRow>
            </div>
          </div>
        </SettingCard>

        {/* DANGER ZONE (Full width on lg) */}
        <div className="lg:col-span-2">
          <SettingsDangerZone
            title="Delete Account & Workspace Data"
            description="Permanently delete your user profile, all 28 video projects, generated voice dubbings, and cancel active subscriptions immediately."
            warningNote="This action is completely irreversible. All video files and cloud transcripts will be immediately wiped."
            actionText="Delete My Account"
            onAction={() => {
              setDeleteConfirmationText("");
              setIsDeleteModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: DELETE FILE CONFIRMATION                           */}
      {/* ========================================================= */}
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
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteFile}
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
            >
              Confirm Delete
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

      {/* ========================================================= */}
      {/* MODAL: SELECTIVE DATA EXPORT                              */}
      {/* ========================================================= */}
      <SettingsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Project & Account Data"
        subtitle="Select specific database entities to include in your ZIP archive"
        icon={<Download size={20} />}
        maxWidth="md"
        footer={
          exportState === "ready" ? (
            <button
              type="button"
              onClick={handleDownloadArchive}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              Download Ready (14.2 MB)
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartExport}
                disabled={exportState === "generating"}
                className="rounded-xl bg-[var(--color-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {exportState === "generating" ? "Packaging Archive..." : "Generate Archive (ZIP)"}
              </button>
            </div>
          )
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-[var(--color-text-muted)]">
            Choose the specific data entities you wish to bundle into your export:
          </p>

          <div className="divide-y divide-[var(--color-border)]/60 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 px-3.5 py-1">
            {[
              {
                key: "projectsMetadata",
                title: "Projects & Workspace Metadata",
                desc: "Project titles, video lists, tags, and member roles (JSON)",
              },
              {
                key: "transcripts",
                title: "Speech-to-Text Transcripts",
                desc: "Timestamped Whisper speech segments with speaker IDs",
              },
              {
                key: "subtitles",
                title: "Generated Subtitles (.SRT, .VTT)",
                desc: "Final closed-caption subtitle tracks for all languages",
              },
              {
                key: "glossaries",
                title: "Project Terminology Glossaries",
                desc: "Custom industry glossaries and translation dictionaries",
              },
              {
                key: "dubbedAudio",
                title: "Synthesized Dubbed Audio (.WAV)",
                desc: "Multi-language vocal dub tracks (increases archive size)",
              },
              {
                key: "invoices",
                title: "Payment Transactions & Invoices",
                desc: "Billing receipts and credit audit consumption history",
              },
            ].map((item) => {
              const isChecked = (exportEntities as any)[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {item.title}
                    </span>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {item.desc}
                    </p>
                  </div>
                  <Toggle
                    checked={isChecked}
                    onChange={(val) =>
                      setExportEntities({
                        ...exportEntities,
                        [item.key]: val,
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </SettingsModal>

      {/* ========================================================= */}
      {/* MODAL: 2-STEP ACCOUNT DELETION                            */}
      {/* ========================================================= */}
      <SettingsModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Permanent Account Deletion"
        subtitle="Please read carefully before proceeding"
        icon={<AlertTriangle size={20} className="text-rose-600" />}
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmationText.trim() !== "DELETE" || isDeletingAccount}
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeletingAccount ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
            ⚠️ <b>Warning:</b> You are about to permanently delete account <b>alex.morgan@vidnova.ai</b>. All active render pipelines will be terminated.
          </div>

          <div>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium mb-1.5">
              Type <span className="font-bold text-rose-600">DELETE</span> below to confirm:
            </p>
            <SettingsInput
              placeholder="Type DELETE"
              value={deleteConfirmationText}
              onChange={setDeleteConfirmationText}
            />
          </div>
        </div>
      </SettingsModal>
    </div>
  );
}
