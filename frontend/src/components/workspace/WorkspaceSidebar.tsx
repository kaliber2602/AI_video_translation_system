import { useEffect, useState } from "react";
import { Folder, Users, Star, Trash2, Plus, Sparkles, Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getTags, createTag, updateTag, deleteTag } from "../../services/tag.service";
import type { TagResponse } from "../../types/tag";
import { toast } from "../../lib/toast";

interface WorkspaceSidebarProps {
  selectedTagId?: number | null;
  onTagSelect?: (tagId: number | null) => void;
  isNavbarCollapsed?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

type TagModalMode = "create" | "edit" | null;

export default function WorkspaceSidebar({
  selectedTagId = null,
  onTagSelect,
  isNavbarCollapsed = false,
  isOpenMobile = false,
  onCloseMobile,
}: WorkspaceSidebarProps) {
  const { t } = useTranslation(["workspace", "navigation", "common"]);

  const [trashHoverState, setTrashHoverState] = useState<{
    isNear: boolean;
    isOver: boolean;
    intensity: number;
  }>({ isNear: false, isOver: false, intensity: 0 });

  useEffect(() => {
    const handleNearTrash = (
      e: CustomEvent<{ isNear: boolean; isOver: boolean; intensity: number }>
    ) => {
      setTrashHoverState(e.detail || { isNear: false, isOver: false, intensity: 0 });
    };

    window.addEventListener("project-near-trash", handleNearTrash as EventListener);
    return () => {
      window.removeEventListener("project-near-trash", handleNearTrash as EventListener);
    };
  }, []);

  const navigationItems = [
    {
      id: "allProjects",
      label: t("navigation:allProjects"),
      icon: Folder,
      active: true,
    },
    {
      id: "sharedWithMe",
      label: t("navigation:sharedWithMe"),
      icon: Users,
    },
    {
      id: "favorites",
      label: t("navigation:favorites"),
      icon: Star,
    },
    {
      id: "trash",
      label: t("navigation:trash"),
      icon: Trash2,
    },
  ];

  // =========================================================
  // Tags
  // =========================================================

  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [tagsError, setTagsError] = useState<string | null>(null);

  // =========================================================
  // Tag Modal
  // =========================================================

  const [tagModalMode, setTagModalMode] = useState<TagModalMode>(null);
  const [editingTag, setEditingTag] = useState<TagResponse | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#45D2B7");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================
  // Delete
  // =========================================================

  const [deletingTag, setDeletingTag] = useState<TagResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // =========================================================
  // Load Tags
  // =========================================================

  useEffect(() => {
    const loadTags = async () => {
      try {
        setIsLoadingTags(true);
        setTagsError(null);

        const data = await getTags();
        setTags(data);
      } catch (error) {
        console.error("[WORKSPACE SIDEBAR] Failed to load tags:", error);
        setTagsError(t("workspace:tags.loadError"));
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTags();
  }, [t]);

  // =========================================================
  // Open Create Tag Modal
  // =========================================================

  const openCreateTagModal = () => {
    setTagModalMode("create");
    setEditingTag(null);
    setTagName("");
    setTagColor("#45D2B7");
  };

  // =========================================================
  // Open Edit Tag Modal
  // =========================================================

  const openEditTagModal = (tag: TagResponse) => {
    setTagModalMode("edit");
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || "#45D2B7");
  };

  // =========================================================
  // Close Tag Modal
  // =========================================================

  const closeTagModal = () => {
    if (isSubmitting) {
      return;
    }

    setTagModalMode(null);
    setEditingTag(null);
    setTagName("");
    setTagColor("#45D2B7");
  };

  // =========================================================
  // Create / Update Tag
  // =========================================================

  const handleSubmitTag = async () => {
    const trimmedName = tagName.trim();

    if (!trimmedName) {
      toast.error(t("workspace:tags.invalidTag"), t("workspace:tags.tagEmptyError"));
      return;
    }

    try {
      setIsSubmitting(true);

      // Create
      if (tagModalMode === "create") {
        const newTag = await createTag({
          name: trimmedName,
          color: tagColor || null,
        });

        setTags((currentTags) => [...currentTags, newTag]);
        toast.success(
          t("workspace:tags.tagCreated"),
          t("workspace:tags.deleteCreated", { name: newTag.name })
        );
      }

      // Update
      if (tagModalMode === "edit" && editingTag) {
        const updatedTag = await updateTag(editingTag.id, {
          name: trimmedName,
          color: tagColor || null,
        });

        setTags((currentTags) =>
          currentTags.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag))
        );

        toast.success(
          t("workspace:tags.tagUpdated"),
          t("workspace:tags.deleteUpdated", { name: updatedTag.name })
        );
      }

      closeTagModal();
    } catch (error) {
      console.error("[WORKSPACE SIDEBAR] Failed to save tag:", error);
      toast.error(t("workspace:tags.saveError"), t("workspace:tags.tryAgain"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // Delete Tag
  // =========================================================

  const handleDeleteTag = async () => {
    if (!deletingTag) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteTag(deletingTag.id);

      setTags((currentTags) => currentTags.filter((tag) => tag.id !== deletingTag.id));

      if (selectedTagId === deletingTag.id) {
        onTagSelect?.(null);
      }

      toast.success(
        t("workspace:tags.tagDeleted"),
        t("workspace:tags.deleteDeleted", { name: deletingTag.name })
      );

      setDeletingTag(null);
    } catch (error) {
      console.error("[WORKSPACE SIDEBAR] Failed to delete tag:", error);
      toast.error(t("workspace:tags.deleteError"), t("workspace:tags.tryAgain"));
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================================================
  // Select Tag
  // =========================================================

  const handleTagSelect = (tagId: number) => {
    if (selectedTagId === tagId) {
      onTagSelect?.(null);
      return;
    }
    onTagSelect?.(tagId);
  };

  const renderSidebarContent = (isMobile = false) => (
    <>
      {/* Navigation */}
      <nav className="space-y-1.5">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isTrash = item.id === "trash";
          const isTrashOver = isTrash && trashHoverState.isOver;
          const isTrashNear = isTrash && trashHoverState.isNear;

          let buttonClass = `flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-left text-sm spring-pill `;
          if (isTrashOver) {
            buttonClass += `bg-red-500 text-white font-bold scale-[1.08] shadow-[0_0_24px_rgba(239,68,68,0.6)] ring-2 ring-red-400 ring-offset-2 animate-pulse`;
          } else if (isTrashNear) {
            buttonClass += `bg-red-500/20 text-red-500 font-bold scale-[1.04] border border-red-500/50 shadow-[0_0_18px_rgba(239,68,68,0.3)]`;
          } else if (item.active) {
            buttonClass += `bg-[var(--color-primary)] text-white font-bold shadow-[0_6px_18px_-6px_color-mix(in_srgb,var(--color-primary)_70%,transparent)]`;
          } else {
            buttonClass += `text-[var(--color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--color-primary-soft)_60%,var(--color-surface-muted))] hover:text-[var(--color-text-primary)] hover:translate-x-0.5`;
          }

          return (
            <div
              key={item.label}
              className={`animate-scale-in stagger-${index + 1}`}
            >
              <button
                id={isTrash ? "sidebar-trash-dropzone" : undefined}
                type="button"
                onClick={() => {
                  if (isMobile) onCloseMobile?.();
                }}
                className={buttonClass}
              >
                <Icon
                  size={isTrashOver ? 21 : 19}
                  className={`transition-transform duration-200 ${
                    isTrashOver
                      ? "text-white animate-bounce"
                      : isTrashNear
                      ? "text-red-500 scale-125 animate-pulse"
                      : item.active
                      ? "text-white scale-105"
                      : "text-[var(--color-text-muted)] group-hover:scale-105"
                  }`}
                />
                <span className="font-medium tracking-tight">
                  {isTrashOver ? t("workspace:dropToDelete", "Thả để xóa") : item.label}
                </span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Tags */}
      <div className="mt-8 sm:mt-9">
        <div className="mb-3 sm:mb-4 flex items-center justify-between px-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            {t("workspace:tags.title")}
          </p>
        </div>

        {/* Loading */}
        {isLoadingTags && (
          <div className="space-y-3.5 px-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-border)]" />
                <span className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-border-muted)]" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoadingTags && tagsError && (
          <p className="px-3 text-xs text-[var(--color-danger)]">{tagsError}</p>
        )}

        {/* Empty */}
        {!isLoadingTags && !tagsError && tags.length === 0 && (
          <p className="px-3 text-xs text-[var(--color-text-muted)]">
            {t("workspace:tags.empty")}
          </p>
        )}

        {/* Tags List */}
        {!isLoadingTags && !tagsError && tags.length > 0 && (
          <div className="space-y-1">
            {tags.map((tag, index) => {
              const isSelected = selectedTagId === tag.id;

              return (
                <div
                  key={tag.id}
                  className={`group relative flex items-center rounded-2xl transition-all duration-200 ease-out animate-scale-in stagger-${((index + 2) % 6) + 1} spring-pill ${
                    isSelected
                      ? "bg-[var(--color-primary)] text-white shadow-[0_6px_18px_-6px_color-mix(in_srgb,var(--color-primary)_70%,transparent)]"
                      : "hover:bg-[color-mix(in_srgb,var(--color-primary-soft)_60%,var(--color-surface-muted))] hover:translate-x-0.5"
                  }`}
                >
                  {/* Tag Button */}
                  <button
                    type="button"
                    onClick={() => {
                      handleTagSelect(tag.id);
                      if (isMobile) onCloseMobile?.();
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5 text-sm spring-pill ${
                      isSelected
                        ? "font-bold text-white"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125"
                      style={{
                        backgroundColor: isSelected ? "white" : (tag.color || "var(--color-primary)"),
                        boxShadow: isSelected ? "0 0 8px rgba(255,255,255,0.8)" : undefined,
                      }}
                    />
                    <span className="truncate text-left">{tag.name}</span>
                  </button>

                  {/* Tag Actions */}
                  <div className="flex items-center gap-1 pr-1.5">
                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => openEditTagModal(tag)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg opacity-80 sm:opacity-0 transition sm:group-hover:opacity-100 ${
                        isSelected
                          ? "text-white/80 hover:bg-white/20 hover:text-white"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                      }`}
                      title={t("common:edit")}
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeletingTag(tag)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg opacity-80 sm:opacity-0 transition sm:group-hover:opacity-100 ${
                        isSelected
                          ? "text-white/80 hover:bg-red-500/80 hover:text-white"
                          : "text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-500"
                      }`}
                      title={t("common:delete")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Tag */}
        <button
          type="button"
          onClick={openCreateTagModal}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] active:scale-[0.98]"
        >
          <Plus size={16} />
          {t("workspace:tags.addTag")}
        </button>
      </div>

      {/* Upgrade Card */}
      <div className="mt-16 sm:mt-32 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 shadow-sm backdrop-blur-md animate-fade-up">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm">
          <Sparkles size={18} />
        </div>

        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t("workspace:upgrade.title")}
        </h3>

        <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
          {t("workspace:upgrade.description")}
        </p>

        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
        >
          {t("workspace:upgrade.button")}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden w-[240px] shrink-0 sidebar-glass px-5 py-8 transition-all duration-300 lg:block ${
          isNavbarCollapsed ? "min-h-screen" : "min-h-[calc(100vh-84px)]"
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer (visible on < lg when triggered) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <aside className="relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-[var(--color-surface)] px-5 py-6 shadow-2xl border-r border-[var(--color-border)] animate-slide-right">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t("workspace:header.title", "Workspace Navigation")}
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Create / Edit Tag Modal */}
      {tagModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {tagModalMode === "create"
                    ? t("workspace:tags.createTitle")
                    : t("workspace:tags.editTitle")}
                </h2>

                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {tagModalMode === "create"
                    ? t("workspace:tags.createSubtitle")
                    : t("workspace:tags.editSubtitle")}
                </p>
              </div>

              <button
                type="button"
                onClick={closeTagModal}
                disabled={isSubmitting}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                aria-label={t("common:close")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Name */}
            <div className="mt-6">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                {t("workspace:tags.tagName")}
              </label>

              <input
                type="text"
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isSubmitting) {
                    handleSubmitTag();
                  }
                }}
                maxLength={100}
                placeholder={t("workspace:tags.tagNamePlaceholder")}
                disabled={isSubmitting}
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 disabled:bg-[var(--color-disabled-background)]"
                autoFocus
              />
            </div>

            {/* Color */}
            <div className="mt-5">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                {t("workspace:tags.color")}
              </label>

              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={tagColor || "#45D2B7"}
                  onChange={(event) => setTagColor(event.target.value)}
                  disabled={isSubmitting}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
                />

                <input
                  type="text"
                  value={tagColor}
                  onChange={(event) => setTagColor(event.target.value)}
                  maxLength={50}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 disabled:bg-[var(--color-disabled-background)]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeTagModal}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
              >
                {t("common:cancel")}
              </button>

              <button
                type="button"
                onClick={handleSubmitTag}
                disabled={isSubmitting || !tagName.trim()}
                className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? t("common:saving")
                  : tagModalMode === "create"
                    ? t("workspace:tags.createTitle")
                    : t("common:saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-[var(--color-danger)]">
                <Trash2 size={19} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {t("workspace:tags.deleteTitle")}
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  {t("workspace:tags.deleteConfirm", { name: deletingTag.name })}
                </p>

                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {t("common:cannotBeUndone")}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingTag(null)}
                disabled={isDeleting}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
              >
                {t("common:cancel")}
              </button>

              <button
                type="button"
                onClick={handleDeleteTag}
                disabled={isDeleting}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? t("common:deleting") : t("common:delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}