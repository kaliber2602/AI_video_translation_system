// src/components/project/ProjectAssetExplorer.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Folder as FolderIconLucide,
  HardDrive,
  Cloud,
  FileText,
  Video as VideoIcon,
  Music,
  FileCode,
  Mic,
  Download,
  Eye,
  Search,
  RefreshCw,
  Archive,
  Loader2,
  Copy,
  Check,
  Filter,
  Trash2,
} from "lucide-react";
import Dialog from "../common/Dialog";
import ConfirmationDialog from "../common/ConfirmationDialog";
import { Button } from "../common/Button";
import {
  getProjectAssets,
  triggerAssetZipDownload,
  deleteProjectAsset,
  bulkDeleteProjectAssets,
} from "../../services/project.service";
import type {
  ProjectAssetItem,
  ProjectAssetsResponse,
  ProjectFolder,
} from "../../types/project";

interface ProjectAssetExplorerProps {
  projectId: number;
  projectName?: string;
  folders: ProjectFolder[];
  activeFolderId: number | null;
  onSelectFolder?: (folderId: number | null) => void;
}

export default function ProjectAssetExplorer({
  projectId,
  projectName,
  folders,
  activeFolderId,
}: ProjectAssetExplorerProps) {
  const [data, setData] = useState<ProjectAssetsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [scopeToFolder, setScopeToFolder] = useState<boolean>(false);
  const [previewAsset, setPreviewAsset] = useState<ProjectAssetItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Asset Selection & Lifecycle Delete States (UX-01, UX-11)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetToDelete, setAssetToDelete] = useState<ProjectAssetItem | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;

  const loadAssets = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const folderParam = scopeToFolder && activeFolderId !== null ? activeFolderId : undefined;
        const res = await getProjectAssets(projectId, {
          folder_id: folderParam,
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          search: searchQuery.trim() ? searchQuery.trim() : undefined,
        });
        setData(res);
      } catch (err) {
        console.error("[ProjectAssetExplorer] Failed to load assets:", err);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [projectId, scopeToFolder, activeFolderId, selectedCategory, searchQuery]
  );

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      const folderParam = scopeToFolder && activeFolderId !== null ? activeFolderId : null;
      await triggerAssetZipDownload(projectId, projectName, folderParam);
    } catch (err) {
      console.error("[ProjectAssetExplorer] ZIP download failed:", err);
      alert("Failed to create ZIP package. Please try again.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedKey(path);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleSelectAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const handleSelectAll = () => {
    if (!data?.assets) return;
    if (selectedAssetIds.length === data.assets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(data.assets.map((a) => a.id));
    }
  };

  const handleDeleteSingleAsset = async () => {
    if (!assetToDelete) return;
    try {
      setIsDeletingAsset(true);
      await deleteProjectAsset(projectId, assetToDelete.id);
      setSelectedAssetIds((prev) => prev.filter((id) => id !== assetToDelete.id));
      setAssetToDelete(null);
      await loadAssets(true);
    } catch (err: any) {
      console.error("[ProjectAssetExplorer] Delete failed:", err);
      alert(err?.response?.data?.detail || "Không thể xóa tệp này.");
    } finally {
      setIsDeletingAsset(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssetIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      await bulkDeleteProjectAssets(projectId, selectedAssetIds);
      setSelectedAssetIds([]);
      setIsBulkDeleteModalOpen(false);
      await loadAssets(true);
    } catch (err: any) {
      console.error("[ProjectAssetExplorer] Bulk delete failed:", err);
      alert(err?.response?.data?.detail || "Không thể xóa các tệp đã chọn.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "video":
        return <VideoIcon size={16} className="text-blue-500" />;
      case "audio":
        return <Music size={16} className="text-violet-500" />;
      case "subtitle":
        return <FileCode size={16} className="text-emerald-500" />;
      case "transcript":
        return <FileText size={16} className="text-amber-500" />;
      case "document":
        return <FileText size={16} className="text-indigo-500" />;
      case "speaker_voice":
        return <Mic size={16} className="text-rose-500" />;
      default:
        return <HardDrive size={16} className="text-gray-500" />;
    }
  };

  const categoryTabs: { id: string; label: string; countKey?: string }[] = [
    { id: "all", label: "All Files", countKey: "all" },
    { id: "video", label: "Videos", countKey: "video" },
    { id: "audio", label: "Audio Stems", countKey: "audio" },
    { id: "subtitles", label: "Subtitles & Transcripts" },
    { id: "document", label: "AI Documents", countKey: "document" },
    { id: "speaker_voice", label: "Speaker Profiles", countKey: "speaker_voice" },
  ];

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const getStorageType = (asset?: ProjectAssetItem | null): string => {
    if (!asset) return "local";
    return (asset.storage_type || asset.storage_location || "local").toLowerCase();
  };

  const getFormat = (asset?: ProjectAssetItem | null): string => {
    if (!asset || !asset.format) return "FILE";
    return asset.format.toUpperCase();
  };

  const getCategoryDisplay = (category?: string): string => {
    if (!category) return "file";
    return category.replace("_", " ");
  };

  const getAssetSizeDisplay = (asset?: ProjectAssetItem | null): string => {
    if (!asset) return "0 B";
    if (asset.size_display) return asset.size_display;
    return formatBytes(asset.size_bytes || 0);
  };

  const totalStorageDisplay = data ? formatBytes(data.total_size_bytes) : "0 B";

  return (
    <div className="space-y-6">
      {/* Overview & Storage Statistics Bar */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Storage Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <HardDrive size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Total Storage
            </p>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {totalStorageDisplay}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {data?.total_files ?? 0} tracked files
            </p>
          </div>
        </div>

        {/* Cloud / S3 Storage Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Cloud size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              S3 / MinIO Storage
            </p>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {data?.assets.filter((a) => getStorageType(a) === "s3").length ?? 0} objects
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Cloud bucket synced
            </p>
          </div>
        </div>

        {/* Audio & Video Assets Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Music size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Media Stems
            </p>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {(data?.category_counts?.video ?? 0) + (data?.category_counts?.audio ?? 0)} files
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Originals & separate tracks
            </p>
          </div>
        </div>

        {/* AI Documents & Transcripts Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Docs & Subtitles
            </p>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {(data?.category_counts?.subtitle ?? 0) +
                (data?.category_counts?.transcript ?? 0) +
                (data?.category_counts?.document ?? 0)} files
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              SRT, VTT, Markdown & JSON
            </p>
          </div>
        </div>
      </section>

      {/* Toolbar & Controls Bar */}
      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            type="text"
            placeholder="Search by filename, video title, or folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
          />
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {activeFolder && (
            <button
              type="button"
              onClick={() => setScopeToFolder(!scopeToFolder)}
              className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${
                scopeToFolder
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
              }`}
            >
              <Filter size={14} />
              <span>Scope: {activeFolder.name}</span>
            </button>
          )}

          {selectedAssetIds.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              icon={<Trash2 size={14} />}
            >
              Xóa ({selectedAssetIds.length}) tệp
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadAssets()}
            disabled={isLoading}
            icon={<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadZip}
            isLoading={isDownloadingZip}
            icon={<Archive size={15} />}
            title="Tải toàn bộ tệp tài nguyên hiện tại dưới dạng gói nén ZIP"
          >
            Tải ZIP ({data?.assets.length || 0} tệp)
          </Button>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="flex overflow-x-auto border-b border-[var(--color-border)] pb-2 scrollbar-none gap-2">
        {categoryTabs.map((tab) => {
          const isActive = selectedCategory === tab.id;
          let count = 0;
          if (data?.category_counts) {
            if (tab.id === "subtitles") {
              count =
                (data.category_counts.subtitle || 0) + (data.category_counts.transcript || 0);
            } else if (tab.countKey && tab.countKey in data.category_counts) {
              count = data.category_counts[tab.countKey];
            }
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </section>

      {/* Assets Table */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
            <span className="ml-3 text-sm text-[var(--color-text-muted)]">
              Indexing project files...
            </span>
          </div>
        ) : !data || data.assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <FolderIconLucide size={28} />
            </div>
            <h4 className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">
              No files or assets found
            </h4>
            <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-sm">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search query or category filter."
                : "Upload and translate videos in this project to generate stems, subtitles, and documents."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                <tr>
                  <th className="w-10 px-3 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(data.assets.length > 0 && selectedAssetIds.length === data.assets.length)}
                      onChange={handleSelectAll}
                      aria-label="Chọn tất cả"
                      className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3.5">File Name & Format</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Associated Video / Folder</th>
                  <th className="px-4 py-3.5">Storage</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={`transition hover:bg-[var(--color-surface-muted)]/40 ${
                      selectedAssetIds.includes(asset.id) ? "bg-[var(--color-primary-soft)]/20" : ""
                    }`}
                  >
                    <td className="px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedAssetIds.includes(asset.id)}
                        onChange={() => handleToggleSelectAsset(asset.id)}
                        aria-label={`Chọn ${asset.name}`}
                        className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                      />
                    </td>
                    {/* File Name & Format */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div className="min-w-0 max-w-xs sm:max-w-sm">
                          <p
                            className="truncate font-semibold text-[var(--color-text-primary)]"
                            title={asset.name}
                          >
                            {asset.name}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                            .{getFormat(asset)} • {getStorageType(asset).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                        {getCategoryDisplay(asset.category)}
                      </span>
                    </td>

                    {/* Associated Video / Folder */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="truncate">
                        {asset.video_title ? (
                          <span
                            className="font-medium text-[var(--color-text-primary)]"
                            title={asset.video_title}
                          >
                            {asset.video_title}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">Project wide</span>
                        )}
                        {asset.folder_name && (
                          <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] mt-0.5">
                            <FolderIconLucide size={10} />
                            <span>{asset.folder_name}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Storage Type */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getStorageType(asset) === "s3" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                          <Cloud size={12} />
                          <span>S3 / Cloud</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-neutral-500/20 bg-neutral-500/10 px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                          <HardDrive size={12} />
                          <span>Local Disk</span>
                        </span>
                      )}
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-[var(--color-text-primary)]">
                      {getAssetSizeDisplay(asset)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Preview button */}
                        <button
                          type="button"
                          onClick={() => setPreviewAsset(asset)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                          title="Preview asset"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Download button */}
                        {asset.download_url ? (
                          <a
                            href={asset.download_url}
                            download={asset.name}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            title="Download file"
                          >
                            <Download size={14} />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCopyPath(asset.path_or_key)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            title="Copy file path"
                          >
                            {copiedKey === asset.path_or_key ? (
                              <Check size={14} className="text-emerald-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        )}

                        {/* Delete button (UX-01) */}
                        <button
                          type="button"
                          onClick={() => setAssetToDelete(asset)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-danger)] transition hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                          title="Xóa tệp này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Asset Preview / Details Dialog */}
      <Dialog
        isOpen={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        title={
          <div className="flex items-center gap-2 text-base font-bold">
            {previewAsset && getCategoryIcon(previewAsset.category)}
            <span className="truncate max-w-md">{previewAsset?.name}</span>
          </div>
        }
        description={`Category: ${getCategoryDisplay(previewAsset?.category)} • Size: ${getAssetSizeDisplay(previewAsset)} • Storage: ${getStorageType(previewAsset).toUpperCase()}`}
        maxWidth="xl"
      >
        {previewAsset && (
          <div className="space-y-4 pt-2">
            {/* Media Player or Document Viewer */}
            {previewAsset.category === "video" && previewAsset.download_url ? (
              <div className="overflow-hidden rounded-xl bg-black">
                <video
                  controls
                  className="w-full max-h-96"
                  src={previewAsset.download_url}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ) : previewAsset.category === "audio" && previewAsset.download_url ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-center">
                <Music size={40} className="mx-auto text-violet-500 mb-3" />
                <audio controls className="w-full" src={previewAsset.download_url}>
                  Your browser does not support audio playback.
                </audio>
              </div>
            ) : previewAsset.category === "speaker_voice" && previewAsset.download_url ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-center">
                <Mic size={40} className="mx-auto text-rose-500 mb-3" />
                <audio controls className="w-full" src={previewAsset.download_url}>
                  Your browser does not support audio playback.
                </audio>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-xs text-[var(--color-text-secondary)]">
                <p className="font-semibold text-[var(--color-text-primary)] mb-1">
                  File storage reference:
                </p>
                <code className="block bg-[var(--color-input-background)] p-3 rounded-lg break-all font-mono text-[11px]">
                  {previewAsset.path_or_key}
                </code>
              </div>
            )}

            {/* Metadata breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3">
                <span className="text-[var(--color-text-muted)]">Associated Video:</span>
                <p className="font-medium text-[var(--color-text-primary)] mt-0.5 truncate">
                  {previewAsset.video_title || "None (Project Wide)"}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3">
                <span className="text-[var(--color-text-muted)]">Storage Type:</span>
                <p className="font-medium text-[var(--color-text-primary)] mt-0.5">
                  {getStorageType(previewAsset) === "s3"
                    ? "MinIO / S3 Object Storage"
                    : "Local Filesystem"}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3">
                <span className="text-[var(--color-text-muted)]">File Format:</span>
                <p className="font-medium text-[var(--color-text-primary)] mt-0.5">
                  .{getFormat(previewAsset)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3">
                <span className="text-[var(--color-text-muted)]">Exact Size:</span>
                <p className="font-medium text-[var(--color-text-primary)] mt-0.5">
                  {(previewAsset.size_bytes || 0).toLocaleString()} bytes ({getAssetSizeDisplay(previewAsset)})
                </p>
              </div>
            </div>

            {/* Action Buttons in Modal */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopyPath(previewAsset.path_or_key)}
                icon={
                  copiedKey === previewAsset.path_or_key ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )
                }
              >
                {copiedKey === previewAsset.path_or_key ? "Copied Path" : "Copy Path / Key"}
              </Button>

              {previewAsset.download_url && (
                <a
                  href={previewAsset.download_url}
                  download={previewAsset.name}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
                >
                  <Download size={14} />
                  Download File
                </a>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Single Asset Confirmation (UX-01) */}
      <ConfirmationDialog
        isOpen={Boolean(assetToDelete)}
        onClose={() => setAssetToDelete(null)}
        onConfirm={handleDeleteSingleAsset}
        title="Xóa tệp tài nguyên"
        message={`Bạn có chắc chắn muốn xóa tệp "${assetToDelete?.name}"? Thao tác này sẽ xóa tệp vĩnh viễn khỏi hệ thống.`}
        confirmLabel="Xóa tệp"
        isDestructive
        isLoading={isDeletingAsset}
      />

      {/* Bulk Delete Assets Confirmation (UX-01, UX-11) */}
      <ConfirmationDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Xóa các tệp đã chọn"
        message={`Bạn có chắc chắn muốn xóa ${selectedAssetIds.length} tệp tài nguyên đã chọn? Thao tác này không thể hoàn tác.`}
        confirmLabel={`Xóa ${selectedAssetIds.length} tệp`}
        isDestructive
        isLoading={isBulkDeleting}
      />
    </div>
  );
}
