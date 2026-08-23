import React, { useRef, useEffect } from "react";
import type { Project } from "../../types/project";

interface ElasticCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  elasticity?: number;
  maxDisplacement?: number;
  tiltFactor?: number;
  project?: Project;
  onDropToTrash?: (project: Project) => void;
}

export default function ElasticCard({
  children,
  className = "",
  onClick,
  elasticity = 0.45,
  maxDisplacement = 280, // Expanded displacement so cards can be dragged freely to the sidebar Trash
  tiltFactor = 0.035,
  project,
  onDropToTrash,
  style,
  ...rest
}: ElasticCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const hasMovedRef = useRef(false);
  const isOverTrashRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

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

        const tilt = posX * tiltFactor;
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
          el.style.borderColor = "";
          el.style.opacity = "";
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
      if (
        target.closest("button, a, input, textarea, select, [data-no-drag], [role='menuitem']")
      ) {
        if (target !== el) return;
      }

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      isDraggingRef.current = true;
      hasMovedRef.current = false;
      isOverTrashRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = performance.now();
      velocityRef.current = { x: 0, y: 0 };

      el.style.transition = "none";
      el.style.animation = "none";
      el.style.zIndex = "60";
      el.style.cursor = "grabbing";

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) return;

        const rawDx = moveEvent.clientX - startPosRef.current.x;
        const rawDy = moveEvent.clientY - startPosRef.current.y;

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

        // Check distance to sidebar Trash drop zone
        const trashEl = document.getElementById("sidebar-trash-dropzone");
        let suctionIntensity = 0;
        let isOverTrash = false;

        if (trashEl) {
          const trashRect = trashEl.getBoundingClientRect();
          const trashCenterX = trashRect.left + trashRect.width / 2;
          const trashCenterY = trashRect.top + trashRect.height / 2;

          const distance = Math.hypot(
            moveEvent.clientX - trashCenterX,
            moveEvent.clientY - trashCenterY
          );

          if (distance < 240) {
            suctionIntensity = (240 - distance) / 240;
            isOverTrash = distance < 80;
            isOverTrashRef.current = isOverTrash;

            window.dispatchEvent(
              new CustomEvent("project-near-trash", {
                detail: { isNear: true, isOver: isOverTrash, intensity: suctionIntensity },
              })
            );
          } else {
            isOverTrashRef.current = false;
            window.dispatchEvent(
              new CustomEvent("project-near-trash", {
                detail: { isNear: false, isOver: false, intensity: 0 },
              })
            );
          }
        }

        const tilt = tx * tiltFactor;
        // As card is sucked into trash, scale down and tint red
        const scale = isOverTrash
          ? 0.55
          : suctionIntensity > 0
          ? 1.035 * (1 - suctionIntensity * 0.35)
          : 1.035;

        el.style.transform = `translate3d(${tx}px, ${ty}px, 0px) rotate(${tilt}deg) scale(${scale})`;
        
        if (suctionIntensity > 0) {
          el.style.borderColor = `rgba(239, 68, 68, ${0.4 + suctionIntensity * 0.6})`;
          el.style.boxShadow = `0 24px 48px -10px rgba(239, 68, 68, ${0.2 + suctionIntensity * 0.4}), 0 0 24px -2px rgba(239, 68, 68, 0.5)`;
        } else {
          el.style.borderColor = "";
          el.style.boxShadow =
            "0 28px 56px -12px rgba(0, 0, 0, 0.28), 0 0 24px -4px color-mix(in srgb, var(--color-primary) 35%, transparent)";
        }
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        isDraggingRef.current = false;

        window.dispatchEvent(
          new CustomEvent("project-near-trash", {
            detail: { isNear: false, isOver: false, intensity: 0 },
          })
        );

        if (isOverTrashRef.current && project) {
          // Play suction vanish effect into the Trash
          el.style.transition = "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease-out";
          el.style.transform = `translate3d(${currentPosRef.current.x}px, ${currentPosRef.current.y}px, 0px) scale(0) rotate(25deg)`;
          el.style.opacity = "0";

          window.dispatchEvent(
            new CustomEvent("project-dropped-to-trash", {
              detail: { project },
            })
          );
          onDropToTrash?.(project);

          setTimeout(() => {
            el.style.transform = "";
            el.style.opacity = "";
            el.style.zIndex = "";
            el.style.boxShadow = "";
            el.style.cursor = "";
            el.style.borderColor = "";
            currentPosRef.current = { x: 0, y: 0 };
          }, 350);
          return;
        }

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
  }, [elasticity, maxDisplacement, tiltFactor, project, onDropToTrash]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.();
  };

  return (
    <div
      {...rest}
      ref={cardRef}
      onClick={handleClick}
      style={{
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        cursor: "grab",
        willChange: "transform",
        ...style,
      }}
      className={`relative select-none ${className}`}
    >
      {children}
    </div>
  );
}
