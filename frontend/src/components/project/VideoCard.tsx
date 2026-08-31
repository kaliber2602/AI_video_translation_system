import React, { useRef, useEffect } from "react";
import {
  FileText,
  MoreHorizontal,
  Play,
  Settings2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type VideoStatus =
  | "completed"
  | "editing"
  | "processing"
  | "draft";

type Video = {
  id: number;
  title: string;
  filename: string;
  duration: string;
  size: string;
  updated: string;
  status: VideoStatus;
};

type VideoCardProps = {
  video: Video;
  onOpen: () => void;
};

const statusClasses: Record<VideoStatus, string> = {
  completed: "bg-[#E4F8F2] text-[#16A88F] dark:bg-emerald-950/40 dark:text-emerald-300",
  editing: "bg-[#FFF2D8] text-[#C68A1C] dark:bg-amber-950/40 dark:text-amber-300",
  processing: "bg-[#EAF1FF] text-[#5783D4] dark:bg-blue-950/40 dark:text-blue-300",
  draft: "bg-[#F0F2F3] text-[#738187] dark:bg-slate-800 dark:text-slate-300",
};

export default function VideoCard({
  video,
  onOpen,
}: VideoCardProps) {
  const { t } = useTranslation(["project"]);
  const statusClassName = statusClasses[video.status];

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
      if (target.closest("button, a, input, textarea, select, [data-no-drag]")) {
        if (target !== el) return;
      }

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      isDraggingRef.current = true;
      hasMovedRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = performance.now();
      velocityRef.current = { x: 0, y: 0 };

      el.style.transition = "none";
      el.style.animation = "none";
      el.style.zIndex = "50";
      el.style.cursor = "grabbing";

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) return;

        const rawDx = moveEvent.clientX - startPosRef.current.x;
        const rawDy = moveEvent.clientY - startPosRef.current.y;

        // If on touch device and user is scrolling vertically more than horizontally, cancel dragging to allow native scroll
        if (moveEvent.pointerType === "touch" && !hasMovedRef.current) {
          if (Math.abs(rawDy) > Math.abs(rawDx) && Math.abs(rawDy) > 8) {
            isDraggingRef.current = false;
            return;
          }
        }

        if (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3) {
          hasMovedRef.current = true;
        }

        const now = performance.now();
        const dt = Math.max((now - lastTimeRef.current) / 1000, 0.001);
        lastTimeRef.current = now;

        const tx = applyRubberBand(rawDx);
        const ty = applyRubberBand(rawDy);

        velocityRef.current = {
          x: (tx - currentPosRef.current.x) / dt,
          y: (ty - currentPosRef.current.y) / dt,
        };

        currentPosRef.current = { x: tx, y: ty };
        const tilt = tx * 0.035;

        el.style.transform = `translate3d(${tx}px, ${ty}px, 0px) rotate(${tilt}deg) scale(1.035)`;
        el.style.boxShadow =
          "0 28px 56px -12px rgba(0, 0, 0, 0.28), 0 0 24px -4px color-mix(in srgb, var(--color-primary) 35%, transparent)";
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        isDraggingRef.current = false;
        startSpring();
      };

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };

    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("dragstart", preventDrag);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("dragstart", preventDrag);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
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
        return t("project:status.completed");
      case "editing":
        return t("project:status.editing");
      case "processing":
        return t("project:status.processing");
      case "draft":
        return t("project:status.draft");
    }
  };

  const getActionLabel = (status: VideoStatus) => {
    switch (status) {
      case "completed":
        return t("project:action.reviewVideo");
      case "editing":
        return t("project:action.continueEditing");
      case "processing":
        return t("project:action.viewProgress");
      case "draft":
        return t("project:action.openPipeline");
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
      className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all duration-220 ease-out hover:shadow-lg animate-fade-up select-none"
    >
      {/* Thumbnail */}
      <div className="relative h-[165px] sm:h-[190px] overflow-hidden bg-gradient-to-br from-[#15212B] via-[#334854] to-[#78919A]">
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

        {/* More Button */}
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
            }}
            aria-label="More options"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-white backdrop-blur-md transition-colors duration-150 ease-out hover:bg-black/50"
          >
            <MoreHorizontal size={17} />
          </button>
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
        <div className="mt-4 flex items-center gap-2">
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
            }}
            aria-label={t("project:viewDocuments")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors duration-180 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <FileText size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}