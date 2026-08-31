import { useState } from "react";
import { Tag as TagIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Project, ProjectCreateRequest, ProjectUpdateRequest } from "../../types/project";
import type { TagResponse } from "../../types/tag";

interface ProjectModalProps {
  mode: "create" | "edit";
  project?: Project | null;
  availableTags: TagResponse[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: ProjectCreateRequest | ProjectUpdateRequest,
    selectedTagIds: number[]
  ) => Promise<void>;
}

export default function ProjectModal({
  mode,
  project,
  availableTags,
  isOpen,
  onClose,
  onSubmit,
}: ProjectModalProps) {
  if (!isOpen) return null;

  return (
    <ProjectModalContent
      key={`${mode}-${project?.id ?? "new"}`}
      mode={mode}
      project={project}
      availableTags={availableTags}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function ProjectModalContent({
  mode,
  project,
  availableTags,
  onClose,
  onSubmit,
}: Omit<ProjectModalProps, "isOpen">) {
  const { t } = useTranslation(["workspace", "common"]);

  const [name, setName] = useState(mode === "edit" && project ? project.name : "");
  const [description, setDescription] = useState(
    mode === "edit" && project ? project.description || "" : ""
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    mode === "edit" && project?.tags ? project.tags.map((tg) => tg.id) : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("workspace:project.nameEmptyError"));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (mode === "create") {
        await onSubmit(
          {
            name: name.trim(),
            description: description.trim() || null,
            tag_ids: selectedTagIds,
          },
          selectedTagIds
        );
      } else {
        await onSubmit(
          {
            name: name.trim(),
            description: description.trim() || null,
          },
          selectedTagIds
        );
      }

      onClose();
    } catch (err: unknown) {
      console.error("[ProjectModal] Submit error:", err);
      const apiError = err as { response?: { data?: { detail?: string } } };
      setError(apiError?.response?.data?.detail || t("workspace:project.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-card)] transition-colors duration-200 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {mode === "create"
                ? t("workspace:project.createTitle")
                : t("workspace:project.editTitle")}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {mode === "create"
                ? t("workspace:project.createSubtitle")
                : t("workspace:project.editSubtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            aria-label={t("common:close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {t("workspace:project.name")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("workspace:project.namePlaceholder")}
              maxLength={255}
              disabled={isSubmitting}
              autoFocus
              className="mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {t("workspace:project.description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("workspace:project.descriptionPlaceholder")}
              rows={3}
              disabled={isSubmitting}
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] p-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
            />
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
              <TagIcon size={14} className="text-[var(--color-primary)]" />
              <span>{t("workspace:project.assignTags")}</span>
            </div>

            {availableTags.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {t("workspace:tags.empty")}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      disabled={isSubmitting}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: tag.color || "var(--color-primary)",
                        }}
                      />
                      <span>{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
            >
              {t("common:cancel")}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? t("common:saving")
                : mode === "create"
                  ? t("workspace:project.createTitle")
                  : t("common:saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
