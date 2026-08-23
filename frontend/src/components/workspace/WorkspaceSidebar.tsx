import { useEffect, useState } from "react";
import {Folder, Users, Star, Trash2, Plus, Sparkles, Pencil, X,} from "lucide-react";
import { getTags, createTag, updateTag, deleteTag, } from "../../services/tag.service";
import type { TagResponse } from "../../types/tag";
import { toast } from "../../lib/toast";


const navigationItems = [
  {
    label: "All Projects",
    icon: Folder,
    active: true,
  },
  {
    label: "Shared With Me",
    icon: Users,
  },
  {
    label: "Favorites",
    icon: Star,
  },
  {
    label: "Trash",
    icon: Trash2,
  },
];


interface WorkspaceSidebarProps {
  selectedTagId?: number | null;
  onTagSelect?: (tagId: number | null) => void;
}


type TagModalMode = "create" | "edit" | null;


export default function WorkspaceSidebar({
  selectedTagId = null,
  onTagSelect,
}: WorkspaceSidebarProps) {

  // =========================================================
  // Tags
  // =========================================================

  const [tags, setTags] = useState<TagResponse[]>([]);

  const [isLoadingTags, setIsLoadingTags] =
    useState(true);

  const [tagsError, setTagsError] =
    useState<string | null>(null);


  // =========================================================
  // Tag Menu
  // =========================================================



  // =========================================================
  // Tag Modal
  // =========================================================

  const [tagModalMode, setTagModalMode] =
    useState<TagModalMode>(null);

  const [editingTag, setEditingTag] =
    useState<TagResponse | null>(null);

  const [tagName, setTagName] =
    useState("");

  const [tagColor, setTagColor] =
    useState("#45D2B7");

  const [isSubmitting, setIsSubmitting] =
    useState(false);


  // =========================================================
  // Delete
  // =========================================================

  const [deletingTag, setDeletingTag] =
    useState<TagResponse | null>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);


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
        console.error(
          "[WORKSPACE SIDEBAR] Failed to load tags:",
          error
        );

        setTagsError(
          "Failed to load tags."
        );
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTags();
  }, []);


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

  const openEditTagModal = (
    tag: TagResponse
  ) => {

    setTagModalMode("edit");
    setEditingTag(tag);

    setTagName(tag.name);

    setTagColor(
      tag.color || "#45D2B7"
    );
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
    const trimmedName =
      tagName.trim();

    if (!trimmedName) {
      toast.error(
        "Invalid tag",
        "Tag name cannot be empty."
      );

      return;
    }

    try {
      setIsSubmitting(true);

      // -------------------------------------------------------
      // Create
      // -------------------------------------------------------

      if (
        tagModalMode === "create"
      ) {
        const newTag =
          await createTag({
            name: trimmedName,
            color: tagColor || null,
          });

        setTags(
          (currentTags) => [
            ...currentTags,
            newTag,
          ]
        );

        toast.success(
          "Tag created",
          `"${newTag.name}" has been created successfully.`
        );
      }


      // -------------------------------------------------------
      // Update
      // -------------------------------------------------------

      if (
        tagModalMode === "edit" &&
        editingTag
      ) {
        const updatedTag =
          await updateTag(
            editingTag.id,
            {
              name: trimmedName,
              color: tagColor || null,
            }
          );

        setTags(
          (currentTags) =>
            currentTags.map(
              (tag) =>
                tag.id === updatedTag.id
                  ? updatedTag
                  : tag
            )
        );

        toast.success(
          "Tag updated",
          `"${updatedTag.name}" has been updated successfully.`
        );
      }

      closeTagModal();

    } catch (error) {
      console.error(
        "[WORKSPACE SIDEBAR] Failed to save tag:",
        error
      );

      toast.error(
        "Failed to save tag",
        "Please try again."
      );
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

      await deleteTag(
        deletingTag.id
      );

      setTags(
        (currentTags) =>
          currentTags.filter(
            (tag) =>
              tag.id !==
              deletingTag.id
          )
      );


      // Nếu tag đang được chọn
      // thì clear filter

      if (
        selectedTagId ===
        deletingTag.id
      ) {
        onTagSelect?.(null);
      }


      toast.success(
        "Tag deleted",
        `"${deletingTag.name}" has been deleted successfully.`
      );

      setDeletingTag(null);

    } catch (error) {
      console.error(
        "[WORKSPACE SIDEBAR] Failed to delete tag:",
        error
      );

      toast.error(
        "Failed to delete tag",
        "Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };


  // =========================================================
  // Select Tag
  // =========================================================

  const handleTagSelect = (
    tagId: number
  ) => {

    if (
      selectedTagId === tagId
    ) {
      onTagSelect?.(null);
      return;
    }

    onTagSelect?.(tagId);
  };


  return (
    <>
      <aside className="hidden min-h-[calc(100vh-84px)] w-[240px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]/80 px-5 py-9 transition-colors duration-200 lg:block">

        {/* =====================================================
            Navigation
        ===================================================== */}

        <nav className="space-y-2">

          {navigationItems.map(
            (item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm transition ${item.active
                      ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                >
                  <Icon size={20} />

                  {item.label}
                </button>
              );
            }
          )}

        </nav>


        {/* =====================================================
            Tags
        ===================================================== */}

        <div className="mt-10">

          <div className="mb-5 flex items-center justify-between px-3">

            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Tags
            </p>

          </div>


          {/* Loading */}

          {isLoadingTags && (
            <div className="space-y-4 px-3">

              {[1, 2, 3].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-border)]" />

                    <span className="h-3 w-24 animate-pulse rounded bg-[var(--color-border-muted)]" />
                  </div>
                )
              )}

            </div>
          )}


          {/* Error */}

          {!isLoadingTags &&
            tagsError && (
              <p className="px-3 text-xs text-[var(--color-danger)]">
                {tagsError}
              </p>
            )}


          {/* Empty */}

          {!isLoadingTags &&
            !tagsError &&
            tags.length === 0 && (
              <p className="px-3 text-xs text-[var(--color-text-muted)]">
                No tags yet.
              </p>
            )}


          {/* Tags */}

          {!isLoadingTags &&
            !tagsError &&
            tags.length > 0 && (

              <div className="space-y-1">

                {tags.map((tag) => {

                  const isSelected =
                    selectedTagId ===
                    tag.id;

                  return (
                    <div
                      key={tag.id}
                      className={`group relative flex items-center rounded-xl transition ${isSelected
                          ? "bg-[var(--color-primary-soft)]"
                          : "hover:bg-[var(--color-surface-muted)]"
                        }`}
                    >

                      {/* =================================================
                          Tag Button
                      ================================================= */}

                      <button
                        type="button"
                        onClick={() =>
                          handleTagSelect(
                            tag.id
                          )
                        }
                        className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm ${isSelected
                            ? "font-semibold text-[var(--color-primary)]"
                            : "text-[var(--color-text-secondary)]"
                          }`}
                      >

                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              tag.color ||
                              "var(--color-primary)",
                          }}
                        />

                        <span className="truncate text-left">
                          {tag.name}
                        </span>

                      </button>


                      {/* =================================================
                          More Button
                      ================================================= */}

                      {/* Tag Actions */}

                      <div className="flex items-center gap-1 pr-1">

                        {/* Edit */}

                        <button
                          type="button"
                          onClick={() => openEditTagModal(tag)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] opacity-0 transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] group-hover:opacity-100"
                          title="Edit tag"
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Delete */}

                        <button
                          type="button"
                          onClick={() => setDeletingTag(tag)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                          title="Delete tag"
                        >
                          <Trash2 size={15} />
                        </button>

                      </div>

                    </div>
                  );
                })}

              </div>
            )}


          {/* =====================================================
              Add Tag
          ===================================================== */}

          <button
            type="button"
            onClick={
              openCreateTagModal
            }
            className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
          >
            <Plus size={17} />

            Add Tag
          </button>

        </div>


        {/* =====================================================
            Upgrade Card
        ===================================================== */}

        <div className="mt-36 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 shadow-sm">

          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm">
            <Sparkles size={19} />
          </div>

          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Need more storage?
          </h3>

          <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
            Upgrade your plan for unlimited projects and AI processing.
          </p>

          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
          >
            Upgrade Now
          </button>

        </div>

      </aside>


      {/* =======================================================
          Create / Edit Tag Modal
      ======================================================= */}

      {tagModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">

            {/* Header */}

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {tagModalMode ===
                    "create"
                    ? "Create Tag"
                    : "Edit Tag"}
                </h2>

                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {tagModalMode ===
                    "create"
                    ? "Create a new tag for your projects."
                    : "Update your tag information."}
                </p>

              </div>


              <button
                type="button"
                onClick={
                  closeTagModal
                }
                disabled={
                  isSubmitting
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X size={18} />
              </button>

            </div>


            {/* Name */}

            <div className="mt-6">

              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Tag name
              </label>

              <input
                type="text"
                value={tagName}
                onChange={(event) =>
                  setTagName(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter" &&
                    !isSubmitting
                  ) {
                    handleSubmitTag();
                  }
                }}
                maxLength={100}
                placeholder="e.g. AI"
                disabled={
                  isSubmitting
                }
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 disabled:bg-[var(--color-disabled-background)]"
                autoFocus
              />

            </div>


            {/* Color */}

            <div className="mt-5">

              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Color
              </label>

              <div className="mt-2 flex items-center gap-3">

                <input
                  type="color"
                  value={
                    tagColor ||
                    "#45D2B7"
                  }
                  onChange={(event) =>
                    setTagColor(
                      event.target.value
                    )
                  }
                  disabled={
                    isSubmitting
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
                />

                <input
                  type="text"
                  value={tagColor}
                  onChange={(event) =>
                    setTagColor(
                      event.target.value
                    )
                  }
                  maxLength={50}
                  disabled={
                    isSubmitting
                  }
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 disabled:bg-[var(--color-disabled-background)]"
                />

              </div>

            </div>


            {/* Actions */}

            <div className="mt-7 flex justify-end gap-3">

              <button
                type="button"
                onClick={
                  closeTagModal
                }
                disabled={
                  isSubmitting
                }
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleSubmitTag
                }
                disabled={
                  isSubmitting ||
                  !tagName.trim()
                }
                className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving..."
                  : tagModalMode ===
                    "create"
                    ? "Create Tag"
                    : "Save Changes"}
              </button>

            </div>

          </div>

        </div>
      )}


      {/* =======================================================
          Delete Confirmation
      ======================================================= */}

      {deletingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">

            <div className="flex items-start gap-4">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-[var(--color-danger)]">
                <Trash2 size={19} />
              </div>

              <div>

                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Delete Tag
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    "{deletingTag.name}"
                  </span>
                  ?
                </p>

                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  This action cannot be undone.
                </p>

              </div>

            </div>


            {/* Actions */}

            <div className="mt-7 flex justify-end gap-3">

              <button
                type="button"
                onClick={() =>
                  setDeletingTag(
                    null
                  )
                }
                disabled={
                  isDeleting
                }
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteTag
                }
                disabled={
                  isDeleting
                }
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting
                  ? "Deleting..."
                  : "Delete Tag"}
              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
}