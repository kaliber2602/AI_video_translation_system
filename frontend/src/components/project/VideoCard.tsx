import React, { useRef, useEffect, useState } from "react";
import {
  FileText,
  MoreHorizontal,
  Play,
  Settings2,
  Pencil,
  FolderInput,
  Download,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export type VideoStatus =
  | "completed"
  | "editing"
  | "processing"
  | "draft"
  | "failed"
  | "uploaded";

export type Video = {
  id: number;
  title: string;
  filename: string;
  duration: string;
  size: string;
  updated: string;
  status: VideoStatus;
  thumbnail?: string;
  progress?: number;
  folder_id?: number | null;
};

export type VideoCardProps = {
  video: Video;
  onOpen: () => void;
  onOpenEditor?: (video: Video) => void;
  onRename?: (video: Video) => void;
  onMove?: (video: Video) => void;
  onDownload?: (video: Video) => void;
  onDelete?: (video: Video) => void;
  onViewDocuments?: (video: Video) => void;
};

const statusClasses: Record<VideoStatus, string> = {
  completed: "bg-[#E4F8F2] text-[#16A88F] dark:bg-emerald-950/40 dark:text-emerald-300",
  editing: "bg-[#FFF2D8] text-[#C68A1C] dark:bg-amber-950/40 dark:text-amber-300",
  processing: "bg-[#EAF1FF] text-[#5783D4] dark:bg-blue-950/40 dark:text-blue-300",
  draft: "bg-[#F0F2F3] text-[#738187] dark:bg-slate-800 dark:text-slate-300",
  failed: "bg-red-500/10 text-red-500 dark:bg-red-950/40 dark:text-red-300",
  uploaded: "bg-blue-500/10 text-blue-500 dark:bg-blue-950/40 dark:text-blue-300",
};

export default function VideoCard({
  video,
  onOpen,
  onOpenEditor,
  onRename,
  onMove,
  onDownload,
  onDelete,
  onViewDocuments,
}: VideoCardProps) {
  const { t } = useTranslation(["project"]);
  const statusClassName = statusClasses[video.status] || statusClasses.uploaded;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const cardRef = useRef<HTMLElement>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const hasMovedRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const elasticity = 0.42;
    const maxDisplacement = 130;

    const applyRubberBand = (delta: number) => {
      const abs = Math.abs(delta);
      const sign = Math.sign(delta);
      const resisted =
        (abs * elasticity * maxDisplacement) /
        (maxDisplacement + abs * elasticity);
      return sign * Math.min(resisted, maxDisplacement);
    };

    const startSpring = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const stiffness = 320;
      const damping = 22;
      const mass = 1;

      let posX = currentPosRef.current.x;
      let posY = currentPosRef.current.y;
      let velX = velocityRef.current.x * 0.45;
      let velY = velocityRef.current.y * 0.45;
      let lastTime = performance.now();

      const animate = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;

        const forceX = -stiffness * posX - damping * velX;
        const forceY = -stiffness * posY - damping * velY;

        velX += (forceX / mass) * dt;
        velY += (forceY / mass) * dt;

        posX += velX * dt;
        posY += velY * dt;

        currentPosRef.current = { x: posX, y: posY };

        const tilt = posX * 0.035;
        el.style.transform = `translate3d(${posX}px, ${posY}px, 0px) rotate(${tilt}deg)`;

        if (
          Math.abs(posX) < 0.1 &&
          Math.abs(posY) < 0.1 &&
          Math.abs(velX) < 0.1 &&
          Math.abs(velY) < 0.1
        ) {
          el.style.transform = "";
          el.style.zIndex = "";
          el.style.boxShadow = "";
          el.style.cursor = "";
          el.style.transition = "";
          currentPosRef.current = { x: 0, y: 0 };
          animFrameRef.current = null;
          return;
        }

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, [data-no-drag]")) {
        return;
      }

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      isDraggingRef.current = true;
      hasMovedRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      currentPosRef.current = { x: 0, y: 0 };
      velocityRef.current = { x: 0, y: 0 };
      lastTimeRef.current = performance.now();

      el.setPointerCapture(e.pointerId);
      el.style.zIndex = "50";
      el.style.boxShadow = "var(--shadow-lg)";
      el.style.cursor = "grabbing";
      el.style.transition = "none";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const now = performance.now();
      const dt = Math.max((now - lastTimeRef.current) / 1000, 0.001);

      const rawDx = e.clientX - startPosRef.current.x;
      const rawDy = e.clientY - startPosRef.current.y;

      if (!hasMovedRef.current && (Math.abs(rawDx) > 4 || Math.abs(rawDy) > 4)) {
        hasMovedRef.current = true;
      }

      const dx = applyRubberBand(rawDx);
      const dy = applyRubberBand(rawDy);

      velocityRef.current = {
        x: (dx - currentPosRef.current.x) / dt,
        y: (dy - currentPosRef.current.y) / dt,
      };

      currentPosRef.current = { x: dx, y: dy };
      lastTimeRef.current = now;

      const tilt = dx * 0.035;
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0px) rotate(${tilt}deg)`;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // pointer was already released
      }

      startSpring();
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // pointer was already released
      }

      startSpring();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [data-no-drag]")) {
      return;
    }
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpen();
  };

  const getStatusLabel = (status: VideoStatus) => {
    switch (status) {
      case "completed":
        return t("project:status.completed") || "Completed";
      case "editing":
        return t("project:status.editing") || "Editing";
      case "processing":
        return t("project:status.processing") || "Processing";
      case "draft":
        return t("project:status.draft") || "Draft";
      case "uploaded":
        return t("project:status.uploaded") || "Uploaded";
      case "failed":
        return t("project:status.failed") || "Failed";
      default:
        return status;
    }
  };

  const getActionLabel = (status: VideoStatus) => {
    switch (status) {
      case "completed":
        return t("project:action.reviewVideo") || "Review Video";
      case "editing":
        return t("project:action.continueEditing") || "Continue Editing";
      case "processing":
        return t("project:action.viewProgress") || "View Progress";
      case "uploaded":
      case "draft":
        return t("project:action.openPipeline") || "Open Pipeline";
      case "failed":
        return t("project:action.retry") || "Retry Processing";
      default:
        return t("project:action.openPipeline") || "Open";
    }
  };

  return (
    <article
      ref={cardRef}
      onClick={handleCardClick}
      style={{
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        cursor: "grab",
        willChange: "transform",
      }}
      className="group relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all duration-220 ease-out hover:shadow-lg animate-fade-up select-none"
    >
      {/* Thumbnail */}
      <div className="relative h-[165px] sm:h-[190px] overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#15212B] via-[#334854] to-[#78919A]">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,189,0.3),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.14),transparent_30%)]" />

        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${video.title}`}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[var(--color-primary)] shadow-xl transition-all duration-200 ease-out hover:scale-110 hover:bg-white active:scale-95"
          >
            <Play
              size={22}
              fill="currentColor"
            />
          </button>
        </div>

        {/* Duration */}
        <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-xs">
          {video.duration}
        </div>

        {/* More Button & Menu */}
        <div className="absolute right-3 top-3" ref={menuRef} data-no-drag>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            aria-label="More options"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-white backdrop-blur-md transition-colors duration-150 ease-out hover:bg-black/50"
          >
            <MoreHorizontal size={17} />
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 shadow-xl backdrop-blur-md animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenEditor ? onOpenEditor(video) : onOpen();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-indigo-400 transition hover:bg-[var(--color-surface-muted)]"
              >
                <Sparkles size={14} />
                Mở Video Editor
              </button>
              {onRename && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onRename(video);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
                >
                  <Pencil size={14} />
                  Rename
                </button>
              )}

              {onMove && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onMove(video);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
                >
                  <FolderInput size={14} />
                  Move to Folder
                </button>
              )}

              {onDownload && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDownload(video);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
                >
                  <Download size={14} />
                  Download
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete(video);
                  }}
                  className="flex w-full items-center gap-2.5 border-t border-[var(--color-border)] px-4 py-2 text-left text-xs font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger)]/10"
                >
                  <Trash2 size={14} />
                  Delete Video
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-[var(--color-text-primary)]">
              {video.title}
            </h2>

            <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
              {video.filename}
            </p>
          </div>

          {/* Status */}
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusClassName}`}
          >
            {getStatusLabel(video.status)}
          </span>
        </div>

        {/* Metadata */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
          <span>{video.size}</span>
          <span>{video.updated}</span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2" data-no-drag>
          {/* Open Pipeline */}
          <button
            type="button"
            onClick={onOpen}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-soft)] py-2 text-xs font-bold text-[var(--color-primary)] transition-all duration-180 ease-out hover:bg-[var(--color-primary)] hover:text-white active:scale-[0.985]"
          >
            <Settings2 size={15} />
            {getActionLabel(video.status)}
          </button>

          {/* Documents */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onViewDocuments?.(video);
            }}
            aria-label={t("project:viewDocuments") || "View Documents"}
            title="View Chapters & Documents"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors duration-180 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <FileText size={15} />
          </button>

          {/* Open Video Editor Button */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenEditor ? onOpenEditor(video) : onOpen();
            }}
            aria-label="Mở Video Editor"
            title="Mở Trình Dựng Video & Phụ Đề"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-950/20 text-indigo-400 transition-colors duration-180 ease-out hover:border-indigo-400 hover:bg-indigo-600 hover:text-white"
          >
            <Sparkles size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}